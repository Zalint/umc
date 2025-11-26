/**
 * Projection Routes
 * Routes for election projection and sampling
 */

const express = require('express');
const router = express.Router();
const projectionController = require('../controllers/projection.controller');
const { auth, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get projection settings (all authenticated users)
router.get('/settings', projectionController.getProjectionSettings);

// Update projection settings (admin only)
router.put('/settings', adminOnly, projectionController.updateProjectionSettings);

// Get projection stations (all authenticated users)
router.get('/stations', projectionController.getProjectionStations);

// Toggle projection station (admin only)
router.put('/stations/:id/toggle', adminOnly, projectionController.toggleProjectionStation);

// Auto-select projection stations using stratified sampling (admin only)
router.post('/auto-select', adminOnly, projectionController.autoSelectProjectionStations);

// Get projection results (all authenticated users)
router.get('/results', projectionController.getProjectionResults);

module.exports = router;

