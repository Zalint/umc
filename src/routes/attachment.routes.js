/**
 * Attachment Routes
 * Routes for procès verbal photo uploads
 */

const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment.controller');
const { auth, canSubmitResults, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(auth);

// Upload attachment (admin, manager, or member with access)
router.post('/upload', canSubmitResults, upload.single('file'), attachmentController.uploadAttachment);

// Get attachments for a station (all authenticated users)
router.get('/station/:stationId', attachmentController.getStationAttachments);

// Get attachment by ID (all authenticated users)
router.get('/:id', attachmentController.getAttachment);

// Delete attachment (admin or original uploader)
router.delete('/:id', attachmentController.deleteAttachment);

module.exports = router;

