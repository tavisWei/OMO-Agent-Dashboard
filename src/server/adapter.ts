import type { AgentStatus } from '../types/index.js';
import type { DashboardOverview, DashboardProjectGroup, DashboardSession, DashboardSessionTreeNode, DashboardTodo } from '../types/domain.js';
import type { OpenCodeMessageRow, OpenCodeProjectRow, OpenCodeSessionRow, OpenCodeTodoRow } from '../types/opencode.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

function toIso(timestamp: number | null | undefined): string | null {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

export function inferSessionStatus(
  session: OpenCodeSessionRow,
  todos: OpenCodeTodoRow[],
  messages: OpenCodeMessageRow[],
): AgentStatus {
  const lastMessage = messages[0];
  const parsed = lastMessage?.parsed ?? null;
  const lastMessageTime = lastMessage?.parsed?.time?.created ?? lastMessage?.time_created ?? null;
  const isRecentlyActive = (
    (typeof lastMessageTime === 'number' && Date.now() - lastMessageTime <= ACTIVE_WINDOW_MS) ||
    Date.now() - session.time_updated <= ACTIVE_WINDOW_MS
  );

  const inputTokens = parsed?.tokens?.input ?? 0;
  const outputTokens = parsed?.tokens?.output ?? 0;
  const reasoningTokens = parsed?.tokens?.reasoning ?? 0;
  const totalTokens = parsed?.tokens?.total ?? inputTokens + outputTokens + reasoningTokens;

  if (todos.some((todo) => todo.status === 'failed' || todo.status === 'cancelled')) {
    return 'error';
  }

  if (todos.some((todo) => todo.status === 'in_progress')) {
    return isRecentlyActive ? 'running' : 'queued';
  }

  if (todos.length === 0) {
    if (!isRecentlyActive) return 'completed';

    // Infer from last message role for single-task sessions
    const role = parsed?.role;
    const finishReason = parsed?.finish_reason ?? parsed?.finish;
    const hasToolCalls = parsed?.tool_calls && parsed.tool_calls.length > 0;

    if (role === 'user') return 'running';
    if (role === 'tool') return 'running';
    if (role === 'assistant') {
      if (finishReason === 'stop' && totalTokens > 0) return 'completed';
      if (hasToolCalls) return 'running';
      if (totalTokens === 0 && isRecentlyActive) return 'running';
      if (totalTokens > 0 && !finishReason) return 'running';
      return 'queued';
    }

    return 'queued';
  }

  if (todos.length > 0 && todos.every((todo) => todo.status === 'completed')) {
    if (isRecentlyActive && parsed?.role === 'assistant' && !parsed?.finish && !parsed?.finish_reason) {
      return 'running';
    }
    return 'completed';
  }

  if (todos.every((todo) => todo.status === 'pending') && isRecentlyActive) {
    return 'thinking';
  }

  return 'queued';
}

export function toDashboardTodos(todos: OpenCodeTodoRow[]): DashboardTodo[] {
  return todos
    .slice()
    .sort((left, right) => left.position - right.position || left.time_created - right.time_created)
    .map((todo) => ({
      content: todo.content,
      status: todo.status,
      priority: todo.priority,
      position: todo.position,
      updatedAt: new Date(todo.time_updated).toISOString(),
    }));
}

export function toDashboardSession(
  session: OpenCodeSessionRow,
  todos: OpenCodeTodoRow[],
  messages: OpenCodeMessageRow[],
  lastMessageText: string | null = null,
): DashboardSession {
  const lastMessage = messages[0] ?? null;
  const parsed = lastMessage?.parsed ?? null;
  const status = inferSessionStatus(session, todos, messages);
  const parentId = session.parent_id;

  const inputTokens = parsed?.tokens?.input ?? 0;
  const outputTokens = parsed?.tokens?.output ?? 0;
  const reasoningTokens = parsed?.tokens?.reasoning ?? 0;
  const totalTokens = parsed?.tokens?.total ?? inputTokens + outputTokens + reasoningTokens;

  return {
    id: session.id,
    projectId: session.project_id,
    parentId,
    title: session.title,
    slug: session.slug,
    directory: session.directory,
    status,
    agentLabel: parsed?.mode ?? parsed?.agent ?? 'unknown',
    sessionType: parentId ? 'child' : 'root',
    model: parsed?.modelID ?? null,
    provider: parsed?.providerID ?? null,
    variant: parsed?.variant ?? null,
    cost: parsed?.cost ?? 0,
    totalTokens,
    inputTokens,
    outputTokens,
    reasoningTokens,
    lastMessageAt: toIso(parsed?.time?.created ?? lastMessage?.time_created),
    createdAt: new Date(session.time_created).toISOString(),
    updatedAt: new Date(session.time_updated).toISOString(),
    todos: toDashboardTodos(todos),
    raw: session,
    lastMessage: parsed,
    lastMessageText,
  };
}

export function toSessionTree(sessions: DashboardSession[]): DashboardSessionTreeNode[] {
  const map = new Map<string, DashboardSessionTreeNode>();
  sessions.forEach((session) => {
    map.set(session.id, { ...session, children: [] });
  });

  const roots: DashboardSessionTreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
      return;
    }

    if (node.parentId && !map.has(node.parentId)) {
      node.sessionType = 'orphan';
    }
    roots.push(node);
  });

  return roots.sort((left, right) => right.raw.time_updated - left.raw.time_updated);
}


const STATUS_PRIORITY: Record<string, number> = {
  error: 7,
  running: 6,
  thinking: 5,
  queued: 4,
  idle: 3,
  completed: 2,
  stopped: 1,
  offline: 0,
};

function getPriority(status: string): number {
  return STATUS_PRIORITY[status] ?? 0;
}

function getMostActiveStatus(statuses: string[]): string {
  if (statuses.length === 0) return 'completed';
  return statuses.reduce((best, current) =>
    getPriority(current) > getPriority(best) ? current : best,
  );
}

function collectTreeStatuses(node: DashboardSessionTreeNode): string[] {
  const statuses: string[] = [node.status];
  for (const child of node.children) {
    statuses.push(...collectTreeStatuses(child));
  }
  return statuses;
}

export function aggregateTreeStatuses(roots: DashboardSessionTreeNode[]): void {
  for (const root of roots) {
    const allStatuses = collectTreeStatuses(root);
    const aggregated = getMostActiveStatus(allStatuses);
    if (aggregated !== root.status) {
      root.status = aggregated as AgentStatus;
    }
  }
}

export function toProjectGroups(
  sessions: DashboardSession[],
  projects: OpenCodeProjectRow[],
): DashboardProjectGroup[] {
  const sessionCounts = new Map<string, { active: number; total: number; projectId: string }>();

  sessions.forEach((session) => {
    const current = sessionCounts.get(session.directory) ?? { active: 0, total: 0, projectId: session.projectId };
    current.total += 1;
    if (session.status === 'running' || session.status === 'thinking') {
      current.active += 1;
    }
    sessionCounts.set(session.directory, current);
  });

  return Array.from(sessionCounts.entries()).map(([directory, counts]) => {
    const matchingProject = projects.find((project) => project.id === counts.projectId);
    const derivedName = matchingProject?.name || directory.split('/').filter(Boolean).pop() || directory;

    return {
      id: directory,
      name: derivedName,
      directory,
      projectId: counts.projectId,
      activeSessionCount: counts.active,
      totalSessionCount: counts.total,
    };
  }).sort((left, right) => right.activeSessionCount - left.activeSessionCount || left.name.localeCompare(right.name));
}

export function toOverview(sessions: DashboardSession[], projectGroups: DashboardProjectGroup[]): DashboardOverview {
  return {
    totalSessions: sessions.length,
    runningSessions: sessions.filter((session) => session.status === 'running').length,
    thinkingSessions: sessions.filter((session) => session.status === 'thinking').length,
    failedSessions: sessions.filter((session) => session.status === 'error').length,
    idleSessions: sessions.filter((session) => session.status === 'idle').length,
    queuedSessions: sessions.filter((session) => session.status === 'queued').length,
    completedSessions: sessions.filter((session) => session.status === 'completed').length,
    activeProjects: projectGroups.filter((project) => project.activeSessionCount > 0).length,
  };
}
