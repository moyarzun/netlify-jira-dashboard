// Helper para centralizar la lógica de carryover
import type { Task } from '@/data/schema';
import type { JiraSprint } from './sprint-history';

export type IsCarryoverParams = {
  task: Pick<Task, 'sprintHistory'>;
  selectedSprint: JiraSprint | null;
  allSprints: JiraSprint[];
};

export const isCarryover = ({ task, selectedSprint, allSprints }: IsCarryoverParams): boolean => {
  if (!selectedSprint || !selectedSprint.startDate || !Array.isArray(task.sprintHistory) || task.sprintHistory.length === 0) {
    return false;
  }

  const selectedSprintStartDate = new Date(selectedSprint.startDate);

  const sprintDatesMap = new Map<string, Date>();
  allSprints.forEach(s => {
    if (s.startDate) {
      sprintDatesMap.set(String(s.id), new Date(s.startDate));
    }
  });

  return task.sprintHistory.some(historicalSprintId => {
    const historicalSprintDate = sprintDatesMap.get(historicalSprintId);
    if (historicalSprintDate) {
      return historicalSprintDate.getTime() < selectedSprintStartDate.getTime();
    }
    return false;
  });
};
