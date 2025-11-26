/**
 * Quick Clear All Fake Election Results (No Confirmation)
 * Run: node db/clear-fake-data-quick.js
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

async function clearFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Clear All Election Results');
    console.log('==============================================\n');
    
    // Get current counts
    const resultsCount = await client.query('SELECT COUNT(*) FROM results');
    const metadataCount = await client.query('SELECT COUNT(*) FROM station_metadata');
    
    console.log('Current Data:');
    console.log(`  Results: ${resultsCount.rows[0].count} records`);
    console.log(`  Station Metadata: ${metadataCount.rows[0].count} records\n`);
    
    if (parseInt(resultsCount.rows[0].count) === 0) {
      console.log('✓ No data to clear. Database is already empty.\n');
      process.exit(0);
    }
    
    console.log('Clearing data...\n');
    
    await client.query('BEGIN');
    
    // Delete all results
    console.log('Deleting results...');
    await client.query('DELETE FROM results');
    console.log('✓ Results cleared');
    
    // Delete all station metadata
    console.log('Deleting station metadata...');
    await client.query('DELETE FROM station_metadata');
    console.log('✓ Station metadata cleared');
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ All Data Cleared Successfully!');
    console.log('==============================================\n');
    
    console.log('Database is now clean and ready for fresh data.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearFakeData();

