/**
 * Migration Script: Add Groups and Members Feature
 * Adds groups, user_groups, and members tables
 * Assigns default groups to existing users
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Adding Groups and Members Feature');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // ============================================
    // 1. Create Groups Table
    // ============================================
    console.log('Creating groups table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index
    await client.query('CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name)');
    console.log('  ✓ Groups table created\n');
    
    // ============================================
    // 2. Seed Groups
    // ============================================
    console.log('Seeding groups...');
    await client.query(`
      INSERT INTO groups (name, description) 
      VALUES 
        ('Election', 'Election management and results collection'),
        ('Membership', 'Member registration and management')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('  ✓ Groups seeded\n');
    
    // ============================================
    // 3. Create User Groups Junction Table
    // ============================================
    console.log('Creating user_groups table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, group_id)
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_groups_user ON user_groups(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(group_id)');
    console.log('  ✓ User groups table created\n');
    
    // ============================================
    // 4. Create Members Table
    // ============================================
    console.log('Creating members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
        sexe VARCHAR(20) NOT NULL CHECK (sexe IN ('Male', 'Female', 'Other')),
        occupation VARCHAR(255) NOT NULL,
        station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
        constituency_id INTEGER REFERENCES constituencies(id) ON DELETE SET NULL,
        region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
        comment TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_members_station ON members(station_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_members_constituency ON members(constituency_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_members_region ON members(region_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by)');
    console.log('  ✓ Members table created\n');
    
    // ============================================
    // 5. Add Trigger for Members Updated At
    // ============================================
    console.log('Adding trigger for members updated_at...');
    await client.query(`
      CREATE TRIGGER update_members_updated_at 
      BEFORE UPDATE ON members
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('  ✓ Trigger created\n');
    
    // ============================================
    // 6. Assign Groups to Existing Users
    // ============================================
    console.log('Assigning groups to existing users...');
    
    // Get group IDs
    const electionGroup = await client.query("SELECT id FROM groups WHERE name = 'Election'");
    const membershipGroup = await client.query("SELECT id FROM groups WHERE name = 'Membership'");
    
    const electionGroupId = electionGroup.rows[0].id;
    const membershipGroupId = membershipGroup.rows[0].id;
    
    // Get all users
    const users = await client.query('SELECT id, role FROM users');
    
    for (const user of users.rows) {
      if (user.role === 'admin') {
        // Admin gets both groups
        await client.query(
          'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING',
          [user.id, electionGroupId, membershipGroupId]
        );
        console.log(`  ✓ Admin user ${user.id} assigned to both groups`);
      } else {
        // Other users get Election group by default
        await client.query(
          'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, electionGroupId]
        );
        console.log(`  ✓ User ${user.id} assigned to Election group`);
      }
    }
    
    console.log('\n  ✓ All users assigned to groups\n');
    
    await client.query('COMMIT');
    
    console.log('==============================================');
    console.log('  ✅ Migration Completed Successfully!');
    console.log('==============================================\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

