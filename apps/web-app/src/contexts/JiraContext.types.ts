import type { JiraProject, JiraSprint, JiraStatus, ApiTask, JiraUser } from '../dao/jira'
import type { AssigneeStat, AssigneeSprintStats } from '../dao/kpi'
import type { NormalizedTask } from '../types/NormalizedTask'

export interface JiraContextType {
  projects: JiraProject[];
  sprints: JiraSprint[];
  tasks: NormalizedTask[];
  loading: boolean;
  error: string | null;
  sprintInfo: JiraSprint | null;
  uniqueStatuses: string[];
  assigneeStats: AssigneeStat[];
  assigneeStatsBySprint: AssigneeSprintStats;
  setAssigneeSprintStat: (sprintId: string, assigneeName: string, field: 'qaRework' | 'delaysMinutes', value: number) => void;
  fetchProjects: () => Promise<void>;
  fetchSprints: (projectKey: string) => Promise<void>;
  fetchTasks: (sprintId: number) => Promise<void>;
  forceUpdate: (sprintId: number) => Promise<void>;
  clearTasks: () => void;
  clearSprints: () => void;
  getRawTaskById: (id: string) => ApiTask | undefined;
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
  selectedProjectKey: string | null;
  logMessages: string[];
  users: Record<string, { name: string; avatarUrl: string; }>;
  activeUsers: Record<string, boolean>;
  toggleUserActivation: (accountId: string) => void;
  userTypes: Record<string, string>;
  setUserType: (accountId: string, type: string) => void;
  projectStatuses: JiraStatus[];
  fetchProjectStatuses: (projectKey: string) => Promise<void>;
  fetchUsers: (query?: string) => Promise<JiraUser[]>;
  kpiCardVisibility: Record<string, boolean>;
  toggleKpiCardVisibility: (accountId: string) => void;
  projectsCache: JiraProject[];
  sprintsCache: Record<string, JiraSprint[]>;
  tasksCache: Record<string, ApiTask[]>;
  activeStatuses: Record<string, boolean>;
  toggleStatusActivation: (statusId: string) => void;
  projectUsers: JiraUser[];
  projectUsersCache: Record<string, JiraUser[]>;
}
