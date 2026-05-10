import type { OpenCodeSessionRow } from '../types/opencode.js';
import { getDatabaseSync, saveDatabase } from '../db/index.js';

/**
 * Auto-associate an OpenCode session with a matching dashboard task.
 *
 * Looks for a project whose directory matches the session directory,
 * then finds a backlog or in_progress task in that project that does not
 * already have an active session linked. If found, creates a link.
 *
 * @returns The task_id if a match was found and linked, otherwise null.
 */
export function autoAssociateSession(session: OpenCodeSessionRow): number | null {
  const db = getDatabaseSync();

  // Find project by matching directory
  const projectResult = db.exec(
    'SELECT id FROM projects WHERE directory = ? LIMIT 1',
    [session.directory],
  );
  if (!projectResult[0]?.values[0]) return null;
  const projectId = projectResult[0].values[0][0] as number;

  // Find a backlog/in_progress task in that project without an active session
  const taskResult = db.exec(
    `SELECT t.id FROM tasks t
     WHERE t.project_id = ?
       AND t.status IN ('backlog', 'in_progress')
       AND NOT EXISTS (
         SELECT 1 FROM task_sessions ts
         WHERE ts.task_id = t.id AND ts.status = 'active'
       )
     ORDER BY
       CASE t.status WHEN 'in_progress' THEN 0 WHEN 'backlog' THEN 1 END,
       t.priority DESC,
       t.position ASC
     LIMIT 1`,
    [projectId],
  );
  if (!taskResult[0]?.values[0]) return null;
  const taskId = taskResult[0].values[0][0] as number;

  // Link session to task
  db.run(
    "INSERT OR REPLACE INTO task_sessions (task_id, session_id, started_at, status) VALUES (?, ?, datetime('now'), 'active')",
    [taskId, session.id],
  );
  saveDatabase();

  return taskId;
}
