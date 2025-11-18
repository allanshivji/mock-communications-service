import fs from 'fs';
import path from 'path';

// Mock S3 bucket name from environment
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'mock-recordings-bucket';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Mock S3 upload function
export const uploadRecordingToS3 = async (callId: string): Promise<string> => {
  console.log(`📤 Starting mock upload for call ${callId}...`);
  
  // Simulating upload delay (2-3 seconds)
  const delay = Math.floor(Math.random() * 1000) + 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Check if mock recording file exists (optional validation)
  const mockFilePath = path.join(__dirname, '../../mock_recording.mp3');
  
  if (fs.existsSync(mockFilePath)) {
    console.log(`✅ Mock recording file found: ${mockFilePath}`);
  } else {
    console.warn(`⚠️ Mock recording file not found, but continuing with mock upload`);
  }
  
  // Generate mock S3 URL
  const mockUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/recordings/${callId}.mp3`;
  
  console.log(`✅ Mock upload completed for call ${callId}`);
  console.log(`📍 Mock S3 URL: ${mockUrl}`);
  
  return mockUrl;
};

// Validate if S3 is configured (will always returns true for mock)
export const isS3Configured = (): boolean => {
  return true; // Mock service is always "configured"
};