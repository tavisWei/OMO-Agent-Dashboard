import { Router } from 'express';
import { getTokenStats, getModelDistribution } from '../opencode-reader.js';

const router = Router();

// GET /api/analytics/token-stats?days=7
router.get('/token-stats', (req, res) => {
  const daysParam = typeof req.query.days === 'string' ? Number.parseInt(req.query.days, 10) : 7;
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7;
  const result = getTokenStats(days);

  if (result.error) {
    return res.status(500).json({ error: result.error.message, data: [] });
  }

  return res.json(result.data);
});

// GET /api/analytics/model-distribution?days=30
router.get('/model-distribution', (req, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const result = getModelDistribution(days);

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    res.json({
      rows: result.data,
      days,
    });
  } catch (error) {
    console.error('Error getting model distribution:', error);
    res.status(500).json({ error: 'Failed to get model distribution' });
  }
});

export default router;
