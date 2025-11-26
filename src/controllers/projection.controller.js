/**
 * Projection Controller
 * Handles election projection and sampling operations
 */

const projectionModel = require('../models/projection.model');
const { ROLES } = require('../config/auth');

/**
 * Get projection settings
 * GET /api/projections/settings
 */
const getProjectionSettings = async (req, res, next) => {
  try {
    const settings = await projectionModel.getProjectionSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update projection settings
 * PUT /api/projections/settings
 */
const updateProjectionSettings = async (req, res, next) => {
  try {
    // Only admin can update settings
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update projection settings'
      });
    }
    
    const settings = await projectionModel.updateProjectionSettings(req.body);
    
    res.json({
      success: true,
      message: 'Projection settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all projection stations grouped by region
 * GET /api/projections/stations
 */
const getProjectionStations = async (req, res, next) => {
  try {
    const stations = await projectionModel.getProjectionStations();
    
    res.json({
      success: true,
      data: {
        regions: stations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle station as projection station
 * PUT /api/projections/stations/:id/toggle
 */
const toggleProjectionStation = async (req, res, next) => {
  try {
    // Only admin can toggle projection stations
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manage projection stations'
      });
    }
    
    const { id } = req.params;
    const { is_projection_station } = req.body;
    
    const station = await projectionModel.toggleProjectionStation(id, is_projection_station);
    
    res.json({
      success: true,
      message: `Station ${is_projection_station ? 'added to' : 'removed from'} projection sample`,
      data: station
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-select stratified sample stations
 * POST /api/projections/auto-select
 */
const autoSelectProjectionStations = async (req, res, next) => {
  try {
    // Only admin can auto-select
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can auto-select projection stations'
      });
    }
    
    const { target_sample_size } = req.body;
    const sampleSize = target_sample_size || 74;
    
    const summary = await projectionModel.autoSelectProjectionStations(sampleSize);
    
    res.json({
      success: true,
      message: `Successfully selected ${sampleSize} projection stations using stratified random sampling`,
      data: {
        summary,
        total_selected: summary.reduce((sum, r) => sum + parseInt(r.sample_stations), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get projection results
 * GET /api/projections/results
 */
const getProjectionResults = async (req, res, next) => {
  try {
    const results = await projectionModel.calculateNationalProjection();
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectionSettings,
  updateProjectionSettings,
  getProjectionStations,
  toggleProjectionStation,
  autoSelectProjectionStations,
  getProjectionResults
};

