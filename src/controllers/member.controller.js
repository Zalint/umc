/**
 * Member Controller
 * Handles member registration and management
 */

const { memberModel, auditModel, groupModel } = require('../models');
const { validateGambiaPhone, normalizePhone } = require('../utils/phoneValidator');
const { validateEmail } = require('../utils/emailValidator');

/**
 * Create a new member
 * POST /api/members
 */
const createMember = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const {
      first_name,
      last_name,
      phone,
      email,
      age,
      sexe,
      occupation,
      address,
      station_id,
      constituency_id,
      region_id,
      comment
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !phone || !occupation) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, phone, and occupation are required'
      });
    }
    
    // Validate phone number
    const phoneValidation = validateGambiaPhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }
    
    // Validate email (optional field)
    let normalizedEmail = null;
    if (email && email.trim() !== '') {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.error
        });
      }
      normalizedEmail = emailValidation.normalized;
    }
    
    // Validate age (optional)
    let ageNum = null;
    if (age !== undefined && age !== null && age !== '') {
      ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        return res.status(400).json({
          success: false,
          message: 'Age must be a valid number between 1 and 150'
        });
      }
    }
    
    // Validate sexe (optional)
    if (sexe && sexe !== '') {
      const validSexe = ['Male', 'Female', 'Other'];
      if (!validSexe.includes(sexe)) {
        return res.status(400).json({
          success: false,
          message: `Sexe must be one of: ${validSexe.join(', ')}`
        });
      }
    }
    
    // Create member with normalized phone and email
    const member = await memberModel.createMember({
      first_name,
      last_name,
      phone: phoneValidation.normalized,
      email: normalizedEmail,
      age: ageNum,
      sexe: sexe || null,
      occupation,
      address: address || null,
      station_id: station_id || null,
      constituency_id: constituency_id || null,
      region_id: region_id || null,
      comment: comment || null,
      created_by: req.user.id
    });
    
    // Log the action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'INSERT',
      'members',
      member.id,
      `Registered new member: ${first_name} ${last_name}`,
      ipAddress
    );
    
    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: { member }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all members
 * GET /api/members
 */
const getAllMembers = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const { limit = 100, offset = 0, region_id, constituency_id, station_id } = req.query;
    
    const result = await memberModel.getAllMembers({
      limit: parseInt(limit),
      offset: parseInt(offset),
      region_id: region_id ? parseInt(region_id) : null,
      constituency_id: constituency_id ? parseInt(constituency_id) : null,
      station_id: station_id ? parseInt(station_id) : null
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get member by ID
 * GET /api/members/:id
 */
const getMemberById = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const { id } = req.params;
    const member = await memberModel.getMemberById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    res.json({
      success: true,
      data: { member }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update member
 * PUT /api/members/:id
 */
const updateMember = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Validate phone if provided
    if (updates.phone) {
      const phoneValidation = validateGambiaPhone(updates.phone);
      if (!phoneValidation.valid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error
        });
      }
      updates.phone = phoneValidation.normalized;
    }
    
    // Validate email if provided
    if (updates.email !== undefined) {
      if (updates.email && updates.email.trim() !== '') {
        const emailValidation = validateEmail(updates.email);
        if (!emailValidation.valid) {
          return res.status(400).json({
            success: false,
            message: emailValidation.error
          });
        }
        updates.email = emailValidation.normalized;
      } else {
        updates.email = null;
      }
    }
    
    // Validate age if provided (optional)
    if (updates.age !== undefined && updates.age !== null && updates.age !== '') {
      const ageNum = parseInt(updates.age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        return res.status(400).json({
          success: false,
          message: 'Age must be a valid number between 1 and 150'
        });
      }
      updates.age = ageNum;
    } else if (updates.age === '' || updates.age === null) {
      updates.age = null;
    }
    
    // Validate sexe if provided (optional)
    if (updates.sexe && updates.sexe !== '') {
      const validSexe = ['Male', 'Female', 'Other'];
      if (!validSexe.includes(updates.sexe)) {
        return res.status(400).json({
          success: false,
          message: `Sexe must be one of: ${validSexe.join(', ')}`
        });
      }
    } else if (updates.sexe === '' || updates.sexe === null) {
      updates.sexe = null;
    }
    
    const member = await memberModel.updateMember(id, updates);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Log the action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'UPDATE',
      'members',
      id,
      `Updated member: ${member.first_name} ${member.last_name}`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Member updated successfully',
      data: { member }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete member
 * DELETE /api/members/:id
 */
const deleteMember = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const { id } = req.params;
    const member = await memberModel.deleteMember(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Log the action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'DELETE',
      'members',
      id,
      'Deleted member',
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get member statistics
 * GET /api/members/stats
 */
const getMemberStats = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const stats = await memberModel.getMemberStats();
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search members
 * GET /api/members/search
 */
const searchMembers = async (req, res, next) => {
  try {
    // Check if user has Membership group access or is admin/manager
    const hasAccess = await groupModel.userHasGroup(req.user.id, 'Membership');
    if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the Membership group'
      });
    }
    
    const {
      q,
      first_name,
      last_name,
      phone,
      email,
      age_min,
      age_max,
      sexe,
      region_id,
      constituency_id,
      station_id,
      occupation,
      page = 1,
      limit = 25,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query;
    
    const result = await memberModel.searchMembers({
      q,
      first_name,
      last_name,
      phone,
      email,
      age_min,
      age_max,
      sexe,
      region_id,
      constituency_id,
      station_id,
      occupation,
      page: parseInt(page),
      limit: parseInt(limit),
      sort_by,
      sort_order
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  getMemberStats,
  searchMembers
};

