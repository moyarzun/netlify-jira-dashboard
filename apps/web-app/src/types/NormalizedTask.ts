// Tipos para normalización de issues y tareas


export interface NormalizedTask {
  id: string
  key: string
  summary: string
  issueType: string
  status: {
    id: string
    name: string
  }
  priority: {
    id: string
    name: string
  }
  assignee: {
    accountId: string
    displayName: string
    avatarUrl: string
  } | null
  storyPoints: number
  sprintHistory: Array<{
    id: string
    name: string
    state: string
    startDate?: string
    endDate?: string
  }>
  originalEstimate: number
  timeSpent: number
  remainingEstimate: number
  created: string
  updated: string
  resolutiondate: string
  labels: string[]
  components: string[]
  reporter: string
  creator: string
  comments: number
  parent: string
  project: string
  sprint: string
  epic: string
  url: string
}
