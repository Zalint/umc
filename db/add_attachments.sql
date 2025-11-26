-- Add result_attachments table for procès verbal photos
-- Run this to update your existing database

CREATE TABLE IF NOT EXISTS result_attachments (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_result_attachments_station ON result_attachments(station_id);
CREATE INDEX IF NOT EXISTS idx_result_attachments_uploaded_by ON result_attachments(uploaded_by);

COMMENT ON TABLE result_attachments IS 'Photos/scans of procès verbal (official tally sheets)';

