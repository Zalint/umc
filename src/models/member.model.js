/**
 * Member Assignment Model
 * Data access for member geographic assignments
 */

const { query } = require('../config/db');

/**
 * Create member assignment
 */
const createAssignment = async ({ user_id, level, region_id, constituency_id, station_id, created_by }) => {
  const result = await query(
    `INSERT INTO member_assignments (user_id, level, region_id, constituency_id, station_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user_id, level, region_id, constituency_id, station_id, created_by]
  );
  return result.rows[0];
};

/**
 * Get assignments for a user
 */
const getUserAssignments = async (userId) => {
  const result = await query(
    `SELECT 
       ma.*,
       r.name as region_name,
       c.name as constituency_name,
       s.name as station_name
     FROM member_assignments ma
     LEFT JOIN regions r ON ma.region_id = r.id
     LEFT JOIN constituencies c ON ma.constituency_id = c.id
     LEFT JOIN stations s ON ma.station_id = s.id
     WHERE ma.user_id = $1
     ORDER BY ma.level, r.name, c.name, s.name`,
    [userId]
  );
  return result.rows;
};

/**
 * Get accessible stations for a member
 * Based on their level and assignments
 */
const getAccessibleStations = async (userId) => {
  const result = await query(
    `SELECT DISTINCT s.*,
            c.name as constituency_name,
            r.name as region_name
     FROM member_assignments ma
     INNER JOIN stations s ON (
       (ma.level = 1 AND ma.station_id = s.id) OR
       (ma.level = 2 AND ma.constituency_id = s.constituency_id) OR
       (ma.level = 3 AND EXISTS (
         SELECT 1 FROM constituencies c2 
         WHERE c2.id = s.constituency_id AND c2.region_id = ma.region_id
       ))
     )
     INNER JOIN constituencies c ON s.constituency_id = c.id
     INNER JOIN regions r ON c.region_id = r.id
     WHERE ma.user_id = $1
     ORDER BY r.name, c.name, s.name`,
    [userId]
  );
  return result.rows;
};

/**
 * Check if user has access to a station
 */
const hasStationAccess = async (userId, stationId) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM member_assignments ma
       INNER JOIN stations s ON s.id = $2
       INNER JOIN constituencies c ON s.constituency_id = c.id
       WHERE ma.user_id = $1 AND (
         (ma.level = 1 AND ma.station_id = $2) OR
         (ma.level = 2 AND ma.constituency_id = s.constituency_id) OR
         (ma.level = 3 AND ma.region_id = c.region_id)
       )
     ) as has_access`,
    [userId, stationId]
  );
  return result.rows[0].has_access;
};

/**
 * Delete assignment
 */
const deleteAssignment = async (assignmentId) => {
  const result = await query(
    'DELETE FROM member_assignments WHERE id = $1 RETURNING id',
    [assignmentId]
  );
  return result.rows[0];
};

/**
 * Delete all assignments for a user
 */
const deleteUserAssignments = async (userId) => {
  await query(
    'DELETE FROM member_assignments WHERE user_id = $1',
    [userId]
  );
};

module.exports = {
  createAssignment,
  getUserAssignments,
  getAccessibleStations,
  hasStationAccess,
  deleteAssignment,
  deleteUserAssignments
};

