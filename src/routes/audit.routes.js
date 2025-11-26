/**
 * Audit Routes
 * Routes for audit log and system management
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get audit logs (admin only)
router.get('/logs', auditController.getAuditLogs);

// Get audit statistics (admin only)
router.get('/stats', auditController.getAuditStats);

// Export audit logs to CSV (admin only)
router.get('/export', auditController.exportAuditLogs);

// Get system lock status (all authenticated users)
router.get('/system-lock', auditController.getSystemLockStatus);

// Lock/unlock system (admin only)
router.post('/system-lock', auditController.toggleSystemLock);

// Get audit enabled status (admin only)
router.get('/audit-enabled', auditController.getAuditEnabledStatus);

// Enable/disable audit logging (admin only)
router.post('/audit-enabled', auditController.toggleAuditEnabled);

module.exports = router;

