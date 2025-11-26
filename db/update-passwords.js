/**
 * Update user passwords
 * 
 * IMPORTANT: This script uses default passwords.
 * Change the passwords below or use environment variables in production.
 * 
 * Run: node db/update-passwords.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gambia_election',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function updatePasswords() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Update User Passwords');
    console.log('==============================================\n');
    
    // Define passwords
    const adminPassword = 'T@libeZal1601738';
    const regularPassword = 'T@libe4P';
    
    // Hash passwords
    console.log('Hashing passwords...');
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const regularHash = await bcrypt.hash(regularPassword, 10);
    console.log('✓ Passwords hashed\n');
    
    await client.query('BEGIN');
    
    // Update admin password
    console.log('Updating admin password...');
    const adminResult = await client.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE role = 'admin'
       RETURNING email`,
      [adminHash]
    );
    
    if (adminResult.rows.length > 0) {
      adminResult.rows.forEach(row => {
        const username = row.email.split('@')[0];
        console.log(`  ✓ ${username} (admin) → T@libeZal1601738`);
      });
    }
    
    // Update all other users' passwords
    console.log('\nUpdating other users passwords...');
    const othersResult = await client.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE role != 'admin'
       RETURNING email, role`,
      [regularHash]
    );
    
    if (othersResult.rows.length > 0) {
      othersResult.rows.forEach(row => {
        const username = row.email.split('@')[0];
        console.log(`  ✓ ${username} (${row.role}) → T@libe4P`);
      });
    } else {
      console.log('  (No non-admin users found)');
    }
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ Passwords Updated Successfully!');
    console.log('==============================================\n');
    console.log('Summary:');
    console.log(`  Admin users: ${adminResult.rows.length} updated`);
    console.log(`  Other users: ${othersResult.rows.length} updated`);
    console.log(`  Total: ${adminResult.rows.length + othersResult.rows.length} users updated\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updatePasswords();

