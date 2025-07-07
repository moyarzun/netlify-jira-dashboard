import type { Task } from "@/data/schema";

// Helper functions (mapping)
export const mapJiraStatus = (jiraStatus: string, treatReviewDoneAsDone: boolean): Task['status'] => {
  if (treatReviewDoneAsDone && jiraStatus === "Review Done") {
    return "done";
  }
  const statusMapping: { [key: string]: Task['status'] } = {
    // English
    "To Do": "todo",
    "In Progress": "in progress",
    "Done": "done",
    "Backlog": "backlog",
    "Canceled": "canceled",
    "Selected for Development": "backlog",
    "In Review": "in progress",
    "Resolved": "done",
    "Closed": "done",
    "Reopened": "todo",
    "Backlog Sprint": "todo",
    "Review Done": "todo",

    // Spanish
    "Por hacer": "todo",
    "En curso": "in progress",
    "Finalizado": "done",
    "Finalizada": "done",
    "Resuelto": "done",
    "Cerrado": "done",
    "Reabierto": "todo",
  };
  return statusMapping[jiraStatus] || "todo"; // Default to 'todo'
};
