/**
 * Geography Controller
 * Handles geographic hierarchy operations (regions, constituencies, stations)
 */

const { geographyModel } = require('../models');

// ============================================
// Regions
// ============================================

const getAllRegions = async (req, res, next) => {
  try {
    const regions = await geographyModel.getAllRegions();
    
    res.json({
      success: true,
      data: {
        regions
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRegionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const region = await geographyModel.getRegionById(id);
    
    if (!region) {
      return res.status(404).json({
        success: false,
        message: 'Region not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        region
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Constituencies
// ============================================

const getAllConstituencies = async (req, res, next) => {
  try {
    const { region_id } = req.query;
    const constituencies = await geographyModel.getAllConstituencies(region_id);
    
    res.json({
      success: true,
      data: {
        constituencies
      }
    });
  } catch (error) {
    next(error);
  }
};

const getConstituencyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const constituency = await geographyModel.getConstituencyById(id);
    
    if (!constituency) {
      return res.status(404).json({
        success: false,
        message: 'Constituency not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        constituency
      }
    });
  } catch (error) {
    next(error);
  }
};

const getConstituenciesByRegion = async (req, res, next) => {
  try {
    const { regionId } = req.params;
    const constituencies = await geographyModel.getConstituenciesByRegion(regionId);
    
    res.json({
      success: true,
      data: {
        constituencies
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Stations
// ============================================

const getAllStations = async (req, res, next) => {
  try {
    const { constituency_id } = req.query;
    const stations = await geographyModel.getAllStations(constituency_id);
    
    res.json({
      success: true,
      data: {
        stations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const station = await geographyModel.getStationById(id);
    
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }
    
    // Get metadata
    const metadata = await geographyModel.getStationMetadata(id);
    
    res.json({
      success: true,
      data: {
        station: {
          ...station,
          metadata: metadata || {
            registered_voters: 0,
            total_population: 0
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStationsByConstituency = async (req, res, next) => {
  try {
    const { constituencyId } = req.params;
    const stations = await geographyModel.getStationsByConstituency(constituencyId);
    
    res.json({
      success: true,
      data: {
        stations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStationsByRegion = async (req, res, next) => {
  try {
    const { regionId } = req.params;
    const stations = await geographyModel.getStationsByRegion(regionId);
    
    res.json({
      success: true,
      data: {
        stations
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Station Metadata
// ============================================

const updateStationMetadata = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { registered_voters, total_population, notes } = req.body;
    
    const metadata = await geographyModel.upsertStationMetadata({
      station_id: stationId,
      registered_voters,
      total_population,
      notes,
      updated_by: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Station metadata updated successfully',
      data: {
        metadata
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRegions,
  getRegionById,
  getAllConstituencies,
  getConstituencyById,
  getConstituenciesByRegion,
  getAllStations,
  getStationById,
  getStationsByConstituency,
  getStationsByRegion,
  updateStationMetadata
};

