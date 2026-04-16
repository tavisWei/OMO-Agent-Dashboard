import { Router } from 'express';
import { cleanupHistoricalData } from '../../db/cleanup.js';

const router = Router();

router.post('/', (_req, res) => {
  try {
    const deleted = cleanupHistoricalData();
    res.json({
      success: true,
      message: 'Historical dashboard data cleaned up successfully',
      deleted,
    });
  } catch (error) {
    console.error('Error cleaning up historical data:', error);
    res.status(500).json({ error: 'Failed to clean up historical data' });
  }
});

export default router;
