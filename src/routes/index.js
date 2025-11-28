/**
 * Routes Index
 * Aggregates and mounts all route modules
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const geographyRoutes = require('./geography.routes');
const participantRoutes = require('./participant.routes');
const resultRoutes = require('./result.routes');
const attachmentRoutes = require('./attachment.routes');
const auditRoutes = require('./audit.routes');
const projectionRoutes = require('./projection.routes');
const sessionRoutes = require('./session.routes');
const groupRoutes = require('./group.routes');
const memberRoutes = require('./member.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/geography', geographyRoutes);
router.use('/participants', participantRoutes);
router.use('/results', resultRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/audit', auditRoutes);
router.use('/projections', projectionRoutes);
router.use('/sessions', sessionRoutes);
router.use('/groups', groupRoutes);
router.use('/members', memberRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

