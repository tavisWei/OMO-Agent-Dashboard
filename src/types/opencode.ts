export interface OpenCodeProjectRow {
  id: string;
  worktree: string;
  vcs: string | null;
  name: string | null;
  icon_url: string | null;
  icon_color: string | null;
  time_created: number;
  time_updated: number;
  time_initialized: number | null;
  sandboxes: string;
  commands: string | null;
}

export interface OpenCodeSessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  slug: string;
  directory: string;
  title: string;
  version: string;
  share_url: string | null;
  summary_additions: number | null;
  summary_deletions: number | null;
  summary_files: number | null;
  summary_diffs: string | null;
  revert: string | null;
  permission: string | null;
  time_created: number;
  time_updated: number;
  time_compacting: number | null;
  time_archived: number | null;
  workspace_id: string | null;
}

export interface OpenCodeMessageMeta {
  parentID?: string;
  role?: string;
  mode?: string;
  agent?: string;
  variant?: string;
  path?: {
    cwd?: string;
    root?: string;
  };
  cost?: number;
  tokens?: {
    total?: number;
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: {
      read?: number;
      write?: number;
    };
  };
  modelID?: string;
  providerID?: string;
  time?: {
    created?: number;
  };
  [key: string]: unknown;
}

export interface OpenCodeMessageRow {
  id: string;
  session_id: string;
  time_created: number;
  time_updated: number;
  data: string;
  parsed: OpenCodeMessageMeta | null;
}

export type OpenCodeTodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | string;

export interface OpenCodeTodoRow {
  session_id: string;
  content: string;
  status: OpenCodeTodoStatus;
  priority: string;
  position: number;
  time_created: number;
  time_updated: number;
}

export interface OpenCodeSessionQuery {
  activeOnly?: boolean;
  projectId?: string;
  directory?: string;
  days?: number;
  limit?: number;
  offset?: number;
}
