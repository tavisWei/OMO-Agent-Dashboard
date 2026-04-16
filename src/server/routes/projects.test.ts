import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectsRouter from './projects.js';
import agentsRouter from './agents.js';
import { getAllAgents, getAgent, updateAgent, deleteAgent } from '../../db/index.js';
import { getDashboardSnapshot } from '../opencode-reader.js';
import type { Agent } from '../../db/schema.js';

vi.mock('../../db/index.js');
vi.mock('../opencode-reader.js', () => ({
  getDashboardSnapshot: vi.fn(),
}));

const mockOverview = {
  totalSessions: 0,
  runningSessions: 0,
  thinkingSessions: 0,
  failedSessions: 0,
  idleSessions: 0,
  activeProjects: 0,
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectsRouter);
  app.use('/api/agents', agentsRouter);
  return app;
};

describe('Projects API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/projects', () => {
    it('returns all projects', async () => {
      const mockProjects = [
        { id: '/repo/a', name: 'Project 1', directory: '/repo/a', projectId: 'global', activeSessionCount: 1, totalSessionCount: 2 },
        { id: '/repo/b', name: 'Project 2', directory: '/repo/b', projectId: 'global', activeSessionCount: 0, totalSessionCount: 1 },
      ];
      vi.mocked(getDashboardSnapshot).mockReturnValue({
        sessions: [],
        tree: [],
        projects: mockProjects,
        overview: mockOverview,
        error: null,
      });

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProjects);
      expect(getDashboardSnapshot).toHaveBeenCalledTimes(1);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(getDashboardSnapshot).mockReturnValue({
        sessions: [],
        tree: [],
        projects: [],
        overview: mockOverview,
        error: { code: 'DB_QUERY_FAILED', message: 'Database error' },
      });

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ projects: [], error: 'Database error' });
    });
  });

  describe('POST /api/projects', () => {
    it('rejects creating derived projects', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'New Project', description: 'Test' });

      expect(response.status).toBe(405);
      expect(response.body).toEqual({ error: 'Projects are derived from OpenCode sessions and cannot be created here' });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns a project by id', async () => {
      const project = { id: '/repo/a', name: 'Project 1', directory: '/repo/a', projectId: 'global', activeSessionCount: 1, totalSessionCount: 2 };
      vi.mocked(getDashboardSnapshot).mockReturnValue({
        sessions: [],
        tree: [],
        projects: [project],
        overview: mockOverview,
        error: null,
      });

      const response = await request(app).get('/api/projects/%2Frepo%2Fa');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(project);
    });

    it('returns 404 if project not found', async () => {
      vi.mocked(getDashboardSnapshot).mockReturnValue({
        sessions: [],
        tree: [],
        projects: [],
        overview: mockOverview,
        error: null,
      });

      const response = await request(app).get('/api/projects/missing');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found' });
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('rejects updates for derived projects', async () => {
      const response = await request(app)
        .put('/api/projects/1')
        .send({ description: 'Test' });

      expect(response.status).toBe(405);
      expect(response.body).toEqual({ error: 'Projects are read-only derived data' });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('rejects deletes for derived projects', async () => {
      const response = await request(app).delete('/api/projects/1');

      expect(response.status).toBe(405);
      expect(response.body).toEqual({ error: 'Projects are read-only derived data' });
    });
  });
});

describe('Agents API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/agents', () => {
    it('returns all agents', async () => {
      const mockAgents: Agent[] = [
        { id: 1, name: 'Agent 1', model_id: null, model: 'gpt-4', status: 'idle', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' },
        { id: 2, name: 'Agent 2', model_id: null, model: 'gpt-4', status: 'running', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' },
      ];
      vi.mocked(getAllAgents).mockReturnValue(mockAgents);

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAgents);
      expect(getAllAgents).toHaveBeenCalledTimes(1);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(getAllAgents).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get agents' });
    });
  });

  describe('GET /api/agents/:id', () => {
    it('returns an agent by id', async () => {
      const agent: Agent = { id: 1, name: 'Agent 1', model_id: null, model: 'gpt-4', status: 'idle', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' };
      vi.mocked(getAgent).mockReturnValue(agent);

      const response = await request(app).get('/api/agents/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(agent);
    });

    it('returns 404 if agent not found', async () => {
      vi.mocked(getAgent).mockReturnValue(null);

      const response = await request(app).get('/api/agents/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Agent not found' });
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('updates an agent', async () => {
      const updated: Agent = { id: 1, name: 'Updated Agent', model_id: null, model: 'gpt-4', status: 'running', project_id: null, temperature: 0.8, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' };
      vi.mocked(updateAgent).mockReturnValue(true);
      vi.mocked(getAgent).mockReturnValue(updated);

      const response = await request(app)
        .put('/api/agents/1')
        .send({ name: 'Updated Agent', status: 'running' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updated);
    });

    it('returns 400 if no updates provided', async () => {
      const response = await request(app)
        .put('/api/agents/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No updates provided' });
    });

    it('returns 404 if agent not found', async () => {
      vi.mocked(updateAgent).mockReturnValue(false);

      const response = await request(app)
        .put('/api/agents/999')
        .send({ status: 'running' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Agent not found' });
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('deletes an agent', async () => {
      vi.mocked(getAgent).mockReturnValue({ id: 1, name: 'Agent 1', model_id: null, model: 'gpt-4', status: 'idle', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' });
      vi.mocked(deleteAgent).mockReturnValue(true);

      const response = await request(app).delete('/api/agents/1');

      expect(response.status).toBe(204);
      expect(deleteAgent).toHaveBeenCalledWith(1);
    });

    it('returns 404 if agent not found', async () => {
      vi.mocked(getAgent).mockReturnValue(null);

      const response = await request(app).delete('/api/agents/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Agent not found' });
    });

    it('returns 403 for OMO config agents', async () => {
      vi.mocked(getAgent).mockReturnValue({ id: 2, name: 'Agent 2', model_id: null, model: 'gpt-4', status: 'idle', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'omo_config', created_at: '', updated_at: '' });

      const response = await request(app).delete('/api/agents/2');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'OMO config agents cannot be deleted' });
    });
  });
});
