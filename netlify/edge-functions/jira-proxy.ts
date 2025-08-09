/// <reference types="https://esm.sh/@netlify/functions@2.6.0/deno/index.d.ts" />

import type { Context } from "https://edge.netlify.com/";
import { getStore } from "@netlify/blobs";

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

interface TransformedIssue {
  id: string;
  title: string;
  status: string;
  label: string;
  priority: string;
  assignee: {
    name: string;
    avatarUrl: string;
  };
  storyPoints: number;
  complexity: number;
  changelog: unknown; // Use unknown for better type safety than any
  closedSprints: JiraSprint[]; // Use a specific type for closed sprints
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
    customfield_10331: number; // storyPoints
    customfield_10127: { value: string }[] | string; // complexity
    closedSprints: JiraSprint[];
  };
  changelog: unknown;
}

// Helper to create standardized JSON responses
const jsonResponse = (statusCode: number, body: object) => {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

// Helper to get Jira config from Blobs
const getJiraConfig = async (): Promise<JiraConfig | null> => {
  const store = getStore("jira-config");
  return await store.get("credentials", { type: "json" });
};

// Helper function to transform Jira issue data
const transformIssueData = (issue: JiraIssue): TransformedIssue => {
  // The complexity field from Jira (customfield_10127) might be an array.
  // We need to handle this case and extract the numeric value, defaulting to 0.
  const rawComplexity = issue.fields.customfield_10127;

  // ADD THIS LOG
  context.log(`Raw Complexity for ${issue.key}:`, rawComplexity);

  const complexity = Array.isArray(rawComplexity) && rawComplexity.length > 0
    ? Number(rawComplexity[0].value) || 0
    : Number(rawComplexity) || 0;

  return {
    id: issue.key,
    title: issue.fields.summary || "No Title",
    status: issue.fields.status?.name || "No Status",
    label: issue.fields.labels?.join(", ") || "No Label",
    priority: issue.fields.priority?.name || "No Priority",
    assignee: issue.fields.assignee
      ? {
          name: issue.fields.assignee.displayName,
          avatarUrl: issue.fields.assignee.avatarUrls["48x48"],
        }
      : {
          name: "Unassigned",
          avatarUrl: "",
        },
    storyPoints: issue.fields.customfield_10331 || 0,
    complexity: complexity,
    changelog: issue.changelog,
    closedSprints: issue.fields.closedSprints || [],
  };
};

// Main Edge Function handler
export default async (request: Request, context: Context) => {
  context.log(`[jira-proxy] Received request for: ${request.method} ${request.url}`);
  // Handle CORS pre-flight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(request.url);
  const forceUpdate = url.searchParams.get('force') === 'true';

  // --- Endpoint: /api/jira/config ---
  if (url.pathname.includes("/api/jira/config")) {
    // Handle GET request to fetch config
    if (request.method === "GET") {
      const config = await getJiraConfig();
      if (config) {
        return jsonResponse(200, { config });
      }
      return jsonResponse(404, { message: "Configuration not found." });
    }

    // Handle POST request to save config
    if (request.method === "POST") {
      const { baseUrl, email, apiToken } = await request.json();
      if (!baseUrl || !email || !apiToken) {
        return jsonResponse(400, { error: "Missing Jira credentials" });
      }

      const configStore = getStore("jira-config");
      await configStore.setJSON("credentials", { baseUrl, email, apiToken });

      return jsonResponse(200, { message: "Configuration saved successfully." });
    }

    // For other methods on this endpoint
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  // --- Secure Endpoints (require config) ---
  const config = await getJiraConfig();
  if (!config) {
    return jsonResponse(401, { error: "Jira configuration not found. Please set it up first." });
  }

  const { baseUrl: JIRA_BASE_URL, email: JIRA_EMAIL, apiToken: JIRA_API_TOKEN } = config;
  const authHeader = `Basic ${btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)}`;
  const baseHeaders = {
    "Accept": "application/json",
    "Authorization": authHeader,
  };

  const cacheStore = getStore("jira-cache");

  try {
    // --- Endpoint: /api/jira/projects ---
    if (url.pathname.includes("/api/jira/projects")) {
      const cacheKey = "projects";
      if (!forceUpdate) {
        const cachedProjects = await cacheStore.get(cacheKey, { type: "json" });
        if (cachedProjects) {
          return jsonResponse(200, { projects: cachedProjects, fromCache: true });
        }
      }

      const projectsUrl = `${JIRA_BASE_URL}/rest/api/3/project`;
      const projectsResponse = await fetch(projectsUrl, { headers: baseHeaders });
      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${await projectsResponse.text()}`);
      }
      const projects: JiraProject[] = await projectsResponse.json();
      projects.sort((a, b) => a.name.localeCompare(b.name));

      await cacheStore.setJSON(cacheKey, projects);
      return jsonResponse(200, { projects });
    }

    const body = await request.json().catch(() => ({})); // Body might be empty for some requests
    const { projectKey, sprintId } = body;

    // --- Endpoint: /api/jira/sprints ---
    if (url.pathname.includes("/api/jira/sprints")) {
      if (!projectKey) return jsonResponse(400, { error: "Missing projectKey" });

      const cacheKey = `sprints-${projectKey}`;
      if (!forceUpdate) {
        const cachedSprints = await cacheStore.get(cacheKey, { type: "json" });
        if (cachedSprints) {
          return jsonResponse(200, { sprints: cachedSprints, fromCache: true });
        }
      }

      const boardUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
      const boardResponse = await fetch(boardUrl, { headers: baseHeaders });
      if (!boardResponse.ok) throw new Error(`Failed to fetch boards: ${await boardResponse.text()}`);
      
      const boards = (await boardResponse.json()).values;
      if (!boards || boards.length === 0) {
        return jsonResponse(200, { sprints: [] });
      }

      const sprintPromises = boards.map(async (board: { id: number }) => {
        const sprintUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board/${board.id}/sprint?state=active,future,closed`;
        const sprintResponse = await fetch(sprintUrl, { headers: baseHeaders });
        if (!sprintResponse.ok) return []; // Silently fail for a single board
        const data = await sprintResponse.json();
        return data.values;
      });

      const sprintsPerBoard = await Promise.all(sprintPromises);
      const combinedSprints = sprintsPerBoard.flat();
      const uniqueSprints = Array.from(new Map(combinedSprints.map(s => [s.id, s])).values());
      
      uniqueSprints.sort((a, b) => b.id - a.id);

      await cacheStore.setJSON(cacheKey, uniqueSprints);
      return jsonResponse(200, { sprints: uniqueSprints });
    }

    // --- Endpoint: /api/jira/issues ---
    if (url.pathname.includes("/api/jira/issues")) {
      if (!sprintId) return jsonResponse(400, { error: "Missing sprintId" });

      const cacheKey = `issues-sprint-${sprintId}`;
      if (!forceUpdate) {
        const cachedIssues = await cacheStore.get(cacheKey, { type: "json" });
        if (cachedIssues) {
          return jsonResponse(200, { issues: cachedIssues, fromCache: true });
        }
      }

      // Explicitly request all necessary fields, including closedSprints
      const fields = [
        "summary",
        "status",
        "labels",
        "priority",
        "assignee",
        "customfield_10331", // Story Points
        "customfield_10127", // Complexity
        "closedSprints",
        "issuetype" // Also fetch issuetype for the label
      ].join(","); // CORREGIDO: usar coma, no salto de línea

      const jql = `sprint = ${sprintId} ORDER BY created DESC`;
      const allIssues: JiraIssue[] = [];
      let startAt = 0;
      const maxResults = 50; // Jira default page size
      let keepFetching = true;

      while (keepFetching) {
        const issuesUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&expand=changelog&startAt=${startAt}&maxResults=${maxResults}`;
        const issuesResponse = await fetch(issuesUrl, { headers: baseHeaders });

        if (!issuesResponse.ok) {
          throw new Error(`Failed to fetch issues (page starting at ${startAt}): ${await issuesResponse.text()}`);
        }

        const pageData = await issuesResponse.json();
        if (pageData.issues && pageData.issues.length > 0) {
          allIssues.push(...pageData.issues);
          startAt += pageData.issues.length;
          // Si la página es menor que maxResults, ya no hay más issues
          keepFetching = pageData.issues.length === maxResults;
        } else {
          keepFetching = false;
        }
      }

      const transformedIssues = allIssues.map(transformIssueData);

      // ADD THIS LOG
      context.log("Transformed Issues Complexity Check:", transformedIssues.map(issue => ({ id: issue.id, complexity: issue.complexity })));

      await cacheStore.setJSON(cacheKey, transformedIssues);
      // Siempre responder con { issues: [...] }
      return jsonResponse(200, { issues: transformedIssues });
    }

    return jsonResponse(404, { error: "Endpoint not found" });

  } catch (error) {
    context.log("Jira Proxy Error:", error);
    return jsonResponse(500, { error: error.message });
  }
};
