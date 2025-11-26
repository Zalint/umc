/**
 * Fill Fake Election Results for Testing
 * United Movement for Change wins with 52% of total votes
 * Run: node db/fill-fake-data.js
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

// Helper to generate random number in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fillFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Filling Fake Election Results');
    console.log('  United Movement for Change: 52% Winner');
    console.log('==============================================\n');
    
    await client.query('BEGIN');
    
    // Get admin user ID
    const adminResult = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminUserId = adminResult.rows[0]?.id || null;
    
    // Get all stations with region information
    console.log('Loading stations...');
    const stationsResult = await client.query(`
      SELECT s.id, s.name, r.name as region_name
      FROM stations s
      INNER JOIN constituencies c ON s.constituency_id = c.id
      INNER JOIN regions r ON c.region_id = r.id
      ORDER BY s.id
    `);
    const stations = stationsResult.rows;
    console.log(`✓ Found ${stations.length} stations\n`);
    
    // Get all active participants
    console.log('Loading participants...');
    const participantsResult = await client.query(`
      SELECT id, name, short_name 
      FROM participants 
      WHERE is_active = true 
      ORDER BY display_order, name
    `);
    const participants = participantsResult.rows;
    console.log(`✓ Found ${participants.length} participants\n`);
    
    // Find UMC (United Movement for Change)
    const umc = participants.find(p => 
      p.short_name === 'UMC' || 
      p.name.toLowerCase().includes('unite movement for change') ||
      p.name.toLowerCase().includes('united movement for change')
    );
    
    if (!umc) {
      console.error('❌ Error: United Movement for Change (UMC) not found!');
      console.error('Available participants:', participants.map(p => p.short_name).join(', '));
      process.exit(1);
    }
    
    // Find UDP (United Democratic Party)
    const udp = participants.find(p => 
      p.short_name === 'UDP' || 
      p.name.toLowerCase().includes('united democratic party')
    );
    
    if (!udp) {
      console.error('❌ Error: United Democratic Party (UDP) not found!');
      console.error('Available participants:', participants.map(p => p.short_name).join(', '));
      process.exit(1);
    }
    
    console.log(`✓ 1st Place: ${umc.name} (${umc.short_name})`);
    console.log(`  - Kanifing: 80% (UMC mayor's stronghold)`);
    console.log(`  - Other regions: 45-60% (varied)`);
    console.log(`✓ 2nd Place: ${udp.name} (${udp.short_name})`);
    console.log(`  - Kanifing: 15%`);
    console.log(`  - Other regions: 35-50% (varied)`);
    console.log(`✓ Others: Remaining ${participants.length - 2} participants (5-10%)\n`);
    
    // Other participants (excluding UMC and UDP)
    const otherParticipants = participants.filter(p => p.id !== umc.id && p.id !== udp.id);
    
    console.log('Generating fake results...');
    console.log('(This may take a moment...)\n');
    
    let processedCount = 0;
    let totalVotesGenerated = 0;
    let umcTotalVotes = 0;
    let udpTotalVotes = 0;
    
    for (const station of stations) {
      // Get registered voters from station metadata (or use default if not set)
      const metadataResult = await client.query(
        'SELECT registered_voters FROM station_metadata WHERE station_id = $1',
        [station.id]
      );
      
      let registeredVoters = metadataResult.rows[0]?.registered_voters;
      
      // If no registered voters data, use random number
      if (!registeredVoters || registeredVoters === 0) {
        registeredVoters = randomInt(500, 2000);
        // Insert metadata
        await client.query(
          `INSERT INTO station_metadata (station_id, registered_voters, updated_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (station_id) DO NOTHING`,
          [station.id, registeredVoters, adminUserId]
        );
      }
      
      // Generate turnout (60-85% of registered voters)
      const turnoutPercent = randomInt(60, 85) / 100;
      const totalVotes = Math.floor(registeredVoters * turnoutPercent);
      
      // Determine vote distribution based on region
      let umcPercent, udpPercent, othersPercent;
      
      if (station.region_name === 'Kanifing') {
        // Kanifing: UMC stronghold (mayor's region)
        umcPercent = randomInt(78, 82) / 100; // 78-82% (avg 80%)
        udpPercent = randomInt(13, 17) / 100; // 13-17% (avg 15%)
        othersPercent = 1 - umcPercent - udpPercent; // Remaining 3-9%
      } else {
        // Other regions: More varied and competitive
        // Ensure total doesn't exceed 95% to leave room for others
        umcPercent = randomInt(45, 58) / 100; // 45-58%
        const maxUdpPercent = Math.min(50, 95 - Math.floor(umcPercent * 100));
        const minUdpPercent = Math.max(35, 95 - Math.floor(umcPercent * 100) - 10);
        udpPercent = randomInt(minUdpPercent, maxUdpPercent) / 100; // 35-50%
        othersPercent = 1 - umcPercent - udpPercent; // At least 5%
      }
      
      const umcVotes = Math.floor(totalVotes * umcPercent);
      const udpVotes = Math.floor(totalVotes * udpPercent);
      
      // Remaining votes distributed among other participants (always positive)
      let remainingVotes = totalVotes - umcVotes - udpVotes;
      
      // Safety check: ensure remaining votes are positive
      if (remainingVotes < 0) {
        remainingVotes = Math.floor(totalVotes * 0.05); // Force at least 5%
      }
      
      // Distribute remaining 3% randomly among other participants
      const otherVotes = {};
      let distributedVotes = 0;
      
      if (otherParticipants.length > 0) {
        for (let i = 0; i < otherParticipants.length; i++) {
          if (i === otherParticipants.length - 1) {
            // Last participant gets whatever is left
            otherVotes[otherParticipants[i].id] = remainingVotes - distributedVotes;
          } else {
            // Random portion of remaining votes
            const maxVotes = Math.floor((remainingVotes - distributedVotes) / (otherParticipants.length - i));
            const votes = randomInt(0, maxVotes);
            otherVotes[otherParticipants[i].id] = votes;
            distributedVotes += votes;
          }
        }
      }
      
      // Insert UMC result (1st place - varied by region)
      await client.query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count`,
        [station.id, umc.id, umcVotes, adminUserId]
      );
      
      // Insert UDP result (2nd place - varied by region)
      await client.query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count`,
        [station.id, udp.id, udpVotes, adminUserId]
      );
      
      // Insert other participants' results (remaining votes)
      for (const participant of otherParticipants) {
        const votes = otherVotes[participant.id] || 0;
        await client.query(
          `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (station_id, participant_id) 
           DO UPDATE SET vote_count = EXCLUDED.vote_count`,
          [station.id, participant.id, votes, adminUserId]
        );
      }
      
      // Generate blank and spoiled ballots (1-3% of registered voters)
      const blankBallots = Math.floor(registeredVoters * (randomInt(5, 15) / 1000)); // 0.5-1.5%
      const spoiledBallots = Math.floor(registeredVoters * (randomInt(3, 10) / 1000)); // 0.3-1.0%
      
      // Update station metadata with blank and spoiled ballots
      await client.query(
        `UPDATE station_metadata 
         SET blank_ballots = $1, spoiled_ballots = $2
         WHERE station_id = $3`,
        [blankBallots, spoiledBallots, station.id]
      );
      
      totalVotesGenerated += totalVotes;
      umcTotalVotes += umcVotes;
      udpTotalVotes += udpVotes;
      processedCount++;
      
      // Progress indicator
      if (processedCount % 50 === 0) {
        const kanifingStations = stations.slice(0, processedCount).filter(s => s.region_name === 'Kanifing').length;
        console.log(`  Processed ${processedCount}/${stations.length} stations (${kanifingStations} in Kanifing)...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n==============================================');
    console.log('  ✅ Fake Data Generated Successfully!');
    console.log('==============================================\n');
    
    const otherVotes = totalVotesGenerated - umcTotalVotes - udpTotalVotes;
    const umcPercent = ((umcTotalVotes / totalVotesGenerated) * 100).toFixed(2);
    const udpPercent = ((udpTotalVotes / totalVotesGenerated) * 100).toFixed(2);
    const otherPercent = ((otherVotes / totalVotesGenerated) * 100).toFixed(2);
    
    const kanifingStations = stations.filter(s => s.region_name === 'Kanifing').length;
    const otherStations = stations.length - kanifingStations;
    
    console.log('Summary:');
    console.log(`  Stations filled: ${stations.length}`);
    console.log(`    - Kanifing (UMC stronghold): ${kanifingStations} stations`);
    console.log(`    - Other regions: ${otherStations} stations`);
    console.log(`  Total votes: ${totalVotesGenerated.toLocaleString()}`);
    console.log();
    console.log('National Results:');
    console.log(`  🥇 1st: UMC - ${umcTotalVotes.toLocaleString()} votes (${umcPercent}%)`);
    console.log(`  🥈 2nd: UDP - ${udpTotalVotes.toLocaleString()} votes (${udpPercent}%)`);
    console.log(`  📊 Others - ${otherVotes.toLocaleString()} votes (${otherPercent}%)`);
    console.log();
    console.log('🏆 Winner: United Movement for Change (UMC)');
    console.log('💪 Strongest in Kanifing (mayor\'s region - 80%)\n');
    
    console.log('📱 View results at: http://localhost:3000');
    console.log('🗑️  Clear data: npm run test:clear\n');
    
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

fillFakeData();

