import { redisClient } from '../config/redis';
import { 
  createCall, 
  updateCallStatus, 
  findCallById,
  getActiveCallsCount 
} from '../models/Call';
import { 
  incrementTotalCalls, 
  updateActiveCalls 
} from '../models/Metrics';
import { CallStatus, CreateCallRequest, Call } from '../types';
import { getNextState, getStateDelay } from '../utils/callStateMachine';
import { broadcastCallUpdate } from './websocketService';
import { decrementConcurrentCalls } from '../middleware/rateLimiter';

// Store call state in Redis
const storeCallStateInRedis = async (callId: string, status: CallStatus): Promise<void> => {
  const key = `call:${callId}`;
  await redisClient.set(key, status, { EX: 3600 }); // Expire in 1 hour
};

// Get call state from Redis
export const getCallStateFromRedis = async (callId: string): Promise<CallStatus | null> => {
  const key = `call:${callId}`;
  const status = await redisClient.get(key);
  return status as CallStatus | null;
};

// Process state transitions for a call
const processCallStateTransitions = async (callId: string, apiKey: string): Promise<void> => {
  try {
    let currentCall = await findCallById(callId);
    
    if (!currentCall) {
      console.error(`Call ${callId} not found`);
      return;
    }
    
    let currentStatus = currentCall.status as CallStatus;
    
    // Keep transitioning until we reach COMPLETED
    while (currentStatus !== CallStatus.COMPLETED) {
      const nextStatus = getNextState(currentStatus);
      
      if (!nextStatus) {
        break; // No more transitions
      }
      
      // Wait for the appropriate delay
      const delay = getStateDelay(currentStatus, nextStatus);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Update status in database
      await updateCallStatus(callId, nextStatus);
      
      // Update status in Redis
      await storeCallStateInRedis(callId, nextStatus);
      
      // Broadcast via WebSocket
      broadcastCallUpdate(callId, nextStatus);
      
      console.log(`Call ${callId}: ${currentStatus} → ${nextStatus}`);
      
      currentStatus = nextStatus;
    }
    
    // Call completed - decrement concurrent calls counter
    await decrementConcurrentCalls(apiKey);
    
    // Update active calls count in metrics
    const activeCount = await getActiveCallsCount(apiKey);
    await updateActiveCalls(activeCount);
    
    console.log(`✅ Call ${callId} completed`);
    
  } catch (error) {
    console.error(`Error processing call ${callId}:`, error);
    await decrementConcurrentCalls(apiKey);
  }
};

// Create and initiate a new call
export const initiateCall = async (
  data: CreateCallRequest, 
  apiKey: string
): Promise<Call> => {
  // Create call in database
  const call = await createCall(data, apiKey);
  
  // Store initial state in Redis
  await storeCallStateInRedis(call.id, CallStatus.QUEUED);
  
  // Increment total calls metric
  await incrementTotalCalls();
  
  // Update active calls count
  const activeCount = await getActiveCallsCount(apiKey);
  await updateActiveCalls(activeCount);
  
  // Start state transition process asynchronously (don't await)
  processCallStateTransitions(call.id, apiKey).catch(error => {
    console.error(`Failed to process call ${call.id}:`, error);
  });
  
  return call;
};