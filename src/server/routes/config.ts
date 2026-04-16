import { Router } from 'express';
import {
  getConfigSnapshot,
  getRawConfig,
  saveRawConfig,
  updateAgentModel,
  updateCategoryModel,
  updateLegacyOmoAgent,
  addProviderModel,
  deleteProviderModel,
  addProvider,
  updateProvider,
  deleteProvider,
  saveConfigVersion,
  listConfigVersions,
  loadConfigVersion,
  deleteConfigVersion,
  type RawConfigTarget,
} from '../config-manager.js';

const router = Router();

router.get('/', (_req, res) => {
  const snapshot = getConfigSnapshot();
  if (snapshot.error) {
    return res.json({ config: snapshot.data, error: snapshot.error.message });
  }

  return res.json(snapshot.data);
});

router.get('/raw/:target', (req, res) => {
  const target = req.params.target as RawConfigTarget;
  if (!['openagent', 'opencode', 'omo'].includes(target)) {
    return res.status(400).json({ error: 'invalid config target' });
  }

  const result = getRawConfig(target);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.json({ target, content: result.data ?? '' });
});

router.put('/raw/:target', (req, res) => {
  const target = req.params.target as RawConfigTarget;
  const { content } = req.body ?? {};
  if (!['openagent', 'opencode', 'omo'].includes(target)) {
    return res.status(400).json({ error: 'invalid config target' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  const result = saveRawConfig(target, content);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.json({ success: true });
});

router.put('/agents/:name', (req, res) => {
  const { model, variant } = req.body ?? {};
  if (typeof model !== 'string' || model.trim().length === 0) {
    return res.status(400).json({ error: 'model is required' });
  }

  const update = {
    model: model.trim(),
    ...(typeof variant === 'string' ? { variant } : {}),
  };
  const result = updateAgentModel(req.params.name, update);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  updateLegacyOmoAgent(req.params.name, update);
  return res.json({ success: true });
});

router.put('/categories/:name', (req, res) => {
  const { model, variant } = req.body ?? {};
  if (typeof model !== 'string' || model.trim().length === 0) {
    return res.status(400).json({ error: 'model is required' });
  }

  const result = updateCategoryModel(req.params.name, {
    model: model.trim(),
    ...(typeof variant === 'string' ? { variant } : {}),
  });
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }

  return res.json({ success: true });
});

router.post('/models/:provider', (req, res) => {
  const { modelId, name } = req.body ?? {};
  if (typeof modelId !== 'string' || modelId.trim().length === 0) {
    return res.status(400).json({ error: 'modelId is required' });
  }
  const result = addProviderModel(req.params.provider, modelId.trim(), typeof name === 'string' ? name.trim() : modelId.trim());
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.delete('/models/:provider/:modelId', (req, res) => {
  const result = deleteProviderModel(req.params.provider, req.params.modelId);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.post('/providers', (req, res) => {
  const { key, name, npm, baseURL, apiKey } = req.body ?? {};
  if (typeof key !== 'string' || key.trim().length === 0) {
    return res.status(400).json({ error: 'key is required' });
  }
  if (typeof baseURL !== 'string' || baseURL.trim().length === 0) {
    return res.status(400).json({ error: 'baseURL is required' });
  }
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({ error: 'apiKey is required' });
  }
  const result = addProvider({
    key: key.trim(),
    name: typeof name === 'string' ? name.trim() : undefined,
    npm: typeof npm === 'string' ? npm.trim() : undefined,
    baseURL: baseURL.trim(),
    apiKey: apiKey.trim(),
  });
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.put('/providers/:key', (req, res) => {
  const { name, npm, baseURL, apiKey } = req.body ?? {};
  const result = updateProvider(req.params.key, {
    name: typeof name === 'string' ? name.trim() : undefined,
    npm: typeof npm === 'string' ? npm.trim() : undefined,
    baseURL: typeof baseURL === 'string' ? baseURL.trim() : undefined,
    apiKey: typeof apiKey === 'string' ? apiKey.trim() : undefined,
  });
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.delete('/providers/:key', (req, res) => {
  const result = deleteProvider(req.params.key);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.get('/versions', (_req, res) => {
  const result = listConfigVersions();
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json(result.data);
});

router.post('/versions', (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'version name is required' });
  }
  const result = saveConfigVersion(name.trim());
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json(result.data);
});

router.post('/versions/:filename/load', (req, res) => {
  const result = loadConfigVersion(req.params.filename);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

router.delete('/versions/:filename', (req, res) => {
  const result = deleteConfigVersion(req.params.filename);
  if (result.error) {
    return res.status(500).json({ error: result.error.message });
  }
  return res.json({ success: true });
});

export default router;
