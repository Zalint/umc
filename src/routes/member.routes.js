/**
 * Member Routes
 * Handles member registration and management endpoints
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const memberController = require('../controllers/member.controller');

// All routes require authentication
router.use(auth);

// Create a new member
router.post('/', memberController.createMember);

// Get all members
router.get('/', memberController.getAllMembers);

// Get member statistics
router.get('/stats', memberController.getMemberStats);

// Search members
router.get('/search', memberController.searchMembers);

// Get member by ID
router.get('/:id', memberController.getMemberById);

// Update member
router.put('/:id', memberController.updateMember);

// Delete member
router.delete('/:id', memberController.deleteMember);

module.exports = router;

