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
  const lastMessageTime = lastMessage?.parsed?.time?.created ?? lastMessage?.time_created ?? null;
  const isRecentlyActive = (
    (typeof lastMessageTime === 'number' && Date.now() - lastMessageTime <= ACTIVE_WINDOW_MS) ||
    Date.now() - session.time_updated <= ACTIVE_WINDOW_MS
  );

  if (todos.some((todo) => todo.status === 'failed' || todo.status === 'cancelled')) {
    return 'error';
  }

  if (todos.some((todo) => todo.status === 'in_progress')) {
    return isRecentlyActive ? 'running' : 'queued';
  }

  if (typeof lastMessageTime === 'number' && Date.now() - lastMessageTime <= ACTIVE_WINDOW_MS) {
    return 'thinking';
  }

  if (Date.now() - session.time_updated <= ACTIVE_WINDOW_MS) {
    return 'thinking';
  }

  if (todos.length > 0 && todos.every((todo) => todo.status === 'completed')) {
    return 'completed';
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
