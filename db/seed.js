/**
 * Database Seed Script
 * Imports geographic data from CSV and creates initial users
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || 
                     (process.env.DB_HOST && process.env.DB_HOST.includes('render.com'));

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gambia_election',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }
  
  return rows;
}

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seed...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // ============================================
    // 1. Create Initial Users
    // ============================================
    console.log('Creating initial users...');
    
    const users = [
      {
        email: 'admin@election.gm',
        password: 'admin123',
        full_name: 'System Administrator',
        role: 'admin'
      },
      {
        email: 'manager@election.gm',
        password: 'manager123',
        full_name: 'Election Manager',
        role: 'manager'
      },
      {
        email: 'member@election.gm',
        password: 'member123',
        full_name: 'Election Member',
        role: 'member'
      },
      {
        email: 'reader@election.gm',
        password: 'reader123',
        full_name: 'Results Reader',
        role: 'reader'
      }
    ];
    
    for (const user of users) {
      const password_hash = await bcrypt.hash(user.password, 10);
      await client.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [user.email, password_hash, user.full_name, user.role]
      );
      console.log(`  ✓ Created user: ${user.email}`);
    }
    
    // ============================================
    // 2. Import Geographic Data from CSV
    // ============================================
    console.log('\nImporting geographic data from CSV...');
    
    const csvPath = path.join(__dirname, '../REGRISTRATION DEMOGRAPHICS_STATIC.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.warn(`  ⚠ CSV file not found: ${csvPath}`);
      console.warn('  Skipping geographic data import.');
    } else {
      const data = parseCSV(csvPath);
      console.log(`  Found ${data.length} records in CSV`);
      
      // Extract unique regions, constituencies, and stations
      const regionsMap = new Map();
      const constituenciesMap = new Map();
      const stationsSet = new Set();
      
      data.forEach(row => {
        if (row.Region && row.Constituency && row.Station) {
          // Store region
          if (!regionsMap.has(row.Region)) {
            regionsMap.set(row.Region, {
              name: row.Region,
              code: row.Region.toLowerCase().replace(/\s+/g, '_')
            });
          }
          
          // Store constituency with region
          const constituencyKey = `${row.Region}|${row.Constituency}`;
          if (!constituenciesMap.has(constituencyKey)) {
            constituenciesMap.set(constituencyKey, {
              region: row.Region,
              name: row.Constituency,
              code: row.Constituency.toLowerCase().replace(/\s+/g, '_')
            });
          }
          
          // Store station
          const stationKey = `${row.Region}|${row.Constituency}|${row.Station}`;
          stationsSet.add(stationKey);
        }
      });
      
      console.log(`  • ${regionsMap.size} unique regions`);
      console.log(`  • ${constituenciesMap.size} unique constituencies`);
      console.log(`  • ${stationsSet.size} unique stations`);
      
      // Insert regions
      console.log('\n  Inserting regions...');
      const regionIdMap = new Map();
      for (const [regionName, region] of regionsMap) {
        const result = await client.query(
          'INSERT INTO regions (name, code) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code RETURNING id',
          [region.name, region.code]
        );
        regionIdMap.set(regionName, result.rows[0].id);
      }
      console.log(`    ✓ Inserted ${regionIdMap.size} regions`);
      
      // Insert constituencies
      console.log('  Inserting constituencies...');
      const constituencyIdMap = new Map();
      for (const [key, constituency] of constituenciesMap) {
        const regionId = regionIdMap.get(constituency.region);
        if (regionId) {
          const result = await client.query(
            `INSERT INTO constituencies (region_id, name, code) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (region_id, name) DO UPDATE SET code = EXCLUDED.code 
             RETURNING id`,
            [regionId, constituency.name, constituency.code]
          );
          constituencyIdMap.set(key, result.rows[0].id);
        }
      }
      console.log(`    ✓ Inserted ${constituencyIdMap.size} constituencies`);
      
      // Insert stations
      console.log('  Inserting stations...');
      let stationCount = 0;
      for (const stationKey of stationsSet) {
        const [regionName, constituencyName, stationName] = stationKey.split('|');
        const constituencyKey = `${regionName}|${constituencyName}`;
        const constituencyId = constituencyIdMap.get(constituencyKey);
        
        if (constituencyId) {
          // Truncate code to 50 characters if needed
          const code = stationName.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
          await client.query(
            `INSERT INTO stations (constituency_id, name, code) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (constituency_id, name) DO NOTHING`,
            [constituencyId, stationName, code]
          );
          stationCount++;
        }
      }
      console.log(`    ✓ Inserted ${stationCount} stations`);
    }
    
    // ============================================
    // 3. Create Participant Categories
    // ============================================
    console.log('\nCreating participant categories...');
    
    const categories = [
      { name: 'Political Party', description: 'Registered political party' },
      { name: 'Movement', description: 'Political movement' },
      { name: 'Coalition', description: 'Coalition of parties/movements' },
      { name: 'Independent', description: 'Independent candidate' }
    ];
    
    const categoryIdMap = new Map();
    for (const category of categories) {
      const result = await client.query(
        'INSERT INTO participant_categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id',
        [category.name, category.description]
      );
      categoryIdMap.set(category.name, result.rows[0].id);
      console.log(`  ✓ Created category: ${category.name}`);
    }
    
    // ============================================
    // 4. Create Sample Participants
    // ============================================
    console.log('\nCreating sample participants...');
    
    const politicalPartyId = categoryIdMap.get('Political Party');
    const movementId = categoryIdMap.get('Movement');
    const independentId = categoryIdMap.get('Independent');
    
    const participants = [
      { category_id: politicalPartyId, name: 'United Democratic Party', short_name: 'UDP', display_order: 1 },
      { category_id: politicalPartyId, name: 'Alliance for Patriotic Reorientation and Construction', short_name: 'APRC', display_order: 2 },
      { category_id: politicalPartyId, name: 'National People\'s Party', short_name: 'NPP', display_order: 3 },
      { category_id: politicalPartyId, name: 'Gambia Democratic Congress', short_name: 'GDC', display_order: 4 },
      { category_id: politicalPartyId, name: 'People\'s Democratic Organisation for Independence and Socialism', short_name: 'PDOIS', display_order: 5 },
      { category_id: movementId, name: 'Unite Movement Gambia', short_name: 'UMG', display_order: 6 },
      { category_id: independentId, name: 'Independent Candidates', short_name: 'IND', display_order: 99 }
    ];
    
    for (const participant of participants) {
      await client.query(
        `INSERT INTO participants (category_id, name, short_name, display_order) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, display_order = EXCLUDED.display_order`,
        [participant.category_id, participant.name, participant.short_name, participant.display_order]
      );
      console.log(`  ✓ Created participant: ${participant.name} (${participant.short_name})`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Database seed completed successfully!');
    console.log('\nDefault user credentials:');
    console.log('  Admin:   admin@election.gm / admin123');
    console.log('  Manager: manager@election.gm / manager123');
    console.log('  Member:  member@election.gm / member123');
    console.log('  Reader:  reader@election.gm / reader123');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

