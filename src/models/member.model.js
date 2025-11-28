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
    email,
    age,
    sexe,
    occupation,
    address,
    station_id,
    constituency_id,
    region_id,
    comment,
    created_by
  } = memberData;
  
  const result = await query(
    `INSERT INTO members (
      first_name, last_name, phone, email, age, sexe, occupation, address,
      station_id, constituency_id, region_id, comment, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      first_name,
      last_name,
      phone,
      email || null,
      age || null,
      sexe || null,
      occupation,
      address || null,
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
    'first_name', 'last_name', 'phone', 'email', 'age', 'sexe', 
    'occupation', 'address', 'station_id', 'constituency_id', 'region_id', 'comment'
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
  
  // Average age
  const avgAgeResult = await query('SELECT AVG(age) as avg_age FROM members');
  const average_age = parseFloat(avgAgeResult.rows[0].avg_age) || 0;
  
  // By sexe
  const sexeResult = await query(
    'SELECT sexe, COUNT(*) as count FROM members GROUP BY sexe'
  );
  
  // By region with gender breakdown
  const regionResult = await query(
    `SELECT 
       r.id as region_id,
       r.name as region_name, 
       COUNT(*) as count,
       COUNT(CASE WHEN m.sexe = 'Male' THEN 1 END) as male_count,
       COUNT(CASE WHEN m.sexe = 'Female' THEN 1 END) as female_count
     FROM members m
     LEFT JOIN regions r ON m.region_id = r.id
     GROUP BY r.id, r.name
     ORDER BY count DESC`
  );
  
  // By age groups - using subquery to avoid GROUP BY issues
  const ageResult = await query(
    `SELECT age_group, count
     FROM (
       SELECT 
         CASE 
           WHEN age < 18 THEN 'Under 18'
           WHEN age BETWEEN 18 AND 25 THEN '18-25'
           WHEN age BETWEEN 26 AND 35 THEN '26-35'
           WHEN age BETWEEN 36 AND 45 THEN '36-45'
           WHEN age BETWEEN 46 AND 55 THEN '46-55'
           WHEN age BETWEEN 56 AND 65 THEN '56-65'
           WHEN age > 65 THEN '66+'
         END as age_group,
         COUNT(*) as count
       FROM members
       GROUP BY 
         CASE 
           WHEN age < 18 THEN 'Under 18'
           WHEN age BETWEEN 18 AND 25 THEN '18-25'
           WHEN age BETWEEN 26 AND 35 THEN '26-35'
           WHEN age BETWEEN 36 AND 45 THEN '36-45'
           WHEN age BETWEEN 46 AND 55 THEN '46-55'
           WHEN age BETWEEN 56 AND 65 THEN '56-65'
           WHEN age > 65 THEN '66+'
         END
     ) as age_groups
     ORDER BY 
       CASE age_group
         WHEN 'Under 18' THEN 1
         WHEN '18-25' THEN 2
         WHEN '26-35' THEN 3
         WHEN '36-45' THEN 4
         WHEN '46-55' THEN 5
         WHEN '56-65' THEN 6
         WHEN '66+' THEN 7
         ELSE 8
       END`
  );
  
  // By occupation
  const occupationResult = await query(
    `SELECT occupation, COUNT(*) as count
     FROM members
     WHERE occupation IS NOT NULL AND occupation != ''
     GROUP BY occupation
     ORDER BY count DESC
     LIMIT 10`
  );
  
  return {
    total,
    average_age,
    by_sexe: sexeResult.rows,
    by_region: regionResult.rows,
    by_age: ageResult.rows,
    by_occupation: occupationResult.rows
  };
};

/**
 * Search members with filters
 */
const searchMembers = async (options = {}) => {
  const {
    q, // Quick search (name, phone, occupation)
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
  } = options;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 1;
  
  // Quick search across multiple fields
  if (q) {
    whereClause += ` AND (
      m.first_name ILIKE $${paramCount} OR
      m.last_name ILIKE $${paramCount} OR
      m.phone ILIKE $${paramCount} OR
      m.occupation ILIKE $${paramCount} OR
      m.address ILIKE $${paramCount}
    )`;
    params.push(`%${q}%`);
    paramCount++;
  }
  
  // Individual field filters
  if (first_name) {
    whereClause += ` AND m.first_name ILIKE $${paramCount}`;
    params.push(`%${first_name}%`);
    paramCount++;
  }
  
  if (last_name) {
    whereClause += ` AND m.last_name ILIKE $${paramCount}`;
    params.push(`%${last_name}%`);
    paramCount++;
  }
  
  if (phone) {
    whereClause += ` AND m.phone ILIKE $${paramCount}`;
    params.push(`%${phone}%`);
    paramCount++;
  }
  
  if (email) {
    whereClause += ` AND m.email ILIKE $${paramCount}`;
    params.push(`%${email}%`);
    paramCount++;
  }
  
  if (age_min) {
    whereClause += ` AND m.age >= $${paramCount}`;
    params.push(parseInt(age_min));
    paramCount++;
  }
  
  if (age_max) {
    whereClause += ` AND m.age <= $${paramCount}`;
    params.push(parseInt(age_max));
    paramCount++;
  }
  
  if (sexe) {
    whereClause += ` AND m.sexe = $${paramCount}`;
    params.push(sexe);
    paramCount++;
  }
  
  if (region_id) {
    whereClause += ` AND m.region_id = $${paramCount}`;
    params.push(parseInt(region_id));
    paramCount++;
  }
  
  if (constituency_id) {
    whereClause += ` AND m.constituency_id = $${paramCount}`;
    params.push(parseInt(constituency_id));
    paramCount++;
  }
  
  if (station_id) {
    whereClause += ` AND m.station_id = $${paramCount}`;
    params.push(parseInt(station_id));
    paramCount++;
  }
  
  if (occupation) {
    whereClause += ` AND m.occupation ILIKE $${paramCount}`;
    params.push(`%${occupation}%`);
    paramCount++;
  }
  
  // Sorting
  let orderBy = 'm.created_at DESC';
  if (sort_by === 'name') {
    orderBy = `m.first_name ${sort_order}, m.last_name ${sort_order}`;
  } else if (sort_by === 'age') {
    orderBy = `m.age ${sort_order}`;
  } else if (sort_by === 'created_at') {
    orderBy = `m.created_at ${sort_order}`;
  }
  
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  
  // Get members
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
     ORDER BY ${orderBy}
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
    pagination: {
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    }
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
  searchMembers,
  // Member assignment functions (geographic assignments)
  createAssignment,
  getUserAssignments,
  deleteAssignment
};
