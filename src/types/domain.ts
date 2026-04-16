import type { AgentStatus } from './index.js';
import type { OpenCodeMessageMeta, OpenCodeSessionRow, OpenCodeTodoRow } from './opencode.js';

export type DashboardSessionStatus = AgentStatus | 'active';

export interface DashboardTodo {
  content: string;
  status: OpenCodeTodoRow['status'];
  priority: string;
  position: number;
  updatedAt: string;
}

export interface DashboardProjectGroup {
  id: string;
  name: string;
  directory: string;
  projectId: string;
  activeSessionCount: number;
  totalSessionCount: number;
}

export interface DashboardSession {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  slug: string;
  directory: string;
  status: DashboardSessionStatus;
  agentLabel: string;
  sessionType: 'root' | 'child' | 'orphan';
  model: string | null;
  provider: string | null;
  variant: string | null;
  cost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  todos: DashboardTodo[];
  raw: OpenCodeSessionRow;
  lastMessage: OpenCodeMessageMeta | null;
}

export interface DashboardSessionTreeNode extends DashboardSession {
  children: DashboardSessionTreeNode[];
}

export interface DashboardOverview {
  totalSessions: number;
  runningSessions: number;
  thinkingSessions: number;
  failedSessions: number;
  idleSessions: number;
  completedSessions: number;
  activeProjects: number;
}

export interface AgentModelConfigEntry {
  key: string;
  model: string;
  variant?: string | null;
}

export interface DashboardConfigSnapshot {
  openAgentPath: string;
  opencodePath: string;
  omoPath: string;
  agents: AgentModelConfigEntry[];
  categories: AgentModelConfigEntry[];
  providers: string[];
  providerModels?: Record<string, string[]>;
  providerDetails?: Record<string, { name: string; npm: string; baseURL: string; apiKeyMasked: string }>;
}
