import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import modelsRouter from './models.js';
import {
  createModel,
  deleteModel,
  getAllModels,
  getModel,
  getModelAgentUsageCount,
  updateModel,
} from '../../db/index.js';

vi.mock('../../db/index.js');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/models', modelsRouter);
  return app;
};

const mockModel = {
  id: 1,
  name: 'GPT-4o',
  provider: 'openai',
  model_id: 'gpt-4o',
  description: '',
  pricing_input: 2.5,
  pricing_output: 10,
  max_tokens: 128000,
  is_active: true,
  created_at: '',
  updated_at: '',
};

describe('Models API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/models', () => {
    it('returns all models', async () => {
      vi.mocked(getAllModels).mockReturnValue([mockModel]);

      const res = await request(app).get('/api/models');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([mockModel]);
      expect(getAllModels).toHaveBeenCalledWith(undefined);
    });

    it('filters by provider', async () => {
      vi.mocked(getAllModels).mockReturnValue([mockModel]);

      const res = await request(app).get('/api/models?provider=openai');

      expect(res.status).toBe(200);
      expect(getAllModels).toHaveBeenCalledWith('openai');
    });

    it('handles errors', async () => {
      vi.mocked(getAllModels).mockImplementation(() => { throw new Error('fail'); });

      const res = await request(app).get('/api/models');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to get models' });
    });
  });

  describe('POST /api/models', () => {
    it('creates a model', async () => {
      vi.mocked(createModel).mockReturnValue(mockModel);

      const res = await request(app)
        .post('/api/models')
        .send({ name: 'GPT-4o', provider: 'openai', model_id: 'gpt-4o' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockModel);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/models')
        .send({ provider: 'openai', model_id: 'gpt-4o' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name');
    });

    it('returns 400 when provider is missing', async () => {
      const res = await request(app)
        .post('/api/models')
        .send({ name: 'GPT-4o', model_id: 'gpt-4o' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('provider');
    });

    it('returns 409 on duplicate', async () => {
      vi.mocked(createModel).mockImplementation(() => {
        throw new Error('UNIQUE constraint failed');
      });

      const res = await request(app)
        .post('/api/models')
        .send({ name: 'GPT-4o', provider: 'openai', model_id: 'gpt-4o' });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/models/:id', () => {
    it('updates a model', async () => {
      vi.mocked(updateModel).mockReturnValue(true);
      vi.mocked(getModel).mockReturnValue({ ...mockModel, name: 'Updated' });

      const res = await request(app)
        .put('/api/models/1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app)
        .put('/api/models/1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No updates provided' });
    });

    it('returns 404 when model not found', async () => {
      vi.mocked(updateModel).mockReturnValue(false);

      const res = await request(app)
        .put('/api/models/999')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await request(app)
        .put('/api/models/abc')
        .send({ name: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID' });
    });
  });

  describe('DELETE /api/models/:id', () => {
    it('deletes a model', async () => {
      vi.mocked(getModel).mockReturnValue(mockModel);
      vi.mocked(getModelAgentUsageCount).mockReturnValue(0);

      const res = await request(app).delete('/api/models/1');

      expect(res.status).toBe(204);
      expect(deleteModel).toHaveBeenCalledWith(1);
    });

    it('returns 404 when model not found', async () => {
      vi.mocked(getModel).mockReturnValue(null);

      const res = await request(app).delete('/api/models/999');

      expect(res.status).toBe(404);
    });

    it('returns 409 when model is in use', async () => {
      vi.mocked(getModel).mockReturnValue(mockModel);
      vi.mocked(getModelAgentUsageCount).mockReturnValue(3);

      const res = await request(app).delete('/api/models/1');

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Model is assigned to one or more agents' });
    });
  });
});
