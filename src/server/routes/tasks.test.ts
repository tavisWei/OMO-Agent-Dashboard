import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import tasksRouter from './tasks.js';
import {
  createTask,
  getAllAgents,
  getProject,
  getTask,
  getTaskAssignments,
  getTaskDependencies,
  getTaskSubtasks,
  getDependentTasks,
  replaceTaskAssignments,
  replaceTaskDependencies,
} from '../../db/index.js';
import {
  advanceTaskOrchestration,
  failTaskOrchestration,
  getTaskOrchestrationSnapshot,
  startTaskOrchestration,
} from '../orchestrator.js';
import type { Task, Agent } from '../../types/index.js';

vi.mock('../../db/index.js');
vi.mock('../orchestrator.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../orchestrator.js')>();
  return {
    ...actual,
    startTaskOrchestration: vi.fn(),
    advanceTaskOrchestration: vi.fn(),
    failTaskOrchestration: vi.fn(),
    getTaskOrchestrationSnapshot: vi.fn(),
  };
});
vi.mock('../websocket.js', () => ({
  broadcastAll: vi.fn(),
  createWSMessage: vi.fn((_type: string, payload: unknown) => ({ type: _type, payload, timestamp: 0 })),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', tasksRouter);
  return app;
};

const baseTask: Task = {
  id: 1,
  title: 'Test Task',
  description: '',
  status: 'backlog',
  position: 0,
  project_id: null,
  agent_id: null,
  parent_task_id: null,
  depends_on: [],
  priority: 'medium',
  labels: [],
  due_date: null,
  estimated_tokens: null,
  assigned_agents: [],
  created_at: '',
  updated_at: '',
};

const baseAgent: Agent = {
  id: 10,
  name: 'Agent 10',
  model_id: null,
  model: 'gpt-4',
  status: 'idle',
  project_id: null,
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 4096,
  last_heartbeat: null,
  config_path: null,
  source: 'ui_created',
  created_at: '',
  updated_at: '',
};

function setupTaskDetailMocks(task: Task) {
  vi.mocked(getTask).mockReturnValue(task);
  vi.mocked(getAllAgents).mockReturnValue([baseAgent]);
  vi.mocked(getTaskAssignments).mockReturnValue([]);
  vi.mocked(getTaskDependencies).mockReturnValue([]);
  vi.mocked(getDependentTasks).mockReturnValue([]);
  vi.mocked(getTaskSubtasks).mockReturnValue([]);
  vi.mocked(getProject).mockReturnValue(null);
}

describe('Tasks API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/tasks', () => {
    it('creates a task with new metadata fields', async () => {
      const created = { ...baseTask, priority: 'high' as const, labels: ['backend'], estimated_tokens: 5000 };
      vi.mocked(createTask).mockReturnValue(created);
      setupTaskDetailMocks(created);

      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          priority: 'high',
          labels: ['backend'],
          estimated_tokens: 5000,
        });

      expect(res.status).toBe(201);
      expect(res.body.task.priority).toBe('high');
      expect(createTask).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ description: 'no title' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /:id/assign', () => {
    it('assigns agents to a task', async () => {
      const task = { ...baseTask };
      vi.mocked(getTask).mockReturnValue(task);
      vi.mocked(getAllAgents).mockReturnValue([baseAgent]);
      vi.mocked(replaceTaskAssignments).mockReturnValue([
        { task_id: 1, agent_id: 10, role: 'lead', assigned_at: '' },
      ]);
      vi.mocked(getTaskAssignments).mockReturnValue([
        { task_id: 1, agent_id: 10, role: 'lead', assigned_at: '' },
      ]);
      vi.mocked(getTaskDependencies).mockReturnValue([]);
      vi.mocked(getDependentTasks).mockReturnValue([]);
      vi.mocked(getTaskSubtasks).mockReturnValue([]);
      vi.mocked(getProject).mockReturnValue(null);

      const res = await request(app)
        .post('/api/tasks/1/assign')
        .send({ assignments: [{ agent_id: 10, role: 'lead' }] });

      expect(res.status).toBe(200);
      expect(res.body.assignments).toHaveLength(1);
      expect(res.body.assignments[0].role).toBe('lead');
    });

    it('returns 404 for non-existent task', async () => {
      vi.mocked(getTask).mockReturnValue(null);

      const res = await request(app)
        .post('/api/tasks/999/assign')
        .send({ assignments: [{ agent_id: 10, role: 'worker' }] });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/dependencies', () => {
    it('adds dependencies to a task', async () => {
      const task = { ...baseTask };
      const depTask = { ...baseTask, id: 2, title: 'Dep Task' };
      vi.mocked(getTask).mockImplementation((id) => {
        if (id === 1) return task;
        if (id === 2) return depTask;
        return null;
      });
      vi.mocked(getTaskDependencies).mockReturnValue([]);
      vi.mocked(replaceTaskDependencies).mockReturnValue([
        { task_id: 1, depends_on_task_id: 2, dependency_type: 'requires' },
      ]);
      vi.mocked(getAllAgents).mockReturnValue([]);
      vi.mocked(getTaskAssignments).mockReturnValue([]);
      vi.mocked(getDependentTasks).mockReturnValue([]);
      vi.mocked(getTaskSubtasks).mockReturnValue([]);
      vi.mocked(getProject).mockReturnValue(null);

      const res = await request(app)
        .post('/api/tasks/1/dependencies')
        .send({ add: [{ depends_on_task_id: 2, dependency_type: 'requires' }] });

      expect(res.status).toBe(200);
      expect(res.body.dependencies).toHaveLength(1);
    });

    it('returns 404 for non-existent task', async () => {
      vi.mocked(getTask).mockReturnValue(null);

      const res = await request(app)
        .post('/api/tasks/999/dependencies')
        .send({ add: [{ depends_on_task_id: 2 }] });

      expect(res.status).toBe(404);
    });
  });

  describe('invalid state transition', () => {
    it('returns 400 for backlog -> done', async () => {
      const task = { ...baseTask, status: 'backlog' as const };
      vi.mocked(getTask).mockReturnValue(task);
      vi.mocked(getAllAgents).mockReturnValue([]);

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ status: 'done' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid task status transition');
    });

    it('returns 400 for backlog -> failed', async () => {
      const task = { ...baseTask, status: 'backlog' as const };
      vi.mocked(getTask).mockReturnValue(task);
      vi.mocked(getAllAgents).mockReturnValue([]);

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ status: 'failed' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid task status transition');
    });
  });

  describe('dependency-blocked transition', () => {
    it('returns 400 when moving to in_progress with unfinished deps', async () => {
      const depTask = { ...baseTask, id: 2, status: 'backlog' as const };
      const task = { ...baseTask, depends_on: [2] };
      vi.mocked(getTask).mockImplementation((id) => {
        if (id === 1) return task;
        if (id === 2) return depTask;
        return null;
      });
      vi.mocked(getTaskDependencies).mockReturnValue([]);
      vi.mocked(getAllAgents).mockReturnValue([]);

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('blocked by unfinished dependencies');
    });
  });
});

describe('Orchestration API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /:id/orchestrate (start)', () => {
    it('starts orchestration', async () => {
      vi.mocked(startTaskOrchestration).mockReturnValue({
        event: 'started',
        snapshot: {
          task: baseTask,
          orchestration: {
            id: 1,
            task_id: 1,
            pattern: 'sequential',
            agent_order: [{ agent_id: 10, role: 'lead', label: 'Agent 10' }],
            current_step: 0,
            status: 'running',
            created_at: '',
            updated_at: '',
          },
          steps: [],
          progress: { total_steps: 1, completed_steps: 0, active_steps: 1, pending_steps: 0, completion_percentage: 0 },
          available_actions: ['advance', 'fail'],
        },
      });

      const res = await request(app)
        .post('/api/tasks/1/orchestrate')
        .send({ action: 'start', pattern: 'sequential' });

      expect(res.status).toBe(201);
      expect(res.body.action).toBe('started');
      expect(startTaskOrchestration).toHaveBeenCalledWith(1, { pattern: 'sequential' });
    });

    it('returns error from orchestrator', async () => {
      vi.mocked(startTaskOrchestration).mockReturnValue({
        error: 'Task must have at least one assigned agent before orchestration can start',
        statusCode: 409,
      });

      const res = await request(app)
        .post('/api/tasks/1/orchestrate')
        .send({ action: 'start', pattern: 'sequential' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /:id/orchestrate (advance)', () => {
    it('advances orchestration', async () => {
      vi.mocked(advanceTaskOrchestration).mockReturnValue({
        event: 'advanced',
        snapshot: {
          task: { ...baseTask, status: 'in_progress' },
          orchestration: {
            id: 1,
            task_id: 1,
            pattern: 'sequential',
            agent_order: [{ agent_id: 10, role: 'lead', label: 'Agent 10' }],
            current_step: 1,
            status: 'completed',
            created_at: '',
            updated_at: '',
          },
          steps: [],
          progress: { total_steps: 1, completed_steps: 1, active_steps: 0, pending_steps: 0, completion_percentage: 100 },
          available_actions: ['start'],
        },
      });

      const res = await request(app)
        .post('/api/tasks/1/orchestrate')
        .send({ action: 'advance' });

      expect(res.status).toBe(200);
      expect(advanceTaskOrchestration).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /:id/orchestrate (fail)', () => {
    it('fails orchestration', async () => {
      vi.mocked(failTaskOrchestration).mockReturnValue({
        event: 'failed',
        snapshot: {
          task: { ...baseTask, status: 'failed' },
          orchestration: {
            id: 1,
            task_id: 1,
            pattern: 'sequential',
            agent_order: [{ agent_id: 10, role: 'lead', label: 'Agent 10' }],
            current_step: 0,
            status: 'failed',
            created_at: '',
            updated_at: '',
          },
          steps: [],
          progress: { total_steps: 1, completed_steps: 0, active_steps: 0, pending_steps: 1, completion_percentage: 0 },
          available_actions: ['start'],
        },
      });

      const res = await request(app)
        .post('/api/tasks/1/orchestrate')
        .send({ action: 'fail' });

      expect(res.status).toBe(200);
      expect(failTaskOrchestration).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /:id/orchestration', () => {
    it('returns orchestration snapshot', async () => {
      vi.mocked(getTask).mockReturnValue(baseTask);
      vi.mocked(getTaskOrchestrationSnapshot).mockReturnValue({
        task: baseTask,
        orchestration: {
          id: 1,
          task_id: 1,
          pattern: 'sequential',
          agent_order: [],
          current_step: 0,
          status: 'running',
          created_at: '',
          updated_at: '',
        },
        steps: [],
        progress: { total_steps: 0, completed_steps: 0, active_steps: 0, pending_steps: 0, completion_percentage: 0 },
        available_actions: ['advance', 'fail'],
      });

      const res = await request(app).get('/api/tasks/1/orchestration');

      expect(res.status).toBe(200);
      expect(res.body.orchestration.status).toBe('running');
    });

    it('returns 404 when no orchestration exists', async () => {
      vi.mocked(getTask).mockReturnValue(baseTask);
      vi.mocked(getTaskOrchestrationSnapshot).mockReturnValue(null);

      const res = await request(app).get('/api/tasks/1/orchestration');

      expect(res.status).toBe(404);
    });
  });
});
