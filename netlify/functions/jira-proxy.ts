import { Handler } from '@netlify/functions';

// Import shared storage - using global object for shared state between functions
declare global {
  var jiraConfigStorage: JiraConfig | null;
}

if (!global.jiraConfigStorage) {
  global.jiraConfigStorage = null;
}

// Define interfaces for better type safety
interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  boardId?: number;
  originBoardId?: number;
  goal?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    labels: string[];
    priority: { name: string };
    assignee: {
      displayName: string;
      avatarUrls: { [key: string]: string };
    } | null;
    customfield_10331: number; // story points (Story point estimate)
    customfield_10127: any; // sprint field
    closedSprints: JiraSprint[];
  };
  changelog: unknown;
}

// Helper to get Jira config
const getJiraConfig = async (): Promise<JiraConfig | null> => {
  if (global.jiraConfigStorage) {
    return global.jiraConfigStorage;
  }
  
  // Fallback to environment variables
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  
  if (baseUrl && email && apiToken) {
    const config = { baseUrl, email, apiToken };
    global.jiraConfigStorage = config;
    return config;
  }
  
  return null;
};

// Helper function to transform Jira issue data
const transformIssueData = (issue: JiraIssue, selectedSprint?: JiraSprint): any => {
  // Extract sprint history from multiple sources
  const sprintHistory: string[] = [];
  
  // 1. Extract from current sprint field (customfield_10127)
  const sprintField = (issue.fields as any).customfield_10127;
  if (sprintField) {
    if (Array.isArray(sprintField)) {
      sprintField.forEach((sprint: any) => {
        if (sprint && sprint.id) {
          sprintHistory.push(String(sprint.id));
        }
      });
    } else if (sprintField.id) {
      sprintHistory.push(String(sprintField.id));
    }
  }
  
  // 2. Extract from changelog
  if (issue.changelog && typeof issue.changelog === 'object' && 'histories' in issue.changelog) {
    const histories = (issue.changelog as any).histories || [];
    histories.forEach((history: any) => {
      if (history.items) {
        history.items.forEach((item: any) => {
          if (item.field === 'Sprint' && item.toString) {
            const toSprintIds = item.toString.match(/\d+/g) || [];
            sprintHistory.push(...toSprintIds);
          }
        });
      }
    });
  }
  
  const uniqueSprintHistory = [...new Set(sprintHistory)];
  
  // Always ensure current sprint is included
  if (selectedSprint) {
    const currentSprintId = String(selectedSprint.id);
    if (!uniqueSprintHistory.includes(currentSprintId)) {
      uniqueSprintHistory.push(currentSprintId);
    }
  }
  
  return {
    id: issue.key,
    title: issue.fields.summary || "No Title",
    status: issue.fields.status?.name || "No Status",
    label: issue.fields.labels?.join(", ") || "No Label",
    priority: issue.fields.priority?.name || "No Priority",
    assignee: issue.fields.assignee
      ? {
          displayName: issue.fields.assignee.displayName,
          name: issue.fields.assignee.displayName,
          avatarUrl: issue.fields.assignee.avatarUrls["48x48"],
        }
      : {
          displayName: "Unassigned",
          name: "Unassigned",
          avatarUrl: "",
        },
    storyPoints: issue.fields.customfield_10331 || 0, // Story point estimate
    complexity: 0, // Complexity field needs to be identified
    changelog: issue.changelog,
    closedSprints: issue.fields.closedSprints || [],
    sprintHistory: uniqueSprintHistory,
    isCarryover: false, // Will be set by middleware
  };
};

export const handler: Handler = async (event, context) => {
  console.log(`[jira-proxy] Received request: ${event.httpMethod} ${event.path}`);
  
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const path = event.path;
  const forceUpdate = event.queryStringParameters?.force === 'true';

  try {
    // --- Endpoint: /api/jira/config ---
    if (path.includes("/api/jira/config")) {
      if (event.httpMethod === "GET") {
        const config = await getJiraConfig();
        if (config) {
          return { statusCode: 200, headers, body: JSON.stringify({ config }) };
        }
        return { statusCode: 404, headers, body: JSON.stringify({ message: "Configuration not found." }) };
      }

      if (event.httpMethod === "POST") {
        const { baseUrl, email, apiToken } = JSON.parse(event.body || '{}');
        if (!baseUrl || !email || !apiToken) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing Jira credentials" }) };
        }

        global.jiraConfigStorage = { baseUrl, email, apiToken };
        return { statusCode: 200, headers, body: JSON.stringify({ message: "Configuration saved successfully." }) };
      }

      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    // --- Secure Endpoints (require config) ---
    const config = await getJiraConfig();
    if (!config) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Jira configuration not found. Please set it up first." }) };
    }

    const { baseUrl: JIRA_BASE_URL, email: JIRA_EMAIL, apiToken: JIRA_API_TOKEN } = config;
    const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
    const baseHeaders = {
      "Accept": "application/json",
      "Authorization": authHeader,
    };

    const body = JSON.parse(event.body || '{}');
    const { projectKey, sprintId } = body;

    // --- Endpoint: /api/jira/sprints ---
    if (path.includes("/api/jira/sprints")) {
      if (!projectKey) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing projectKey" }) };
      }

      console.log(`[DEBUG] Fetching boards for project: ${projectKey}`);
      
      const boardsUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
      const boardsResponse = await fetch(boardsUrl, { headers: baseHeaders });
      const boardsData = await boardsResponse.json();
      const boards = boardsData.values || [];
      
      console.log(`[DEBUG] Found ${boards.length} boards`);
      
      if (boards.length === 0) {
        console.log(`[DEBUG] No boards found for project ${projectKey}`);
        return { statusCode: 200, headers, body: JSON.stringify({ sprints: [] }) };
      }

      const boardId = boards[0].id;
      console.log(`[DEBUG] Using board ID: ${boardId}`);
      
      const sprintsUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board/${boardId}/sprint?maxResults=50`;
      const sprintsResponse = await fetch(sprintsUrl, { headers: baseHeaders });
      if (!sprintsResponse.ok) {
        throw new Error(`Failed to fetch sprints: ${await sprintsResponse.text()}`);
      }

      const sprintsData = await sprintsResponse.json();
      const sprints = sprintsData.values || [];
      
      console.log(`[DEBUG] Found ${sprints.length} sprints`);

      return { statusCode: 200, headers, body: JSON.stringify({ sprints }) };
    }

    // --- Endpoint: /api/jira/projects ---
    if (path.includes("/api/jira/projects")) {
      const projectsUrl = `${JIRA_BASE_URL}/rest/api/3/project/search?maxResults=50`;
      const projectsResponse = await fetch(projectsUrl, { headers: baseHeaders });
      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${await projectsResponse.text()}`);
      }

      const projectsData = await projectsResponse.json();
      const projects = projectsData.values || [];

      return { statusCode: 200, headers, body: JSON.stringify({ projects }) };
    }

    // --- Endpoint: /api/jira/issues ---
    if (path.includes("/api/jira/issues")) {
      console.log(`[DEBUG] /api/jira/issues called with sprintId: ${sprintId}`);
      if (!sprintId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing sprintId" }) };
      }

      const fields = [
        "summary", "status", "labels", "priority", "assignee",
        "customfield_10331", // Story points (Story point estimate)
        "customfield_10127", // Sprint field
        "closedSprints", "issuetype"
      ].join(",");

      const jql = `sprint = ${sprintId} ORDER BY created DESC`;
      const issuesUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&expand=changelog&maxResults=100`;
      
      const issuesResponse = await fetch(issuesUrl, { headers: baseHeaders });
      if (!issuesResponse.ok) {
        throw new Error(`Failed to fetch issues: ${await issuesResponse.text()}`);
      }

      const pageData = await issuesResponse.json();
      const allIssues: JiraIssue[] = pageData.issues || [];

      // Get current sprint info
      const currentSprintUrl = `${JIRA_BASE_URL}/rest/agile/1.0/sprint/${sprintId}`;
      const currentSprintResponse = await fetch(currentSprintUrl, { headers: baseHeaders });
      let currentSprint: JiraSprint | undefined;
      if (currentSprintResponse.ok) {
        currentSprint = await currentSprintResponse.json();
      }

      const transformedIssues = allIssues.map(issue => {
        const transformed = transformIssueData(issue, currentSprint);
        
        // Ensure current sprint is always in sprintHistory
        if (!transformed.sprintHistory.includes(String(sprintId))) {
          transformed.sprintHistory.push(String(sprintId));
        }
        
        return transformed;
      });
      console.log(`[DEBUG] Transformed ${transformedIssues.length} issues`);

      return { statusCode: 200, headers, body: JSON.stringify({ issues: transformedIssues }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Endpoint not found" }) };

  } catch (error) {
    console.error("Jira Proxy Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
  }
};