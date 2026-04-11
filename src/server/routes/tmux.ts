import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// GET /api/tmux/sessions
router.get('/sessions', async (_req, res) => {
  try {
    // List tmux sessions
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}|#{session_activity}|#{session_windows}" 2>/dev/null || echo ""');
    
    const sessions = stdout.trim().split('\n')
      .filter(line => line && line.includes('|'))
      .map(line => {
        const parts = line.split('|');
        const name = parts[0] || '';
        const activity = parts[1] || '0';
        const windows = parts[2] || '1';
        
        // activity is timestamp, 0 means no recent activity
        const activityTime = parseInt(activity) || 0;
        const now = Math.floor(Date.now() / 1000);
        const isActive = (now - activityTime) < 30; // Active if activity within 30 seconds
        
        return {
          name,
          status: isActive ? 'running' : 'idle',
          lastActivity: activityTime > 0 ? new Date(activityTime * 1000).toISOString() : null,
          windowCount: parseInt(windows) || 1,
        };
      });
    
    res.json({ sessions });
  } catch (error) {
    res.json({ sessions: [], error: 'tmux not available' });
  }
});

export default router;