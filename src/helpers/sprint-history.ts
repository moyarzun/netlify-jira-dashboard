// src/helpers/sprint-history.ts
// Helper para obtener todos los IDs de sprints por los que pasó una tarjeta usando el changelog

export type ChangelogItem = {
  field: string;
  to?: string;
  toString?: string;
};

export type History = {
  items: ChangelogItem[];
};

export type IssueWithChangelog = {
  changelog?: {
    histories?: History[];
  };
};

export const getAllSprintIdsFromChangelog = (issue: IssueWithChangelog): string[] => {
  const sprintIds = new Set<string>();
  issue.changelog?.histories?.forEach(history => {
    history.items.forEach(item => {
      if (item.field === "Sprint" && item.to) {
        item.to.split(",").map(id => id.trim()).forEach(id => {
          if (id) sprintIds.add(id);
        });
      }
    });
  });
  return Array.from(sprintIds);
};
