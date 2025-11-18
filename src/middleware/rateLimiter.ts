import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

// Get rate limit config from environment
const MAX_CONCURRENT_CALLS = parseInt(process.env.MAX_CONCURRENT_CALLS_PER_KEY || '3');
const MAX_CPS = parseInt(process.env.MAX_CPS_PER_KEY || '2');

// Rate limiter middleware
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.apiKey;
  
  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key not found in request'
    });
    return;
  }
  
  try {
    const concurrentKey = `concurrent:${apiKey}`;
    const cpsKey = `cps:${apiKey}`;
    
    //Firstly: Concurrent calls limit (ATOMIC INCREMENT)
    const newConcurrentCount = await redisClient.incr(concurrentKey);
    
    if (newConcurrentCount > MAX_CONCURRENT_CALLS) {
      // if Exceeded limit, decrement back
      await redisClient.decr(concurrentKey);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum concurrent calls reached (${MAX_CONCURRENT_CALLS})`
      });
      return;
    }
    
    // Secondly: Calls per second limit
    const cpsCount = await redisClient.incr(cpsKey);
    
    if (cpsCount === 1) {
      // First call in this second, set expiry
      await redisClient.expire(cpsKey, 1);
    }
    
    if (cpsCount > MAX_CPS) {
      // Exceeded CPS limit, decrement concurrent counter
      await redisClient.decr(concurrentKey);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Calls per second limit exceeded (${MAX_CPS})`
      });
      return;
    }
    
    // Both checks passed
    next();
    
  } catch (error) {
    console.error('Rate limiter error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Rate limiting check failed'
    });
  }
};

// Helper function to decrement concurrent calls (call this when call completes)
export const decrementConcurrentCalls = async (apiKey: string): Promise<void> => {
  try {
    const concurrentKey = `concurrent:${apiKey}`;
    const current = await redisClient.get(concurrentKey);
    
    if (current && parseInt(current) > 0) {
      await redisClient.decr(concurrentKey);
    }
  } catch (error) {
    console.error('Error decrementing concurrent calls:', error);
  }
};