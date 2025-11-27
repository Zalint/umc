/**
 * Set Production Passwords
 * Admin: T@libeZal1601738
 * Others: T@libe4P
 * 
 * Run in Render Shell: node db/set-prod-passwords.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

const users = [
  { email: 'admin@election.gm', password: 'T@libeZal1601738', name: 'Admin' },
  { email: 'manager@election.gm', password: 'T@libe4P', name: 'Manager' },
  { email: 'member@election.gm', password: 'T@libe4P', name: 'Member' },
  { email: 'reader@election.gm', password: 'T@libe4P', name: 'Reader' }
];

async function setPasswords() {
  try {
    console.log('==============================================');
    console.log('  Setting Production Passwords');
    console.log('==============================================\n');
    
    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      
      const result = await pool.query(
        `UPDATE users 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE email = $2
         RETURNING email, full_name`,
        [hash, user.email]
      );
      
      if (result.rows.length > 0) {
        const username = user.email.split('@')[0];
        console.log(`✓ ${user.name} (${username})`);
        console.log(`  Password: ${user.password}\n`);
      } else {
        console.log(`⚠ ${user.name} not found (${user.email})\n`);
      }
    }
    
    console.log('==============================================');
    console.log('  ✅ Passwords Updated Successfully!');
    console.log('==============================================\n');
    
    console.log('Login credentials:');
    console.log('  Admin:   admin   / T@libeZal1601738');
    console.log('  Manager: manager / T@libe4P');
    console.log('  Member:  member  / T@libe4P');
    console.log('  Reader:  reader  / T@libe4P\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setPasswords();

