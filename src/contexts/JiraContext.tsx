"use client";

import { createContext, useState, useMemo, useCallback, useEffect } from 'react';

const JiraContext = createContext<Record<string, unknown>>({});
export { JiraContext };
import { mapJiraIssueType } from '@/helpers/issue-type-mapper';
import { mapJiraPriority } from '@/helpers/priority-mapper';
import { mapJiraStatus } from '@/helpers/status-mapper';
import { getAllSprintIdsFromChangelog } from '@/helpers/sprint-history';
import type { IssueWithChangelog } from '@/helpers/sprint-history';
import { isCarryover } from '@/helpers/is-carryover';
import { calculateAssigneeStats, calculateTotalStoryPointsTarget, calculateTotalTasksTarget, calculateSprintAverageComplexityTarget, calculateWeightsSum, areWeightsValid } from '@/lib/metrics';

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

// ...eliminado: tipo no usado...

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

// ...existing code...

// Definir tipo para stats por sprint y desarrollador
type AssigneeSprintStats = Record<string, Record<string, { qaRework: number; delaysMinutes: number }>>;

// Utilidad local para obtener valores de KPI desde localStorage
const getKpiNumber = (key: string, fallback: number): number => {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(key);
  return v !== null && !isNaN(Number(v)) ? Number(v) : fallback;
};

export const JiraProvider = ({ children }: { children: React.ReactNode }) => {
  // Estado para mensajes de log de carga
  const [logMessages, setLogMessages] = useState<string[]>([]);
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
      const storedUsers = JSON.parse(window.localStorage.getItem('users') || '{}');
      const updatedUsers = { ...storedUsers };
      rawTasks.forEach(task => {
        if (task.assignee) {
          const userId = task.assignee.accountId || task.assignee.name;
          if (userId && !updatedUsers[userId]) {
            updatedUsers[userId] = {
              name: task.assignee.name || userId,
              avatarUrl: task.assignee.avatarUrl,
            };
          }
        }
        if (task.id) {
          window.localStorage.setItem(`lastSync_${task.id}`, new Date().toISOString());
        }
      });
      setUsers(updatedUsers);
      window.localStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log("JiraContext: rawTasks updated, newUsers:", JSON.stringify(updatedUsers, null, 2));
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

  const toggleUserActivation = useCallback((userId: string) => {
    setActiveUsers(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

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

  const setUserType = useCallback((userId: string, userType: string) => {
    setUserTypes(prev => ({
      ...prev,
      [userId]: userType,
    }));
  }, []);

  const [assigneeStatsBySprint, setAssigneeStatsBySprint] = useState<AssigneeSprintStats>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem('assigneeStatsBySprint');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('assigneeStatsBySprint', JSON.stringify(assigneeStatsBySprint));
    } catch (e) {
      console.error('Error guardando assigneeStatsBySprint:', e);
    }
  }, [assigneeStatsBySprint]);

  const setAssigneeSprintStat = useCallback((sprintId: string, assigneeId: string, field: 'qaRework' | 'delaysMinutes', value: number) => {
    setAssigneeStatsBySprint((prev: AssigneeSprintStats) => {
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

  useEffect(() => { localStorage.setItem('kpi_sprintQuality', String(sprintQuality)); }, [sprintQuality]);
  useEffect(() => { localStorage.setItem('kpi_historicalReworkRate', String(historicalReworkRate)); }, [historicalReworkRate]);
  useEffect(() => { localStorage.setItem('kpi_perfectWorkKpiLimit', String(perfectWorkKpiLimit)); }, [perfectWorkKpiLimit]);
  useEffect(() => { localStorage.setItem('kpi_weightStoryPoints', String(weightStoryPoints)); }, [weightStoryPoints]);
  useEffect(() => { localStorage.setItem('kpi_weightTasks', String(weightTasks)); }, [weightTasks]);
  useEffect(() => { localStorage.setItem('kpi_weightComplexity', String(weightComplexity)); }, [weightComplexity]);
  useEffect(() => { localStorage.setItem('kpi_weightRework', String(weightRework)); }, [weightRework]);
  useEffect(() => { localStorage.setItem('kpi_weightDelays', String(weightDelays)); }, [weightDelays]);
  useEffect(() => { localStorage.setItem('kpi_reworkKpiUpperLimit', String(reworkKpiUpperLimit)); }, [reworkKpiUpperLimit]);

  const normalizedTasks = useMemo(() => {
    return rawTasks.map(task => {
      const sprintHistory = getAllSprintIdsFromChangelog(task as IssueWithChangelog) || [];
      const assignee = task.assignee;
      const userId = assignee?.accountId || assignee?.name;
      const userType = userId ? userTypes[userId] || "Sin tipo" : "Sin tipo";
      return {
        ...task,
        status: mapJiraStatus(task.status, false),
        priority: mapJiraPriority(task.priority),
        label: mapJiraIssueType(task.label),
        sprintHistory,
        userType,
      };
    });
  }, [rawTasks, userTypes]);

  const filteredTasks = useMemo(() => {
    const selectedSprintId = sprintInfo?.id?.toString();
    const sprintsList = sprints.map((s, idx) => ({ id: s.id.toString(), sequence: idx }));
    return normalizedTasks.filter(task => {
      if (!selectedSprintId) return true;
      return !isCarryover({ task, selectedSprintId, sprints: sprintsList });
    });
  }, [normalizedTasks, sprintInfo, sprints]);

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
  }, [addLogMessage]);

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
      setSelectedProjectKey(projectKey);
      addLogMessage("Sprints obtenidos correctamente para el proyecto: " + projectKey);
    } catch (err: unknown) {
      addLogMessage("Error al obtener sprints: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido al obtener los sprints.");
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }, [addLogMessage]);

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
      if (data.fromCache === true) {
        addLogMessage("Datos obtenidos desde caché.");
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
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];
      console.log('fetchTasks: issues (id, assignee):', (issues as ApiTask[]).map((t: ApiTask) => ({ id: t.id, assignee: t.assignee })));
      const usuariosUnicos = Array.from(new Set((issues as ApiTask[]).map((t: ApiTask) => t.assignee?.accountId).filter(Boolean)));
      console.log('fetchTasks: usuarios únicos detectados:', usuariosUnicos);
      if (usuariosUnicos.length === 0) {
        console.warn('fetchTasks: No se detectaron usuarios asignados en las tareas.');
      }
      setRawTasks(issues);
      addLogMessage("Tareas obtenidas correctamente para el sprint: " + sprintId);
      console.log("JiraContext: rawTasks:", JSON.stringify(issues, null, 2));
    } catch (err: unknown) {
      addLogMessage("Error al obtener tareas: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido al obtener las tareas.");
      setRawTasks([]);
    } finally {
      setLoading(false);
    }
  }, [sprints, addLogMessage]);

  const forceUpdate = useCallback(async (sprintId: number) => {
    setLoading(true);
    setLogMessages([]);
    addLogMessage("Forzando actualización de tareas para el sprint: " + sprintId);
    setError(null);
    try {
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
      const issues = data.issues && Array.isArray(data.issues.issues)
        ? data.issues.issues
        : Array.isArray(data.issues)
        ? data.issues
        : [];
      setRawTasks(issues);
      addLogMessage("Tareas actualizadas correctamente para el sprint: " + sprintId);
      const selectedSprint = sprints.find(s => s.id === sprintId);
      setSprintInfo(selectedSprint || null);
    } catch (err: unknown) {
      addLogMessage("Error durante la actualización forzada: " + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error) setError(err.message);
      else setError("Ocurrió un error desconocido durante la actualización forzada.");
      setRawTasks([]);
    } finally {
      setLoading(false);
    }
  }, [sprints, addLogMessage]);

  const clearTasks = useCallback(() => {
    setRawTasks([]);
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
    const sprintId = sprintInfo?.id?.toString() || '';
    return calculateAssigneeStats(filteredTasks, assigneeStatsBySprint, sprintId, activeUsers, users);
  }, [filteredTasks, assigneeStatsBySprint, sprintInfo, activeUsers, users]);

  const totalStoryPointsTarget = useMemo(() => calculateTotalStoryPointsTarget(filteredTasks), [filteredTasks]);
  const totalTasksTarget = useMemo(() => calculateTotalTasksTarget(filteredTasks), [filteredTasks]);
  const sprintAverageComplexityTarget = useMemo(() => calculateSprintAverageComplexityTarget(totalStoryPointsTarget, totalTasksTarget), [totalStoryPointsTarget, totalTasksTarget]);

  const weightsSum = useMemo(() => calculateWeightsSum({
    storyPoints: weightStoryPoints,
    tasks: weightTasks,
    complexity: weightComplexity,
    rework: weightRework,
    delays: weightDelays
  }), [weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays]);
  const weightsAreValid = useMemo(() => areWeightsValid(weightsSum), [weightsSum]);

  const value = useMemo(() => ({
    projects,
    sprints,
    tasks: normalizedTasks,
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
  }), [
    projects,
    sprints,
    filteredTasks,
    normalizedTasks,
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
}

// ...eliminado: exportación duplicada...
