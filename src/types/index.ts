// Call STatus 
export enum CallStatus {
  QUEUED = 'QUEUED',
  RINGING = 'RINGING',
  ANSWERED = 'ANSWERED',
  UNANSWERED = 'UNANSWERED',
  COMPLETED = 'COMPLETED'
}

// Call
export interface Call {
  id: string;
  from_number: string;
  to_number: string;
  status: CallStatus;
  metadata?: Record<string, any>;
  recording_url?: string | null;
  api_key: string;
  created_at: Date;
  updated_at: Date;
}

// Request - for creating a call
export interface CreateCallRequest {
  from: string;
  to: string;
  metadata?: Record<string, any>;
}

// Response - creating a call
export interface CreateCallResponse {
  call_id: string;
  status: CallStatus;
  websocket_url: string;
  from: string;
  to: string;
  created_at: Date;
}

// Metrics
export interface Metrics {
  total_calls: number;
  active_calls: number;
  completed_calls: number;
  current_cps: number;
  uploads_in_progress: number;
  uploads_completed: number;
}

// WebSocket message
export interface WebSocketMessage {
  call_id: string;
  status: CallStatus;
  timestamp: Date;
}

// Rate limit info
export interface RateLimitInfo {
  concurrent_calls: number;
  calls_in_last_second: number;
}

// API ERRor response
export interface ApiError {
  error: string;
  message: string;
}