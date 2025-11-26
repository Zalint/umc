/**
 * Authentication Configuration
 * JWT settings and authentication utilities
 */

require('dotenv').config();

module.exports = {
  // JWT secret key - MUST be changed in production
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  
  // Token expiration time
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Bcrypt salt rounds for password hashing
  SALT_ROUNDS: 10,
  
  // Role definitions
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
    READER: 'reader'
  },
  
  // Member access levels
  MEMBER_LEVELS: {
    STATION: 1,
    CONSTITUENCY: 2,
    REGION: 3
  }
};

