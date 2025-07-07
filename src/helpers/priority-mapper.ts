import type { Task } from "@/data/schema";

export const mapJiraPriority = (jiraPriority: string): Task['priority'] => {
  const priorityMapping: { [key: string]: Task['priority'] } = {
    "Lowest": "low",
    "Low": "low",
    "Medium": "medium",
    "High": "high",
    "Highest": "high",
  };
  return priorityMapping[jiraPriority] || "low";
};
