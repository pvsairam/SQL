import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { z } from 'zod';

// Fusion query schema
const FusionQuerySchema = z.object({
  fusionUrl: z.string().url("Please enter a valid Fusion URL"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  sql: z.string().min(1, "SQL query is required"),
  rows: z.number().min(1).max(10000).default(5)
});

// SOAP envelope template
const createSOAPEnvelope = (fusionUrl: string, username: string, password: string, sql: string, rows: number) => {
  const cleanSql = sql.trim().replace(/;+$/, '');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
  <soap:Header/>
  <soap:Body>
    <pub:runReport>
      <pub:reportRequest>
        <pub:attributeFormat>xml</pub:attributeFormat>
        <pub:reportAbsolutePath>/Custom/CidUtils/RunSQL.xdo</pub:reportAbsolutePath>
        <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
        <pub:parameterNameValues>
          <pub:listOfParamNameValues>
            <pub:item>
              <pub:name>p_sql</pub:name>
              <pub:values>
                <pub:item>${cleanSql}</pub:item>
              </pub:values>
            </pub:item>
            <pub:item>
              <pub:name>p_rows</pub:name>
              <pub:values>
                <pub:item>${rows}</pub:item>
              </pub:values>
            </pub:item>
          </pub:listOfParamNameValues>
        </pub:parameterNameValues>
      </pub:reportRequest>
    </pub:runReport>
  </soap:Body>
</soap:Envelope>`;
};

// Parse XML response
const parseXMLResponse = (xmlData: string) => {
  try {
    const { XMLParser } = eval('require')('fast-xml-parser');
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true
    });
    
    const parsed = parser.parse(xmlData);
    
    // Extract data from various possible structures
    let data = null;
    
    if (parsed?.['soap:Envelope']?.['soap:Body']?.['ns2:runReportResponse']?.['ns2:runReportReturn']?.['ns2:reportBytes']) {
      const reportBytes = parsed['soap:Envelope']['soap:Body']['ns2:runReportResponse']['ns2:runReportReturn']['ns2:reportBytes'];
      const decodedXml = Buffer.from(reportBytes, 'base64').toString('utf-8');
      const reportData = parser.parse(decodedXml);
      
      if (reportData?.DATA_DS?.G_DATA) {
        data = Array.isArray(reportData.DATA_DS.G_DATA) ? reportData.DATA_DS.G_DATA : [reportData.DATA_DS.G_DATA];
      } else if (reportData?.ROWSET?.ROW) {
        data = Array.isArray(reportData.ROWSET.ROW) ? reportData.ROWSET.ROW : [reportData.ROWSET.ROW];
      }
    }
    
    return { results: data, rawXml: xmlData };
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error('Failed to parse response from Oracle BI Publisher');
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validatedData = FusionQuerySchema.parse(req.body);
    const { fusionUrl, username, password, sql, rows } = validatedData;
    
    const soapEnvelope = createSOAPEnvelope(fusionUrl, username, password, sql, rows);
    const encodedCredentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await axios.post(
      `${fusionUrl}/xmlpserver/services/ExternalReportWSSService`,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Authorization': `Basic ${encodedCredentials}`,
          'SOAPAction': ''
        },
        timeout: 30000
      }
    );
    
    const result = parseXMLResponse(response.data);
    res.json({ success: true, ...result });
    
  } catch (error: any) {
    console.error('Fusion query error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: JSON.stringify(error.errors),
        isMaintenanceMode: false
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute query',
      isMaintenanceMode: error.message?.includes('maintenance') || false
    });
  }
}