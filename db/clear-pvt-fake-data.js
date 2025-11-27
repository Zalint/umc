/**
 * Clear fake data from PVT/Projection stations only
 * Run in Render Shell: node db/clear-pvt-fake-data.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || 
                     (process.env.DB_HOST && process.env.DB_HOST.includes('render.com'));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gambia_election',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function clearPVTFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Clear PVT Stations Fake Data');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Count PVT stations
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM stations WHERE is_projection_station = true`
    );
    
    const pvtCount = parseInt(countResult.rows[0].count);
    console.log(`Found ${pvtCount} PVT stations\n`);
    
    // Delete results from PVT stations only
    const deleteResults = await client.query(
      `DELETE FROM results 
       WHERE station_id IN (
         SELECT id FROM stations WHERE is_projection_station = true
       )`
    );
    
    console.log(`✓ Deleted ${deleteResults.rowCount} result records`);
    
    // Reset blank and spoiled ballots for PVT stations
    const updateMetadata = await client.query(
      `UPDATE station_metadata 
       SET blank_ballots = 0, 
           spoiled_ballots = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE station_id IN (
         SELECT id FROM stations WHERE is_projection_station = true
       )`
    );
    
    console.log(`✓ Reset metadata for ${updateMetadata.rowCount} stations`);
    
    await client.query('COMMIT');
    
    console.log(`\n==============================================`);
    console.log(`  ✅ PVT Fake Data Cleared Successfully!`);
    console.log(`==============================================\n`);
    console.log(`Summary:`);
    console.log(`  - PVT stations affected: ${pvtCount}`);
    console.log(`  - Results deleted: ${deleteResults.rowCount}`);
    console.log(`  - Metadata reset: ${updateMetadata.rowCount}`);
    console.log(`  - Non-PVT stations: UNCHANGED\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearPVTFakeData();

