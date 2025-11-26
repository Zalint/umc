/**
 * System Lock Middleware
 * Prevents write operations when system is locked (except for admin/manager)
 */

const { auditModel } = require('../models');
const { ROLES } = require('../config/auth');

/**
 * Check if system is locked and user has permission to write
 */
const checkSystemLock = async (req, res, next) => {
  try {
    // Admin and Manager can always write
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER) {
      return next();
    }
    
    // Check if system is locked
    const isLocked = await auditModel.getSystemSetting('system_locked');
    
    if (isLocked === 'true') {
      return res.status(403).json({
        success: false,
        message: 'System is locked. Results submission is currently disabled. Only administrators and managers can make changes.'
      });
    }
    
    next();
  } catch (error) {
    console.error('System lock check error:', error);
    next(error);
  }
};

module.exports = {
  checkSystemLock
};

