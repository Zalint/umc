/**
 * Clear All Fake Election Results
 * Removes all results and station metadata for testing
 * Run: node db/clear-fake-data.js
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gambia_election',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function clearFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Clear All Election Results');
    console.log('==============================================\n');
    
    // Get current counts
    const resultsCount = await client.query('SELECT COUNT(*) FROM results');
    const metadataCount = await client.query('SELECT COUNT(*) FROM station_metadata');
    const attachmentsCount = await client.query('SELECT COUNT(*) FROM result_attachments');
    
    console.log('Current Data:');
    console.log(`  Results: ${resultsCount.rows[0].count} records`);
    console.log(`  Station Metadata: ${metadataCount.rows[0].count} records`);
    console.log(`  Attachments: ${attachmentsCount.rows[0].count} files\n`);
    
    if (parseInt(resultsCount.rows[0].count) === 0) {
      console.log('✓ No data to clear. Database is already empty.\n');
      process.exit(0);
    }
    
    // Ask for confirmation
    const answer = await askQuestion('⚠️  This will DELETE ALL results and metadata. Continue? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Operation cancelled.\n');
      process.exit(0);
    }
    
    console.log('\nClearing data...\n');
    
    await client.query('BEGIN');
    
    // Delete all results
    console.log('Deleting results...');
    await client.query('DELETE FROM results');
    console.log('✓ Results cleared');
    
    // Delete all station metadata
    console.log('Deleting station metadata...');
    await client.query('DELETE FROM station_metadata');
    console.log('✓ Station metadata cleared');
    
    // Note: We keep attachments in case they're needed, but you can uncomment to delete
    // console.log('Deleting attachments...');
    // await client.query('DELETE FROM result_attachments');
    // console.log('✓ Attachments cleared');
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ All Data Cleared Successfully!');
    console.log('==============================================\n');
    
    console.log('Database is now clean and ready for fresh data.\n');
    console.log('📊 Fill fake data: npm run test:fill\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
    client.release();
    await pool.end();
  }
}

clearFakeData();

