// Assignee History Middleware

export interface AssigneeHistoryEntry {
  assignee: string;
  assignedDate: string;
  fromAssignee?: string;
}

export const extractAssigneeHistory = (task: any): AssigneeHistoryEntry[] => {
  const assigneeHistory: AssigneeHistoryEntry[] = [];
  
  console.log(`[ASSIGNEE_MIDDLEWARE] Processing task ${task.id}, has changelog:`, !!task.changelog);
  
  if (task.changelog && task.changelog.histories) {
    console.log(`[ASSIGNEE_MIDDLEWARE] Task ${task.id} has ${task.changelog.histories.length} history entries`);
    
    task.changelog.histories.forEach((history: any) => {
      if (history.items) {
        history.items.forEach((item: any) => {
          if (item.field === 'assignee') {
            const assignedDate = history.created;
            const fromAssignee = item.fromString || null;
            const toAssignee = item.toString || null;
            
            console.log(`[ASSIGNEE_MIDDLEWARE] Found assignee change: ${fromAssignee} -> ${toAssignee} on ${assignedDate}`);
            
            if (toAssignee) {
              assigneeHistory.push({
                assignee: toAssignee,
                assignedDate,
                fromAssignee
              });
            }
          }
        });
      }
    });
  } else {
    console.log(`[ASSIGNEE_MIDDLEWARE] Task ${task.id} has no changelog or histories`);
  }
  
  // If task has assignee but no changelog entries, assume created with assignee
  const currentAssignee = task.assignee?.displayName || task.assignee?.name;
  if (currentAssignee && assigneeHistory.length === 0) {
    assigneeHistory.push({
      assignee: currentAssignee,
      assignedDate: task.created || new Date().toISOString(),
      fromAssignee: null
    });
  }
  
  // Sort by date (oldest first)
  assigneeHistory.sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime());
  
  return assigneeHistory;
};

// Middleware function to add assignee history to tasks
export const addAssigneeHistoryMiddleware = (tasks: any[]): any[] => {
  return tasks.map(task => ({
    ...task,
    assigneeHistory: extractAssigneeHistory(task)
  }));
};