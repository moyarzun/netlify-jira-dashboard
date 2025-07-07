// Helper para centralizar la lógica de carryover
import type { Task } from '@/data/schema';
import type { JiraSprint } from '@/contexts/JiraContext';

export type IsCarryoverParams = {
  task: Pick<Task, 'sprintHistory'>;
  selectedSprintId: string | undefined;
  closedSprintIds: string[];
};

export const isCarryover = ({ task, selectedSprintId, closedSprintIds }: IsCarryoverParams): boolean => {
  if (!selectedSprintId) return false;
  const { sprintHistory } = task;
  return Array.isArray(sprintHistory)
    && sprintHistory.includes(selectedSprintId)
    && sprintHistory.some(id => closedSprintIds.includes(id) && id !== selectedSprintId);
};
