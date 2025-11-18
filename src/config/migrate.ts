import { pool } from './database';

const createCallsTable = `
  CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    metadata JSONB DEFAULT '{}',
    recording_url TEXT,
    api_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
  CREATE INDEX IF NOT EXISTS idx_calls_api_key ON calls(api_key);
  CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
`;

const createMetricsTable = `
  CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    total_calls INTEGER DEFAULT 0,
    active_calls INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    uploads_completed INTEGER DEFAULT 0,
    uploads_in_progress INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const insertInitialMetrics = `
  INSERT INTO metrics (total_calls, active_calls, completed_calls, uploads_completed, uploads_in_progress)
  SELECT 0, 0, 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM metrics LIMIT 1);
`;

export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');
  
  try {
    // calls table
    await pool.query(createCallsTable);
    console.log('✅ Calls table created/verified');

    // Creating indexes
    await pool.query(createIndexes);
    console.log('✅ Indexes created/verified');

    //Creating Metrics table
    await pool.query(createMetricsTable);
    console.log('✅ Metrics table created/verified');

    // Inserting initial metrics row
    await pool.query(insertInitialMetrics);
    console.log('✅ Initial metrics row created/verified');

    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
