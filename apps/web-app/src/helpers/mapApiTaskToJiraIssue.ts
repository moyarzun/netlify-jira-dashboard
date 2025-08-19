import type { ApiTask } from '../dao/jira'
import type { JiraIssue } from './normalizeJiraIssues'

export function mapApiTaskToJiraIssue(tasks: ApiTask[]): JiraIssue[] {
  return tasks.map(task => ({
    id: task.id,
    key: task.id, // Si existe un campo key real, usarlo
    fields: {
      summary: task.title || '',
      issuetype: { name: 'Task' },
      status: { id: '', name: task.status || '' },
      priority: { id: '', name: task.priority || '' },
      assignee: task.assignee
        ? {
            accountId: task.assignee.accountId,
            displayName: task.assignee.name,
            avatarUrls: { '48x48': task.assignee.avatarUrl },
          }
        : undefined,
      customfield_10004: task.storyPoints || 0,
      customfield_10007: [], // Si hay historial de sprints, mapear aquí
      timetracking: {
        originalEstimateSeconds: 0,
        timespentSeconds: 0,
        remainingEstimateSeconds: 0,
      },
      created: '',
      updated: '',
      resolutiondate: '',
      labels: [task.label],
      components: [],
      reporter: { displayName: '' },
      creator: { displayName: '' },
      comment: { comments: [] },
      parent: { key: '' },
      project: { name: '' },
      sprint: { name: '' },
      customfield_10008: '',
    },
  }))
}
