/**
 * Fill ONLY PVT/Projection Stations with Fake Data
 * - United Movement for Change wins (50-55%)
 * - National People's Party second (35-40%)
 * - Other parties share remaining votes
 * 
 * Run in Render Shell: node db/fill-pvt-fake-data.js
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

async function fillPVTFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Fill PVT Stations with Fake Data');
    console.log('==============================================\n');
    
    // Get admin user ID
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const adminUserId = adminResult.rows[0].id;
    console.log(`✓ Using admin user ID: ${adminUserId}\n`);
    
    // Get UMC participant
    const umcResult = await client.query(
      `SELECT id FROM participants WHERE name ILIKE '%United Movement for Change%' LIMIT 1`
    );
    
    if (umcResult.rows.length === 0) {
      throw new Error('United Movement for Change not found');
    }
    
    const umcId = umcResult.rows[0].id;
    console.log(`✓ Found United Movement for Change (ID: ${umcId})`);
    
    // Check if NPP exists, if not, create it
    let nppResult = await client.query(
      `SELECT id FROM participants WHERE name ILIKE '%National People%s Party%' LIMIT 1`
    );
    
    let nppId;
    if (nppResult.rows.length === 0) {
      console.log('⚠ National People\'s Party not found, creating it...');
      
      // Get Political Party category
      const categoryResult = await client.query(
        `SELECT id FROM participant_categories WHERE name = 'Political Party' LIMIT 1`
      );
      
      const categoryId = categoryResult.rows[0].id;
      
      const createNppResult = await client.query(
        `INSERT INTO participants (category_id, name, short_name, is_active, display_order, created_by)
         VALUES ($1, 'National People''s Party', 'NPP', true, 8, $2)
         RETURNING id`,
        [categoryId, adminUserId]
      );
      
      nppId = createNppResult.rows[0].id;
      console.log(`✓ Created National People's Party (ID: ${nppId})`);
    } else {
      nppId = nppResult.rows[0].id;
      console.log(`✓ Found National People's Party (ID: ${nppId})`);
    }
    
    // Get all other active participants
    const otherParticipantsResult = await client.query(
      `SELECT id, name FROM participants 
       WHERE is_active = true AND id NOT IN ($1, $2)
       ORDER BY display_order`,
      [umcId, nppId]
    );
    
    console.log(`✓ Found ${otherParticipantsResult.rows.length} other participants\n`);
    
    // Get all PVT stations with their registered voters
    const stationsResult = await client.query(
      `SELECT s.id, s.name, COALESCE(sm.registered_voters, 1000) as registered_voters
       FROM stations s
       LEFT JOIN station_metadata sm ON s.id = sm.station_id
       WHERE s.is_projection_station = true
       ORDER BY s.id`
    );
    
    const stations = stationsResult.rows;
    console.log(`Found ${stations.length} PVT stations\n`);
    
    if (stations.length === 0) {
      throw new Error('No PVT stations found! Please run projection setup first.');
    }
    
    await client.query('BEGIN');
    
    let processedCount = 0;
    
    for (const station of stations) {
      const registeredVoters = station.registered_voters;
      
      // Voter turnout: 70-85%
      const turnoutRate = 0.70 + Math.random() * 0.15;
      const totalVoters = Math.floor(registeredVoters * turnoutRate);
      
      // Blank ballots: 1-3%
      const blankBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.02));
      
      // Spoiled ballots: 1-2%
      const spoiledBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.01));
      
      // Valid votes
      const validVotes = totalVoters - blankBallots - spoiledBallots;
      
      // UMC wins with 50-55%
      const umcPercentage = 0.50 + Math.random() * 0.05;
      const umcVotes = Math.floor(validVotes * umcPercentage);
      
      // NPP second with 35-40%
      const nppPercentage = 0.35 + Math.random() * 0.05;
      const nppVotes = Math.floor(validVotes * nppPercentage);
      
      // Remaining votes for other parties
      let remainingVotes = validVotes - umcVotes - nppVotes;
      
      // Insert UMC votes
      await client.query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count, 
                       updated_at = CURRENT_TIMESTAMP`,
        [station.id, umcId, umcVotes, adminUserId]
      );
      
      // Insert NPP votes
      await client.query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count, 
                       updated_at = CURRENT_TIMESTAMP`,
        [station.id, nppId, nppVotes, adminUserId]
      );
      
      // Distribute remaining votes among other participants
      for (const participant of otherParticipantsResult.rows) {
        if (remainingVotes <= 0) break;
        
        const maxVotes = Math.min(
          remainingVotes,
          Math.floor(validVotes * 0.05) // Max 5% per party
        );
        
        const votes = Math.floor(Math.random() * maxVotes);
        remainingVotes -= votes;
        
        if (votes > 0) {
          await client.query(
            `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (station_id, participant_id) 
             DO UPDATE SET vote_count = EXCLUDED.vote_count, 
                           updated_at = CURRENT_TIMESTAMP`,
            [station.id, participant.id, votes, adminUserId]
          );
        }
      }
      
      // Update station metadata
      await client.query(
        `INSERT INTO station_metadata (station_id, blank_ballots, spoiled_ballots, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id) 
         DO UPDATE SET 
           blank_ballots = EXCLUDED.blank_ballots,
           spoiled_ballots = EXCLUDED.spoiled_ballots,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [station.id, blankBallots, spoiledBallots, adminUserId]
      );
      
      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`  Processed ${processedCount}/${stations.length} stations...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n==============================================`);
    console.log(`  ✅ PVT Fake Data Created Successfully!`);
    console.log(`==============================================\n`);
    console.log(`Summary:`);
    console.log(`  - Stations filled: ${stations.length}`);
    console.log(`  - United Movement for Change: 50-55% (WINNER)`);
    console.log(`  - National People's Party: 35-40% (SECOND)`);
    console.log(`  - Other parties: Share remaining votes`);
    console.log(`  - Blank ballots: 1-3% of total votes`);
    console.log(`  - Spoiled ballots: 1-2% of total votes\n`);
    console.log(`Next steps:`);
    console.log(`  1. View Projection Results dashboard`);
    console.log(`  2. Check projections are calculating correctly`);
    console.log(`  3. Run 'npm run test:clear-pvt' to clear when done\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fillPVTFakeData();

