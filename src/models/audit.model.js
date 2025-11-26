/**
 * Audit Model
 * Logs all system actions for audit trail
 */

const { query } = require('../config/db');

/**
 * Log an action to audit log (only if audit is enabled)
 */
const logAction = async (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    // Check if audit is enabled
    const auditEnabled = await getSystemSetting('audit_enabled');
    if (auditEnabled !== 'true') {
      return null; // Audit is disabled, skip logging
    }
    
    const result = await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, action, entityType, entityId, details, ipAddress]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit failure shouldn't break the app
    return null;
  }
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}) => {
  const { user_id, action, entity_type, start_date, end_date, limit = 1000, offset = 0 } = filters;
  
  let whereClause = [];
  let params = [];
  let paramCount = 0;
  
  if (user_id) {
    paramCount++;
    whereClause.push(`a.user_id = $${paramCount}`);
    params.push(user_id);
  }
  
  if (action) {
    paramCount++;
    whereClause.push(`a.action = $${paramCount}`);
    params.push(action);
  }
  
  if (entity_type) {
    paramCount++;
    whereClause.push(`a.entity_type = $${paramCount}`);
    params.push(entity_type);
  }
  
  if (start_date) {
    paramCount++;
    whereClause.push(`a.created_at >= $${paramCount}`);
    params.push(start_date);
  }
  
  if (end_date) {
    paramCount++;
    whereClause.push(`a.created_at <= $${paramCount}`);
    params.push(end_date);
  }
  
  const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
  
  paramCount++;
  params.push(limit);
  paramCount++;
  params.push(offset);
  
  const result = await query(
    `SELECT 
       a.id,
       a.user_id,
       u.full_name as user_name,
       u.email as user_email,
       a.action,
       a.entity_type,
       a.entity_id,
       a.details,
       a.ip_address,
       a.created_at
     FROM audit_log a
     LEFT JOIN users u ON a.user_id = u.id
     ${whereSQL}
     ORDER BY a.created_at DESC
     LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
    params
  );
  
  return result.rows;
};

/**
 * Get audit log statistics
 */
const getAuditStats = async () => {
  const result = await query(
    `SELECT 
       COUNT(*) as total_actions,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
       COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
       COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
       COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
       MAX(created_at) as last_action
     FROM audit_log`
  );
  
  return result.rows[0];
};

/**
 * Get system settings
 */
const getSystemSetting = async (key) => {
  const result = await query(
    'SELECT setting_value FROM system_settings WHERE setting_key = $1',
    [key]
  );
  return result.rows[0]?.setting_value;
};

/**
 * Update system setting
 */
const updateSystemSetting = async (key, value, userId) => {
  const result = await query(
    `INSERT INTO system_settings (setting_key, setting_value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (setting_key)
     DO UPDATE SET 
       setting_value = EXCLUDED.setting_value,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [key, value, userId]
  );
  return result.rows[0];
};

module.exports = {
  logAction,
  getAuditLogs,
  getAuditStats,
  getSystemSetting,
  updateSystemSetting
};

