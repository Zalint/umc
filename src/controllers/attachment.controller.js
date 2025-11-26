/**
 * Attachment Controller
 * Handles procès verbal photo uploads
 */

const path = require('path');
const fs = require('fs');
const attachmentModel = require('../models/attachment.model');
const { geographyModel } = require('../models');
const { memberModel } = require('../models');
const { ROLES } = require('../config/auth');

/**
 * Upload procès verbal photo
 * POST /api/attachments/upload
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const { station_id, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    if (!station_id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'station_id is required'
      });
    }
    
    // Check if user has access to this station (for members)
    if (req.user.role === ROLES.MEMBER) {
      const hasAccess = await memberModel.hasStationAccess(req.user.id, station_id);
      if (!hasAccess) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'You do not have access to upload files for this station'
        });
      }
    }
    
    // Get station details for proper file naming
    const station = await geographyModel.getStationById(station_id);
    
    if (!station) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }
    
    // Generate proper filename: region_constituency_station_timestamp.ext
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const regionName = station.region_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const constituencyName = station.constituency_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const stationName = station.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
    
    const newFilename = `${regionName}_${constituencyName}_${stationName}_${timestamp}${ext}`;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newFilename);
    
    // Rename file
    fs.renameSync(oldPath, newPath);
    
    // Save to database
    const attachment = await attachmentModel.createAttachment({
      station_id: station_id,
      file_name: newFilename,
      file_path: `/uploads/documents/${newFilename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.id,
      description: description || null
    });
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        attachment
      }
    });
    
  } catch (error) {
    // Clean up file if there's an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Get attachments for a station
 * GET /api/attachments/station/:stationId
 */
const getStationAttachments = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { recent_only } = req.query;
    
    let attachments;
    
    if (recent_only === 'true') {
      const attachment = await attachmentModel.getMostRecentAttachment(stationId);
      attachments = attachment ? [attachment] : [];
    } else {
      attachments = await attachmentModel.getStationAttachments(stationId);
    }
    
    res.json({
      success: true,
      data: {
        attachments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attachment by ID
 * GET /api/attachments/:id
 */
const getAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const attachment = await attachmentModel.getAttachmentById(id);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        attachment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attachment
 * DELETE /api/attachments/:id
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const attachment = await attachmentModel.getAttachmentById(id);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    // Check if user has permission (admin only or original uploader)
    if (req.user.role !== ROLES.ADMIN && attachment.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this attachment'
      });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', attachment.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await attachmentModel.deleteAttachment(id);
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAttachment,
  getStationAttachments,
  getAttachment,
  deleteAttachment
};

