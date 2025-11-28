/**
 * Test Data Routes
 * Handles test data generation endpoints (admin only)
 */

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const testDataController = require('../controllers/testdata.controller');

// All routes require authentication and admin role
router.use(auth);
router.use(adminOnly);

// Fill test data for all stations
router.post('/fill-all', testDataController.fillAllTestData);

// Fill test data for projection subset (clears all first)
router.post('/fill-subset', testDataController.fillSubsetTestData);

// Clear all test data
router.post('/clear-all', testDataController.clearAllTestData);

// Fill test member data
router.post('/fill-members', testDataController.fillTestMembers);

// Clear all test member data
router.post('/clear-members', testDataController.clearTestMembers);

module.exports = router;

