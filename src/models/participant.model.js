/**
 * Participant Model
 * Data access for participant categories and participants (parties, movements, etc.)
 */

const { query } = require('../config/db');

// ============================================
// Participant Categories
// ============================================

const getAllCategories = async () => {
  const result = await query(
    'SELECT * FROM participant_categories ORDER BY name'
  );
  return result.rows;
};

const getCategoryById = async (id) => {
  const result = await query(
    'SELECT * FROM participant_categories WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

const createCategory = async ({ name, description, created_by }) => {
  const result = await query(
    'INSERT INTO participant_categories (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
    [name, description, created_by]
  );
  return result.rows[0];
};

const updateCategory = async (id, { name, description }) => {
  const result = await query(
    'UPDATE participant_categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return result.rows[0];
};

const deleteCategory = async (id) => {
  const result = await query(
    'DELETE FROM participant_categories WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0];
};

// ============================================
// Participants
// ============================================

const getAllParticipants = async (activeOnly = true) => {
  let queryText = `
    SELECT p.*, pc.name as category_name
    FROM participants p
    INNER JOIN participant_categories pc ON p.category_id = pc.id
  `;
  
  if (activeOnly) {
    queryText += ' WHERE p.is_active = true';
  }
  
  queryText += ' ORDER BY p.display_order, p.name';
  
  const result = await query(queryText);
  return result.rows;
};

const getParticipantById = async (id) => {
  const result = await query(
    `SELECT p.*, pc.name as category_name
     FROM participants p
     INNER JOIN participant_categories pc ON p.category_id = pc.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0];
};

const getParticipantsByCategory = async (categoryId) => {
  const result = await query(
    `SELECT * FROM participants 
     WHERE category_id = $1 AND is_active = true
     ORDER BY display_order, name`,
    [categoryId]
  );
  return result.rows;
};

const createParticipant = async ({ category_id, name, short_name, description, logo_url, display_order, created_by }) => {
  const result = await query(
    `INSERT INTO participants (category_id, name, short_name, description, logo_url, display_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [category_id, name, short_name, description, logo_url, display_order || 0, created_by]
  );
  return result.rows[0];
};

const updateParticipant = async (id, updates) => {
  const allowedFields = ['category_id', 'name', 'short_name', 'description', 'logo_url', 'is_active', 'display_order'];
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  
  const result = await query(
    `UPDATE participants SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
};

const deleteParticipant = async (id) => {
  // Soft delete by setting is_active to false
  const result = await query(
    'UPDATE participants SET is_active = false WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  // Categories
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Participants
  getAllParticipants,
  getParticipantById,
  getParticipantsByCategory,
  createParticipant,
  updateParticipant,
  deleteParticipant
};

