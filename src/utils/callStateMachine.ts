import { CallStatus } from '../types';

// Each call automatically follows a randomized path:
// Purpose: Generate random delays between state transitions to simulate real call behavior.
// randomDelay(3, 5) returns a random number between 3 and 5 seconds.
const randomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Define realistic timing for each state transition.
export const STATE_DELAYS = {
  QUEUED_TO_RINGING: { min: 1, max: 2 },
  RINGING_TO_ANSWERED: { min: 3, max: 5 },
  RINGING_TO_UNANSWERED: { min: 3, max: 5 },
  ANSWERED_TO_COMPLETED: { min: 2, max: 4 },
  UNANSWERED_TO_COMPLETED: { min: 1, max: 2 }
};

/* 
Get next state based on current state
Automatically follows a randomized path
  - Math.random() < 0.7 creates randomness
  - 70% of calls are ANSWERED
  - 30% of calls are UNANSWERED

Either answered -> completed or unanswered -> completed
  - Both paths end in COMPLETED
*/
export const getNextState = (currentState: CallStatus): CallStatus | null => {
  switch (currentState) {
    case CallStatus.QUEUED:
      return CallStatus.RINGING;
    
    case CallStatus.RINGING:
      // 70% chance answered, 30% unanswered
      return Math.random() < 0.7 ? CallStatus.ANSWERED : CallStatus.UNANSWERED;
    
    case CallStatus.ANSWERED:
    case CallStatus.UNANSWERED:
      return CallStatus.COMPLETED;
    
    case CallStatus.COMPLETED:
      return null; // Terminal state
    
    default:
      return null;
  }
};

// Given current and next state, return how long to wait (in ms).
export const getStateDelay = (currentState: CallStatus, nextState: CallStatus): number => {
  let delay: { min: number; max: number };
  
  if (currentState === CallStatus.QUEUED && nextState === CallStatus.RINGING) {
    delay = STATE_DELAYS.QUEUED_TO_RINGING;
  } else if (currentState === CallStatus.RINGING && nextState === CallStatus.ANSWERED) {
    delay = STATE_DELAYS.RINGING_TO_ANSWERED;
  } else if (currentState === CallStatus.RINGING && nextState === CallStatus.UNANSWERED) {
    delay = STATE_DELAYS.RINGING_TO_UNANSWERED;
  } else if (currentState === CallStatus.ANSWERED && nextState === CallStatus.COMPLETED) {
    delay = STATE_DELAYS.ANSWERED_TO_COMPLETED;
  } else if (currentState === CallStatus.UNANSWERED && nextState === CallStatus.COMPLETED) {
    delay = STATE_DELAYS.UNANSWERED_TO_COMPLETED;
  } else {
    return 0;
  }
  
  return randomDelay(delay.min, delay.max) * 1000; // Convert to milliseconds
};