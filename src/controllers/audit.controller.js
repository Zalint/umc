/**
 * Audit Controller
 * Manages audit logs and system settings
 */

const { auditModel } = require('../models');
const { ROLES } = require('../config/auth');

/**
 * Get audit logs
 * GET /api/audit/logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    // Only admin can view audit logs
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view audit logs'
      });
    }
    
    const { user_id, action, entity_type, start_date, end_date, limit, offset } = req.query;
    
    const filters = {
      user_id: user_id ? parseInt(user_id) : undefined,
      action,
      entity_type,
      start_date,
      end_date,
      limit: limit ? parseInt(limit) : 1000,
      offset: offset ? parseInt(offset) : 0
    };
    
    const logs = await auditModel.getAuditLogs(filters);
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
const getAuditStats = async (req, res, next) => {
  try {
    // Only admin can view audit stats
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view audit statistics'
      });
    }
    
    const stats = await auditModel.getAuditStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lock/Unlock system
 * POST /api/audit/system-lock
 */
const toggleSystemLock = async (req, res, next) => {
  try {
    // Only admin can lock/unlock system
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can lock/unlock the system'
      });
    }
    
    const { locked } = req.body;
    
    if (locked === undefined) {
      return res.status(400).json({
        success: false,
        message: 'locked parameter is required (true/false)'
      });
    }
    
    const lockValue = locked ? 'true' : 'false';
    await auditModel.updateSystemSetting('system_locked', lockValue, req.user.id);
    
    // Log the action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      locked ? 'SYSTEM_LOCK' : 'SYSTEM_UNLOCK',
      'system',
      null,
      `System ${locked ? 'locked' : 'unlocked'} by admin`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: `System ${locked ? 'locked' : 'unlocked'} successfully`,
      data: {
        locked: locked
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system lock status
 * GET /api/audit/system-lock
 */
const getSystemLockStatus = async (req, res, next) => {
  try {
    const isLocked = await auditModel.getSystemSetting('system_locked');
    
    res.json({
      success: true,
      data: {
        locked: isLocked === 'true'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit enabled status
 * GET /api/audit/audit-enabled
 */
const getAuditEnabledStatus = async (req, res, next) => {
  try {
    // Only admin can view audit status
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view audit settings'
      });
    }
    
    const auditEnabled = await auditModel.getSystemSetting('audit_enabled');
    
    res.json({
      success: true,
      data: {
        enabled: auditEnabled === 'true'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enable/Disable audit logging
 * POST /api/audit/audit-enabled
 */
const toggleAuditEnabled = async (req, res, next) => {
  try {
    // Only admin can enable/disable audit
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can enable/disable audit logging'
      });
    }
    
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'enabled parameter is required (true/false)'
      });
    }
    
    const auditValue = enabled ? 'true' : 'false';
    await auditModel.updateSystemSetting('audit_enabled', auditValue, req.user.id);
    
    // Log the action (this will still log even if audit is being disabled, which is good for security)
    const ipAddress = req.ip || req.connection.remoteAddress;
    // Temporarily set audit_enabled to true to log this critical action
    if (!enabled) {
      await auditModel.updateSystemSetting('audit_enabled', 'true', req.user.id);
    }
    
    await auditModel.logAction(
      req.user.id,
      enabled ? 'AUDIT_ENABLE' : 'AUDIT_DISABLE',
      'system',
      null,
      `Audit logging ${enabled ? 'enabled' : 'disabled'} by admin`,
      ipAddress
    );
    
    // Now set it to the desired value
    if (!enabled) {
      await auditModel.updateSystemSetting('audit_enabled', 'false', req.user.id);
    }
    
    res.json({
      success: true,
      message: `Audit logging ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: enabled
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs to CSV
 * GET /api/audit/export
 */
const exportAuditLogs = async (req, res, next) => {
  try {
    // Only admin can export audit logs
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can export audit logs'
      });
    }
    
    const { start_date, end_date } = req.query;
    
    const filters = {
      start_date,
      end_date,
      limit: 100000 // Large limit for export
    };
    
    const logs = await auditModel.getAuditLogs(filters);
    
    // Create CSV
    const csvHeader = 'ID,Date/Time,User,Email,Action,Entity Type,Entity ID,Details,IP Address\n';
    const csvRows = logs.map(log => {
      const date = new Date(log.created_at).toLocaleString();
      const details = (log.details || '').replace(/"/g, '""'); // Escape quotes
      return `${log.id},"${date}","${log.user_name || ''}","${log.user_email || ''}","${log.action}","${log.entity_type || ''}","${log.entity_id || ''}","${details}","${log.ip_address || ''}"`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_log_export.csv');
    res.send(csv);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditStats,
  toggleSystemLock,
  getSystemLockStatus,
  getAuditEnabledStatus,
  toggleAuditEnabled,
  exportAuditLogs
};

