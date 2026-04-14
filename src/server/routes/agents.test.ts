import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import agentsRouter from './agents.js';
import { createAgent, deleteAgent, getAgent, getAllAgents, updateAgent } from '../../db/index.js';
import { saveAgentConfig } from '../../config/omo-writer.js';

vi.mock('../../db/index.js');
vi.mock('../../config/omo-writer.js', () => ({ saveAgentConfig: vi.fn(() => ({ success: true, path: '/tmp/config.jsonc' })) }));
vi.mock('../websocket.js', () => ({
  broadcastAll: vi.fn(),
  createWSMessage: vi.fn((type: string, payload: unknown) => ({ type, payload, timestamp: 0 })),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/agents', agentsRouter);
  return app;
};

const baseAgent = {
  id: 1,
  name: 'Agent One',
  project_id: null,
  model_id: null,
  model: 'gpt-4',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 4096,
  status: 'idle' as const,
  last_heartbeat: null,
  config_path: null,
  source: 'ui_created' as const,
  created_at: '',
  updated_at: '',
};

describe('Agents API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('lists agents', async () => {
    vi.mocked(getAllAgents).mockReturnValue([baseAgent]);
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([baseAgent]);
  });

  it('creates an agent', async () => {
    vi.mocked(createAgent).mockReturnValue(baseAgent);
    const res = await request(app).post('/api/agents').send({ name: 'Agent One', model: 'gpt-4' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Agent One');
    expect(createAgent).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when name is missing on create', async () => {
    const res = await request(app).post('/api/agents').send({ model: 'gpt-4' });
    expect(res.status).toBe(400);
  });

  it('returns single agent', async () => {
    vi.mocked(getAgent).mockReturnValue(baseAgent);
    const res = await request(app).get('/api/agents/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('updates an agent and syncs config', async () => {
    vi.mocked(updateAgent).mockReturnValue(true);
    vi.mocked(getAgent).mockReturnValue(baseAgent);
    const res = await request(app).put('/api/agents/1').send({ model: 'gpt-4o' });
    expect(res.status).toBe(200);
    expect(updateAgent).toHaveBeenCalledWith(1, { model: 'gpt-4o' });
    expect(saveAgentConfig).toHaveBeenCalled();
  });

  it('deletes custom agent', async () => {
    vi.mocked(getAgent).mockReturnValue(baseAgent);
    vi.mocked(deleteAgent).mockReturnValue(true);
    const res = await request(app).delete('/api/agents/1');
    expect(res.status).toBe(204);
  });

  it('blocks deleting omo_config agent', async () => {
    vi.mocked(getAgent).mockReturnValue({ ...baseAgent, source: 'omo_config' });
    const res = await request(app).delete('/api/agents/1');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('cannot be deleted');
  });
});
