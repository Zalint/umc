/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, adminOnly, adminOrManager } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', auth, authController.getCurrentUser);

// Admin or Manager can create users
router.post('/register', auth, adminOrManager, authController.register);

module.exports = router;

