/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth, adminOnly, adminOrManager } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all users (admin/manager only)
router.get('/', adminOrManager, userController.getAllUsers);

// Get user by ID (admin/manager only)
router.get('/:id', adminOrManager, userController.getUserById);

// Update user (admin only)
router.put('/:id', adminOnly, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', adminOnly, userController.deleteUser);

// Member assignments (admin or manager)
router.post('/:id/assignments', adminOrManager, userController.assignMember);
router.delete('/:id/assignments/:assignmentId', adminOrManager, userController.removeAssignment);

// Toggle user active status (admin or manager)
router.put('/:id/status', adminOrManager, userController.toggleUserStatus);

module.exports = router;

