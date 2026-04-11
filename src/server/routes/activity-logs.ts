import { Router } from 'express';
import { createActivityLog } from '../../db/index.js';

const router = Router();

// Activity types for filtering and display
export type ActivityType = 'started' | 'stopped' | 'error' | 'config_changed' | 'task_assigned' | 'task_completed';

interface ActivityLogWithAgent {
  id: number;
  agent_id: number | null;
  agent_name: string | null;
  action: string;
  details: string;
  created_at: string;
}

interface GetActivityLogsQuery {
  type?: string;
  agentId?: string;
  limit?: string;
  offset?: string;
}

// GET /api/activity-logs - Get activity logs with optional filtering
router.get('/', (req, res) => {
  try {
    const { type, agentId, limit = '50', offset = '0' } = req.query as GetActivityLogsQuery;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let logs: ActivityLogWithAgent[];

    if (agentId) {
      const agentIdNum = parseInt(agentId, 10);
      if (isNaN(agentIdNum)) {
        return res.status(400).json({ error: 'Invalid agentId' });
      }
      logs = getActivityLogsByAgentWithName(agentIdNum, limitNum + 1, offsetNum);
    } else {
      logs = getRecentActivityLogsWithName(limitNum + 1, offsetNum);
    }

    // Filter by type if specified
    if (type) {
      const types = type.split(',').map(t => t.trim());
      logs = logs.filter(log => types.includes(log.action));
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
function getActivityLogsByAgentWithName(agentId: number, limit: number, offset: number): ActivityLogWithAgent[] {
  const { getDatabaseSync } = require('../../db/index.js');
  const database = getDatabaseSync();
  const result = database.exec(
    `SELECT al.id, al.agent_id, a.name as agent_name, al.action, al.details, al.created_at
     FROM activity_logs al
     LEFT JOIN agents a ON al.agent_id = a.id
     WHERE al.agent_id = ?
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [agentId, limit, offset]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => ({
    id: row[0],
    agent_id: row[1],
    agent_name: row[2],
    action: row[3],
    details: row[4],
    created_at: row[5]
  }));
}

// Helper function to get recent activity logs with agent name
function getRecentActivityLogsWithName(limit: number, offset: number): ActivityLogWithAgent[] {
  const { getDatabaseSync } = require('../../db/index.js');
  const database = getDatabaseSync();
  const result = database.exec(
    `SELECT al.id, al.agent_id, a.name as agent_name, al.action, al.details, al.created_at
     FROM activity_logs al
     LEFT JOIN agents a ON al.agent_id = a.id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => ({
    id: row[0],
    agent_id: row[1],
    agent_name: row[2],
    action: row[3],
    details: row[4],
    created_at: row[5]
  }));
}

export default router;