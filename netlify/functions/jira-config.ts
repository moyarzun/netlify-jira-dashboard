interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

type Handler = (event: NetlifyEvent) => Promise<NetlifyResponse> | NetlifyResponse;

// Shared global storage
declare global {
  var jiraConfigStorage: any;
}

if (!global.jiraConfigStorage) {
  global.jiraConfigStorage = null;
}

export const handler: Handler = async (event: NetlifyEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    // Return stored config or environment variables
    if (global.jiraConfigStorage) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ config: global.jiraConfigStorage }),
      };
    }
    
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_USER_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    
    if (baseUrl && email && apiToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ config: { baseUrl, email, apiToken } }),
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Configuration not found.' }),
    };
  }

  if (event.httpMethod === 'POST') {
    const { baseUrl, email, apiToken } = JSON.parse(event.body || '{}');
    
    if (!baseUrl || !email || !apiToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing Jira credentials' }),
      };
    }

    global.jiraConfigStorage = { baseUrl, email, apiToken };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Configuration saved successfully.' }),
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};