/**
 * Group Routes
 * Handles group-related endpoints
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const groupController = require('../controllers/group.controller');

// All routes require authentication
router.use(auth);

// Get all groups
router.get('/', groupController.getAllGroups);

// Get current user's groups
router.get('/my-groups', groupController.getMyGroups);

// Get groups for a specific user
router.get('/user/:userId', groupController.getUserGroups);

// Assign groups to user (admin only)
router.put('/user/:userId', groupController.assignGroupsToUser);

module.exports = router;

