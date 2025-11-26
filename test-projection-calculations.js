/**
 * Test: Verify projection calculations are accurate
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

async function testProjectionCalculations() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Test: Projection Calculation Verification');
    console.log('==============================================\n');
    
    // Step 1: Get projection station results
    console.log('Step 1: Fetching projection station results...');
    const projectionStationsResult = await client.query(`
      SELECT 
        r.id as region_id,
        r.name as region_name,
        COUNT(DISTINCT s.id) as total_stations_in_region,
        COUNT(DISTINCT CASE WHEN s.is_projection_station = TRUE THEN s.id END) as sample_stations,
        COUNT(DISTINCT CASE WHEN s.is_projection_station = TRUE AND res.id IS NOT NULL THEN s.id END) as sample_stations_reported
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id
      LEFT JOIN results res ON s.id = res.station_id AND s.is_projection_station = TRUE
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    console.log('┌──────────────────┬───────┬────────┬──────────┬──────────┐');
    console.log('│ Region           │ Total │ Sample │ Reported │ Coverage │');
    console.log('├──────────────────┼───────┼────────┼──────────┼──────────┤');
    
    let totalSample = 0;
    let totalReported = 0;
    
    projectionStationsResult.rows.forEach(row => {
      const coverage = row.sample_stations > 0 ? 
        ((row.sample_stations_reported / row.sample_stations) * 100).toFixed(1) : 0;
      
      totalSample += parseInt(row.sample_stations);
      totalReported += parseInt(row.sample_stations_reported);
      
      console.log(`│ ${row.region_name.padEnd(16)} │ ${String(row.total_stations_in_region).padStart(5)} │ ${String(row.sample_stations).padStart(6)} │ ${String(row.sample_stations_reported).padStart(8)} │ ${String(coverage + '%').padStart(8)} │`);
    });
    
    const overallCoverage = totalSample > 0 ? ((totalReported / totalSample) * 100).toFixed(1) : 0;
    
    console.log('├──────────────────┼───────┼────────┼──────────┼──────────┤');
    console.log(`│ ${'TOTAL'.padEnd(16)} │ ${String('-').padStart(5)} │ ${String(totalSample).padStart(6)} │ ${String(totalReported).padStart(8)} │ ${String(overallCoverage + '%').padStart(8)} │`);
    console.log('└──────────────────┴───────┴────────┴──────────┴──────────┘\n');
    
    // Step 2: Calculate projection manually
    console.log('Step 2: Calculating weighted projection...\n');
    
    const participantsResult = await client.query('SELECT id, name, short_name FROM participants ORDER BY name');
    const participants = participantsResult.rows;
    
    const nationalResults = {};
    participants.forEach(p => {
      nationalResults[p.id] = {
        participant_name: p.name,
        sample_votes: 0,
        projected_votes: 0
      };
    });
    
    let totalProjectedVotes = 0;
    
    console.log('Regional Projections:');
    
    for (const region of projectionStationsResult.rows) {
      const regionWeight = parseInt(region.total_stations_in_region);
      const sampleSize = parseInt(region.sample_stations);
      
      if (sampleSize === 0) continue;
      
      // Get votes from sample stations in this region
      const regionVotesResult = await client.query(`
        SELECT 
          p.id as participant_id,
          p.name as participant_name,
          SUM(res.vote_count) as sample_votes
        FROM stations s
        INNER JOIN constituencies c ON s.constituency_id = c.id
        INNER JOIN results res ON s.id = res.station_id
        INNER JOIN participants p ON res.participant_id = p.id
        WHERE c.region_id = $1 AND s.is_projection_station = TRUE
        GROUP BY p.id, p.name
        ORDER BY sample_votes DESC
      `, [region.region_id]);
      
      console.log(`\n  ${region.region_name}:`);
      console.log(`  Sample: ${sampleSize} stations, Weight: ${regionWeight} stations`);
      
      regionVotesResult.rows.forEach(result => {
        const sampleVotes = parseInt(result.sample_votes);
        const projectedVotes = (sampleVotes / sampleSize) * regionWeight;
        
        if (nationalResults[result.participant_id]) {
          nationalResults[result.participant_id].sample_votes += sampleVotes;
          nationalResults[result.participant_id].projected_votes += projectedVotes;
        }
        
        totalProjectedVotes += projectedVotes;
        
        console.log(`    ${result.participant_name}: ${sampleVotes} sample votes → ${Math.round(projectedVotes)} projected`);
      });
    }
    
    // Step 3: Calculate percentages and compare
    console.log('\n\nStep 3: National Projection Results:\n');
    console.log('┌─────────────────────────────────────┬─────────┬─────────────┬─────────┬─────────┐');
    console.log('│ Participant                         │ Sample  │ Projected   │ %       │ MoE     │');
    console.log('├─────────────────────────────────────┼─────────┼─────────────┼─────────┼─────────┤');
    
    const projectionArray = Object.values(nationalResults)
      .map(result => {
        const percentage = totalProjectedVotes > 0 ? 
          (result.projected_votes / totalProjectedVotes * 100) : 0;
        
        const p = percentage / 100;
        const n = totalReported;
        
        // Margin of error: 1.96 * sqrt(p * (1 - p) / n)
        const marginOfError = n > 0 ? 1.96 * Math.sqrt(p * (1 - p) / n) * 100 : 0;
        
        return {
          ...result,
          percentage: percentage.toFixed(2),
          margin_of_error: marginOfError.toFixed(2),
          projected_votes_rounded: Math.round(result.projected_votes)
        };
      })
      .sort((a, b) => b.projected_votes - a.projected_votes);
    
    projectionArray.forEach(result => {
      console.log(`│ ${result.participant_name.padEnd(35)} │ ${String(result.sample_votes).padStart(7)} │ ${String(result.projected_votes_rounded.toLocaleString()).padStart(11)} │ ${String(result.percentage + '%').padStart(7)} │ ${String('±' + result.margin_of_error + '%').padStart(7)} │`);
    });
    
    console.log('├─────────────────────────────────────┼─────────┼─────────────┼─────────┼─────────┤');
    console.log(`│ ${'TOTAL'.padEnd(35)} │ ${String('-').padStart(7)} │ ${String(Math.round(totalProjectedVotes).toLocaleString()).padStart(11)} │ ${String('100%').padStart(7)} │ ${String('-').padStart(7)} │`);
    console.log('└─────────────────────────────────────┴─────────┴─────────────┴─────────┴─────────┘\n');
    
    // Step 4: Compare with actual full results
    console.log('Step 4: Comparing projection vs actual full results...\n');
    
    const actualResult = await client.query(`
      SELECT 
        p.name as participant_name,
        SUM(res.vote_count) as actual_votes,
        (SUM(res.vote_count)::numeric / (SELECT SUM(vote_count) FROM results) * 100) as percentage
      FROM results res
      INNER JOIN participants p ON res.participant_id = p.id
      GROUP BY p.id, p.name
      ORDER BY actual_votes DESC
    `);
    
    console.log('┌─────────────────────────────────────┬─────────────┬─────────────┬─────────┐');
    console.log('│ Participant                         │ Projected   │ Actual      │ Error   │');
    console.log('├─────────────────────────────────────┼─────────────┼─────────────┼─────────┤');
    
    const winner = projectionArray[0];
    const actualWinner = actualResult.rows[0];
    
    actualResult.rows.forEach(actual => {
      const projected = projectionArray.find(p => p.participant_name === actual.participant_name);
      const error = projected ? 
        (parseFloat(projected.percentage) - parseFloat(actual.percentage)).toFixed(2) : 'N/A';
      
      console.log(`│ ${actual.participant_name.padEnd(35)} │ ${String((projected ? projected.projected_votes_rounded : 0).toLocaleString()).padStart(11)} │ ${String(actual.actual_votes).padStart(11)} │ ${String(error + '%').padStart(7)} │`);
    });
    
    console.log('└─────────────────────────────────────┴─────────────┴─────────────┴─────────┘\n');
    
    // Step 5: Winner validation
    console.log('Step 5: Winner Validation:\n');
    
    console.log(`  Projected Winner: ${winner.participant_name} (${winner.percentage}%)`);
    console.log(`  Actual Winner: ${actualWinner.participant_name} (${parseFloat(actualWinner.percentage).toFixed(2)}%)`);
    
    const winnerMatch = winner.participant_name === actualWinner.participant_name;
    const error = Math.abs(parseFloat(winner.percentage) - parseFloat(actualWinner.percentage));
    
    console.log(`  Winner Match: ${winnerMatch ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`  Percentage Error: ${error.toFixed(2)}%`);
    console.log(`  Within MoE (±${winner.margin_of_error}%): ${error <= parseFloat(winner.margin_of_error) ? '✅ YES' : '❌ NO'}`);
    
    // Step 6: Confidence check
    console.log('\nStep 6: Confidence Check:\n');
    
    const leader = projectionArray[0];
    const second = projectionArray[1];
    const gap = parseFloat(leader.percentage) - parseFloat(second.percentage);
    const combinedMoE = parseFloat(leader.margin_of_error) + parseFloat(second.margin_of_error);
    
    console.log(`  Leader: ${leader.participant_name} (${leader.percentage}%)`);
    console.log(`  Second: ${second.participant_name} (${second.percentage}%)`);
    console.log(`  Gap: ${gap.toFixed(2)}%`);
    console.log(`  Combined MoE: ${combinedMoE.toFixed(2)}%`);
    console.log(`  Gap > 2× MoE: ${gap > 2 * combinedMoE ? '✅ YES' : '❌ NO'}`);
    console.log(`  Confidence: ${gap > 2 * combinedMoE ? 'HIGH (Can call winner)' : 'MODERATE (Wait for more data)'}`);
    console.log(`  Sample Coverage: ${overallCoverage}% ${parseFloat(overallCoverage) >= 90 ? '✅' : '⚠️'}`);
    
    // Final verdict
    console.log('\n==============================================');
    if (winnerMatch && error <= parseFloat(winner.margin_of_error)) {
      console.log('  ✅ PROJECTION TEST PASSED!');
      console.log('==============================================\n');
      console.log('✓ Winner correctly predicted');
      console.log('✓ Percentage within margin of error');
      console.log(`✓ Accuracy: ${(100 - error).toFixed(2)}%`);
    } else {
      console.log('  ⚠️ PROJECTION TEST: REVIEW NEEDED');
      console.log('==============================================\n');
      if (!winnerMatch) {
        console.log('⚠️ Winner prediction incorrect');
      }
      if (error > parseFloat(winner.margin_of_error)) {
        console.log(`⚠️ Error (${error.toFixed(2)}%) exceeds MoE (±${winner.margin_of_error}%)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testProjectionCalculations();

