import { Router } from 'express';
import {
  createAgent,
  getAllAgents,
  getAgent,
  updateAgent,
  deleteAgent
} from '../../db/index.js';
import { saveAgentConfig } from '../../config/omo-writer.js';
import { broadcastAll, createWSMessage } from '../websocket.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const agents = getAllAgents();
    res.json(agents);
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      name,
      project_id = null,
      model_id = null,
      model = 'gpt-4',
      temperature = 0.7,
      top_p = 0.9,
      max_tokens = 4096,
      status = 'idle',
      config_path = null,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const agent = createAgent(name, project_id, model, {
      model_id,
      temperature,
      top_p,
      max_tokens,
      status,
      config_path,
      source: 'ui_created',
    });

    broadcastAll(createWSMessage('agent_created', agent));
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const agent = getAgent(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // First update SQLite
    const success = updateAgent(id, updates);
    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Then sync back to OMO config file
    const agent = getAgent(id);
    if (agent) {
      const omoAgent = {
        name: agent.name,
        model: agent.model,
        temperature: agent.temperature,
        top_p: agent.top_p,
        max_tokens: agent.max_tokens,
      };
      const saveResult = saveAgentConfig(omoAgent);
      if (!saveResult.success) {
        console.error('Failed to sync to OMO config:', saveResult.error);
      } else {
        console.log('Synced agent config to OMO:', saveResult.path);
      }
    }
    
    const updated = getAgent(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const agent = getAgent(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    if (agent.source !== 'ui_created') {
      return res.status(403).json({ error: 'OMO config agents cannot be deleted' });
    }

    const success = deleteAgent(id);
    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    broadcastAll(createWSMessage('agent_deleted', { id }));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router;
