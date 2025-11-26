/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLES } = require('../config/auth');
const { sessionModel } = require('../models');

/**
 * Verify JWT token
 */
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please include Authorization: Bearer <token> header'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is still active in database
    const { query } = require('../config/db');
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const result = await query(
      `SELECT u.is_active as user_active, s.is_active as session_active 
       FROM users u
       LEFT JOIN user_sessions s ON u.id = s.user_id AND s.token_hash = $2
       WHERE u.id = $1`,
      [decoded.id, tokenHash]
    );
    
    if (!result.rows[0] || result.rows[0].user_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }
    
    // Check if session has been terminated
    if (result.rows[0].session_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been terminated. Please login again.'
      });
    }
    
    // Update session activity (last activity timestamp)
    try {
      await sessionModel.updateSessionActivity(token);
    } catch (sessionError) {
      // Don't fail the request if session update fails
      console.error('Failed to update session activity:', sessionError.message);
    }
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based authorization middleware factory
 * Usage: authorize(['admin', 'manager'])
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

/**
 * Admin-only authorization
 */
const adminOnly = authorize(ROLES.ADMIN);

/**
 * Admin or Manager authorization
 */
const adminOrManager = authorize(ROLES.ADMIN, ROLES.MANAGER);

/**
 * Can submit results (admin, manager, or member)
 */
const canSubmitResults = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER);

module.exports = {
  auth,
  authorize,
  adminOnly,
  adminOrManager,
  canSubmitResults
};

