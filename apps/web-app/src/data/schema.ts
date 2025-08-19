import { z } from "zod"

// We're keeping a simple non-relational schema here.
// A real app might be more complex and require a relational schema.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
  raw: z.unknown(), // To store the original raw JSON from Jira
  assignee: z.object({
    name: z.string(),
    avatarUrl: z.string(),
  }).optional(),
  storyPoints: z.number().optional(),
  complexity: z.number().optional(),
  closedSprints: z.array(z.unknown()).optional(), // To track carry-over tasks
  sprintHistory: z.array(z.string()).optional(), // Historial de sprints por changelog
  userType: z.string().optional(), // Tipo de usuario asignado
})

export interface Task {
  id: string
  title: string
  status: string
  label: string
  priority: string
  raw?: unknown
  assignee?: {
    name: string
    avatarUrl: string
  }
  storyPoints?: number
  complexity?: number
  closedSprints?: unknown[]
  sprintHistory?: string[]
  userType?: string
}


