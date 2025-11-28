/**
 * Group Model
 * Data access for user groups (Election, Membership)
 */

const { query } = require('../config/db');

/**
 * Get all groups
 */
const getAllGroups = async () => {
  const result = await query(
    'SELECT * FROM groups ORDER BY name'
  );
  return result.rows;
};

/**
 * Get group by ID
 */
const getGroupById = async (id) => {
  const result = await query(
    'SELECT * FROM groups WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

/**
 * Get group by name
 */
const getGroupByName = async (name) => {
  const result = await query(
    'SELECT * FROM groups WHERE name = $1',
    [name]
  );
  return result.rows[0];
};

/**
 * Get groups for a user
 */
const getUserGroups = async (userId) => {
  const result = await query(
    `SELECT g.* 
     FROM groups g
     INNER JOIN user_groups ug ON g.id = ug.group_id
     WHERE ug.user_id = $1
     ORDER BY g.name`,
    [userId]
  );
  return result.rows;
};

/**
 * Get group IDs for a user (for quick access checks)
 */
const getUserGroupIds = async (userId) => {
  const result = await query(
    'SELECT group_id FROM user_groups WHERE user_id = $1',
    [userId]
  );
  return result.rows.map(row => row.group_id);
};

/**
 * Get group names for a user (for frontend)
 */
const getUserGroupNames = async (userId) => {
  const result = await query(
    `SELECT g.name 
     FROM groups g
     INNER JOIN user_groups ug ON g.id = ug.group_id
     WHERE ug.user_id = $1`,
    [userId]
  );
  return result.rows.map(row => row.name);
};

/**
 * Check if user has group access
 */
const userHasGroup = async (userId, groupName) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM user_groups ug
       INNER JOIN groups g ON ug.group_id = g.id
       WHERE ug.user_id = $1 AND g.name = $2
     ) as has_access`,
    [userId, groupName]
  );
  return result.rows[0].has_access;
};

/**
 * Assign groups to user
 */
const assignGroupsToUser = async (userId, groupIds) => {
  // Delete existing assignments
  await query('DELETE FROM user_groups WHERE user_id = $1', [userId]);
  
  // Insert new assignments
  if (groupIds && groupIds.length > 0) {
    const values = groupIds.map((groupId, index) => 
      `($1, $${index + 2})`
    ).join(', ');
    
    const params = [userId, ...groupIds];
    await query(
      `INSERT INTO user_groups (user_id, group_id) VALUES ${values}`,
      params
    );
  }
  
  return getUserGroups(userId);
};

/**
 * Add group to user
 */
const addGroupToUser = async (userId, groupId) => {
  const result = await query(
    'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [userId, groupId]
  );
  return result.rows[0];
};

/**
 * Remove group from user
 */
const removeGroupFromUser = async (userId, groupId) => {
  await query(
    'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
    [userId, groupId]
  );
};

module.exports = {
  getAllGroups,
  getGroupById,
  getGroupByName,
  getUserGroups,
  getUserGroupIds,
  getUserGroupNames,
  userHasGroup,
  assignGroupsToUser,
  addGroupToUser,
  removeGroupFromUser
};

