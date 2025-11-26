/**
 * Add blank_ballots and spoiled_ballots columns to station_metadata
 * Run: node db/add-blank-spoiled-ballots.js
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

async function addBlankSpoiledBallots() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Blank & Spoiled Ballots Columns');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Add columns
    console.log('Adding blank_ballots column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS blank_ballots INTEGER DEFAULT 0
    `);
    console.log('✓ blank_ballots column added');
    
    console.log('Adding spoiled_ballots column...');
    await client.query(`
      ALTER TABLE station_metadata 
      ADD COLUMN IF NOT EXISTS spoiled_ballots INTEGER DEFAULT 0
    `);
    console.log('✓ spoiled_ballots column added');
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ Columns Added Successfully!');
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

addBlankSpoiledBallots();

