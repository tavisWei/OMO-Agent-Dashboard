import express, { Request, Response, NextFunction } from 'express';
import { getDatabase, createAgent, clearAgents } from '../db/index.js';
import { getAgents, getConfigPath } from '../config/omo-reader.js';
import projectsRouter from './routes/projects.js';
import agentsRouter from './routes/agents.js';
import modelsRouter from './routes/models.js';
import tasksRouter from './routes/tasks.js';
import costRouter from './routes/cost.js';
import activityLogsRouter from './routes/activity-logs.js';
import tmuxRouter from './routes/tmux.js';
import { initializeWebSocketServer } from './websocket.js';
import { agentStatusMonitor } from './agentStatus.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/api/projects', projectsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/cost-records', costRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/tmux', tmuxRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function syncOMOConfig() {
  const configPath = getConfigPath();
  const omoAgents = getAgents(configPath);
  
  if (omoAgents.length === 0) {
    console.log('No agents found in OMO config or config file not found:', configPath);
    return;
  }
  
  console.log(`Found ${omoAgents.length} agents in OMO config`);
  
  clearAgents('omo_config');
  
  for (const agent of omoAgents) {
    createAgent(agent.name, null, agent.model || 'gpt-4', {
      model_id: null,
      temperature: agent.temperature,
      top_p: agent.top_p,
      max_tokens: agent.max_tokens,
      status: 'idle',
      source: 'omo_config'
    });
    console.log(`  - Synced agent: ${agent.name} (${agent.model || 'gpt-4'})`);
  }
  
  console.log('OMO config sync completed');
}

async function start() {
  try {
    await getDatabase();
    console.log('Database initialized');
    
    await syncOMOConfig();
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
    initializeWebSocketServer(server);
    
    startTmuxPolling();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

function startTmuxPolling() {
  const pollInterval = 5000;
  
  async function pollTmuxSessions() {
    try {
      const { stdout } = await execAsync(
        'tmux list-sessions -F "#{session_name}|#{session_activity}|#{session_windows}" 2>/dev/null || echo ""'
      );
      
      const sessions = stdout.trim().split('\n')
        .filter(line => line && line.includes('|'))
        .map(line => {
          const parts = line.split('|');
          const name = parts[0] || '';
          const activity = parts[1] || '0';
          const windows = parts[2] || '1';
          
          const activityTime = parseInt(activity) || 0;
          const now = Math.floor(Date.now() / 1000);
          const isActive = (now - activityTime) < 30;
          
          return {
            name,
            status: isActive ? 'running' : 'idle',
            windowCount: parseInt(windows) || 1,
          };
        });
      
      sessions.forEach(session => {
        const status = session.status as 'idle' | 'running' | 'thinking' | 'error';
        agentStatusMonitor.updateStatus(session.name, status, session.name);
      });
      
      if (sessions.length > 0) {
        console.log(`[tmux-polling] ${sessions.length} sessions, statuses updated`);
      }
    } catch (error) {
      // tmux not available or error - silent fail
    }
  }
  
  pollTmuxSessions();
  setInterval(pollTmuxSessions, pollInterval);
}

start();
