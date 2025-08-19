// Sprint Date Filter for KPI calculations
// Heuristic:
// 1. Get startDate and completionDate from selected Sprint
// 2. For the User being calculated, get list of Tasks assigned according to assigneeHistory 
//    between startDate and completionDate of selected Sprint (INCLUSIVE)
// 3. Use this task list to calculate User KPI metrics

export const shouldIncludeTaskForKpi = (
  task: any,
  assigneeName: string,
  sprintStartDate?: string,
  sprintCompleteDate?: string
): boolean => {
  // If no sprint start date available, fallback to original logic (only new tasks)
  if (!sprintStartDate) {
    return task.isCarryover !== true;
  }

  // Check if user was assigned to this task during sprint period
  if (!task.assigneeHistory || !Array.isArray(task.assigneeHistory)) {
    return false;
  }

  const sprintStart = new Date(sprintStartDate);
  const sprintComplete = sprintCompleteDate ? new Date(sprintCompleteDate) : null;

  // Find assignments for this user during sprint period (INCLUSIVE)
  const userAssignmentsDuringSprint = task.assigneeHistory.filter((entry: any) => {
    if (entry.assignee !== assigneeName) return false;
    
    const assignmentDate = new Date(entry.assignedDate);
    // If sprint is open (no completeDate), only check startDate
    if (!sprintComplete) {
      return assignmentDate >= sprintStart;
    }
    // If sprint is closed, check both dates
    return assignmentDate >= sprintStart && assignmentDate <= sprintComplete;
  });

  return userAssignmentsDuringSprint.length > 0;
};

export const getUserKpiTasks = (
  tasks: any[],
  assigneeName: string,
  sprintStartDate?: string,
  sprintCompleteDate?: string
): Array<{taskId: string, assignedDate: string, storyPoints: number}> => {
  if (!sprintStartDate) {
    return tasks
      .filter(task => task.isCarryover !== true && (task.assignee?.displayName === assigneeName || task.assignee?.name === assigneeName))
      .map(task => ({
        taskId: task.id,
        assignedDate: task.created || 'Unknown',
        storyPoints: task.storyPoints || 0
      }));
  }

  const sprintStart = new Date(sprintStartDate);
  const sprintComplete = sprintCompleteDate ? new Date(sprintCompleteDate) : null;
  const kpiTasks: Array<{taskId: string, assignedDate: string, storyPoints: number}> = [];

  console.log(`[DEBUG] Sprint period for ${assigneeName}: ${sprintStartDate} to ${sprintCompleteDate || 'OPEN'}`);
  console.log(`[DEBUG] Sprint dates parsed: ${sprintStart.toISOString()} to ${sprintComplete?.toISOString() || 'OPEN'}`);

  tasks.forEach(task => {
    if (!task.assigneeHistory || !Array.isArray(task.assigneeHistory)) {
      console.log(`[DEBUG] Task ${task.id} has no assigneeHistory`);
      return;
    }

    const userAssignments = task.assigneeHistory.filter((entry: any) => {
      if (entry.assignee !== assigneeName) return false;
      const assignmentDate = new Date(entry.assignedDate);
      const isValid = !isNaN(assignmentDate.getTime());
      
      let isInPeriod = false;
      if (isValid) {
        if (!sprintComplete) {
          // Sprint is open, only check startDate
          isInPeriod = assignmentDate >= sprintStart;
        } else {
          // Sprint is closed, check both dates
          isInPeriod = assignmentDate >= sprintStart && assignmentDate <= sprintComplete;
        }
      }
      
      console.log(`[DEBUG] Task ${task.id} - ${assigneeName}: assignedDate=${entry.assignedDate}, parsed=${assignmentDate.toISOString()}, inPeriod=${isInPeriod}`);
      
      return isInPeriod;
    });

    if (userAssignments.length > 0) {
      const latestAssignment = userAssignments[userAssignments.length - 1];
      kpiTasks.push({
        taskId: task.id,
        assignedDate: latestAssignment.assignedDate,
        storyPoints: task.storyPoints || 0
      });
      console.log(`[DEBUG] Task ${task.id} INCLUDED for ${assigneeName} KPI`);
    } else {
      console.log(`[DEBUG] Task ${task.id} EXCLUDED for ${assigneeName} KPI`);
    }
  });

  return kpiTasks;
};