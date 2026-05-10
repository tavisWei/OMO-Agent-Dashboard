import Database from 'better-sqlite3';
import os from 'node:os';
import path from 'node:path';
import { createActivityLog } from '../db/index.js';
import { autoAssociateSession } from './auto-association.js';
import type { OpenCodeSessionRow } from '../types/opencode.js';

function getDefaultDbPath(): string {
  return process.env.OPENCODE_DB_PATH || path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
}

let stopFn: (() => void) | null = null;

export function startPollingOpenCodeDB(intervalMs = 30000): () => void {
  // Track known session IDs and their last-updated timestamps
  const knownSessions = new Map<string, number>();
  const knownTodos = new Map<string, string>(); // key = "session_id::position" -> status

  function openOpenCodeDb(): Database.Database | null {
    const dbPath = getDefaultDbPath();
    try {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');
      return db;
    } catch {
      return null;
    }
  }

  async function poll(): Promise<void> {
    let db: Database.Database | null = null;
    try {
      db = openOpenCodeDb();
      if (!db) return;

      // --- Detect new sessions ---
      const sessionRows = db.prepare(`
        SELECT id, title, time_created, time_updated
        FROM session
        ORDER BY time_created DESC
        LIMIT 100
      `).all() as Array<{ id: string; title: string; time_created: number; time_updated: number }>;

      for (const row of sessionRows) {
        const prevTime = knownSessions.get(row.id);
        if (prevTime === undefined) {
          // New session detected
          knownSessions.set(row.id, row.time_updated);
          try {
            createActivityLog(null, 'session_started', JSON.stringify({
              sessionId: row.id,
              title: row.title,
              timeCreated: new Date(row.time_created).toISOString(),
            }));
            console.log(`[polling] New session detected: ${row.title}`);
          } catch (err) {
            console.error('[polling] Failed to log session_started:', err);
          }

          try {
            const linkedTaskId = autoAssociateSession({
              id: row.id,
              project_id: '',
              parent_id: null,
              slug: row.title,
              directory: '',
              title: row.title,
              version: '',
              time_created: row.time_created,
              time_updated: row.time_updated,
              time_compacting: null,
              time_archived: null,
            } as OpenCodeSessionRow);
            if (linkedTaskId) {
              console.log(`[polling] Auto-associated session ${row.id} with task ${linkedTaskId}`);
            }
          } catch (err) {
            console.error('[polling] Failed to auto-associate session:', err);
          }
        } else if (row.time_updated > prevTime) {
          // Session updated - could be status change
          knownSessions.set(row.id, row.time_updated);
        }
      }

      // --- Detect todo status changes ---
      const todoRows = db.prepare(`
        SELECT session_id, content, status, position, time_updated
        FROM todo
        ORDER BY time_updated DESC
        LIMIT 500
      `).all() as Array<{ session_id: string; content: string; status: string; position: number; time_updated: number }>;

      for (const row of todoRows) {
        const key = `${row.session_id}::${row.position}`;
        const prevStatus = knownTodos.get(key);

        if (prevStatus === undefined) {
          // First time seeing this todo
          knownTodos.set(key, row.status);
        } else if (prevStatus !== row.status) {
          // Status changed
          knownTodos.set(key, row.status);

          if (row.status === 'completed') {
            try {
              createActivityLog(null, 'task_completed', JSON.stringify({
                sessionId: row.session_id,
                content: row.content,
                timeUpdated: new Date(row.time_updated).toISOString(),
              }));
              console.log(`[polling] Todo completed: ${row.content}`);
            } catch (err) {
              console.error('[polling] Failed to log task_completed:', err);
            }
          } else if (row.status === 'failed' || row.status === 'cancelled') {
            try {
              createActivityLog(null, 'error', JSON.stringify({
                sessionId: row.session_id,
                content: row.content,
                status: row.status,
                timeUpdated: new Date(row.time_updated).toISOString(),
              }));
              console.log(`[polling] Todo error (${row.status}): ${row.content}`);
            } catch (err) {
              console.error('[polling] Failed to log error:', err);
            }
          }
        }
      }

      // Error detection is handled above: todo status changes to 'failed' or 'cancelled'
      // indicate session errors (per adapter.ts: inferSessionStatus)

    } catch (err) {
      console.error('[polling] Poll cycle error:', err);
    } finally {
      if (db) {
        try { db.close(); } catch { /* ignore close errors */ }
      }
    }
  }

  // Run initial poll immediately
  poll().catch((err) => console.error('[polling] Initial poll error:', err));

  // Schedule recurring polls using setTimeout (not setInterval) for error resilience
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleNext(): void {
    timeout = setTimeout(() => {
      poll()
        .catch((err) => console.error('[polling] Poll cycle error:', err))
        .finally(() => {
          scheduleNext();
        });
    }, intervalMs);
  }

  scheduleNext();

  stopFn = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    knownSessions.clear();
    knownTodos.clear();
  };

  return stopFn;
}

export function stopPollingOpenCodeDB(): void {
  if (stopFn) {
    stopFn();
    stopFn = null;
  }
}
