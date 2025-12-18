import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fusionQuerySchema } from "@shared/schema";
import { XMLParser } from "fast-xml-parser";
import axios from "axios";

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Execute Fusion Cloud SQL query
  app.post("/api/run-fusion-query", async (req, res) => {
    try {
      const validatedData = fusionQuerySchema.parse(req.body);
      const { fusionUrl, username, password, rows, bindVariables } = validatedData;
      
      // Clean SQL: remove trailing semicolons and extra whitespace
      let sql = validatedData.sql.trim().replace(/;+\s*$/, '');
      
      // If bind variables are provided, replace them in the SQL
      if (bindVariables && Object.keys(bindVariables).length > 0) {
        Object.entries(bindVariables).forEach(([key, value]) => {
          const regex = new RegExp(`:${key}\\b`, 'g');
          sql = sql.replace(regex, `'${value}'`);
        });
      }

      // Construct SOAP envelope with HTTP Basic Auth (no credentials in body)
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
  <soap:Header/>
  <soap:Body>
    <pub:runReport>
      <pub:reportRequest>
        <pub:attributeFormat>xml</pub:attributeFormat>
        <pub:parameterNameValues>
          <pub:item>
            <pub:name>p_sql</pub:name>
            <pub:values>
              <pub:item><![CDATA[${sql}]]></pub:item>
            </pub:values>
          </pub:item>
          <pub:item>
            <pub:name>p_rows</pub:name>
            <pub:values>
              <pub:item>${rows}</pub:item>
            </pub:values>
          </pub:item>
        </pub:parameterNameValues>
        <pub:reportAbsolutePath>/Custom/CidUtils/RunSQL.xdo</pub:reportAbsolutePath>
        <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
      </pub:reportRequest>
    </pub:runReport>
  </soap:Body>
</soap:Envelope>`;

      // Make SOAP request to Fusion Cloud
      const soapUrl = `${fusionUrl}/xmlpserver/services/ExternalReportWSSService`;
      
      const response = await axios.post(soapUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': '',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
        timeout: 60000, // 60 second timeout
      });

      // Parse XML response
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
      });

      const parsedResponse = parser.parse(response.data);
      
      // Debug: Log the parsed response structure
      console.log('Parsed SOAP Response Structure:', JSON.stringify(parsedResponse, null, 2));
      
      // Extract reportBytes from SOAP response (SOAP 1.2 format)
      const reportBytes = parsedResponse?.['soap:Envelope']?.['soap:Body']?.['runReportResponse']?.['runReportReturn']?.['reportBytes'] ||
                         parsedResponse?.['soapenv:Envelope']?.['soapenv:Body']?.['runReportResponse']?.['runReportReturn']?.['reportBytes'] ||
                         parsedResponse?.['env:Envelope']?.['env:Body']?.['ns2:runReportResponse']?.['ns2:runReportReturn']?.['ns2:reportBytes'];
      
      if (!reportBytes) {
        // Check if there's a SOAP fault in the response instead
        const fault = parsedResponse?.['soap:Envelope']?.['soap:Body']?.['soap:Fault'] ||
                     parsedResponse?.['env:Envelope']?.['env:Body']?.['env:Fault'];
        
        if (fault) {
          const faultText = fault?.['env:Reason']?.['env:Text'] || fault?.faultstring || 'SOAP Fault occurred';
          
          // Extract Oracle error with line numbers if present
          if (typeof faultText === 'string' && faultText.includes('ORA-')) {
            // Extract full Oracle error including line numbers
            const lines = faultText.split('\n');
            const errorLines = [];
            
            for (const line of lines) {
              if (line.includes('ORA-') || line.includes('PLS-') || line.includes('at line')) {
                errorLines.push(line.trim());
              }
            }
            
            throw new Error(errorLines.length > 0 ? errorLines.join('\n') : faultText);
          } else {
            throw new Error(typeof faultText === 'string' ? faultText : 'SQL execution failed');
          }
        }
        
        throw new Error('No report data found in response - Query may have returned empty results');
      }

      // Decode base64 content
      const decodedXml = Buffer.from(reportBytes, 'base64').toString('utf-8');
      console.log('Decoded XML:', decodedXml);
      
      // Parse the decoded XML to extract data
      const decodedParsed = parser.parse(decodedXml);
      console.log('Decoded parsed structure:', JSON.stringify(decodedParsed, null, 2));
      
      // Try different data extraction paths based on Oracle BI Publisher format
      let results;
      const jsonDoc = decodedParsed?.['json_doc'];
      const dataDs = decodedParsed?.['DATA_DS'];
      const gData = dataDs?.['G_DATA'];
      
      if (jsonDoc) {
        // JSON document format
        if (typeof jsonDoc === 'string') {
          try {
            results = JSON.parse(jsonDoc);
          } catch (e) {
            results = { raw: jsonDoc };
          }
        } else {
          results = jsonDoc;
        }
      } else if (gData && typeof gData === 'object' && Object.keys(gData).length > 0) {
        // Check for XML result data in different formats
        if (gData.RESULT || gData.r) {
          // Oracle XML format - extract ROWSET data
          const resultXml = gData.RESULT || gData.r;
          if (typeof resultXml === 'string') {
            try {
              const resultParsed = parser.parse(resultXml);
              const rowset = resultParsed?.ROWSET;
              if (rowset?.ROW) {
                results = Array.isArray(rowset.ROW) ? rowset.ROW : [rowset.ROW];
              } else {
                results = [];
              }
            } catch (e) {
              console.error('Error parsing ROWSET XML:', e);
              results = [];
            }
          } else {
            results = resultXml;
          }
        } else {
          // Check if G_DATA has actual data rows
          const dataKeys = Object.keys(gData).filter(key => key !== 'RESULT' && key !== 'r');
          if (dataKeys.length > 0) {
            // Convert G_DATA object structure to array format
            const firstKey = dataKeys[0];
            const firstData = gData[firstKey];
            
            if (Array.isArray(firstData)) {
              // Multiple rows
              results = firstData.map((_, index) => {
                const row: any = {};
                dataKeys.forEach(key => {
                  const values = gData[key];
                  row[key] = Array.isArray(values) ? values[index] : values;
                });
                return row;
              });
            } else {
              // Single row
              const row: any = {};
              dataKeys.forEach(key => {
                row[key] = gData[key];
              });
              results = [row];
            }
          } else {
            results = [];
          }
        }
      } else {
        // Fallback: return the entire parsed structure but log for debugging
        console.log('No recognizable data structure found, using fallback');
        results = decodedParsed;
      }

      // Save to query history
      await storage.addQueryHistory({
        sql,
        fusionUrl,
        username,
        results,
      });

      res.json({
        success: true,
        results,
        rawXml: response.data,
        executionTime: Date.now(),
      });

    } catch (error: any) {
      console.error('Fusion query error:', error);
      
      let errorMessage = 'Unknown error occurred';
      let isMaintenanceMode = false;
      
      if (error.response?.data) {
        // Check for Oracle Cloud maintenance mode
        if (typeof error.response.data === 'string' && 
            error.response.data.includes('scheduled maintenance')) {
          isMaintenanceMode = true;
          errorMessage = 'Oracle Cloud Service Maintenance\n\nThe Oracle Fusion Cloud service is currently undergoing scheduled maintenance. Please try again once maintenance is complete.';
        } else {
          // Try to parse SOAP fault (both SOAP 1.1 and 1.2 formats)
          try {
            const parser = new XMLParser();
            const parsed = parser.parse(error.response.data);
            const fault = parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'] ||
                         parsed?.['env:Envelope']?.['env:Body']?.['env:Fault'];
            
            if (fault) {
              const faultText = fault?.['env:Reason']?.['env:Text'] || fault?.faultstring || 'SOAP Fault occurred';
              
              // Extract Oracle error codes with line numbers if present
              if (typeof faultText === 'string' && faultText.includes('ORA-')) {
                // Try to extract full Oracle error with line number information
                const fullErrorMatch = faultText.match(/ORA-\d+: [^\n\r]+(?:\n.*line \d+.*)?/i);
                if (fullErrorMatch) {
                  errorMessage = fullErrorMatch[0].trim();
                } else {
                  const oraMatch = faultText.match(/ORA-\d+: [^\n\r\\]+/);
                  errorMessage = oraMatch ? oraMatch[0] : faultText.split('\n')[0];
                }
                
                // Also look for line number information separately
                const lineMatch = faultText.match(/line (\d+)/i);
                if (lineMatch) {
                  errorMessage += `\nAt line: ${lineMatch[1]}`;
                }
              } else {
                errorMessage = typeof faultText === 'string' ? faultText.split('\n')[0] : 'SQL execution failed';
              }
            }
          } catch (parseError) {
            console.error('Error parsing SOAP fault:', parseError);
            errorMessage = 'Failed to execute SQL query';
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        details: error.response?.status ? `HTTP ${error.response.status}` : undefined,
        isMaintenanceMode,
      });
    }
  });

  // Get query history
  app.get("/api/query-history/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const history = await storage.getQueryHistory(username, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test connection endpoint
  app.post("/api/test-connection", async (req, res) => {
    try {
      const { fusionUrl, username, password } = req.body;
      
      // Validate inputs
      if (!fusionUrl || !username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: fusionUrl, username, and password are required' 
        });
      }

      // URL validation
      try {
        new URL(fusionUrl);
      } catch {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Fusion URL format. Please include https:// and the complete URL' 
        });
      }
      
      const testQuery = "SELECT 1 as test_connection FROM dual";
      // Use HTTP Basic Auth instead of embedding credentials in SOAP body
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
  <soap:Header/>
  <soap:Body>
    <pub:runReport>
      <pub:reportRequest>
        <pub:attributeFormat>xml</pub:attributeFormat>
        <pub:parameterNameValues>
          <pub:item>
            <pub:name>p_sql</pub:name>
            <pub:values>
              <pub:item>${testQuery}</pub:item>
            </pub:values>
          </pub:item>
          <pub:item>
            <pub:name>p_rows</pub:name>
            <pub:values>
              <pub:item>1</pub:item>
            </pub:values>
          </pub:item>
        </pub:parameterNameValues>
        <pub:reportAbsolutePath>/Custom/CidUtils/RunSQL.xdo</pub:reportAbsolutePath>
        <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
      </pub:reportRequest>
    </pub:runReport>
  </soap:Body>
</soap:Envelope>`;

      const soapUrl = `${fusionUrl}/xmlpserver/services/ExternalReportWSSService`;
      console.log(`Testing connection to: ${soapUrl}`);
      console.log('SOAP Envelope:', soapEnvelope);
      
      const response = await axios.post(soapUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': '',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
        timeout: 30000,
        validateStatus: () => true, // Don't throw on non-2xx status codes
      });

      console.log(`Response status: ${response.status}`);
      console.log('Response data preview:', response.data.substring(0, 1000));
      
      if (response.status === 200) {
        res.json({ success: true, message: 'Connection successful - Oracle Fusion Cloud BI Publisher is accessible' });
      } else if (response.status === 401) {
        res.status(400).json({ 
          success: false, 
          error: 'Authentication failed - Invalid username or password' 
        });
      } else if (response.status === 404) {
        res.status(400).json({ 
          success: false, 
          error: 'BI Publisher service not found - Check if /Custom/CidUtils/RunSQL.xdo report exists in your Fusion instance' 
        });
      } else if (response.status === 500) {
        // Try to parse the response to get more details about the error
        let errorDetail = 'Internal server error';
        try {
          const parser = new XMLParser();
          const parsed = parser.parse(response.data);
          const fault = parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'];
          if (fault) {
            errorDetail = fault.faultstring || fault.detail || 'SOAP Fault occurred';
          }
        } catch (e) {
          // If parsing fails, use generic message
        }
        res.status(400).json({ 
          success: false, 
          error: 'Report execution failed',
          details: `The BI Publisher report returned an error. This could mean: 1) The report doesn't exist at the specified path, 2) Missing required parameters, or 3) Database connection issues. Error: ${errorDetail}`
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: `HTTP ${response.status} - Server returned an error` 
        });
      }

    } catch (error: any) {
      console.error('Connection test error:', error.message);
      
      let errorMessage = 'Connection failed';
      let userFriendlyError = '';
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Server not found';
        userFriendlyError = 'Cannot reach the Fusion Cloud server. Please check the URL and your network connection.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
        userFriendlyError = 'Server refused the connection. The service may be down or blocked.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout';
        userFriendlyError = 'Connection timed out. The server may be overloaded or your network is slow.';
      } else if (error.message.includes('certificate')) {
        errorMessage = 'SSL Certificate error';
        userFriendlyError = 'SSL certificate issue. The server may have an invalid or expired certificate.';
      } else {
        userFriendlyError = error.message;
      }
      
      res.status(400).json({ 
        success: false, 
        error: errorMessage,
        details: userFriendlyError
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
