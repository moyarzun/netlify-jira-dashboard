export interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  qaRework: number; // Retrabajos de QA
  delaysMinutes: number; // Atrasos (Minutos)
}

export type AssigneeSprintStats = Record<string, Record<string, { qaRework: number; delaysMinutes: number }>>;
