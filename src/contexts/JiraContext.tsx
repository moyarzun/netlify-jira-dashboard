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
  qaRework: number; // Retrabajos de QA
  delaysMinutes: number; // Atrasos (Minutos)
}

// Raw task format from our API before normalization
interface ApiTask {
  id: string;
  title: string;
  status: string;
  label: string;
  priority: string;
  assignee: { accountId: string; name: string; avatarUrl: string; };
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
  assigneeStatsBySprint: AssigneeSprintStats; // Nuevo: stats por sprint y dev
  setAssigneeSprintStat: (
    sprintId: string,
    assigneeId: string,
    field: 'qaRework' | 'delaysMinutes',
    value: number
  ) => void; // Nuevo setter para edición
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
  sprintQuality: number;
  setSprintQuality: (value: number) => void;
  historicalReworkRate: number;
  setHistoricalReworkRate: (value: number) => void;
  perfectWorkKpiLimit: number;
  setPerfectWorkKpiLimit: (value: number) => void;
  weightStoryPoints: number;
  setWeightStoryPoints: (value: number) => void;
  weightTasks: number;
  setWeightTasks: (value: number) => void;
  weightComplexity: number;
  setWeightComplexity: (value: number) => void;
  weightRework: number;
  setWeightRework: (value: number) => void;
  weightDelays: number;
  setWeightDelays: (value: number) => void;
  weightsSum: number;
  weightsAreValid: boolean;
  reworkKpiUpperLimit: number;
  setReworkKpiUpperLimit: (value: number) => void;
  totalStoryPointsTarget: number;
  totalTasksTarget: number;
  sprintAverageComplexityTarget: number;
  selectedProjectKey: string | null; // Add this
  logMessages: string[];
  addLogMessage: (message: string) => void;
  users: Record<string, { name: string; avatarUrl: string; }>;
  activeUsers: Record<string, boolean>;
  toggleUserActivation: (userId: string) => void;
  userTypes: Record<string, string>;
  setUserType: (userId: string, userType: string) => void;
}

// Nueva estructura para stats por sprint y desarrollador
interface AssigneeSprintStats {
  [sprintId: string]: {
    [assigneeId: string]: {
      qaRework: number;
      delaysMinutes: number;
    };
  };
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

// Helper para obtener valor numérico de localStorage con fallback
const getKpiNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(key);
  return v !== null && !isNaN(Number(v)) ? Number(v) : fallback;
};

export const JiraProvider = ({ children }: { children: ReactNode }) => {
  // Estado para mensajes de log de carga
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Función para agregar un mensaje al log
  const addLogMessage = useCallback((message: string) => {
    setLogMessages(prev => [...prev, message]);
  }, []);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [rawTasks, setRawTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintInfo, setSprintInfo] = useState<JiraSprint | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);

  

  // Initialize state from localStorage or use default
  const [excludeCarryover, setExcludeCarryover] = useState<boolean>(
    () => getInitialState('excludeCarryover', false)
  );
  const [treatReviewDoneAsDone, setTreatReviewDoneAsDone] = useState<boolean>(
    () => getInitialState('treatReviewDoneAsDone', false)
  );

  // KPI: valores y setters globales
  const [sprintQuality, setSprintQuality] = useState<number>(() => getKpiNumber('kpi_sprintQuality', 95));
  const [historicalReworkRate, setHistoricalReworkRate] = useState<number>(() => getKpiNumber('kpi_historicalReworkRate', 10));
  const [perfectWorkKpiLimit, setPerfectWorkKpiLimit] = useState<number>(() => getKpiNumber('kpi_perfectWorkKpiLimit', 100));
  const [weightStoryPoints, setWeightStoryPoints] = useState<number>(() => getKpiNumber('kpi_weightStoryPoints', 1));
  const [weightTasks, setWeightTasks] = useState<number>(() => getKpiNumber('kpi_weightTasks', 1));
  const [weightComplexity, setWeightComplexity] = useState<number>(() => getKpiNumber('kpi_weightComplexity', 1));
  const [weightRework, setWeightRework] = useState<number>(() => getKpiNumber('kpi_weightRework', 1));
  const [weightDelays, setWeightDelays] = useState<number>(() => getKpiNumber('kpi_weightDelays', 1));
  const [reworkKpiUpperLimit, setReworkKpiUpperLimit] = useState<number>(() => getKpiNumber('kpi_reworkKpiUpperLimit', 1));

  const [users, setUsers] = useState<Record<string, { name: string; avatarUrl: string; }>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = window.localStorage.getItem('users');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newUsers = { ...users };
      rawTasks.forEach(task => {
        if (task.assignee && task.assignee.accountId && !newUsers[task.assignee.accountId]) {
          newUsers[task.assignee.accountId] = {
            name: task.assignee.name,
            avatarUrl: task.assignee.avatarUrl,
          };
        }
      });
      setUsers(newUsers);
      window.localStorage.setItem('users', JSON.stringify(newUsers));
    }
  }, [rawTasks]);

  const [activeUsers, setActiveUsers] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = window.localStorage.getItem('activeUsers');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
    }
  }, [activeUsers]);

  const toggleUserActivation = (userId: string) => {
    setActiveUsers(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const [userTypes, setUserTypes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = window.localStorage.getItem('userTypes');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('userTypes', JSON.stringify(userTypes));
    }
  }, [userTypes]);

  const setUserType = (userId: string, userType: string) => {
    setUserTypes(prev => ({
      ...prev,
      [userId]: userType,
    }));
  };

  // Estado para stats por sprint y desarrollador
  const [assigneeStatsBySprint, setAssigneeStatsBySprint] = useState<AssigneeSprintStats>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem('assigneeStatsBySprint');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persistir cambios en localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('assigneeStatsBySprint', JSON.stringify(assigneeStatsBySprint));
    } catch (e) {
      console.error('Error guardando assigneeStatsBySprint:', e);
    }
  }, [assigneeStatsBySprint]);

  // Setter para actualizar stats de un desarrollador en un sprint
  const setAssigneeSprintStat = useCallback((sprintId: string, assigneeId: string, field: 'qaRework' | 'delaysMinutes', value: number) => {
    setAssigneeStatsBySprint(prev => {
      const prevSprint = prev[sprintId] || {};
      const prevAssignee = prevSprint[assigneeId] || { qaRework: 0, delaysMinutes: 0 };
      return {
        ...prev,
        [sprintId]: {
          ...prevSprint,
          [assigneeId]: {
            ...prevAssignee,
            [field]: value,
          },
        },
      };
    });
  }, []);

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

  // Sincronizar con localStorage
  useEffect(() => { localStorage.setItem('kpi_sprintQuality', String(sprintQuality)); }, [sprintQuality]);
  useEffect(() => { localStorage.setItem('kpi_historicalReworkRate', String(historicalReworkRate)); }, [historicalReworkRate]);
  useEffect(() => { localStorage.setItem('kpi_perfectWorkKpiLimit', String(perfectWorkKpiLimit)); }, [perfectWorkKpiLimit]);
  useEffect(() => { localStorage.setItem('kpi_weightStoryPoints', String(weightStoryPoints)); }, [weightStoryPoints]);
  useEffect(() => { localStorage.setItem('kpi_weightTasks', String(weightTasks)); }, [weightTasks]);
  useEffect(() => { localStorage.setItem('kpi_weightComplexity', String(weightComplexity)); }, [weightComplexity]);
  useEffect(() => { localStorage.setItem('kpi_weightRework', String(weightRework)); }, [weightRework]);
  useEffect(() => { localStorage.setItem('kpi_weightDelays', String(weightDelays)); }, [weightDelays]);
  useEffect(() => { localStorage.setItem('kpi_reworkKpiUpperLimit', String(reworkKpiUpperLimit)); }, [reworkKpiUpperLimit]);

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
    setLogMessages([]);
    addLogMessage("Obteniendo proyectos...");
    setError(null);
    try {
      const response = await fetch('/api/jira/projects');
      if (!response.ok) {
        const { error: errMessage } = await response.json();
        throw new Error(errMessage || 'Failed to fetch projects.');
      }
      const data = await response.json();
      setProjects(data.projects || []);
      addLogMessage("Proyectos obtenidos correctamente.");
    } catch (err: unknown) {
      addLogMessage("Error al obtener proyectos: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido al obtener los proyectos.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSprints = useCallback(async (projectKey: string) => {
    if (!projectKey) return;
    setLoading(true);
    setLogMessages([]);
    addLogMessage("Obteniendo sprints para el proyecto: " + projectKey);
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
      setSelectedProjectKey(projectKey); // Set the selected project key here
      addLogMessage("Sprints obtenidos correctamente para el proyecto: " + projectKey);
    } catch (err: unknown) {
      addLogMessage("Error al obtener sprints: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido al obtener los sprints.");
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (sprintId: number) => {
    if (!sprintId) return;
    setLoading(true);
    setLogMessages([]);
    addLogMessage("Obteniendo tareas para el sprint: " + sprintId);
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
      addLogMessage("Datos obtenidos desde caché.");
        // Guardar el ID del sprint en localStorage como parte de los sprints en caché
        try {
          const cacheKey = 'cachedSprintIds';
          const prev: number[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          if (!prev.includes(sprintId)) {
            const updated = [...prev, sprintId];
            localStorage.setItem(cacheKey, JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Error guardando cachedSprintIds en localStorage', e);
        }
      } else if (data.fromJira === true) {
      addLogMessage("Datos obtenidos directamente desde Jira.");
      } else {
      addLogMessage("Fuente de datos no especificada (puede ser caché o Jira).");
      }
      
      // The user log shows the API returns an object like { issues: { issues: [...], total: ... } }
      // or sometimes just { issues: [...] }. We need to handle both structures.
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];

      setRawTasks(issues);
      addLogMessage("Tareas obtenidas correctamente para el sprint: " + sprintId);

    } catch (err: unknown) {
      addLogMessage("Error al obtener tareas: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido al obtener las tareas.");
      setRawTasks([]); // Clear raw tasks on error
    } finally {
      setLoading(false);
    }
  }, [sprints, selectedProjectKey, fetchSprints]);

  const forceUpdate = useCallback(async (sprintId: number) => {
    setLoading(true);
    setLogMessages([]);
    addLogMessage("Forzando actualización de tareas para el sprint: " + sprintId);
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

      // The user log shows the API returns an object like { issues: { issues: [...], total: ... } }
      // or sometimes just { issues: [...] }. We need to handle both structures.
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];

      setRawTasks(issues);
      addLogMessage("Tareas actualizadas correctamente para el sprint: " + sprintId);

      // Also update sprintInfo, just like in fetchTasks
      const selectedSprint = sprints.find(s => s.id === sprintId);
      setSprintInfo(selectedSprint || null);

    } catch (err: unknown) {
      addLogMessage("Error durante la actualización forzada: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido durante la actualización forzada.");
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
      const assignee = task.assignee;
      if (!assignee || activeUsers[assignee.accountId] === false) {
        return; // Skip inactive users or tasks without assignee
      }

      if (!stats[assignee.accountId]) {
        stats[assignee.accountId] = { totalTasks: 0, totalStoryPoints: 0 };
      }
      stats[assignee.accountId].totalTasks += 1;
      stats[assignee.accountId].totalStoryPoints += typeof task.storyPoints === "number" && !isNaN(task.storyPoints) ? task.storyPoints : 0;
    });

    const sprintId = sprintInfo?.id?.toString() || '';
    return Object.entries(stats).map(([accountId, data]) => {
      const sprintStats = assigneeStatsBySprint[sprintId]?.[accountId] || { qaRework: 0, delaysMinutes: 0 };
      return {
        name: users[accountId]?.name || "Unassigned",
        totalTasks: data.totalTasks,
        totalStoryPoints: data.totalStoryPoints,
        averageComplexity: data.totalTasks > 0 ? data.totalStoryPoints / data.totalTasks : 0,
        qaRework: sprintStats.qaRework,
        delaysMinutes: sprintStats.delaysMinutes,
      };
    });
  }, [filteredTasks, assigneeStatsBySprint, sprintInfo, activeUsers, users]);

  // Calculate total story points and total tasks for the current sprint
  const totalStoryPointsTarget = useMemo(() => {
    const totalStoryPoints = filteredTasks.reduce((acc, task) => acc + (typeof task.storyPoints === "number" && !isNaN(task.storyPoints) ? task.storyPoints : 0), 0);
    return totalStoryPoints / 2;
  }, [filteredTasks]);

  const totalTasksTarget = useMemo(() => {
    return filteredTasks.length / 2;
  }, [filteredTasks]);

  const sprintAverageComplexityTarget = useMemo(() => {
    return totalTasksTarget > 0 ? totalStoryPointsTarget / totalTasksTarget : 0;
  }, [totalStoryPointsTarget, totalTasksTarget]);

  // Validación: suma de ponderaciones debe ser exactamente 100
  const weightsSum = useMemo(() => {
    return weightStoryPoints + weightTasks + weightComplexity + weightRework + weightDelays;
  }, [weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays]);

  const weightsAreValid = useMemo(() => weightsSum === 100, [weightsSum]);

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
    assigneeStatsBySprint, // Exponer para modales
    setAssigneeSprintStat, // Setter para edición
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
    setTreatReviewDoneAsDone,
    sprintQuality,
    setSprintQuality,
    historicalReworkRate,
    setHistoricalReworkRate,
    perfectWorkKpiLimit,
    setPerfectWorkKpiLimit,
    weightStoryPoints,
    setWeightStoryPoints,
    weightTasks,
    setWeightTasks,
    weightComplexity,
    setWeightComplexity,
    weightRework,
    setWeightRework,
    weightDelays,
    setWeightDelays,
    weightsSum, // suma total de ponderaciones
    weightsAreValid, // booleano de validez
    reworkKpiUpperLimit,
    setReworkKpiUpperLimit,
    totalStoryPointsTarget,
    totalTasksTarget,
    sprintAverageComplexityTarget,
        selectedProjectKey,
        logMessages,
        addLogMessage,
        users,
        activeUsers,
        toggleUserActivation,
        userTypes,
        setUserType,
  }), [
    projects,
    sprints,
    filteredTasks,
    loading,
    error,
    sprintInfo,
    uniqueStatuses,
    assigneeStats,
    assigneeStatsBySprint,
    setAssigneeSprintStat,
    fetchProjects,
    fetchSprints,
    fetchTasks,
    forceUpdate,
    clearTasks,
    clearSprints,
    getRawTaskById,
    excludeCarryover,
    treatReviewDoneAsDone,
    sprintQuality,
    setSprintQuality,
    historicalReworkRate,
    setHistoricalReworkRate,
    perfectWorkKpiLimit,
    setPerfectWorkKpiLimit,
    weightStoryPoints,
    setWeightStoryPoints,
    weightTasks,
    setWeightTasks,
    weightComplexity,
    setWeightComplexity,
    weightRework,
    setWeightRework,
    weightDelays,
    setWeightDelays,
    weightsSum,
    weightsAreValid,
    reworkKpiUpperLimit,
    setReworkKpiUpperLimit,
    totalStoryPointsTarget,
    totalTasksTarget,
    sprintAverageComplexityTarget,
    selectedProjectKey,
    logMessages,
    addLogMessage,
    users,
    activeUsers,
    toggleUserActivation,
    userTypes,
    setUserType,
  ]);

  return <JiraContext.Provider value={value}>{children}</JiraContext.Provider>;
};

export { JiraContext }; // Export only the context
