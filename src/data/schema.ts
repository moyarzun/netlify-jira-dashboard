import { z } from "zod"

// We're keeping a simple non-relational schema here.
// A real app might be more complex and require a relational schema.
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
})

export type Task = z.infer<typeof taskSchema>
