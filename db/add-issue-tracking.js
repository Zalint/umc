/**
 * Add issue tracking fields to station_metadata
 * Run: node db/add-issue-tracking.js
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

async function addIssueTracking() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Issue Tracking Fields');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Add has_issue and issue_comment columns
    console.log('Adding has_issue column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS has_issue BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ has_issue column added\n');
    
    console.log('Adding issue_comment column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS issue_comment TEXT
    `);
    console.log('✓ issue_comment column added\n');
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Issue Tracking Fields Added Successfully!');
    console.log('==============================================\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addIssueTracking();

