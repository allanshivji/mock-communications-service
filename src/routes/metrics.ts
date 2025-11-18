import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getTotalCallsCount, 
  getAllActiveCallsCount, 
  getCompletedCallsCount 
} from '../models/Call';
import { getMetrics } from '../models/Metrics';
import { redisClient } from '../config/redis';

const router = Router();

// GET /metrics - Get system metrics
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const dbMetrics = await getMetrics();
    
    // Getting real-time counts from database (more accurate than cached metrics)
    const totalCalls = await getTotalCallsCount();
    const activeCalls = await getAllActiveCallsCount();
    const completedCalls = await getCompletedCallsCount();
    
    // Calculate current CPS (calls in the last second across all API keys)
    const cpsKeys = await redisClient.keys('cps:*');
    let currentCPS = 0;
    
    for (const key of cpsKeys) {
      const count = await redisClient.get(key);
      if (count) {
        currentCPS += parseInt(count);
      }
    }
    
    // Return metrics
    return res.json({
      total_calls: totalCalls,
      active_calls: activeCalls,
      completed_calls: completedCalls,
      current_cps: currentCPS,
      uploads_in_progress: dbMetrics.uploads_in_progress,
      uploads_completed: dbMetrics.uploads_completed
    });
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch metrics'
    });
  }
});

export default router;