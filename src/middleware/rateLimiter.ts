import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

// Get rate limit config from environment
const MAX_CONCURRENT_CALLS = parseInt(process.env.MAX_CONCURRENT_CALLS_PER_KEY || '3');
const MAX_CPS = parseInt(process.env.MAX_CPS_PER_KEY || '2');

// Rate limiter middleware
export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.apiKey;
  
  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key not found in request'
    });
    return;
  }
  
  try {
    // Keys for Redis
    const concurrentKey = `concurrent:${apiKey}`;
    const cpsKey = `cps:${apiKey}`;
    
    // FirsTly: Concurrent calls limit
    const concurrentCalls = await redisClient.get(concurrentKey);
    const currentConcurrent = concurrentCalls ? parseInt(concurrentCalls) : 0;
    
    if (currentConcurrent >= MAX_CONCURRENT_CALLS) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum concurrent calls reached (${MAX_CONCURRENT_CALLS})`
      });
      return;
    }
    
    // Secondly: Calls per second limit
    const callsInLastSecond = await redisClient.get(cpsKey);
    const currentCPS = callsInLastSecond ? parseInt(callsInLastSecond) : 0;
    
    if (currentCPS >= MAX_CPS) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Calls per second limit exceeded (${MAX_CPS})`
      });
      return;
    }
    
    // Increment CPS counter (expires in 1 second)
    const cpsCount = await redisClient.incr(cpsKey);
    if (cpsCount === 1) {
      // Set expiry only on first increment
      await redisClient.expire(cpsKey, 1);
    }
    
    // Increment concurrent calls counter
    await redisClient.incr(concurrentKey);
    
    // Store the keys in request for cleanup later
    req.apiKey = apiKey; // Already set, but just to be sure
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Rate limiting check failed'
    });
  }
};

// Helper function to decrement concurrent calls (to use it when call completes)
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