/**
 * Participant Routes
 * Routes for participant categories and participants
 */

const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participant.controller');
const { auth, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Categories
router.get('/categories', participantController.getAllCategories);
router.post('/categories', adminOnly, participantController.createCategory);
router.put('/categories/:id', adminOnly, participantController.updateCategory);
router.delete('/categories/:id', adminOnly, participantController.deleteCategory);

// Participants
router.get('/', participantController.getAllParticipants);
router.get('/:id', participantController.getParticipantById);
router.post('/', adminOnly, participantController.createParticipant);
router.put('/:id', adminOnly, participantController.updateParticipant);
router.delete('/:id', adminOnly, participantController.deleteParticipant);

module.exports = router;

