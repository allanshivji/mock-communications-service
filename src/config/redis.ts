import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client with proper typing
export const redisClient: RedisClientType = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

// Error handling
redisClient.on('error', (err: Error) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};