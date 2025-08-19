import type { IssueWithChangelog, JiraSprint } from '../dao/jira';
export type { JiraSprint };

export const getAllSprintIds = (issue: IssueWithChangelog): string[] => {
  const activeSprints = new Set<string>();

  if (!issue.changelog?.histories) {
    return [];
  }

  // Sort histories chronologically
  const sortedHistories = [...issue.changelog.histories].sort((a, b) => {
    return new Date(a.created).getTime() - new Date(b.created).getTime();
  });

  sortedHistories.forEach(history => {
    history.items.forEach(item => {
      if (item.field === "Sprint") {
        // Sprints removed from
        if (item.from) {
          item.from.split(",").map(id => id.trim()).forEach(id => {
            if (id) activeSprints.delete(id);
          });
        }
        // Sprints added to
        if (item.to) {
          item.to.split(",").map(id => id.trim()).forEach(id => {
            if (id) activeSprints.add(id);
          });
        }
      }
    });
  });

  return Array.from(activeSprints);
};

export const getFirstSprint = (issue: IssueWithChangelog, allSprints: JiraSprint[]): string | undefined => {
  if (!issue.changelog?.histories) {
    return undefined;
  }

  const allAssociatedSprintIds = new Set<string>();

  // Collect all sprint IDs the card was ever associated with (added to)
  issue.changelog.histories.forEach(history => {
    history.items.forEach(item => {
      if (item.field === "Sprint" && item.to) {
        item.to.split(",").map(id => id.trim()).forEach(id => {
          if (id) allAssociatedSprintIds.add(id);
        });
      }
    });
  });

  if (allAssociatedSprintIds.size === 0) {
    return undefined; // No sprints associated
  }

  // Filter sprints that are relevant to this issue and have a startDate
  const relevantSprints = allSprints.filter(sprint =>
    allAssociatedSprintIds.has(String(sprint.id)) && sprint.startDate
  );

  if (relevantSprints.length === 0) {
    return undefined; // No relevant sprints with start dates found
  }

  // Sort relevant sprints by startDate to find the oldest
  relevantSprints.sort((a, b) => {
    const dateA = new Date(a.startDate!);
    const dateB = new Date(b.startDate!);
    return dateA.getTime() - dateB.getTime();
  });

  return String(relevantSprints[0].id); // Return the ID of the oldest sprint
};
