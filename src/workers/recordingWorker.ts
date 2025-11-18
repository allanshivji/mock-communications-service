import Bull from 'bull';
import dotenv from 'dotenv';
import { updateCallRecordingUrl } from '../models/Call';
import { incrementUploadsInProgress, completeUpload } from '../models/Metrics';
import { uploadRecordingToS3 } from '../services/s3Service';
import { pool } from '../config/database';

dotenv.config();

// Redis for bulL
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Create queue
const recordingQueue = new Bull('recording-uploads', {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

console.log('🔄 Recording worker starting...');
console.log(`📡 Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

// Process jobs
recordingQueue.process(async (job) => {
  const { callId, apiKey } = job.data;
  
  console.log(`📤 [Job ${job.id}] Processing recording upload for call: ${callId}`);
  
  try {
    await incrementUploadsInProgress();
    
    // Upload recording to S3 (mock)
    console.log(`📤 [Job ${job.id}] Uploading recording to S3...`);
    const recordingUrl = await uploadRecordingToS3(callId);
    
    // Update call with recording URL
    console.log(`📤 [Job ${job.id}] Updating call record with URL: ${recordingUrl}`);
    await updateCallRecordingUrl(callId, recordingUrl);
    
    // Complete upload metric
    await completeUpload();
    
    console.log(`✅ [Job ${job.id}] Recording upload completed for call: ${callId}`);
    
    return { success: true, recordingUrl };
    
  } catch (error) {
    console.error(`❌ [Job ${job.id}] Failed to process recording upload:`, error);
    
    // Decrement uploads in progress on error
    await completeUpload();
    
    throw error; // Bull will retry or mark as failed
  }
});

// Event listeners
recordingQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully:`, result);
});

recordingQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

recordingQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

// properly shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker...');
  await recordingQueue.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down worker...');
  await recordingQueue.close();
  await pool.end();
  process.exit(0);
});

console.log('✅ Recording worker ready and waiting for jobs...');