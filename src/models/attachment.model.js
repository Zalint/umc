/**
 * Attachment Model
 * Data access for result attachments (procès verbal photos)
 */

const { query } = require('../config/db');

/**
 * Create attachment record
 */
const createAttachment = async ({ station_id, file_name, file_path, file_size, mime_type, uploaded_by, description }) => {
  const result = await query(
    `INSERT INTO result_attachments (station_id, file_name, file_path, file_size, mime_type, uploaded_by, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [station_id, file_name, file_path, file_size, mime_type, uploaded_by, description]
  );
  return result.rows[0];
};

/**
 * Get all attachments for a station
 */
const getStationAttachments = async (stationId) => {
  const result = await query(
    `SELECT a.*, u.full_name as uploaded_by_name
     FROM result_attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.station_id = $1
     ORDER BY a.uploaded_at DESC`,
    [stationId]
  );
  return result.rows;
};

/**
 * Get most recent attachment for a station
 */
const getMostRecentAttachment = async (stationId) => {
  const result = await query(
    `SELECT a.*, u.full_name as uploaded_by_name
     FROM result_attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.station_id = $1
     ORDER BY a.uploaded_at DESC
     LIMIT 1`,
    [stationId]
  );
  return result.rows[0];
};

/**
 * Get attachment by ID
 */
const getAttachmentById = async (id) => {
  const result = await query(
    `SELECT a.*, u.full_name as uploaded_by_name
     FROM result_attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0];
};

/**
 * Delete attachment
 */
const deleteAttachment = async (id) => {
  const result = await query(
    'DELETE FROM result_attachments WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  createAttachment,
  getStationAttachments,
  getMostRecentAttachment,
  getAttachmentById,
  deleteAttachment
};

