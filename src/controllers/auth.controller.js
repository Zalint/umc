/**
 * Authentication Controller
 * Handles user authentication (login, register)
 */

const jwt = require('jsonwebtoken');
const { userModel, auditModel, sessionModel } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN, ROLES } = require('../config/auth');

/**
 * Login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // If input doesn't contain @, append @election.gm to make it a full email
    if (!email.includes('@')) {
      email = `${email}@election.gm`;
    }
    
    // Find user
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Verify password
    const isValid = await userModel.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Get user with assignments if member
    let userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };
    
    if (user.role === ROLES.MEMBER) {
      const userWithAssignments = await userModel.getUserWithAssignments(user.id);
      userData.assignments = userWithAssignments.assignments || [];
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Track session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';
    await sessionModel.createSession(user.id, token, ipAddress, userAgent);
    
    // Log the action to audit
    await auditModel.logAction(
      user.id,
      'LOGIN',
      'auth',
      user.id,
      `User logged in: ${user.email}`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userData
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Register
 * POST /api/auth/register
 * (Admin only - should be protected by middleware in routes)
 */
const register = async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body;
    
    // Validate input
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (email, password, full_name, role)'
      });
    }
    
    // Validate role
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Check if user already exists
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create user
    const newUser = await userModel.createUser({
      email,
      password,
      full_name,
      role
    });
    
    // Log the action to audit (if created by an authenticated admin)
    if (req.user) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      await auditModel.logAction(
        req.user.id,
        'INSERT',
        'users',
        newUser.id,
        `Created new user: ${newUser.email} (${newUser.full_name}) with role ${newUser.role}`,
        ipAddress
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // req.user is set by auth middleware
    const user = await userModel.findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get assignments if member
    let userData = user;
    if (user.role === ROLES.MEMBER) {
      const userWithAssignments = await userModel.getUserWithAssignments(user.id);
      userData = { ...user, assignments: userWithAssignments.assignments || [] };
    }
    
    res.json({
      success: true,
      data: {
        user: userData
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getCurrentUser
};

