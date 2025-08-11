# Gemini Agent Project Notes for netlify-jira-dashboard

This document outlines key information and conventions learned by the Gemini agent while working on the `netlify-jira-dashboard` project. This serves as a living document to ensure consistent and informed interactions.

## 1. Project Overview
The `netlify-jira-dashboard` is a web application designed to visualize Jira data, particularly focusing on Key Performance Indicators (KPIs) related to sprints and assignee performance.

## 2. Key Technologies
- **Frontend:** React with TypeScript
- **Styling:** Tailwind CSS
- **Backend (Serverless):** Netlify Functions (TypeScript)
- **API Communication:** `axios` and `fetch` for interacting with Netlify Functions.

## 3. Frontend Architecture & Data Flow
- **Main Data Source:** Jira data (projects, sprints, issues) is fetched and managed primarily within `src/contexts/JiraContext.tsx`.
- **Raw Data Processing:** Raw Jira issues are processed into `normalizedTasks` and then `filteredTasks` within `JiraContext.tsx`.
- **KPI Data Preparation:** `assigneeStats` (containing `totalTasks`, `totalStoryPoints`, `averageComplexity`, etc.) are derived from `filteredTasks` within `JiraContext.tsx`.
- **KPI Calculation Request:** The `DashboardPage.tsx` component sends the prepared `assigneeStats` and KPI configuration to the `/api/kpi` Netlify Function for final KPI calculation.

## 4. KPI Calculation Logic (Crucial Detail)
- **Carryover Exclusion:** KPI calculations (for assigned cards, total tasks, total story points, and complexity) **always** exclude "carryover" tasks. This is enforced by the `filteredTasks` `useMemo` in `src/contexts/JiraContext.tsx`, which applies the `isCarryover` logic from `src/helpers/is-carryover.ts` unconditionally. Tasks are considered "carryover" if they were part of a previously closed sprint in their `sprintHistory` but are also in the currently selected sprint.

## 5. Backend (Netlify Functions)
- **`netlify/functions/api-kpi.ts`:** This function receives pre-processed `assigneeStats` and KPI configuration from the frontend and performs the final KPI calculation. It does not perform raw Jira data fetching or carryover filtering itself.
- **Jira API Proxy:** Other Netlify Functions (e.g., `/api/jira/*`) are responsible for proxying requests to the Jira API and potentially caching responses.

## 6. Styling Conventions
- The project uses Tailwind CSS for styling. Adhere to Tailwind utility-first principles.

## 7. Important Learnings/Conventions
- **Data Processing Location:** Most data aggregation and filtering (e.g., for `assigneeStats`, `totalTasks`, `totalStoryPoints`) happens in the frontend, specifically within `src/contexts/JiraContext.tsx`.
- **Empty/Unused Files:** `src/services/jiraService.ts` and `src/utils/jiraUtils.ts` were found to be empty and have been removed. This indicates that any service or utility logic is either inlined within components/contexts or handled by other existing files. Avoid creating new files in these paths unless explicitly required and confirmed to have content.
