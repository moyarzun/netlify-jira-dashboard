// Helper para centralizar la lógica de carryover
import type { Task } from '@/data/schema';
// import type { JiraSprint } from '@/contexts/JiraContext';

export type IsCarryoverParams = {
  task: Pick<Task, 'sprintHistory'>;
  selectedSprintId: string | undefined;
  sprints: { id: string; sequence: number }[]; // sprints ordenados por secuencia
};

export const isCarryover = ({ task, selectedSprintId, sprints }: IsCarryoverParams): boolean => {
  if (!selectedSprintId || !Array.isArray(task.sprintHistory) || task.sprintHistory.length === 0 || !Array.isArray(sprints)) return false;
  // Buscar la secuencia del sprint consultado
  const sprintMap = Object.fromEntries(sprints.map(s => [s.id, s.sequence]));
  const currentSeq = sprintMap[selectedSprintId];
  if (typeof currentSeq !== 'number') return false;
  // ¿Hay algún sprint en el historial con secuencia menor?
  return task.sprintHistory.some(id => sprintMap[id] !== undefined && sprintMap[id] < currentSeq);
};
