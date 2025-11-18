import Bull from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Create queue (like tha of worker)
export const recordingQueue = new Bull('recording-uploads', {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

// Add job to queue
export const enqueueRecordingUpload = async (callId: string, apiKey: string): Promise<void> => {
  try {
    await recordingQueue.add(
      {
        callId,
        apiKey,
      },
      {
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000, // start with 2 second delay
        },
        removeOnComplete: true, // Clean up completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );
    
    console.log(`📥 Enqueued recording upload job for call: ${callId}`);
  } catch (error) {
    console.error(`❌ Failed to enqueue recording upload for call ${callId}:`, error);
    throw error;
  }
};

// Get queue stats (useful for metrics)
export const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    recordingQueue.getWaitingCount(),
    recordingQueue.getActiveCount(),
    recordingQueue.getCompletedCount(),
    recordingQueue.getFailedCount(),
    recordingQueue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
};