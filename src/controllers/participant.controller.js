/**
 * Participant Controller
 * Handles participant categories and participants (parties, movements, etc.)
 */

const { participantModel } = require('../models');

// ============================================
// Categories
// ============================================

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await participantModel.getAllCategories();
    
    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    const category = await participantModel.createCategory({
      name,
      description,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const category = await participantModel.updateCategory(id, { name, description });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await participantModel.deleteCategory(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    // Check if category has participants
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing participants'
      });
    }
    next(error);
  }
};

// ============================================
// Participants
// ============================================

const getAllParticipants = async (req, res, next) => {
  try {
    const { active_only } = req.query;
    const activeOnly = active_only !== 'false'; // Default to true
    
    const participants = await participantModel.getAllParticipants(activeOnly);
    
    res.json({
      success: true,
      data: {
        participants
      }
    });
  } catch (error) {
    next(error);
  }
};

const getParticipantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const participant = await participantModel.getParticipantById(id);
    
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        participant
      }
    });
  } catch (error) {
    next(error);
  }
};

const createParticipant = async (req, res, next) => {
  try {
    const { category_id, name, short_name, description, logo_url, display_order } = req.body;
    
    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and name are required'
      });
    }
    
    const participant = await participantModel.createParticipant({
      category_id,
      name,
      short_name,
      description,
      logo_url,
      display_order,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Participant created successfully',
      data: {
        participant
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const participant = await participantModel.updateParticipant(id, updates);
    
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Participant updated successfully',
      data: {
        participant
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await participantModel.deleteParticipant(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Participant deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllParticipants,
  getParticipantById,
  createParticipant,
  updateParticipant,
  deleteParticipant
};

