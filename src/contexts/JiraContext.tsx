"use client";

import { createContext, useState, useMemo, useCallback, type ReactNode, useEffect } from 'react';
import type { Task } from '@/data/schema';
import { mapJiraIssueType } from '@/helpers/issue-type-mapper';
import { mapJiraPriority } from '@/helpers/priority-mapper';
import { mapJiraStatus } from '@/helpers/status-mapper';
import { getAllSprintIdsFromChangelog } from '@/helpers/sprint-history';
import type { IssueWithChangelog } from '@/helpers/sprint-history';
import { isCarryover } from '@/helpers/is-carryover';

// Define interfaces
export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
}

interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
}

// Raw task format from our API before normalization
interface ApiTask {
  id: string;
  title: string;
  status: string;
  label: string;
  priority: string;
  assignee: { name: string; avatarUrl: string; };
  storyPoints: number;
  complexity: number;
  closedSprints?: JiraSprint[]; // Use specific type
}

interface JiraContextType {
  projects: JiraProject[];
  sprints: JiraSprint[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  sprintInfo: JiraSprint | null;
  uniqueStatuses: string[];
  assigneeStats: AssigneeStat[];
  fetchProjects: () => Promise<void>;
  fetchSprints: (projectKey: string) => Promise<void>;
  fetchTasks: (sprintId: number) => Promise<void>;
  forceUpdate: (sprintId: number) => Promise<void>;
  clearTasks: () => void;
  clearSprints: () => void;
  getRawTaskById: (id: string) => ApiTask | undefined; // Add this function
  excludeCarryover: boolean;
  setExcludeCarryover: (value: boolean) => void;
  treatReviewDoneAsDone: boolean;
  setTreatReviewDoneAsDone: (value: boolean) => void;
}

const JiraContext = createContext<JiraContextType | undefined>(undefined);

// Helper to get initial state from localStorage
const getInitialState = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage for key "${key}":`, error);
    return defaultValue;
  }
};

export const JiraProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [rawTasks, setRawTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintInfo, setSprintInfo] = useState<JiraSprint | null>(null);

  // Initialize state from localStorage or use default
  const [excludeCarryover, setExcludeCarryover] = useState<boolean>(
    () => getInitialState('excludeCarryover', false)
  );
  const [treatReviewDoneAsDone, setTreatReviewDoneAsDone] = useState<boolean>(
    () => getInitialState('treatReviewDoneAsDone', false)
  );

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('excludeCarryover', JSON.stringify(excludeCarryover));
    } catch (error) {
      console.error('Failed to save excludeCarryover state to localStorage:', error);
    }
  }, [excludeCarryover]);

  useEffect(() => {
    try {
      window.localStorage.setItem('treatReviewDoneAsDone', JSON.stringify(treatReviewDoneAsDone));
    } catch (error) {
      console.error('Failed to save treatReviewDoneAsDone state to localStorage:', error);
    }
  }, [treatReviewDoneAsDone]);

  // Memoize normalized tasks to re-process only when rawTasks or mapping options change
  const normalizedTasks = useMemo(() => {
    return rawTasks.map(task => {
      // Cast seguro para obtener sprintHistory
      const sprintHistory = getAllSprintIdsFromChangelog(task as IssueWithChangelog) || [];
      return {
        ...task,
        status: mapJiraStatus(task.status, treatReviewDoneAsDone),
        priority: mapJiraPriority(task.priority),
        label: mapJiraIssueType(task.label),
        sprintHistory, // array de strings, nunca undefined
      };
    });
  }, [rawTasks, treatReviewDoneAsDone]);

  const filteredTasks = useMemo(() => {
    if (!excludeCarryover) {
      return normalizedTasks;
    }
    const selectedSprintId = sprintInfo?.id?.toString();
    const closedSprintIds = sprints.filter(s => s.state === "closed").map(s => s.id.toString());
    return normalizedTasks.filter(task => {
      if (!selectedSprintId) return true;
      return !isCarryover({ task, selectedSprintId, closedSprintIds });
    });
  }, [normalizedTasks, excludeCarryover, sprintInfo, sprints]);

  const getRawTaskById = useCallback((id: string): ApiTask | undefined => {
    return rawTasks.find(task => task.id === id);
  }, [rawTasks]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/jira/projects');
      if (!response.ok) {
        const { error: errMessage } = await response.json();
        throw new Error(errMessage || 'Failed to fetch projects.');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred while fetching projects.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSprints = useCallback(async (projectKey: string) => {
    if (!projectKey) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/jira/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey }),
      });
      if (!response.ok) {
        const { error: errMessage } = await response.json();
        throw new Error(errMessage || 'Failed to fetch sprints.');
      }
      const data = await response.json();
      setSprints(data.sprints || []);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred while fetching sprints.");
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (sprintId: number) => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    try {
      const selectedSprint = sprints.find(s => s.id === sprintId);
      setSprintInfo(selectedSprint || null);

      const response = await fetch('/api/jira/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId }),
      });
      if (!response.ok) {
        const { error: errMessage } = await response.json();
        throw new Error(errMessage || 'Failed to fetch tasks.');
      }
      const data = await response.json();
      // Detectar si la respuesta viene de cache o de Jira
      if (data.fromCache === true) {
        console.log('[Jira] Datos obtenidos desde Cache');
      } else if (data.fromJira === true) {
        console.log('[Jira] Datos obtenidos directamente desde Jira');
      } else {
        console.log('[Jira] Origen de datos no especificado (puede ser Cache o Jira)');
      }
      
      // The user log shows the API returns an object like { issues: { issues: [...], total: ... } }
      // or sometimes just { issues: [...] }. We need to handle both structures.
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];

      setRawTasks(issues);
    } catch (err: unknown) {
      console.error("Error fetching tasks:", err); // Added for better debugging
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred while fetching tasks.");
      setRawTasks([]); // Clear raw tasks on error
    } finally {
      setLoading(false);
    }
  }, [sprints]);

  const forceUpdate = useCallback(async (sprintId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Tell the backend to force-refresh from Jira. The backend will
      // update its cache (Blob) and return the fresh data in the response.
      const response = await fetch(`/api/jira/issues?force=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId }),
      });

      if (!response.ok) {
        const { error: errMessage } = await response.json();
        throw new Error(errMessage || 'Failed to force update tasks.');
      }

      const data = await response.json();
      // Detectar si la respuesta viene de cache o de Jira
      if (data.fromCache === true) {
        console.log('[Jira] Datos obtenidos desde Cache (forceUpdate)');
      } else if (data.fromJira === true) {
        console.log('[Jira] Datos obtenidos directamente desde Jira (forceUpdate)');
      } else {
        console.log('[Jira] Origen de datos no especificado (forceUpdate)');
      }
      console.log("Raw data object from forceUpdate:", data);

      // The user log shows the API returns an object like { issues: { issues: [...], total: ... } }
      // or sometimes just { issues: [...] }. We need to handle both structures.
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];

      setRawTasks(issues);

      // Also update sprintInfo, just like in fetchTasks
      const selectedSprint = sprints.find(s => s.id === sprintId);
      setSprintInfo(selectedSprint || null);

    } catch (err: unknown) {
      console.error("Error during force update:", err);
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred during the force update.");
      setRawTasks([]); // Clear raw tasks on error
    } finally {
      setLoading(false);
    }
  }, [sprints]);

  const clearTasks = useCallback(() => {
    setRawTasks([]); // Clear raw tasks
    setSprintInfo(null);
  }, []);

  const clearSprints = useCallback(() => {
    setSprints([]);
  }, []);

  const uniqueStatuses = useMemo(() => {
    const statuses = filteredTasks.map(task => task.status);
    return [...new Set(statuses)];
  }, [filteredTasks]);

  const assigneeStats = useMemo(() => {
    const stats: { [key: string]: { totalTasks: number; totalStoryPoints: number } } = {};

    filteredTasks.forEach(task => {
      const assigneeName = task.assignee?.name || "Unassigned";
      if (!stats[assigneeName]) {
        stats[assigneeName] = { totalTasks: 0, totalStoryPoints: 0 };
      }
      stats[assigneeName].totalTasks += 1;
      stats[assigneeName].totalStoryPoints += typeof task.storyPoints === "number" && !isNaN(task.storyPoints) ? task.storyPoints : 0;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      totalTasks: data.totalTasks,
      totalStoryPoints: data.totalStoryPoints,
      averageComplexity: data.totalTasks > 0 ? data.totalStoryPoints / data.totalTasks : 0,
    }));
  }, [filteredTasks]);

  // The context value that will be provided to consuming components.
  // It's memoized to prevent unnecessary re-renders of consumers.
  const value = useMemo(() => ({
    projects,
    sprints,
    tasks: filteredTasks,
    loading,
    error,
    sprintInfo,
    uniqueStatuses,
    assigneeStats,
    fetchProjects,
    fetchSprints,
    fetchTasks,
    forceUpdate,
    clearTasks,
    clearSprints,
    getRawTaskById,
    excludeCarryover,
    treatReviewDoneAsDone,
    setExcludeCarryover,
    setTreatReviewDoneAsDone
  }), [
    projects,
    sprints,
    filteredTasks,
    loading,
    error,
    sprintInfo,
    uniqueStatuses,
    assigneeStats,
    fetchProjects,
    fetchSprints,
    fetchTasks,
    forceUpdate,
    clearTasks,
    clearSprints,
    getRawTaskById,
    excludeCarryover,
    treatReviewDoneAsDone,
    setExcludeCarryover,
    setTreatReviewDoneAsDone
  ]);

  return <JiraContext.Provider value={value}>{children}</JiraContext.Provider>;
};

export { JiraContext }; // Export only the context
