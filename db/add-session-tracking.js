/**
 * Add session tracking for active users
 * Run: node db/add-session-tracking.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gambia_election',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function addSessionTracking() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Session Tracking');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Create user_sessions table
    console.log('Creating user_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table created\n');
    
    // Create index for faster queries
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
      ON user_sessions(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_active 
      ON user_sessions(is_active) 
      WHERE is_active = TRUE
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token 
      ON user_sessions(token_hash)
    `);
    console.log('✓ Indexes created\n');
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Session Tracking Added Successfully!');
    console.log('==============================================\n');
    console.log('Next Steps:');
    console.log('1. Restart your server');
    console.log('2. Go to "Active Sessions" (Admin/Manager menu)');
    console.log('3. See who is currently logged in\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addSessionTracking();

