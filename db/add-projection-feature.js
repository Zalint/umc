/**
 * Add projection/sampling feature for election predictions
 * Run: node db/add-projection-feature.js
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

async function addProjectionFeature() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Projection/Sampling Feature');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Add is_projection_station column to stations table
    console.log('Adding is_projection_station column to stations...');
    await client.query(`
      ALTER TABLE stations 
      ADD COLUMN IF NOT EXISTS is_projection_station BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ Column added\n');
    
    // Create index for faster queries
    console.log('Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stations_projection 
      ON stations(is_projection_station) 
      WHERE is_projection_station = TRUE
    `);
    console.log('✓ Index created\n');
    
    // Create projection_settings table for configuration
    console.log('Creating projection_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS projection_settings (
        id SERIAL PRIMARY KEY,
        target_sample_size INTEGER DEFAULT 74,
        confidence_level DECIMAL(3,2) DEFAULT 0.95,
        is_projection_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table created\n');
    
    // Insert default projection settings
    console.log('Inserting default settings...');
    await client.query(`
      INSERT INTO projection_settings (target_sample_size, confidence_level, is_projection_active)
      VALUES (74, 0.95, FALSE)
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Default settings inserted\n');
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Projection Feature Added Successfully!');
    console.log('==============================================\n');
    console.log('Next Steps:');
    console.log('1. Restart your server');
    console.log('2. Go to "Projection Setup" (Admin menu)');
    console.log('3. Select sample stations stratified by region\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addProjectionFeature();

