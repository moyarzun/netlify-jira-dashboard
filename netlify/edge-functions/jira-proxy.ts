/// <reference types="https://esm.sh/@netlify/functions@2.6.0/deno/index.d.ts" />

// netlify/edge-functions/jira-proxy.ts
import type { Context } from "https://edge.netlify.com/";

// Define interfaces for better type safety
interface JiraSprint {
  id: number;
  name: string;
  state: string;
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

// Main Edge Function handler
export default async (request: Request) => {
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

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  const url = new URL(request.url);
  const body = await request.json();
  const { baseUrl, email, apiToken, projectKey, sprintId } = body;

  // Use credentials directly from the request body
  const JIRA_BASE_URL = baseUrl;
  const JIRA_EMAIL = email;
  const JIRA_API_TOKEN = apiToken;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return jsonResponse(400, { error: "Jira authentication details are missing from the request body." });
  }

  const authHeader = `Basic ${btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)}`;
  const baseHeaders = {
    "Accept": "application/json",
    "Authorization": authHeader,
  };

  try {
    // --- Endpoint: /api/jira/sprints ---
    if (url.pathname.includes("/api/jira/sprints")) {
      if (!projectKey) return jsonResponse(400, { error: "Missing projectKey" });

      const boardUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
      const boardResponse = await fetch(boardUrl, { headers: baseHeaders });
      if (!boardResponse.ok) throw new Error(`Failed to fetch boards: ${await boardResponse.text()}`);
      
      const boards = (await boardResponse.json()).values;
      if (!boards || boards.length === 0) {
        return jsonResponse(200, { sprints: [] }); // No boards found, return empty
      }

      const sprintPromises = boards.map(async (board: { id: number }) => {
        let sprints: JiraSprint[] = [];
        let startAt = 0;
        let isLast = false;
        const sprintUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board/${board.id}/sprint`;

        while (!isLast) {
          const pagedSprintUrl = `${sprintUrl}?startAt=${startAt}&maxResults=50&state=active,future,closed`;
          const sprintResponse = await fetch(pagedSprintUrl, { headers: baseHeaders });
          const data = await sprintResponse.json();
          sprints = sprints.concat(data.values);
          isLast = data.isLast;
          startAt += data.values.length;
        }
        return sprints;
      });

      const sprintsPerBoard = await Promise.all(sprintPromises);
      const combinedSprints = sprintsPerBoard.flat();
      const uniqueSprints = Array.from(new Map(combinedSprints.map(s => [s.id, s])).values());
      
      uniqueSprints.sort((a, b) => b.id - a.id); // Sort by most recent
      return jsonResponse(200, { sprints: uniqueSprints });
    }

    // --- Endpoint: /api/jira/issues ---
    if (url.pathname.includes("/api/jira/issues")) {
      if (!sprintId) return jsonResponse(400, { error: "Missing sprintId" });

      const sprintUrl = `${JIRA_BASE_URL}/rest/agile/1.0/sprint/${sprintId}`;
      const sprintResponse = await fetch(sprintUrl, { headers: baseHeaders });
      if (!sprintResponse.ok) throw new Error(`Failed to fetch sprint info: ${await sprintResponse.text()}`);
      const sprintInfo = await sprintResponse.json();

      let allIssues = [];
      let startAt = 0;
      let total = -1;
      const fields = "summary,status,issuetype,priority,assignee,customfield_10331,customfield_10127,customfield_10020";
      const jql = `sprint = ${sprintId} ORDER BY created DESC`;
      
      do {
        const searchUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&startAt=${startAt}&maxResults=100`;
        const issuesResponse = await fetch(searchUrl, { headers: baseHeaders });
        if (!issuesResponse.ok) throw new Error(`Failed to fetch issues: ${await issuesResponse.text()}`);
        
        const data = await issuesResponse.json();
        allIssues = allIssues.concat(data.issues);
        total = data.total;
        startAt += data.issues.length;
      } while (startAt < total);

      return jsonResponse(200, { sprintInfo, issues: allIssues, total: allIssues.length });
    }

    return jsonResponse(404, { error: "Endpoint not found" });

  } catch (error) {
    console.error("Jira Proxy Error:", error);
    return jsonResponse(500, { error: error.message });
  }
};
