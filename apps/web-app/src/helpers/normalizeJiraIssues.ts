// Normaliza los issues de Jira para el dashboard
import type { NormalizedTask } from '../types/NormalizedTask';


export interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    issuetype?: { name?: string }
    status?: { id?: string; name?: string }
    priority?: { id?: string; name?: string }
    assignee?: { accountId: string; displayName: string; avatarUrls?: { [size: string]: string } }
    customfield_10004?: number
    customfield_10007?: JiraSprintHistory[]
    timetracking?: {
      originalEstimateSeconds?: number
      timespentSeconds?: number
      remainingEstimateSeconds?: number
    }
    created: string
    updated: string
    resolutiondate: string
    labels?: string[]
    components?: JiraComponent[]
    reporter?: { displayName?: string }
    creator?: { displayName?: string }
    comment?: { comments?: unknown[] }
    parent?: { key?: string }
    project?: { name?: string }
    sprint?: { name?: string }
    customfield_10008?: string
  }
}

export interface JiraSprintHistory {
  id?: string | number
  name?: string
  state?: string
  startDate?: string
  endDate?: string
}

export interface JiraComponent {
  name: string
}

export function normalizeJiraIssues(issues: JiraIssue[]): NormalizedTask[] {
  if (!issues) return []

  return issues.map((issue) => {
    const issueType = issue.fields.issuetype?.name || 'Unknown'
    const status = {
      id: issue.fields.status?.id || '',
      name: issue.fields.status?.name || 'Unknown',
    }
    const priority = {
      id: issue.fields.priority?.id || '',
      name: issue.fields.priority?.name || 'Unknown',
    }
    const assignee = issue.fields.assignee
      ? {
          accountId: issue.fields.assignee.accountId,
          displayName: issue.fields.assignee.displayName,
          avatarUrl: issue.fields.assignee.avatarUrls?.['48x48'] || '',
        }
      : null
    const storyPoints = issue.fields.customfield_10004 || 0 // Story Points
    const sprintHistory = Array.isArray(issue.fields.customfield_10007)
      ? issue.fields.customfield_10007.map((s: JiraSprintHistory) => ({
          id: s.id ? s.id.toString() : '',
          name: s.name || '',
          state: s.state || '',
          startDate: s.startDate,
          endDate: s.endDate,
        }))
      : []

    return {
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      issueType,
      status,
      priority,
      assignee,
      storyPoints,
      sprintHistory,
      originalEstimate: issue.fields.timetracking?.originalEstimateSeconds || 0,
      timeSpent: issue.fields.timetracking?.timespentSeconds || 0,
      remainingEstimate: issue.fields.timetracking?.remainingEstimateSeconds || 0,
      created: issue.fields.created,
      updated: issue.fields.updated,
      resolutiondate: issue.fields.resolutiondate,
      labels: issue.fields.labels || [],
  components: issue.fields.components?.map((comp: JiraComponent) => comp.name) || [],
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      creator: issue.fields.creator?.displayName || 'Unknown',
      comments: issue.fields.comment?.comments?.length || 0,
      parent: issue.fields.parent?.key || '',
      project: issue.fields.project?.name || 'Unknown',
      sprint: issue.fields.sprint?.name || 'Unknown',
      epic: issue.fields.customfield_10008 || '',
      url: `/browse/${issue.key}`,
    }
  })
}
