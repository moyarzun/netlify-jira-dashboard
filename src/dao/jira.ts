export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory?: { id: number; name: string };
}

export interface ApiTask {
  id: string;
  title: string;
  status: string;
  label: string;
  priority: string;
  assignee: { accountId: string; name: string; avatarUrl: string; };
  storyPoints: number;
  complexity: number;
  closedSprints?: JiraSprint[];
}

export type ChangelogItem = {
  field: string;
  fieldtype: string;
  from?: string;
  fromString?: string;
  to?: string;
  toString?: string;
};

export type History = {
  id: string;
  author: unknown;
  created: string;
  items: ChangelogItem[];
};

export type IssueWithChangelog = {
  changelog?: {
    histories?: History[];
  };
};
