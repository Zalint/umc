/**
 * Add issue tracking and comments to station metadata
 * Run: node db/add-station-comments.js
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

async function addStationComments() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Issue Tracking & Comments');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Add has_issue column
    console.log('Adding has_issue column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS has_issue BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ has_issue column added\n');
    
    // Add issue_comment column
    console.log('Adding issue_comment column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS issue_comment TEXT
    `);
    console.log('✓ issue_comment column added\n');
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Issue Tracking Added Successfully!');
    console.log('==============================================\n');
    console.log('Features:');
    console.log('- Checkbox for reporting issues');
    console.log('- Text field for comments/notes');
    console.log('- Comment required when issue is reported');
    console.log('- Optional comments for normal situations\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addStationComments();

