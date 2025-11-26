/**
 * User Model
 * Data access layer for user operations
 */

const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { SALT_ROUNDS } = require('../config/auth');

/**
 * Create a new user
 */
const createUser = async ({ email, password, full_name, role }) => {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, is_active, created_at`,
    [email, password_hash, full_name, role]
  );
  
  return result.rows[0];
};

/**
 * Find user by email
 */
const findUserByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  
  return result.rows[0];
};

/**
 * Find user by ID
 */
const findUserById = async (id) => {
  const result = await query(
    'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  
  return result.rows[0];
};

/**
 * Get all users (without password hashes)
 */
const getAllUsers = async () => {
  const result = await query(
    'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  
  return result.rows;
};

/**
 * Update user
 */
const updateUser = async (id, updates) => {
  const allowedFields = ['full_name', 'role', 'is_active'];
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  
  const result = await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
    values
  );
  
  return result.rows[0];
};

/**
 * Update user password
 */
const updatePassword = async (id, newPassword) => {
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [password_hash, id]
  );
};

/**
 * Delete user (soft delete by setting is_active to false)
 */
const deleteUser = async (id) => {
  const result = await query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
    [id]
  );
  
  return result.rows[0];
};

/**
 * Verify user password
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Get user with member assignments
 */
const getUserWithAssignments = async (userId) => {
  const result = await query(
    `SELECT 
      u.id, u.email, u.full_name, u.role, u.is_active,
      json_agg(
        json_build_object(
          'id', ma.id,
          'level', ma.level,
          'region_id', ma.region_id,
          'region_name', r.name,
          'constituency_id', ma.constituency_id,
          'constituency_name', c.name,
          'station_id', ma.station_id,
          'station_name', s.name
        )
      ) FILTER (WHERE ma.id IS NOT NULL) as assignments
    FROM users u
    LEFT JOIN member_assignments ma ON u.id = ma.user_id
    LEFT JOIN regions r ON ma.region_id = r.id
    LEFT JOIN constituencies c ON ma.constituency_id = c.id
    LEFT JOIN stations s ON ma.station_id = s.id
    WHERE u.id = $1 AND u.is_active = true
    GROUP BY u.id`,
    [userId]
  );
  
  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
  updatePassword,
  deleteUser,
  verifyPassword,
  getUserWithAssignments
};

