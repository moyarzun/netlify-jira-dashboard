import type { Task } from "../dao/common";

export interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  qaRework: number;
  delaysMinutes: number;
}

export function calculateAssigneeStats(
  tasks: Task[],
  assigneeStatsBySprint: Record<string, Record<string, { qaRework: number; delaysMinutes: number }>>,
  sprintId: string,
  activeUsers: Record<string, boolean>,
  users: Record<string, { name: string; avatarUrl: string }>
): AssigneeStat[] {
  const stats: Record<string, { totalTasks: number; totalStoryPoints: number }> = {};

  tasks.forEach(task => {
    const assignee = task.assignee;
    if (!assignee || !assignee.name || assignee.name.trim() === '') return;
    const userId = assignee.name;
    if (activeUsers[userId] === false) return;
    if (!stats[userId]) stats[userId] = { totalTasks: 0, totalStoryPoints: 0 };
    stats[userId].totalTasks += 1;
    stats[userId].totalStoryPoints += typeof task.storyPoints === "number" && !isNaN(task.storyPoints) ? task.storyPoints : 0;
  });

  return Object.entries(stats).map(([userId, data]) => {
    const sprintStats = assigneeStatsBySprint[sprintId]?.[userId] || { qaRework: 0, delaysMinutes: 0 };
    return {
      name: users[userId]?.name || userId || "Unassigned",
      totalTasks: data.totalTasks,
      totalStoryPoints: data.totalStoryPoints,
      averageComplexity: data.totalTasks > 0 ? data.totalStoryPoints / data.totalTasks : 0,
      qaRework: sprintStats.qaRework,
      delaysMinutes: sprintStats.delaysMinutes,
    };
  });
}

export function calculateTotalStoryPointsTarget(tasks: Task[]): number {
  const totalStoryPoints = tasks.reduce((acc, task) => acc + (typeof task.storyPoints === "number" && !isNaN(task.storyPoints) ? task.storyPoints : 0), 0);
  return totalStoryPoints / 2;
}

export function calculateTotalTasksTarget(tasks: Task[]): number {
  return tasks.length / 2;
}

export function calculateSprintAverageComplexityTarget(totalStoryPointsTarget: number, totalTasksTarget: number): number {
  return totalTasksTarget > 0 ? totalStoryPointsTarget / totalTasksTarget : 0;
}

export function calculateWeightsSum(weights: { storyPoints: number; tasks: number; complexity: number; rework: number; delays: number }): number {
  return weights.storyPoints + weights.tasks + weights.complexity + weights.rework + weights.delays;
}

export function areWeightsValid(weightsSum: number): boolean {
  return weightsSum === 100;
}
