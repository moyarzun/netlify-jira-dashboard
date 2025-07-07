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
})

export type Task = z.infer<typeof taskSchema>
