/**
 * Member Model
 * Data access for member registration
 */

const { query } = require('../config/db');

/**
 * Create a new member
 */
const createMember = async (memberData) => {
  const {
    first_name,
    last_name,
    phone,
    age,
    sexe,
    occupation,
    station_id,
    constituency_id,
    region_id,
    comment,
    created_by
  } = memberData;
  
  const result = await query(
    `INSERT INTO members (
      first_name, last_name, phone, age, sexe, occupation,
      station_id, constituency_id, region_id, comment, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      first_name,
      last_name,
      phone,
      age,
      sexe,
      occupation,
      station_id || null,
      constituency_id || null,
      region_id || null,
      comment || null,
      created_by
    ]
  );
  
  return result.rows[0];
};

/**
 * Get member by ID
 */
const getMemberById = async (id) => {
  const result = await query(
    `SELECT m.*,
            s.name as station_name,
            c.name as constituency_name,
            r.name as region_name
     FROM members m
     LEFT JOIN stations s ON m.station_id = s.id
     LEFT JOIN constituencies c ON m.constituency_id = c.id
     LEFT JOIN regions r ON m.region_id = r.id
     WHERE m.id = $1`,
    [id]
  );
  return result.rows[0];
};

/**
 * Get all members with pagination
 */
const getAllMembers = async (options = {}) => {
  const { limit = 100, offset = 0, region_id, constituency_id, station_id } = options;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 1;
  
  if (region_id) {
    whereClause += ` AND m.region_id = $${paramCount}`;
    params.push(region_id);
    paramCount++;
  }
  
  if (constituency_id) {
    whereClause += ` AND m.constituency_id = $${paramCount}`;
    params.push(constituency_id);
    paramCount++;
  }
  
  if (station_id) {
    whereClause += ` AND m.station_id = $${paramCount}`;
    params.push(station_id);
    paramCount++;
  }
  
  params.push(limit, offset);
  
  const result = await query(
    `SELECT m.*,
            s.name as station_name,
            c.name as constituency_name,
            r.name as region_name
     FROM members m
     LEFT JOIN stations s ON m.station_id = s.id
     LEFT JOIN constituencies c ON m.constituency_id = c.id
     LEFT JOIN regions r ON m.region_id = r.id
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    params
  );
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM members m ${whereClause}`,
    params.slice(0, -2) // Remove limit and offset
  );
  
  return {
    members: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};

/**
 * Update member
 */
const updateMember = async (id, updates) => {
  const allowedFields = [
    'first_name', 'last_name', 'phone', 'age', 'sexe', 
    'occupation', 'station_id', 'constituency_id', 'region_id', 'comment'
  ];
  
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key] || null);
      paramCount++;
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  
  const result = await query(
    `UPDATE members 
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
};

/**
 * Delete member
 */
const deleteMember = async (id) => {
  const result = await query(
    'DELETE FROM members WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0];
};

/**
 * Get member statistics
 */
const getMemberStats = async () => {
  // Total members
  const totalResult = await query('SELECT COUNT(*) as total FROM members');
  const total = parseInt(totalResult.rows[0].total);
  
  // By sexe
  const sexeResult = await query(
    'SELECT sexe, COUNT(*) as count FROM members GROUP BY sexe'
  );
  
  // By region
  const regionResult = await query(
    `SELECT r.name as region_name, COUNT(*) as count
     FROM members m
     LEFT JOIN regions r ON m.region_id = r.id
     GROUP BY r.name
     ORDER BY count DESC`
  );
  
  // By age groups
  const ageResult = await query(
    `SELECT 
       CASE 
         WHEN age < 18 THEN 'Under 18'
         WHEN age BETWEEN 18 AND 25 THEN '18-25'
         WHEN age BETWEEN 26 AND 35 THEN '26-35'
         WHEN age BETWEEN 36 AND 50 THEN '36-50'
         WHEN age > 50 THEN 'Over 50'
       END as age_group,
       COUNT(*) as count
     FROM members
     GROUP BY age_group
     ORDER BY age_group`
  );
  
  return {
    total,
    by_sexe: sexeResult.rows,
    by_region: regionResult.rows,
    by_age: ageResult.rows
  };
};

/**
 * Member Assignment Functions (for geographic assignments)
 * These handle the member_assignments table (different from members table)
 */

/**
 * Create member assignment
 */
const createAssignment = async ({ user_id, level, region_id, constituency_id, station_id, created_by }) => {
  const { query } = require('../config/db');
  const result = await query(
    `INSERT INTO member_assignments (user_id, level, region_id, constituency_id, station_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user_id, level, region_id, constituency_id, station_id, created_by]
  );
  return result.rows[0];
};

/**
 * Get assignments for a user
 */
const getUserAssignments = async (userId) => {
  const { query } = require('../config/db');
  const result = await query(
    `SELECT 
       ma.*,
       r.name as region_name,
       c.name as constituency_name,
       s.name as station_name
     FROM member_assignments ma
     LEFT JOIN regions r ON ma.region_id = r.id
     LEFT JOIN constituencies c ON ma.constituency_id = c.id
     LEFT JOIN stations s ON ma.station_id = s.id
     WHERE ma.user_id = $1
     ORDER BY ma.level, r.name, c.name, s.name`,
    [userId]
  );
  return result.rows;
};

/**
 * Delete assignment
 */
const deleteAssignment = async (assignmentId) => {
  const { query } = require('../config/db');
  const result = await query(
    'DELETE FROM member_assignments WHERE id = $1 RETURNING id',
    [assignmentId]
  );
  return result.rows[0];
};

module.exports = {
  // Member registration functions
  createMember,
  getMemberById,
  getAllMembers,
  updateMember,
  deleteMember,
  getMemberStats,
  // Member assignment functions (geographic assignments)
  createAssignment,
  getUserAssignments,
  deleteAssignment
};
