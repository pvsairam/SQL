import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

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
    const { fusionUrl, username, password } = req.body;
    
    if (!fusionUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required connection parameters'
      });
    }
    
    console.log('Testing connection to:', fusionUrl);
    
    // Test with a simple query
    const testSql = "SELECT 1 as test_column FROM dual";
    const soapEnvelope = createSOAPEnvelope(fusionUrl, username, password, testSql, 1);
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
        timeout: 10000
      }
    );
    
    // If we get here, connection is successful
    res.json({ 
      success: true, 
      message: 'Connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Connection test error:', error);
    
    let errorMessage = 'Connection failed';
    let statusCode = 500;
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Invalid Fusion URL - domain not found';
      statusCode = 400;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      errorMessage = 'Invalid username or password';
      statusCode = 401;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - check Fusion URL and port';
      statusCode = 400;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Connection timeout - server may be unavailable';
      statusCode = 408;
    } else if (error.response?.status) {
      errorMessage = `Server returned ${error.response.status}: ${error.response.statusText}`;
      statusCode = error.response.status;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.message,
      code: error.code,
      responseStatus: error.response?.status
    });
  }
}