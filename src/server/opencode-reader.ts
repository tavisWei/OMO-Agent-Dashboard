import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { DashboardProjectGroup, DashboardSession, DashboardSessionTreeNode, DashboardOverview } from '../types/domain.js';
import type { OpenCodeMessageMeta, OpenCodeMessageRow, OpenCodeProjectRow, OpenCodeSessionQuery, OpenCodeSessionRow, OpenCodeTodoRow } from '../types/opencode.js';
import { toDashboardSession, toOverview, toProjectGroups, toSessionTree } from './adapter.js';

export interface ReaderError {
  code: 'DB_NOT_FOUND' | 'DB_OPEN_FAILED' | 'DB_QUERY_FAILED';
  message: string;
}

export interface ReaderResult<T> {
  data: T;
  error: ReaderError | null;
}

export interface DashboardSnapshot {
  sessions: DashboardSession[];
  tree: DashboardSessionTreeNode[];
  projects: DashboardProjectGroup[];
  overview: DashboardOverview;
  error: ReaderError | null;
}

const DEFAULT_DAYS = 7;
let connection: Database.Database | null = null;
let connectionPath: string | null = null;

function getDefaultDbPath(): string {
  return process.env.OPENCODE_DB_PATH || path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
}

function safeParseMessageMeta(raw: string): OpenCodeMessageMeta | null {
  try {
    const parsed = JSON.parse(raw) as OpenCodeMessageMeta;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getConnection(): ReaderResult<Database.Database> {
  const dbPath = getDefaultDbPath();

  if (connection && connectionPath === dbPath) {
    return { data: connection, error: null };
  }

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma('query_only = ON');
    connection = db;
    connectionPath = dbPath;
    return { data: db, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      data: null as never,
      error: {
        code: message.includes('unable to open database file') ? 'DB_NOT_FOUND' : 'DB_OPEN_FAILED',
        message,
      },
    };
  }
}

function mapSessions(rows: OpenCodeSessionRow[], db: Database.Database): DashboardSession[] {
  const todoStmt = db.prepare(`
    SELECT session_id, content, status, priority, position, time_created, time_updated
    FROM todo
    WHERE session_id = ?
    ORDER BY position ASC, time_created ASC
  `);
  const messageStmt = db.prepare(`
    SELECT id, session_id, time_created, time_updated, data
    FROM message
    WHERE session_id = ?
    ORDER BY time_created DESC
    LIMIT 10
  `);

  return rows.map((row) => {
    const todos = todoStmt.all(row.id) as OpenCodeTodoRow[];
    const messages = (messageStmt.all(row.id) as Array<Omit<OpenCodeMessageRow, 'parsed'>>)
      .map((message) => ({
        ...message,
        parsed: safeParseMessageMeta(message.data),
      }));

    return toDashboardSession(row, todos, messages);
  });
}

export function closeOpenCodeDatabase(): void {
  connection?.close();
  connection = null;
  connectionPath = null;
}

export function getOpenCodeProjects(): ReaderResult<OpenCodeProjectRow[]> {
  const dbResult = getConnection();
  if (dbResult.error) {
    return { data: [], error: dbResult.error };
  }

  try {
    const stmt = dbResult.data.prepare(`
      SELECT id, worktree, vcs, name, icon_url, icon_color, time_created, time_updated, time_initialized, sandboxes, commands
      FROM project
      ORDER BY time_updated DESC
    `);
    return { data: stmt.all() as OpenCodeProjectRow[], error: null };
  } catch (error) {
    return {
      data: [],
      error: { code: 'DB_QUERY_FAILED', message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function getOpenCodeSessions(query: OpenCodeSessionQuery = {}): ReaderResult<DashboardSession[]> {
  const dbResult = getConnection();
  if (dbResult.error) {
    return { data: [], error: dbResult.error };
  }

  try {
    const days = query.days ?? DEFAULT_DAYS;
    const where: string[] = ['time_created >= ?'];
    const values: Array<string | number> = [Date.now() - days * 24 * 60 * 60 * 1000];

    if (query.projectId) {
      where.push('project_id = ?');
      values.push(query.projectId);
    }

    if (query.directory) {
      where.push('directory = ?');
      values.push(query.directory);
    }

    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    values.push(limit, offset);

    const stmt = dbResult.data.prepare(`
      SELECT id, project_id, parent_id, slug, directory, title, version, share_url, summary_additions, summary_deletions,
             summary_files, summary_diffs, revert, permission, time_created, time_updated, time_compacting, time_archived, workspace_id
      FROM session
      WHERE ${where.join(' AND ')}
      ORDER BY time_updated DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...values) as OpenCodeSessionRow[];
    const sessions = mapSessions(rows, dbResult.data);
    const filtered = query.activeOnly
      ? sessions.filter((session) => session.status === 'running' || session.status === 'thinking')
      : sessions;

    return { data: filtered, error: null };
  } catch (error) {
    return {
      data: [],
      error: { code: 'DB_QUERY_FAILED', message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function getOpenCodeSessionById(sessionId: string): ReaderResult<DashboardSession | null> {
  const result = getOpenCodeSessions({ limit: 500, days: 365 });
  if (result.error) {
    return { data: null, error: result.error };
  }

  return {
    data: result.data.find((session) => session.id === sessionId) ?? null,
    error: null,
  };
}

export function getOpenCodeSessionTree(rootId?: string): ReaderResult<DashboardSessionTreeNode[]> {
  const result = getOpenCodeSessions({ limit: 500, days: 365 });
  if (result.error) {
    return { data: [], error: result.error };
  }

  const tree = toSessionTree(result.data);
  if (!rootId) {
    return { data: tree, error: null };
  }

  const stack = [...tree];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (current.id === rootId) {
      return { data: [current], error: null };
    }

    stack.push(...current.children);
  }

  return { data: [], error: null };
}

export function getOpenCodeSessionMessages(sessionId: string, limit = 20): ReaderResult<OpenCodeMessageRow[]> {
  const dbResult = getConnection();
  if (dbResult.error) {
    return { data: [], error: dbResult.error };
  }

  try {
    const stmt = dbResult.data.prepare(`
      SELECT id, session_id, time_created, time_updated, data
      FROM message
      WHERE session_id = ?
      ORDER BY time_created DESC
      LIMIT ?
    `);
    const rows = (stmt.all(sessionId, limit) as Array<Omit<OpenCodeMessageRow, 'parsed'>>).map((row) => ({
      ...row,
      parsed: safeParseMessageMeta(row.data),
    }));
    return { data: rows, error: null };
  } catch (error) {
    return {
      data: [],
      error: { code: 'DB_QUERY_FAILED', message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function getOpenCodeSessionTodos(sessionId: string): ReaderResult<OpenCodeTodoRow[]> {
  const dbResult = getConnection();
  if (dbResult.error) {
    return { data: [], error: dbResult.error };
  }

  try {
    const stmt = dbResult.data.prepare(`
      SELECT session_id, content, status, priority, position, time_created, time_updated
      FROM todo
      WHERE session_id = ?
      ORDER BY position ASC, time_created ASC
    `);
    return { data: stmt.all(sessionId) as OpenCodeTodoRow[], error: null };
  } catch (error) {
    return {
      data: [],
      error: { code: 'DB_QUERY_FAILED', message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function getDashboardSnapshot(query: OpenCodeSessionQuery = {}): DashboardSnapshot {
  const sessionsResult = getOpenCodeSessions(query);
  const projectsResult = getOpenCodeProjects();
  const error = sessionsResult.error ?? projectsResult.error;
  const projects = toProjectGroups(sessionsResult.data, projectsResult.data);
  return {
    sessions: sessionsResult.data,
    tree: toSessionTree(sessionsResult.data),
    projects,
    overview: toOverview(sessionsResult.data, projects),
    error,
  };
}
