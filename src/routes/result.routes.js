/**
 * Result Routes
 * Routes for election results submission and retrieval
 */

const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { auth, canSubmitResults } = require('../middleware/auth');
const { checkSystemLock } = require('../middleware/systemLock');

// All routes require authentication
router.use(auth);

// Submit results (admin, manager, or member) - check system lock
router.post('/', canSubmitResults, checkSystemLock, resultController.submitResults);

// Get accessible stations for member
router.get('/my-stations', resultController.getMyStations);

// Get results (all authenticated users can read)
router.get('/station/:stationId', resultController.getStationResults);
router.get('/constituency/:constituencyId', resultController.getConstituencyResults);
router.get('/region/:regionId', resultController.getRegionResults);
router.get('/country', resultController.getCountryResults);

// Export results to Excel/CSV (all authenticated users can export)
router.get('/export', resultController.exportResults);
router.get('/export-summary', resultController.exportSummary);

// Update station metadata: registered voters, blank ballots, spoiled ballots (admin, manager, member with access) - check system lock
router.put('/station/:stationId/metadata', checkSystemLock, resultController.updateStationMetadata);

module.exports = router;

