/**
 * Geography Model
 * Data access for regions, constituencies, and stations
 */

const { query } = require('../config/db');

// ============================================
// Regions
// ============================================

const getAllRegions = async () => {
  const result = await query(
    'SELECT * FROM regions ORDER BY name'
  );
  return result.rows;
};

const getRegionById = async (id) => {
  const result = await query(
    'SELECT * FROM regions WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

const createRegion = async ({ name, code }) => {
  const result = await query(
    'INSERT INTO regions (name, code) VALUES ($1, $2) RETURNING *',
    [name, code]
  );
  return result.rows[0];
};

// ============================================
// Constituencies
// ============================================

const getAllConstituencies = async (regionId = null) => {
  let queryText = `
    SELECT c.*, r.name as region_name
    FROM constituencies c
    INNER JOIN regions r ON c.region_id = r.id
  `;
  const params = [];
  
  if (regionId) {
    queryText += ' WHERE c.region_id = $1';
    params.push(regionId);
  }
  
  queryText += ' ORDER BY r.name, c.name';
  
  const result = await query(queryText, params);
  return result.rows;
};

const getConstituencyById = async (id) => {
  const result = await query(
    `SELECT c.*, r.name as region_name, r.id as region_id
     FROM constituencies c
     INNER JOIN regions r ON c.region_id = r.id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0];
};

const getConstituenciesByRegion = async (regionId) => {
  const result = await query(
    'SELECT * FROM constituencies WHERE region_id = $1 ORDER BY name',
    [regionId]
  );
  return result.rows;
};

const createConstituency = async ({ region_id, name, code }) => {
  const result = await query(
    'INSERT INTO constituencies (region_id, name, code) VALUES ($1, $2, $3) RETURNING *',
    [region_id, name, code]
  );
  return result.rows[0];
};

// ============================================
// Stations
// ============================================

const getAllStations = async (constituencyId = null) => {
  let queryText = `
    SELECT s.*, 
           c.name as constituency_name, c.id as constituency_id,
           r.name as region_name, r.id as region_id
    FROM stations s
    INNER JOIN constituencies c ON s.constituency_id = c.id
    INNER JOIN regions r ON c.region_id = r.id
  `;
  const params = [];
  
  if (constituencyId) {
    queryText += ' WHERE s.constituency_id = $1';
    params.push(constituencyId);
  }
  
  queryText += ' ORDER BY r.name, c.name, s.name';
  
  const result = await query(queryText, params);
  return result.rows;
};

const getStationById = async (id) => {
  const result = await query(
    `SELECT s.*, 
            c.name as constituency_name, c.id as constituency_id,
            r.name as region_name, r.id as region_id
     FROM stations s
     INNER JOIN constituencies c ON s.constituency_id = c.id
     INNER JOIN regions r ON c.region_id = r.id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0];
};

const getStationsByConstituency = async (constituencyId) => {
  const result = await query(
    'SELECT * FROM stations WHERE constituency_id = $1 ORDER BY name',
    [constituencyId]
  );
  return result.rows;
};

const getStationsByRegion = async (regionId) => {
  const result = await query(
    `SELECT s.*, c.name as constituency_name
     FROM stations s
     INNER JOIN constituencies c ON s.constituency_id = c.id
     WHERE c.region_id = $1
     ORDER BY c.name, s.name`,
    [regionId]
  );
  return result.rows;
};

const createStation = async ({ constituency_id, name, code }) => {
  const result = await query(
    'INSERT INTO stations (constituency_id, name, code) VALUES ($1, $2, $3) RETURNING *',
    [constituency_id, name, code]
  );
  return result.rows[0];
};

// ============================================
// Station Metadata
// ============================================

const getStationMetadata = async (stationId) => {
  const result = await query(
    'SELECT * FROM station_metadata WHERE station_id = $1',
    [stationId]
  );
  return result.rows[0];
};

const upsertStationMetadata = async ({ station_id, registered_voters, total_population, notes, updated_by }) => {
  const result = await query(
    `INSERT INTO station_metadata (station_id, registered_voters, total_population, notes, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (station_id) 
     DO UPDATE SET 
       registered_voters = EXCLUDED.registered_voters,
       total_population = EXCLUDED.total_population,
       notes = EXCLUDED.notes,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [station_id, registered_voters, total_population, notes, updated_by]
  );
  return result.rows[0];
};

module.exports = {
  // Regions
  getAllRegions,
  getRegionById,
  createRegion,
  
  // Constituencies
  getAllConstituencies,
  getConstituencyById,
  getConstituenciesByRegion,
  createConstituency,
  
  // Stations
  getAllStations,
  getStationById,
  getStationsByConstituency,
  getStationsByRegion,
  createStation,
  
  // Metadata
  getStationMetadata,
  upsertStationMetadata
};

