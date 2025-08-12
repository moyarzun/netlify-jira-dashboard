import { z } from "zod";
import type { JiraSprint } from "./jira"; // Assuming JiraSprint is in jira.ts

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
  raw: z.any(), // To store the original raw JSON from Jira
  assignee: z.object({
    name: z.string(),
    avatarUrl: z.string(),
  }).optional(),
  storyPoints: z.number().optional(),
  complexity: z.number().optional(),
  closedSprints: z.array(z.any()).optional(), // To track carry-over tasks
  sprintHistory: z.array(z.string()).optional(), // Historial de sprints por changelog
  userType: z.string().optional(), // Tipo de usuario asignado
});

export type Task = z.infer<typeof taskSchema>;

export type IsCarryoverParams = {
  task: Pick<Task, 'sprintHistory'>;
  selectedSprint: JiraSprint | null;
  allSprints: JiraSprint[];
};

export type MenuItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[]; // Added for nested menu items
};
