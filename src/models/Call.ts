import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { Call, CallStatus, CreateCallRequest } from '../types';

// Creating new call
export async function createCall(data: CreateCallRequest, apiKey: string): Promise<Call> {
  const id = uuidv4();
  const status = CallStatus.QUEUED;
  
  const insertQuery = `
    INSERT INTO calls (id, from_number, to_number, status, metadata, api_key, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;
  
  const values = [
    id,
    data.from,
    data.to,
    status,
    JSON.stringify(data.metadata || {}),
    apiKey
  ];
  
  const result = await query(insertQuery, values);
  return result.rows[0] as Call;
}

// Geting cAll by ID
export async function findCallById(id: string): Promise<Call | null> {
  const selectQuery = 'SELECT * FROM calls WHERE id = $1';
  const result = await query(selectQuery, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Call;
}

// Updating call status
export async function updateCallStatus(id: string, status: CallStatus): Promise<Call | null> {
  const updateQuery = `
    UPDATE calls 
    SET status = $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING *
  `;
  
  const result = await query(updateQuery, [status, id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Call;
}

// Updating recording URL
export async function updateCallRecordingUrl(id: string, recordingUrl: string): Promise<Call | null> {
  const updateQuery = `
    UPDATE calls 
    SET recording_url = $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING *
  `;
  
  const result = await query(updateQuery, [recordingUrl, id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Call;
}

// Geting active calls count for an API key
export async function getActiveCallsCount(apiKey: string): Promise<number> {
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM calls 
    WHERE api_key = $1 
    AND status NOT IN ($2, $3)
  `;
  
  const result = await query(countQuery, [apiKey, CallStatus.COMPLETED, CallStatus.UNANSWERED]);
  return parseInt(result.rows[0].count);
}

// Get all calls (for metrics)
export async function getTotalCallsCount(): Promise<number> {
  const countQuery = 'SELECT COUNT(*) as count FROM calls';
  const result = await query(countQuery);
  return parseInt(result.rows[0].count);
}

// Get active calls count (all API keys)
export async function getAllActiveCallsCount(): Promise<number> {
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM calls 
    WHERE status NOT IN ($1, $2)
  `;
  
  const result = await query(countQuery, [CallStatus.COMPLETED, CallStatus.UNANSWERED]);
  return parseInt(result.rows[0].count);
}

// Get completed calls count
export async function getCompletedCallsCount(): Promise<number> {
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM calls 
    WHERE status = $1
  `;
  
  const result = await query(countQuery, [CallStatus.COMPLETED]);
  return parseInt(result.rows[0].count);
}