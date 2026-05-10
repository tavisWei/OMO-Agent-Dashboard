import { Router } from 'express';
import { createActivityLog, getDatabaseSync } from '../../db/index.js';
import { getDashboardSnapshot } from '../opencode-reader.js';

const router = Router();

// Activity types for filtering and display
export type ActivityType = 'started' | 'stopped' | 'error' | 'config_changed' | 'task_assigned' | 'task_completed';

interface ActivityLogWithAgent {
  id: number;
  agent_id: string | null;
  agent_name: string | null;
  action: string;
  details: string;
  created_at: string;
}

interface GetActivityLogsQuery {
  type?: string;
  agentId?: string;
  project?: string;
  timeRange?: string;
  limit?: string;
  offset?: string;
}

// GET /api/activity-logs - Get activity logs with optional filtering
router.get('/', (req, res) => {
  try {
    const { type, agentId, project, timeRange, limit = '50', offset = '0' } = req.query as GetActivityLogsQuery;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let logs: ActivityLogWithAgent[];

    // Try reading from persistent activity_logs table first
    const db = getDatabaseSync();
    try {
      const dbLogs = db.exec(
        'SELECT id, agent_id, agent_name, action, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limitNum + 1, offsetNum]
      );
      if (dbLogs[0] && dbLogs[0].values.length > 0) {
        logs = dbLogs[0].values.map((row: any[]) => ({
          id: row[0] as number,
          agent_id: row[1] as string | null,
          agent_name: row[2] as string | null,
          action: row[3] as string,
          details: row[4] as string,
          created_at: row[5] as string,
        }));
      } else {
        // Fallback to synthetic data if table is empty
        if (agentId) {
          logs = getActivityLogsBySession(agentId, limitNum + 1, offsetNum);
        } else {
          logs = getRecentActivityLogsWithName(limitNum + 1, offsetNum, project);
        }
      }
    } catch {
      // Fallback on DB error
      if (agentId) {
        logs = getActivityLogsBySession(agentId, limitNum + 1, offsetNum);
      } else {
        logs = getRecentActivityLogsWithName(limitNum + 1, offsetNum, project);
      }
    }

    // Filter by type if specified
    if (type) {
      const types = type.split(',').map(t => t.trim());
      logs = logs.filter(log => types.includes(log.action));
    }

    if (timeRange && timeRange !== 'all') {
      const now = Date.now();
      const threshold = timeRange === 'today'
        ? now - 24 * 60 * 60 * 1000
        : timeRange === 'week'
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;
      logs = logs.filter((log) => new Date(log.created_at).getTime() >= threshold);
    }

    // Check if there are more results
    const hasMore = logs.length > limitNum;
    if (hasMore) {
      logs = logs.slice(0, limitNum);
    }

    res.json({
      logs,
      hasMore,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

// POST /api/activity-logs - Create a new activity log entry
router.post('/', (req, res) => {
  try {
    const { agentId, action, details = '' } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const validActions = ['started', 'stopped', 'error', 'config_changed', 'task_assigned', 'task_completed'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    const log = createActivityLog(agentId || null, action, details);
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Helper function to get activity logs with agent name
function getActivityLogsBySession(sessionId: string, limit: number, offset: number): ActivityLogWithAgent[] {
  const snapshot = getDashboardSnapshot({ limit: 500, days: 365 });
  const matchingSession = snapshot.sessions.find((session) => session.id === sessionId);
  if (!matchingSession) {
    return [];
  }

  return buildSyntheticActivityLogs(snapshot.sessions.filter((session) => session.id === sessionId), limit, offset);
}

function getRecentActivityLogsWithName(limit: number, offset: number, project?: string): ActivityLogWithAgent[] {
  const snapshot = getDashboardSnapshot({ limit: 500, days: 365 });
  const sessions = project
    ? snapshot.sessions.filter((session) => session.directory === project)
    : snapshot.sessions;

  return buildSyntheticActivityLogs(sessions, limit, offset);
}

function buildSyntheticActivityLogs(
  sessions: Array<{ id: string; title: string; agentLabel: string; status: string; updatedAt: string; todos: Array<{ content: string; status: string }> }>,
  limit: number,
  offset: number,
): ActivityLogWithAgent[] {
  const logs = sessions.flatMap((session, index) => {
    const items: ActivityLogWithAgent[] = [{
      id: index * 1000 + 1,
      agent_id: session.id,
      agent_name: session.title,
      action: session.status === 'error' ? 'error' : session.status === 'running' ? 'started' : 'config_changed',
      details: `${session.agentLabel} · ${session.status}`,
      created_at: session.updatedAt,
    }];

    session.todos.forEach((todo, todoIndex) => {
      items.push({
        id: index * 1000 + 10 + todoIndex,
        agent_id: session.id,
        agent_name: session.title,
        action: todo.status === 'completed' ? 'task_completed' : 'task_assigned',
        details: todo.content,
        created_at: session.updatedAt,
      });
    });

    return items;
  }).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  const slice = logs.slice(offset, offset + limit);
  return slice;
}

export default router;
