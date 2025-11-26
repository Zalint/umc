/**
 * Session Controller
 * Handles user session management and monitoring
 */

const { sessionModel } = require('../models');
const { ROLES } = require('../config/auth');

/**
 * Get active sessions
 * GET /api/sessions
 */
const getActiveSessions = async (req, res, next) => {
  try {
    // Only admin and manager can view sessions
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators and managers can view active sessions'
      });
    }
    
    const sessions = await sessionModel.getActiveSessions();
    
    res.json({
      success: true,
      data: {
        sessions
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get session statistics
 * GET /api/sessions/stats
 */
const getSessionStats = async (req, res, next) => {
  try {
    // Only admin and manager can view stats
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators and managers can view session statistics'
      });
    }
    
    const stats = await sessionModel.getSessionStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Terminate user session
 * POST /api/sessions/:userId/terminate
 */
const terminateUserSession = async (req, res, next) => {
  try {
    // Only admin and manager can terminate sessions
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators and managers can terminate sessions'
      });
    }
    
    const { userId } = req.params;
    
    await sessionModel.deactivateUserSessions(parseInt(userId));
    
    res.json({
      success: true,
      message: 'User sessions terminated successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveSessions,
  getSessionStats,
  terminateUserSession
};

