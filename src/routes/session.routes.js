/**
 * Session Routes
 * Defines routes for session management
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const { auth } = require('../middleware/auth');

// All session routes require authentication
router.use(auth);

// Get active sessions (admin/manager only)
router.get('/', sessionController.getActiveSessions);

// Get session statistics (admin/manager only)
router.get('/stats', sessionController.getSessionStats);

// Terminate user sessions (admin/manager only)
router.post('/:userId/terminate', sessionController.terminateUserSession);

module.exports = router;

