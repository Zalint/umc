/**
 * Add is_active column to users table
 * Run: node db/add-user-active-status.js
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

async function addUserActiveStatus() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add is_active Column to Users');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Add is_active column
    console.log('Adding is_active column...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);
    console.log('✓ is_active column added');
    
    // Update existing users to be active
    await client.query(`UPDATE users SET is_active = true WHERE is_active IS NULL`);
    console.log('✓ Existing users set to active');
    
    // Create index
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);');
    console.log('✓ Index created');
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ User Active Status Added Successfully!');
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

addUserActiveStatus();

