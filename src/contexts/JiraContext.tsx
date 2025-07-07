import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import axios from 'axios';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Task } from '@/data/schema';

// Define types
interface JiraSprintField {
  id: number;
  name: string;
  state: string;
  boardId: number;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    issuetype: { name: string };
    priority: { name: string };
    assignee: { displayName: string } | null;
    customfield_10331?: number; // Story Points
    customfield_10020?: JiraSprintField[] | null; // Sprint history (old)
    customfield_10127?: JiraSprintField[] | null; // Sprint field (new)
  };
}

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  sprintId: string;
}

interface SprintInfo {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  goal: string;
}

interface AssigneeStats {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  tasks: Task[];
}

interface JiraContextType {
  tasks: Task[];
  sprintInfo: SprintInfo | null;
  sprints: SprintInfo[];
  isSprintsLoading: boolean;
  formData: JiraConfig;
  setFormData: Dispatch<SetStateAction<JiraConfig>>;
  isLoading: boolean;
  error: string | null;
  uniqueStatuses: string[];
  assigneeStats: AssigneeStats[];
  handleFetchIssues: () => Promise<void>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // New options
  treatReviewDoneAsDone: boolean;
  setTreatReviewDoneAsDone: Dispatch<SetStateAction<boolean>>;
  excludeCarryover: boolean;
  setExcludeCarryover: Dispatch<SetStateAction<boolean>>;
}

// Create context
const JiraContext = createContext<JiraContextType | undefined>(undefined);

// Helper functions (mapping)
const mapJiraStatus = (jiraStatus: string, treatReviewDoneAsDone: boolean): Task['status'] => {
  if (treatReviewDoneAsDone && jiraStatus === "Review Done") {
    return "done";
  }
  const statusMapping: { [key: string]: Task['status'] } = {
    // English
    "To Do": "todo",
    "In Progress": "in progress",
    "Done": "done",
    "Backlog": "backlog",
    "Canceled": "canceled",
    "Selected for Development": "backlog",
    "In Review": "in progress",
    "Resolved": "done",
    "Closed": "done",
    "Reopened": "todo",
    "Backlog Sprint": "todo",
    "Review Done": "todo",

    // Spanish
    "Por hacer": "todo",
    "En curso": "in progress",
    "Finalizado": "done",
    "Finalizada": "done",
    "Resuelto": "done",
    "Cerrado": "done",
    "Reabierto": "todo",
  };
  return statusMapping[jiraStatus] || "todo"; // Default to 'todo'
};

const mapJiraPriority = (jiraPriority: string): Task['priority'] => {
  const priorityMapping: { [key: string]: Task['priority'] } = {
    "Lowest": "low",
    "Low": "low",
    "Medium": "medium",
    "High": "high",
    "Highest": "high",
  };
  return priorityMapping[jiraPriority] || "low";
};

const mapJiraIssueType = (issueType: string): Task['label'] => {
    const labelMapping: { [key: string]: Task['label'] } = {
        "Bug": "bug",
        "Story": "feature",
        "Task": "feature",
        "Improvement": "feature",
        "New Feature": "feature",
        "Documentation": "documentation",
    };
    return labelMapping[issueType] || "feature";
};

// Create provider
export function JiraProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprintInfo, setSprintInfo] = useLocalStorage<SprintInfo | null>("jiraSprintInfo", null);
  const [sprints, setSprints] = useState<SprintInfo[]>([]);
  const [isSprintsLoading, setIsSprintsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uniqueStatuses, setUniqueStatuses] = useState<string[]>([]);
  const [assigneeStats, setAssigneeStats] = useState<AssigneeStats[]>([]);
  const [rawIssues, setRawIssues] = useLocalStorage<JiraIssue[]>("jiraRawIssues", []);

  // Dashboard options
  const [treatReviewDoneAsDone, setTreatReviewDoneAsDone] = useLocalStorage<boolean>(
    "treatReviewDoneAsDone",
    true
  );
  const [excludeCarryover, setExcludeCarryover] = useLocalStorage<boolean>(
    "excludeCarryover",
    false
  );

  const [formData, setFormData] = useLocalStorage<JiraConfig>("jiraConfig", {
    baseUrl: "",
    email: "",
    apiToken: "",
    projectKey: "",
    sprintId: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFetchSprints = useCallback(async () => {
    if (!formData.projectKey || !formData.baseUrl || !formData.email || !formData.apiToken) {
      return;
    }
    setIsSprintsLoading(true);
    try {
      const response = await axios.post(
        "/api/jira/sprints",
        {
          baseUrl: formData.baseUrl,
          email: formData.email,
          apiToken: formData.apiToken,
          projectKey: formData.projectKey,
        }
      );
      setSprints(response.data.sprints);
    } catch (err) {
      // Handle error silently for now, maybe add a toast later
      console.error("Failed to fetch sprints:", err);
      setSprints([]); // Clear sprints on error
    } finally {
      setIsSprintsLoading(false);
    }
  }, [formData.apiToken, formData.baseUrl, formData.email, formData.projectKey]);

  const handleFetchIssues = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/jira/issues", formData);
      const jiraIssues: JiraIssue[] = response.data.issues;
      const sprintInfoData: SprintInfo = response.data.sprintInfo;

      setRawIssues(jiraIssues);
      setSprintInfo(sprintInfoData);

      // Extract unique statuses for debugging - this runs only once on fetch
      const statuses = jiraIssues.map(issue => issue.fields.status.name);
      const unique = [...new Set(statuses)];
      setUniqueStatuses(unique);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setRawIssues([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to process issues whenever rawIssues or options change
  useEffect(() => {
    // 1. Filter issues based on options
    const filteredIssues = rawIssues.filter(issue => {
      // Filter for carryover tasks based on customfield_10127
      if (excludeCarryover) {
        const sprintField = issue.fields.customfield_10127;
        const currentSprintId = parseInt(formData.sprintId, 10);

        if (Array.isArray(sprintField)) {
          const isInCurrentSprint = sprintField.some(s => s.id === currentSprintId);

          // Case 1: NOT Carryover - Only in the current sprint.
          if (sprintField.length === 1 && isInCurrentSprint) {
            return true; // Keep it
          }

          // Case 2: IS Carryover - In current sprint AND others.
          if (sprintField.length > 1 && isInCurrentSprint) {
            return false; // Exclude it
          }
        }
        // Default to keeping the issue if the field is not as expected
        return true;
      }
      return true; // Keep the task if the filter is off.
    });

    // 2. Map to Task format
    const mappedTasks: Task[] = filteredIssues.map((issue) => ({
      id: issue.key,
      title: issue.fields.summary,
      status: mapJiraStatus(issue.fields.status.name, treatReviewDoneAsDone),
      label: mapJiraIssueType(issue.fields.issuetype.name),
      priority: mapJiraPriority(issue.fields.priority.name),
      raw: issue,
    }));
    setTasks(mappedTasks);

    // 3. Calculate stats per assignee from the filtered and mapped tasks
    const stats: { [key: string]: { totalTasks: number; totalStoryPoints: number; tasks: Task[] } } = {};

    mappedTasks.forEach(task => {
      const assigneeName = task.raw.fields.assignee?.displayName || 'Unassigned';
      const storyPoints = task.raw.fields.customfield_10331 || 0;

      if (!stats[assigneeName]) {
        stats[assigneeName] = { totalTasks: 0, totalStoryPoints: 0, tasks: [] };
      }

      stats[assigneeName].totalTasks += 1;
      stats[assigneeName].totalStoryPoints += storyPoints;
      stats[assigneeName].tasks.push(task);
    });

    const calculatedStats: AssigneeStats[] = Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      averageComplexity: data.totalStoryPoints / data.totalTasks || 0,
    }));

    setAssigneeStats(calculatedStats);

  }, [rawIssues, treatReviewDoneAsDone, excludeCarryover, formData.sprintId]);


  // Effect to fetch sprints when projectKey changes
  useEffect(() => {
    handleFetchSprints();
  }, [handleFetchSprints]);

  return (
    <JiraContext.Provider
      value={{
        tasks,
        sprintInfo,
        sprints,
        isSprintsLoading,
        formData,
        setFormData,
        isLoading,
        error,
        uniqueStatuses,
        assigneeStats,
        handleFetchIssues,
        handleInputChange,
        // New options
        treatReviewDoneAsDone,
        setTreatReviewDoneAsDone,
        excludeCarryover,
        setExcludeCarryover,
      }}
    >
      {children}
    </JiraContext.Provider>
  );
}

// Create hook
export const useJira = () => {
  const context = useContext(JiraContext);
  if (context === undefined) {
    throw new Error('useJira must be used within a JiraProvider');
  }
  return context;
}
