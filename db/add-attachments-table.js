/**
 * Script to add result_attachments table
 * Run: node db/add-attachments-table.js
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

async function addAttachmentsTable() {
  try {
    console.log('Adding result_attachments table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS result_attachments (
          id SERIAL PRIMARY KEY,
          station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          uploaded_by INTEGER REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT
      );
    `);
    
    console.log('✓ Table created');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_result_attachments_station ON result_attachments(station_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_result_attachments_uploaded_by ON result_attachments(uploaded_by);');
    
    console.log('✓ Indexes created');
    
    await pool.query("COMMENT ON TABLE result_attachments IS 'Photos/scans of procès verbal (official tally sheets)';");
    
    console.log('✓ Comment added');
    console.log('\n✅ result_attachments table added successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addAttachmentsTable();

