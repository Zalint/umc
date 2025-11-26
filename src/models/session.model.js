/**
 * Session Model
 * Handles user session tracking
 */

const { query } = require('../config/db');
const crypto = require('crypto');

/**
 * Create a new session
 */
const createSession = async (userId, token, ipAddress, userAgent) => {
  // Hash the token for security
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await query(
    `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, login_time, last_activity)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, tokenHash, ipAddress, userAgent]
  );
  
  return result.rows[0];
};

/**
 * Update session activity
 */
const updateSessionActivity = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await query(
    `UPDATE user_sessions 
     SET last_activity = CURRENT_TIMESTAMP
     WHERE token_hash = $1 AND is_active = TRUE
     RETURNING *`,
    [tokenHash]
  );
  
  return result.rows[0];
};

/**
 * Deactivate session (logout)
 */
const deactivateSession = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await query(
    `UPDATE user_sessions 
     SET is_active = FALSE
     WHERE token_hash = $1
     RETURNING *`,
    [tokenHash]
  );
  
  return result.rows[0];
};

/**
 * Deactivate all sessions for a user
 */
const deactivateUserSessions = async (userId) => {
  await query(
    `UPDATE user_sessions 
     SET is_active = FALSE
     WHERE user_id = $1`,
    [userId]
  );
};

/**
 * Get active sessions
 * Excludes admin users from the list
 */
const getActiveSessions = async () => {
  const result = await query(`
    SELECT 
      s.id,
      s.user_id,
      u.email,
      u.full_name,
      u.role,
      s.ip_address,
      s.user_agent,
      s.login_time,
      s.last_activity,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.last_activity)) as idle_seconds
    FROM user_sessions s
    INNER JOIN users u ON s.user_id = u.id
    WHERE s.is_active = TRUE 
      AND u.role != 'admin'
    ORDER BY s.last_activity DESC
  `);
  
  return result.rows;
};

/**
 * Get session statistics
 * Excludes admin users from statistics
 */
const getSessionStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(DISTINCT CASE WHEN s.is_active = TRUE THEN s.user_id END) as active_users,
      COUNT(CASE WHEN s.is_active = TRUE THEN 1 END) as active_sessions,
      COUNT(DISTINCT s.user_id) as total_unique_users,
      COUNT(*) as total_sessions,
      MAX(s.login_time) as most_recent_login
    FROM user_sessions s
    INNER JOIN users u ON s.user_id = u.id
    WHERE u.role != 'admin'
  `);
  
  return result.rows[0];
};

/**
 * Clean up old inactive sessions (older than 30 days)
 */
const cleanupOldSessions = async () => {
  const result = await query(`
    DELETE FROM user_sessions 
    WHERE is_active = FALSE 
      AND login_time < CURRENT_TIMESTAMP - INTERVAL '30 days'
    RETURNING id
  `);
  
  return result.rowCount;
};

module.exports = {
  createSession,
  updateSessionActivity,
  deactivateSession,
  deactivateUserSessions,
  getActiveSessions,
  getSessionStats,
  cleanupOldSessions
};

