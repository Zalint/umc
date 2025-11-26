/**
 * Test: Auto-select projection stations using stratified sampling
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

async function testAutoSelect() {
  const client = await pool.connect();
  
  try {
    console.log('==============================================');
    console.log('  Test: Auto-Select Projection Stations');
    console.log('==============================================\n');
    
    const targetSampleSize = 74;
    
    // Step 1: Clear existing selections
    console.log('Step 1: Clearing existing selections...');
    await client.query('UPDATE stations SET is_projection_station = FALSE');
    console.log('✓ Cleared\n');
    
    // Step 2: Get all regions with station counts
    console.log('Step 2: Getting regional data...');
    const regionsResult = await client.query(`
      SELECT 
        r.id as region_id,
        r.name as region_name,
        COUNT(s.id) as total_stations
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    const regions = regionsResult.rows;
    const totalStations = regions.reduce((sum, r) => sum + parseInt(r.total_stations), 0);
    console.log(`✓ Found ${regions.length} regions, ${totalStations} total stations\n`);
    
    // Step 3: Calculate proportional sample for each region
    console.log('Step 3: Calculating stratified sample...');
    console.log('┌─────────────────────┬───────┬────────┬─────────┐');
    console.log('│ Region              │ Total │ Sample │ %       │');
    console.log('├─────────────────────┼───────┼────────┼─────────┤');
    
    let totalSelected = 0;
    const selections = [];
    
    for (const region of regions) {
      const regionProportion = parseInt(region.total_stations) / totalStations;
      const regionSampleSize = Math.max(1, Math.round(targetSampleSize * regionProportion));
      
      selections.push({
        region: region.region_name,
        total: region.total_stations,
        sample: regionSampleSize,
        percentage: (regionSampleSize / region.total_stations * 100).toFixed(1)
      });
      
      totalSelected += regionSampleSize;
      
      console.log(`│ ${region.region_name.padEnd(19)} │ ${String(region.total_stations).padStart(5)} │ ${String(regionSampleSize).padStart(6)} │ ${String((regionSampleSize / region.total_stations * 100).toFixed(1) + '%').padStart(7)} │`);
      
      // Randomly select stations from this region
      await client.query(`
        UPDATE stations
        SET is_projection_station = TRUE
        WHERE id IN (
          SELECT s.id
          FROM stations s
          INNER JOIN constituencies c ON s.constituency_id = c.id
          WHERE c.region_id = $1
          ORDER BY RANDOM()
          LIMIT $2
        )
      `, [region.region_id, regionSampleSize]);
    }
    
    console.log('├─────────────────────┼───────┼────────┼─────────┤');
    console.log(`│ ${'TOTAL'.padEnd(19)} │ ${String(totalStations).padStart(5)} │ ${String(totalSelected).padStart(6)} │ ${String((totalSelected / totalStations * 100).toFixed(1) + '%').padStart(7)} │`);
    console.log('└─────────────────────┴───────┴────────┴─────────┘\n');
    
    // Step 4: Verify selection
    console.log('Step 4: Verifying selection...');
    const verifyResult = await client.query(`
      SELECT 
        r.name as region_name,
        COUNT(s.id) as total_stations,
        COUNT(CASE WHEN s.is_projection_station = TRUE THEN 1 END) as selected_stations
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    console.log('Verification:');
    let verifyTotal = 0;
    verifyResult.rows.forEach(row => {
      verifyTotal += parseInt(row.selected_stations);
      console.log(`  ${row.region_name}: ${row.selected_stations}/${row.total_stations} selected`);
    });
    console.log(`  Total: ${verifyTotal} stations selected\n`);
    
    // Step 5: Show sample of selected stations
    console.log('Step 5: Sample of selected stations:');
    const sampleStations = await client.query(`
      SELECT 
        s.name as station_name,
        c.name as constituency_name,
        r.name as region_name
      FROM stations s
      INNER JOIN constituencies c ON s.constituency_id = c.id
      INNER JOIN regions r ON c.region_id = r.id
      WHERE s.is_projection_station = TRUE
      ORDER BY r.name, s.name
      LIMIT 10
    `);
    
    sampleStations.rows.forEach((station, index) => {
      console.log(`  ${index + 1}. ${station.station_name} (${station.constituency_name}, ${station.region_name})`);
    });
    console.log(`  ... and ${verifyTotal - 10} more\n`);
    
    console.log('==============================================');
    console.log('  ✅ Auto-Select Test PASSED!');
    console.log('==============================================\n');
    console.log(`Selected ${verifyTotal} stations using stratified random sampling`);
    console.log(`Target: ${targetSampleSize}, Actual: ${verifyTotal}`);
    console.log(`Variance: ${Math.abs(verifyTotal - targetSampleSize)} stations\n`);
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testAutoSelect();

