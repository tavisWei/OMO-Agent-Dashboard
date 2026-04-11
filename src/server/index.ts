import express, { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/index.js';
import projectsRouter from './routes/projects.js';
import agentsRouter from './routes/agents.js';
import tasksRouter from './routes/tasks.js';
import costRouter from './routes/cost.js';
import activityLogsRouter from './routes/activity-logs.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/api/projects', projectsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/cost-records', costRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/chat', chatRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await getDatabase();
    console.log('Database initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
