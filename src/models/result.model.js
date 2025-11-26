/**
 * Result Model
 * Data access for election results and aggregations
 */

const { query } = require('../config/db');

// ============================================
// Results Submission
// ============================================

const submitResult = async ({ station_id, participant_id, vote_count, submitted_by }) => {
  const result = await query(
    `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (station_id, participant_id)
     DO UPDATE SET 
       vote_count = EXCLUDED.vote_count,
       submitted_by = EXCLUDED.submitted_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [station_id, participant_id, vote_count, submitted_by]
  );
  return result.rows[0];
};

const submitBulkResults = async (resultsArray, submitted_by) => {
  const client = await require('../config/db').getClient();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const item of resultsArray) {
      const result = await client.query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id)
         DO UPDATE SET 
           vote_count = EXCLUDED.vote_count,
           submitted_by = EXCLUDED.submitted_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [item.station_id, item.participant_id, item.vote_count, submitted_by]
      );
      results.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// Get Results
// ============================================

const getStationResults = async (stationId) => {
  const result = await query(
    `SELECT * FROM v_station_results
     WHERE station_id = $1
     ORDER BY participant_name`,
    [stationId]
  );
  return result.rows;
};

const getConstituencyResults = async (constituencyId) => {
  const result = await query(
    `SELECT * FROM v_constituency_results
     WHERE constituency_id = $1
     ORDER BY participant_name`,
    [constituencyId]
  );
  return result.rows;
};

const getRegionResults = async (regionId) => {
  const result = await query(
    `SELECT * FROM v_region_results
     WHERE region_id = $1
     ORDER BY participant_name`,
    [regionId]
  );
  return result.rows;
};

const getCountryResults = async () => {
  const result = await query(
    `SELECT * FROM v_country_results
     ORDER BY participant_name`
  );
  return result.rows;
};

// ============================================
// Get Results Summary (with totals)
// ============================================

const getStationResultsSummary = async (stationId) => {
  const result = await query(
    `SELECT 
       s.id as station_id,
       s.name as station_name,
       c.name as constituency_name,
       r.name as region_name,
       COALESCE(sm.registered_voters, 0) as registered_voters,
       COALESCE(sm.blank_ballots, 0) as blank_ballots,
       COALESCE(sm.spoiled_ballots, 0) as spoiled_ballots,
       COALESCE(sm.has_issue, FALSE) as has_issue,
       sm.issue_comment,
       COALESCE(SUM(res.vote_count), 0) as total_votes,
       COUNT(DISTINCT res.participant_id) as participants_reported,
       json_agg(
         json_build_object(
           'participant_id', p.id,
           'participant_name', p.name,
           'participant_short_name', p.short_name,
           'category_name', pc.name,
           'vote_count', COALESCE(res.vote_count, 0),
           'submitted_at', res.submitted_at
         ) ORDER BY p.display_order, p.name
       ) as results
     FROM stations s
     INNER JOIN constituencies c ON s.constituency_id = c.id
     INNER JOIN regions r ON c.region_id = r.id
     LEFT JOIN station_metadata sm ON s.id = sm.station_id
     CROSS JOIN participants p
     INNER JOIN participant_categories pc ON p.category_id = pc.id
     LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
     WHERE s.id = $1 AND p.is_active = true
     GROUP BY s.id, s.name, c.name, r.name, sm.registered_voters, sm.blank_ballots, sm.spoiled_ballots, sm.has_issue, sm.issue_comment`,
    [stationId]
  );
  return result.rows[0];
};

const getConstituencyResultsSummary = async (constituencyId) => {
  const result = await query(
    `SELECT 
       c.id as constituency_id,
       c.name as constituency_name,
       r.name as region_name,
       COUNT(DISTINCT s.id) as total_stations,
       COUNT(DISTINCT CASE WHEN res.id IS NOT NULL THEN s.id END) as stations_reported,
       COALESCE(SUM(sm.registered_voters), 0) as registered_voters,
       COALESCE(SUM(sm.blank_ballots), 0) as blank_ballots,
       COALESCE(SUM(sm.spoiled_ballots), 0) as spoiled_ballots,
       COALESCE(SUM(res.vote_count), 0) as total_votes,
       (
         SELECT json_agg(
           json_build_object(
             'participant_id', p2.id,
             'participant_name', p2.name,
             'participant_short_name', p2.short_name,
             'category_name', pc2.name,
             'vote_count', COALESCE((
               SELECT SUM(r2.vote_count)
               FROM results r2
               INNER JOIN stations s2 ON r2.station_id = s2.id
               WHERE s2.constituency_id = $1 AND r2.participant_id = p2.id
             ), 0)
           ) ORDER BY p2.display_order, p2.name
         )
         FROM participants p2
         INNER JOIN participant_categories pc2 ON p2.category_id = pc2.id
         WHERE p2.is_active = true
       ) as results
     FROM constituencies c
     INNER JOIN regions r ON c.region_id = r.id
     INNER JOIN stations s ON c.id = s.constituency_id
     LEFT JOIN station_metadata sm ON s.id = sm.station_id
     CROSS JOIN participants p
     INNER JOIN participant_categories pc ON p.category_id = pc.id
     LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
     WHERE c.id = $1 AND p.is_active = true
     GROUP BY c.id, c.name, r.name`,
    [constituencyId]
  );
  return result.rows[0];
};

const getRegionResultsSummary = async (regionId) => {
  const result = await query(
    `SELECT 
       r.id as region_id,
       r.name as region_name,
       COUNT(DISTINCT s.id) as total_stations,
       COUNT(DISTINCT CASE WHEN res.id IS NOT NULL THEN s.id END) as stations_reported,
       COALESCE(SUM(sm.registered_voters), 0) as registered_voters,
       COALESCE(SUM(sm.blank_ballots), 0) as blank_ballots,
       COALESCE(SUM(sm.spoiled_ballots), 0) as spoiled_ballots,
       COALESCE(SUM(res.vote_count), 0) as total_votes,
       (
         SELECT json_agg(
           json_build_object(
             'participant_id', p2.id,
             'participant_name', p2.name,
             'participant_short_name', p2.short_name,
             'category_name', pc2.name,
             'vote_count', COALESCE((
               SELECT SUM(r2.vote_count)
               FROM results r2
               INNER JOIN stations s2 ON r2.station_id = s2.id
               INNER JOIN constituencies c2 ON s2.constituency_id = c2.id
               WHERE c2.region_id = $1 AND r2.participant_id = p2.id
             ), 0)
           ) ORDER BY p2.display_order, p2.name
         )
         FROM participants p2
         INNER JOIN participant_categories pc2 ON p2.category_id = pc2.id
         WHERE p2.is_active = true
       ) as results
     FROM regions r
     INNER JOIN constituencies c ON r.id = c.region_id
     INNER JOIN stations s ON c.id = s.constituency_id
     LEFT JOIN station_metadata sm ON s.id = sm.station_id
     CROSS JOIN participants p
     INNER JOIN participant_categories pc ON p.category_id = pc.id
     LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
     WHERE r.id = $1 AND p.is_active = true
     GROUP BY r.id, r.name`,
    [regionId]
  );
  return result.rows[0];
};

const getCountryResultsSummary = async () => {
  const result = await query(
    `SELECT 
       COUNT(DISTINCT s.id) as total_stations,
       COUNT(DISTINCT CASE WHEN res.id IS NOT NULL THEN s.id END) as stations_reported,
       COALESCE(SUM(sm.registered_voters), 0) as registered_voters,
       COALESCE(SUM(sm.blank_ballots), 0) as blank_ballots,
       COALESCE(SUM(sm.spoiled_ballots), 0) as spoiled_ballots,
       COALESCE(SUM(res.vote_count), 0) as total_votes,
       (
         SELECT json_agg(
           json_build_object(
             'participant_id', p2.id,
             'participant_name', p2.name,
             'participant_short_name', p2.short_name,
             'category_name', pc2.name,
             'vote_count', COALESCE((
               SELECT SUM(r2.vote_count)
               FROM results r2
               WHERE r2.participant_id = p2.id
             ), 0)
           ) ORDER BY p2.display_order, p2.name
         )
         FROM participants p2
         INNER JOIN participant_categories pc2 ON p2.category_id = pc2.id
         WHERE p2.is_active = true
       ) as results
     FROM stations s
     LEFT JOIN station_metadata sm ON s.id = sm.station_id
     CROSS JOIN participants p
     INNER JOIN participant_categories pc ON p.category_id = pc.id
     LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
     WHERE p.is_active = true`
  );
  return result.rows[0];
};

/**
 * Update station metadata (registered voters, blank ballots, spoiled ballots)
 */
const updateStationMetadata = async (stationId, data, updatedBy) => {
  const { registered_voters, blank_ballots, spoiled_ballots, has_issue, issue_comment } = data;
  
  const result = await query(
    `INSERT INTO station_metadata (station_id, registered_voters, blank_ballots, spoiled_ballots, has_issue, issue_comment, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (station_id)
     DO UPDATE SET 
       registered_voters = COALESCE(EXCLUDED.registered_voters, station_metadata.registered_voters),
       blank_ballots = COALESCE(EXCLUDED.blank_ballots, station_metadata.blank_ballots),
       spoiled_ballots = COALESCE(EXCLUDED.spoiled_ballots, station_metadata.spoiled_ballots),
       has_issue = COALESCE(EXCLUDED.has_issue, station_metadata.has_issue),
       issue_comment = EXCLUDED.issue_comment,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [stationId, registered_voters, blank_ballots, spoiled_ballots, has_issue, issue_comment, updatedBy]
  );
  return result.rows[0];
};

module.exports = {
  submitResult,
  submitBulkResults,
  getStationResults,
  getConstituencyResults,
  getRegionResults,
  getCountryResults,
  getStationResultsSummary,
  getConstituencyResultsSummary,
  getRegionResultsSummary,
  getCountryResultsSummary,
  updateStationMetadata
};

