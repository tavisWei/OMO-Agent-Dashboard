import { Router } from 'express';
import {
  createModel,
  deleteModel,
  getAllModels,
  getModel,
  getModelAgentUsageCount,
  updateModel,
} from '../../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const models = getAllModels(provider);
    res.json(models);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

router.post('/', (req, res) => {
  try {
    const validationError = validateModelPayload(req.body, false);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const model = createModel(normalizeModelPayload(req.body));
    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating model:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'Model already exists for provider and model_id' });
    }
    res.status(500).json({ error: 'Failed to create model' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const validationError = validateModelPayload(req.body, true);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const success = updateModel(id, normalizeModelPayload(req.body, true));
    if (!success) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const updated = getModel(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating model:', error);
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'Model already exists for provider and model_id' });
    }
    res.status(500).json({ error: 'Failed to update model' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const model = getModel(id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const usageCount = getModelAgentUsageCount(id);
    if (usageCount > 0) {
      return res.status(409).json({ error: 'Model is assigned to one or more agents' });
    }

    deleteModel(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

function validateModelPayload(payload: unknown, partial: boolean): string | null {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid request body';
  }

  const body = payload as Record<string, unknown>;
  const requiredFields = ['name', 'provider', 'model_id'];

  for (const field of requiredFields) {
    if (!partial && (!body[field] || typeof body[field] !== 'string' || !body[field]?.toString().trim())) {
      return `${field} is required`;
    }

    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field]?.toString().trim())) {
      return `${field} must be a non-empty string`;
    }
  }

  const numericFields = ['pricing_input', 'pricing_output', 'max_tokens'];
  for (const field of numericFields) {
    if (body[field] !== undefined && !isFiniteNumber(body[field])) {
      return `${field} must be a valid number`;
    }
  }

  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    return 'is_active must be a boolean';
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description must be a string';
  }

  return null;
}

function normalizeModelPayload(payload: Record<string, unknown>, partial: boolean = false) {
  const normalized = {
    ...(partial ? {} : { description: '', pricing_input: 0, pricing_output: 0, max_tokens: 0, is_active: true }),
  } as Record<string, unknown>;

  if (payload.name !== undefined) normalized.name = String(payload.name).trim();
  if (payload.provider !== undefined) normalized.provider = String(payload.provider).trim();
  if (payload.model_id !== undefined) normalized.model_id = String(payload.model_id).trim();
  if (payload.description !== undefined) normalized.description = payload.description;
  if (payload.pricing_input !== undefined) normalized.pricing_input = Number(payload.pricing_input);
  if (payload.pricing_output !== undefined) normalized.pricing_output = Number(payload.pricing_output);
  if (payload.max_tokens !== undefined) normalized.max_tokens = Number(payload.max_tokens);
  if (payload.is_active !== undefined) normalized.is_active = payload.is_active;

  return normalized as Parameters<typeof createModel>[0];
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed');
}

export default router;
