/**
 * Add audit_log table and system_settings table
 * Run: node db/add-audit-log.js
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

async function addAuditLog() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Add Audit Log & System Settings');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Create audit_log table
    console.log('Creating audit_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ audit_log table created');
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);');
    console.log('✓ Indexes created');
    
    // Create system_settings table
    console.log('Creating system_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ system_settings table created');
    
    // Insert default settings
    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('system_locked', 'false')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    console.log('✓ Default settings inserted');
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ Audit System Added Successfully!');
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

addAuditLog();

