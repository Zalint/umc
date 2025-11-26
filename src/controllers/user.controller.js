/**
 * User Controller
 * Handles user management operations
 */

const { userModel, memberModel, auditModel } = require('../models');

/**
 * Get all users
 * GET /api/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userModel.getAllUsers();
    
    res.json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await userModel.findUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get assignments
    const assignments = await memberModel.getUserAssignments(id);
    
    res.json({
      success: true,
      data: {
        user: {
          ...user,
          assignments
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedUser = await userModel.updateUser(id, updates);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log the action to audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'UPDATE',
      'users',
      id,
      `Updated user: ${updatedUser.email} (${updatedUser.full_name})`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Cannot delete yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const deletedUser = await userModel.deleteUser(id);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log the action to audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'DELETE',
      'users',
      id,
      `Deleted user: ${deletedUser.email} (${deletedUser.full_name})`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign member to geographic area
 * POST /api/users/:id/assignments
 */
const assignMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, region_id, constituency_id, station_id } = req.body;
    
    // Validate input
    if (!level || ![1, 2, 3].includes(parseInt(level))) {
      return res.status(400).json({
        success: false,
        message: 'Valid level is required (1=Station, 2=Constituency, 3=Region)'
      });
    }
    
    // Validate level-specific requirements
    const levelInt = parseInt(level);
    if (levelInt === 1 && !station_id) {
      return res.status(400).json({
        success: false,
        message: 'station_id is required for level 1 (Station)'
      });
    }
    if (levelInt === 2 && !constituency_id) {
      return res.status(400).json({
        success: false,
        message: 'constituency_id is required for level 2 (Constituency)'
      });
    }
    if (levelInt === 3 && !region_id) {
      return res.status(400).json({
        success: false,
        message: 'region_id is required for level 3 (Region)'
      });
    }
    
    const assignment = await memberModel.createAssignment({
      user_id: id,
      level: levelInt,
      region_id: levelInt === 3 ? region_id : null,
      constituency_id: levelInt === 2 ? constituency_id : null,
      station_id: levelInt === 1 ? station_id : null,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Member assignment created successfully',
      data: {
        assignment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member assignment
 * DELETE /api/users/:id/assignments/:assignmentId
 */
const removeAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    
    const deleted = await memberModel.deleteAssignment(assignmentId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active status
 * PUT /api/users/:id/status
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    // Cannot deactivate yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_active parameter is required (true/false)'
      });
    }
    
    const updatedUser = await userModel.updateUser(id, { is_active });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log the action to audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      is_active ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      'users',
      id,
      `${is_active ? 'Activated' : 'Deactivated'} user: ${updatedUser.email} (${updatedUser.full_name})`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignMember,
  removeAssignment,
  toggleUserStatus
};

