/**
 * Production User Seeding Script
 * Creates essential default users for production deployment
 * Run: node db/seed-users-prod.js
 * 
 * IMPORTANT: Change these passwords immediately after first login!
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

// Default users for production
const DEFAULT_USERS = [
  {
    email: 'admin@election.gm',
    password: 'Admin@2024!Change', // Strong temporary password
    full_name: 'System Administrator',
    role: 'admin'
  },
  {
    email: 'manager@election.gm',
    password: 'Manager@2024!Change',
    full_name: 'Election Manager',
    role: 'manager'
  },
  {
    email: 'reader@election.gm',
    password: 'Reader@2024!View',
    full_name: 'Results Reader',
    role: 'reader'
  }
];

async function seedUsers() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Production User Seeding');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    console.log('Creating default users...\n');
    
    for (const user of DEFAULT_USERS) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) 
         DO UPDATE SET 
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, email, full_name, role`,
        [user.email, passwordHash, user.full_name, user.role]
      );
      
      const username = result.rows[0].email.split('@')[0];
      console.log(`✓ ${result.rows[0].full_name} (${username})`);
      console.log(`  Email: ${result.rows[0].email}`);
      console.log(`  Role: ${result.rows[0].role}`);
      console.log(`  Temp Password: ${user.password}`);
      console.log('');
    }
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Users Created Successfully!');
    console.log('==============================================\n');
    
    console.log('⚠️  SECURITY NOTICE:');
    console.log('  1. Login with the credentials above');
    console.log('  2. IMMEDIATELY change all passwords!');
    console.log('  3. Go to: Manage Users → Click user → Update password\n');
    
    console.log('Login Instructions:');
    console.log('  - You can use just the username (e.g., "admin")');
    console.log('  - Or full email (e.g., "admin@election.gm")\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedUsers();

