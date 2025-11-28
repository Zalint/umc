/**
 * Group Controller
 * Handles group management operations
 */

const { groupModel } = require('../models');

/**
 * Get all groups
 * GET /api/groups
 */
const getAllGroups = async (req, res, next) => {
  try {
    const groups = await groupModel.getAllGroups();
    
    res.json({
      success: true,
      data: { groups }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get groups for current user
 * GET /api/groups/my-groups
 */
const getMyGroups = async (req, res, next) => {
  try {
    const groups = await groupModel.getUserGroups(req.user.id);
    
    res.json({
      success: true,
      data: { groups }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get groups for a specific user
 * GET /api/groups/user/:userId
 */
const getUserGroups = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const groups = await groupModel.getUserGroups(userId);
    
    res.json({
      success: true,
      data: { groups }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign groups to user
 * PUT /api/groups/user/:userId
 */
const assignGroupsToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { group_ids } = req.body;
    
    if (!Array.isArray(group_ids)) {
      return res.status(400).json({
        success: false,
        message: 'group_ids must be an array'
      });
    }
    
    // Check if user exists
    const { userModel } = require('../models');
    const user = await userModel.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If user is admin, ensure they have both groups
    if (user.role === 'admin') {
      const allGroups = await groupModel.getAllGroups();
      const allGroupIds = allGroups.map(g => g.id);
      const updatedGroups = await groupModel.assignGroupsToUser(userId, allGroupIds);
      
      return res.json({
        success: true,
        message: 'Admin users always have access to all groups',
        data: { groups: updatedGroups }
      });
    }
    
    // Validate group IDs exist
    if (group_ids.length > 0) {
      for (const groupId of group_ids) {
        const group = await groupModel.getGroupById(groupId);
        if (!group) {
          return res.status(400).json({
            success: false,
            message: `Group with ID ${groupId} not found`
          });
        }
      }
    }
    
    const groups = await groupModel.assignGroupsToUser(userId, group_ids);
    
    // Log the action
    const { auditModel } = require('../models');
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'UPDATE',
      'user_groups',
      userId,
      `Updated groups for user: ${user.email}`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Groups assigned successfully',
      data: { groups }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllGroups,
  getMyGroups,
  getUserGroups,
  assignGroupsToUser
};

