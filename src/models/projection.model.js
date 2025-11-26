/**
 * Projection Model
 * Handles election projection and sampling operations
 */

const { query } = require('../config/db');

/**
 * Get projection settings
 */
const getProjectionSettings = async () => {
  const result = await query('SELECT * FROM projection_settings ORDER BY id DESC LIMIT 1');
  return result.rows[0];
};

/**
 * Update projection settings
 */
const updateProjectionSettings = async (settings) => {
  const { target_sample_size, confidence_level, is_projection_active } = settings;
  
  const result = await query(
    `UPDATE projection_settings 
     SET target_sample_size = $1, 
         confidence_level = $2, 
         is_projection_active = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (SELECT id FROM projection_settings ORDER BY id DESC LIMIT 1)
     RETURNING *`,
    [target_sample_size, confidence_level, is_projection_active]
  );
  
  return result.rows[0];
};

/**
 * Get all projection stations grouped by region
 */
const getProjectionStations = async () => {
  const result = await query(`
    SELECT 
      r.id as region_id,
      r.name as region_name,
      r.code as region_code,
      COUNT(s.id) as total_stations,
      COUNT(CASE WHEN s.is_projection_station = TRUE THEN 1 END) as projection_stations,
      json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'code', s.code,
          'constituency_name', c.name,
          'is_projection_station', s.is_projection_station
        ) ORDER BY s.name
      ) as stations
    FROM regions r
    INNER JOIN constituencies c ON r.id = c.region_id
    INNER JOIN stations s ON c.id = s.constituency_id
    GROUP BY r.id, r.name, r.code
    ORDER BY r.name
  `);
  
  return result.rows;
};

/**
 * Mark/unmark station as projection station
 */
const toggleProjectionStation = async (stationId, isProjection) => {
  const result = await query(
    'UPDATE stations SET is_projection_station = $1 WHERE id = $2 RETURNING *',
    [isProjection, stationId]
  );
  
  return result.rows[0];
};

/**
 * Auto-select stratified sample stations
 */
const autoSelectProjectionStations = async (targetSampleSize = 74) => {
  // First, clear all existing projection stations
  await query('UPDATE stations SET is_projection_station = FALSE');
  
  // Get all regions with station counts
  const regionsResult = await query(`
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
  
  // Calculate proportional sample size for each region
  for (const region of regions) {
    const regionProportion = parseInt(region.total_stations) / totalStations;
    const regionSampleSize = Math.max(1, Math.round(targetSampleSize * regionProportion));
    
    // Randomly select stations from this region
    await query(`
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
  
  // Return summary
  const summaryResult = await query(`
    SELECT 
      r.name as region_name,
      COUNT(s.id) as total_stations,
      COUNT(CASE WHEN s.is_projection_station = TRUE THEN 1 END) as sample_stations
    FROM regions r
    INNER JOIN constituencies c ON r.id = c.region_id
    INNER JOIN stations s ON c.id = s.constituency_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);
  
  return summaryResult.rows;
};

/**
 * Get projection results (from projection stations only)
 */
const getProjectionResults = async () => {
  // Get results from projection stations grouped by region
  // Use CTE to avoid nested aggregates and prevent duplicate counting
  const regionResults = await query(`
    WITH regional_votes AS (
      SELECT 
        r.id as region_id,
        r.name as region_name,
        p.id as participant_id,
        p.name as participant_name,
        p.short_name as participant_short_name,
        pc.name as category_name,
        SUM(res.vote_count) as vote_count
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id AND s.is_projection_station = TRUE
      INNER JOIN results res ON s.id = res.station_id
      INNER JOIN participants p ON res.participant_id = p.id
      INNER JOIN participant_categories pc ON p.category_id = pc.id
      GROUP BY r.id, r.name, p.id, p.name, p.short_name, pc.name
    ),
    regional_metadata AS (
      -- Separate CTE for metadata to avoid duplicate counting from results join
      SELECT 
        r.id as region_id,
        SUM(COALESCE(sm.registered_voters, 0)) as registered_voters,
        SUM(COALESCE(sm.blank_ballots, 0)) as blank_ballots,
        SUM(COALESCE(sm.spoiled_ballots, 0)) as spoiled_ballots
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id AND s.is_projection_station = TRUE
      LEFT JOIN station_metadata sm ON s.id = sm.station_id
      GROUP BY r.id
    ),
    regional_stats AS (
      SELECT 
        r.id as region_id,
        r.name as region_name,
        COUNT(DISTINCT s.id) as total_stations_in_region,
        COUNT(DISTINCT CASE WHEN s.is_projection_station = TRUE THEN s.id END) as sample_stations,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM results res WHERE res.station_id = s.id
        ) AND s.is_projection_station = TRUE THEN s.id END) as sample_stations_reported
      FROM regions r
      INNER JOIN constituencies c ON r.id = c.region_id
      INNER JOIN stations s ON c.id = s.constituency_id
      GROUP BY r.id, r.name
    )
    SELECT 
      rs.region_id,
      rs.region_name,
      rs.total_stations_in_region,
      rs.sample_stations,
      rs.sample_stations_reported,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'participant_id', rv.participant_id,
            'participant_name', rv.participant_name,
            'participant_short_name', rv.participant_short_name,
            'category_name', rv.category_name,
            'vote_count', rv.vote_count
          ) ORDER BY rv.vote_count DESC
        ) FILTER (WHERE rv.participant_id IS NOT NULL),
        '[]'::json
      ) as results,
      COALESCE(rm.registered_voters, 0) as registered_voters,
      COALESCE(rm.blank_ballots, 0) as blank_ballots,
      COALESCE(rm.spoiled_ballots, 0) as spoiled_ballots
    FROM regional_stats rs
    LEFT JOIN regional_votes rv ON rs.region_id = rv.region_id
    LEFT JOIN regional_metadata rm ON rs.region_id = rm.region_id
    GROUP BY rs.region_id, rs.region_name, rs.total_stations_in_region, 
             rs.sample_stations, rs.sample_stations_reported, 
             rm.registered_voters, rm.blank_ballots, rm.spoiled_ballots
    ORDER BY rs.region_name
  `);
  
  return regionResults.rows;
};

/**
 * Calculate national projection with confidence intervals
 */
const calculateNationalProjection = async () => {
  const regionResults = await getProjectionResults();
  
  // Get total station counts per region
  const totalStationsResult = await query(`
    SELECT 
      r.id as region_id,
      COUNT(s.id) as total_stations
    FROM regions r
    INNER JOIN constituencies c ON r.id = c.region_id
    INNER JOIN stations s ON c.id = s.constituency_id
    GROUP BY r.id
  `);
  
  const totalStationsMap = {};
  totalStationsResult.rows.forEach(row => {
    totalStationsMap[row.region_id] = parseInt(row.total_stations);
  });
  
  // Get all participants
  const participantsResult = await query('SELECT id, name, short_name FROM participants ORDER BY name');
  const participants = participantsResult.rows;
  
  // Calculate weighted national totals
  const nationalResults = {};
  let totalVotes = 0;
  let totalRegistered = 0;
  let totalBlank = 0;
  let totalSpoiled = 0;
  let totalSampleStations = 0;
  let totalReportedSampleStations = 0;
  
  participants.forEach(p => {
    nationalResults[p.id] = {
      participant_id: p.id,
      participant_name: p.name,
      participant_short_name: p.short_name,
      projected_votes: 0,
      sample_votes: 0
    };
  });
  
  // Calculate weighted projections
  regionResults.forEach(region => {
    const regionWeight = totalStationsMap[region.region_id] || 0;
    const sampleStations = parseInt(region.sample_stations) || 0;
    const reportedStations = parseInt(region.sample_stations_reported) || 0;
    
    totalSampleStations += sampleStations;
    totalReportedSampleStations += reportedStations;
    
    if (reportedStations > 0 && Array.isArray(region.results)) {
      region.results.forEach(result => {
        if (result.participant_id && nationalResults[result.participant_id]) {
          const sampleVotes = parseInt(result.vote_count) || 0;
          const projectedVotes = (sampleVotes / sampleStations) * regionWeight;
          
          nationalResults[result.participant_id].sample_votes += sampleVotes;
          nationalResults[result.participant_id].projected_votes += projectedVotes;
          totalVotes += projectedVotes;
        }
      });
    }
    
    // Project registered voters, blank, and spoiled ballots
    if (sampleStations > 0) {
      totalRegistered += ((parseInt(region.registered_voters) || 0) / sampleStations) * regionWeight;
      totalBlank += ((parseInt(region.blank_ballots) || 0) / sampleStations) * regionWeight;
      totalSpoiled += ((parseInt(region.spoiled_ballots) || 0) / sampleStations) * regionWeight;
    }
  });
  
  // Convert to array and calculate percentages
  // Calculate total sample votes (actual voters, not stations)
  const totalSampleVotes = Object.values(nationalResults).reduce((sum, r) => sum + r.sample_votes, 0);
  
  const projectionArray = Object.values(nationalResults).map(result => {
    const percentage = totalVotes > 0 ? (result.projected_votes / totalVotes * 100) : 0;
    const p = percentage / 100;
    // Use total sample VOTES as n, not number of stations
    const n = totalSampleVotes;
    
    // Design effect for stratified, clustered sampling
    // Typical DEFF = 1.5 to 3.0 for complex surveys
    // We use 2.0 as a conservative estimate
    const designEffect = 2.0;
    const effectiveSampleSize = n / designEffect;
    
    // Margin of error: 1.96 * sqrt(p * (1 - p) / n_eff) * sqrt(DEFF)
    // Simplified: 1.96 * sqrt(p * (1 - p) / (n / DEFF))
    const marginOfError = effectiveSampleSize > 0 
      ? 1.96 * Math.sqrt(p * (1 - p) / effectiveSampleSize) * 100 
      : 0;
    
    return {
      ...result,
      projected_votes: Math.round(result.projected_votes),
      percentage: percentage.toFixed(2),
      margin_of_error: marginOfError.toFixed(2),
      confidence_interval_lower: Math.max(0, percentage - marginOfError).toFixed(2),
      confidence_interval_upper: Math.min(100, percentage + marginOfError).toFixed(2)
    };
  }).sort((a, b) => b.projected_votes - a.projected_votes);
  
  return {
    projection: projectionArray,
    summary: {
      total_projected_votes: Math.round(totalVotes),
      total_registered_voters: Math.round(totalRegistered),
      projected_blank_ballots: Math.round(totalBlank),
      projected_spoiled_ballots: Math.round(totalSpoiled),
      projected_turnout: totalRegistered > 0 ? ((totalVotes / totalRegistered) * 100).toFixed(2) : 0,
      sample_stations: totalSampleStations,
      reported_sample_stations: totalReportedSampleStations,
      sample_percentage: ((totalReportedSampleStations / totalSampleStations) * 100).toFixed(1),
      confidence_level: 95
    },
    regions: regionResults
  };
};

module.exports = {
  getProjectionSettings,
  updateProjectionSettings,
  getProjectionStations,
  toggleProjectionStation,
  autoSelectProjectionStations,
  getProjectionResults,
  calculateNationalProjection
};

