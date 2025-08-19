# Gemini Agent Project Notes for netlify-jira-dashboard

This document outlines key information and conventions learned by the Gemini agent while working on the `netlify-jira-dashboard` project. This serves as a living document to ensure consistent and informed interactions.

## 0. Gemini Agent Context

You are an expert in React, Vite and Tailwind CSS.
  
Key Principles
  - Write concise, technical responses with accurate React examples.
  - Use functional, declarative programming. Avoid classes.
  - Prefer iteration and modularization over duplication.
  - Use descriptive variable names with auxiliary verbs (e.g., isLoading).
  - Use lowercase with dashes for directories (e.g., components/auth-wizard).
  - Favor named exports for components.
  - Use the Receive an Object, Return an Object (RORO) pattern.
  
JavaScript
  - Use "function" keyword for pure functions. Omit semicolons.
  - Use TypeScript for all code. Prefer interfaces over types. Avoid enums, use maps.
  - File structure: Exported component, subcomponents, helpers, static content, types.
  - Avoid unnecessary curly braces in conditional statements.
  - For single-line statements in conditionals, omit curly braces.
  - Use concise, one-line syntax for simple conditional statements (e.g., if (condition) doSomething()).
  
Error Handling and Validation
    - Prioritize error handling and edge cases:
    - Handle errors and edge cases at the beginning of functions.
    - Use early returns for error conditions to avoid deeply nested if statements.
    - Place the happy path last in the function for improved readability.
    - Avoid unnecessary else statements; use if-return pattern instead.
    - Use guard clauses to handle preconditions and invalid states early.
    - Implement proper error logging and user-friendly error messages.
    - Consider using custom error types or error factories for consistent error handling.
  
React
  - Use functional components and interfaces.
  - Use declarative JSX.
  - Use function, not const, for components.
  - Use Next UI, and Tailwind CSS for components and styling.
  - Implement responsive design with Tailwind CSS.
  - Implement responsive design.
  - Place static content and interfaces at file end.
  - Use content variables for static content outside render functions.
  - Wrap client components in Suspense with fallback.
  - Use dynamic loading for non-critical components.
  - Optimize images: WebP format, size data, lazy loading.
  - Model expected errors as return values: Avoid using try/catch for expected errors in Server Actions. Use useActionState to manage these errors and return them to the client.
  - Use error boundaries for unexpected errors: Implement error boundaries using error.tsx and global-error.tsx files to handle unexpected errors and provide a fallback UI.
  - Use useActionState with react-hook-form for form validation.
  - Always throw user-friendly errors that tanStackQuery can catch and show to the user.
  - Use the `useActionState` hook to manage form state and errors.

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

## 8. Recent Implementation Insights

### Infinite Loop Prevention
- **JiraContext useCallback Dependencies**: All fetch functions (fetchProjects, fetchSprints, fetchTasks) are wrapped in useCallback with proper dependencies to prevent infinite re-renders
- **Automatic Initialization Disabled**: JiraContext no longer automatically initializes on mount to prevent unwanted API calls

### LocalStorage Data Management
- **Storage Keys**: 
  - Projects: `'jiraProjects'`
  - Sprints: `'jiraSprints-{projectKey}'`
  - Tasks: `'jiraTasks-{sprintId}'`
- **Dashboard Loading**: Dashboard loads cached data from localStorage instead of making API calls on every render
- **Persistence**: SprintSelector remembers selected project (`'selectedProjectKey'`) and sprint (`'selectedSprintId'`) across page refreshes

### Carryover Task Classification
- **Detection Logic**: Tasks are carryover if they existed in sprints with start dates before the current sprint's start date
- **Implementation Location**: Carryover detection happens in edge function's `transformIssueData` function during data fetching
- **Helper Function**: `src/helpers/is-carryover.ts` provides carryover determination logic
- **Force Update**: "Actualizar desde Jira" button calls `forceUpdate` with `sprintId` parameter and `force=true` to recalculate carryover status

### KPI and Configuration
- **KPI Calculation**: KPIs calculated from localStorage config values (`kpi_weightStoryPoints`, etc.) and cached per sprint
- **Netlify Functions**: 
  - `jira-config.ts` handles GET/POST requests for Jira configuration with in-memory storage
  - `jira-proxy.ts` edge function handles API calls with carryover classification
- **Sprint History**: Extracted from Jira changelog to determine task carryover status

## 9. Key Files and Their Responsibilities
- **JiraContext.tsx**: Main context provider with fetchProjects, fetchSprints, fetchTasks functions; loads cached data from localStorage; forceUpdate function accepts sprintId parameter
- **SprintSelector.tsx**: Project and sprint selector dropdowns that persist selections in localStorage
- **DashboardPage.tsx**: Dashboard component using JiraContext data, calculating new vs carryover tasks, displaying assignee stats with KPIs
- **jira-config.ts**: Netlify function handling Jira configuration with in-memory storage
- **jira-proxy.ts**: Edge function handling Jira API calls with carryover classification logic
- **netlify.toml**: Configuration file with redirects mapping API endpoints to functions and edge functions

# Folder and File Structure

Estructura Visual del Proyecto Monorepo
code
Code
mi-proyecto-netlify/
│
├── .gitignore
├── package.json          # Gestiona los "workspaces" de todo el monorepo
└── netlify.toml          # (Opcional) Configuración global de Netlify
│
├── apps/                 # Contiene los sitios o aplicaciones que se desplegarán
│   │
│   ├── web-app/          # 👈 Tu aplicación frontend (Ej: React, Vue, Svelte)
│   │   ├── public/
│   │   │   └── index.html
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── App.jsx
│   │   ├── netlify.toml  # 👈 Instrucciones de despliegue para el frontend
│   │   └── package.json
│   │
│   └── api/              # 👈 Tu backend de funciones serverless
│       ├── functions/    # Carpeta donde Netlify busca las funciones
│       │   ├── get-products.js
│       │   └── submit-form.js
│       └── package.json
│
└── packages/             # Contiene el código compartido entre las apps
    │
    └── ui-components/    # Un paquete de ejemplo para componentes de UI
    │   ├── src/
    │   │   └── Button.jsx
    │   └── package.json
    │
    └── utils/            # Otro paquete de ejemplo para funciones de utilidad
        ├── src/
        │   └── format-date.js
        └── package.json
Resumen de cada parte:
Raíz del proyecto (/): Contiene la configuración general para gestionar todo el monorepo (package.json con workspaces) y archivos comunes como .gitignore.
apps/: Es el corazón de lo que se despliega. Cada subcarpeta aquí es un sitio independiente en Netlify.
web-app/: Tu interfaz de usuario, lo que ven los visitantes. Su netlify.toml le dice a Netlify cómo construir y publicar esta parte específica.
api/: Tu lógica de backend. La carpeta functions/ es un estándar de Netlify para encontrar y desplegar tus funciones serverless.
packages/: Es tu "caja de herramientas" interna. Contiene código (componentes, utilidades, etc.) que puedes usar tanto en web-app como en api para no repetir código.
Esta estructura es la recomendada por Netlify porque permite que cada sitio tenga su propia configuración de despliegue, al mismo tiempo que facilita la gestión y el uso de código compartido.