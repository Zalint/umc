/**
 * Geography Routes
 * Routes for regions, constituencies, and stations
 */

const express = require('express');
const router = express.Router();
const geographyController = require('../controllers/geography.controller');
const { auth, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Regions
router.get('/regions', geographyController.getAllRegions);
router.get('/regions/:id', geographyController.getRegionById);

// Constituencies
router.get('/constituencies', geographyController.getAllConstituencies);
router.get('/constituencies/:id', geographyController.getConstituencyById);
router.get('/regions/:regionId/constituencies', geographyController.getConstituenciesByRegion);

// Stations
router.get('/stations', geographyController.getAllStations);
router.get('/stations/:id', geographyController.getStationById);
router.get('/constituencies/:constituencyId/stations', geographyController.getStationsByConstituency);
router.get('/regions/:regionId/stations', geographyController.getStationsByRegion);

// Station metadata (admin only)
router.put('/stations/:stationId/metadata', adminOnly, geographyController.updateStationMetadata);

module.exports = router;

