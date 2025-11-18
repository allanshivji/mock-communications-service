import { query } from '../config/database';
import { Metrics } from '../types';

// Getting current metrics
export async function getMetrics(): Promise<Metrics> {
  const selectQuery = 'SELECT * FROM metrics LIMIT 1';
  const result = await query(selectQuery);
  
  if (result.rows.length === 0) {
    // Nothing exists
    return {
      total_calls: 0,
      active_calls: 0,
      completed_calls: 0,
      current_cps: 0,
      uploads_in_progress: 0,
      uploads_completed: 0
    };
  }
  
  return result.rows[0] as Metrics;
}

// Incrementing total calls
export async function incrementTotalCalls(): Promise<void> {
  const updateQuery = `
    UPDATE metrics 
    SET total_calls = total_calls + 1, updated_at = NOW()
  `;
  await query(updateQuery);
}

// Updating active calls count
export async function updateActiveCalls(count: number): Promise<void> {
  const updateQuery = `
    UPDATE metrics 
    SET active_calls = $1, updated_at = NOW()
  `;
  await query(updateQuery, [count]);
}

// Incrementing completed calls
export async function incrementCompletedCalls(): Promise<void> {
  const updateQuery = `
    UPDATE metrics 
    SET completed_calls = completed_calls + 1, updated_at = NOW()
  `;
  await query(updateQuery);
}

// Incrementing uploads in progress
export async function incrementUploadsInProgress(): Promise<void> {
  const updateQuery = `
    UPDATE metrics 
    SET uploads_in_progress = uploads_in_progress + 1, updated_at = NOW()
  `;
  await query(updateQuery);
}

// Decrementing uploads in progress and increment completed
export async function completeUpload(): Promise<void> {
  const updateQuery = `
    UPDATE metrics 
    SET 
      uploads_in_progress = GREATEST(uploads_in_progress - 1, 0),
      uploads_completed = uploads_completed + 1,
      updated_at = NOW()
  `;
  await query(updateQuery);
}