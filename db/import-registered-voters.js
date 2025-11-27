/**
 * Import Registered Voters from CSV
 * Run: node db/import-registered-voters.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
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

async function importRegisteredVoters() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Import Registered Voters from CSV');
    console.log('==============================================\n');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../REGRISTRATION DEMOGRAPHICS.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Error: CSV file not found at:', csvPath);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    console.log(`Reading CSV file... Found ${lines.length} lines\n`);
    
    await client.query('BEGIN');
    
    // Get admin user ID
    const adminResult = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminUserId = adminResult.rows[0]?.id || null;
    
    let processedCount = 0;
    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',');
      if (columns.length < 4) continue;
      
      const regionName = columns[0]?.trim();
      const constituencyName = columns[1]?.trim();
      const stationName = columns[2]?.trim();
      const registered = parseInt(columns[3]?.trim());
      
      if (!regionName || !constituencyName || !stationName || isNaN(registered)) {
        continue;
      }
      
      // Find station by name and constituency
      const stationResult = await client.query(`
        SELECT s.id, s.name, c.name as constituency_name, r.name as region_name
        FROM stations s
        INNER JOIN constituencies c ON s.constituency_id = c.id
        INNER JOIN regions r ON c.region_id = r.id
        WHERE s.name = $1 AND c.name = $2 AND r.name = $3
      `, [stationName, constituencyName, regionName]);
      
      if (stationResult.rows.length === 0) {
        notFoundCount++;
        console.log(`⚠️  Station not found: ${regionName} > ${constituencyName} > ${stationName}`);
        continue;
      }
      
      const station = stationResult.rows[0];
      
      // Insert or update station metadata
      await client.query(`
        INSERT INTO station_metadata (station_id, registered_voters, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (station_id)
        DO UPDATE SET 
          registered_voters = EXCLUDED.registered_voters,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [station.id, registered, adminUserId]);
      
      updatedCount++;
      processedCount++;
      
      if (processedCount % 50 === 0) {
        console.log(`  Processed ${processedCount} stations...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ Import Completed Successfully!');
    console.log('==============================================\n');
    
    console.log('Summary:');
    console.log(`  Total processed: ${processedCount}`);
    console.log(`  Successfully updated: ${updatedCount}`);
    console.log(`  Not found: ${notFoundCount}\n`);
    
    // Get total registered voters
    const totalResult = await client.query('SELECT SUM(registered_voters) as total FROM station_metadata');
    const totalRegistered = parseInt(totalResult.rows[0].total) || 0;
    
    console.log(`📊 Total Registered Voters: ${totalRegistered.toLocaleString()}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importRegisteredVoters();

