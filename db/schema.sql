-- ============================================
-- Gambia Election Results Collection System
-- Database Schema
-- ============================================

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS member_assignments CASCADE;
DROP TABLE IF EXISTS station_metadata CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS participant_categories CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS constituencies CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'reader')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Geographic Hierarchy Tables
-- ============================================

-- Regions
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regions_name ON regions(name);

-- Constituencies
CREATE TABLE constituencies (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region_id, name)
);

CREATE INDEX idx_constituencies_region ON constituencies(region_id);
CREATE INDEX idx_constituencies_name ON constituencies(name);

-- Stations (Polling Stations)
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    constituency_id INTEGER NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(constituency_id, name)
);

CREATE INDEX idx_stations_constituency ON stations(constituency_id);
CREATE INDEX idx_stations_name ON stations(name);

-- ============================================
-- Participant Categories and Participants
-- ============================================

-- Participant Categories (party, movement, coalition, etc.)
CREATE TABLE participant_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants (Political parties, movements, coalitions, etc.)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES participant_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(50),
    description TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_participants_category ON participants(category_id);
CREATE INDEX idx_participants_active ON participants(is_active);
CREATE INDEX idx_participants_order ON participants(display_order);

-- ============================================
-- Station Metadata (Registered Voters, Population)
-- ============================================
CREATE TABLE station_metadata (
    id SERIAL PRIMARY KEY,
    station_id INTEGER UNIQUE NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    registered_voters INTEGER DEFAULT 0,
    total_population INTEGER DEFAULT 0,
    notes TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_metadata_station ON station_metadata(station_id);

-- ============================================
-- Results (Vote Counts)
-- ============================================
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
    submitted_by INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, participant_id)
);

CREATE INDEX idx_results_station ON results(station_id);
CREATE INDEX idx_results_participant ON results(participant_id);
CREATE INDEX idx_results_submitted ON results(submitted_at);

-- ============================================
-- Member Assignments (Level-based Access)
-- ============================================
CREATE TABLE member_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level IN (1, 2, 3)), -- 1=Station, 2=Constituency, 3=Region
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    constituency_id INTEGER REFERENCES constituencies(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure level matches assigned geographic entity
    CONSTRAINT check_level_assignment CHECK (
        (level = 1 AND station_id IS NOT NULL) OR
        (level = 2 AND constituency_id IS NOT NULL AND station_id IS NULL) OR
        (level = 3 AND region_id IS NOT NULL AND constituency_id IS NULL AND station_id IS NULL)
    )
);

CREATE INDEX idx_member_assignments_user ON member_assignments(user_id);
CREATE INDEX idx_member_assignments_level ON member_assignments(level);
CREATE INDEX idx_member_assignments_region ON member_assignments(region_id);
CREATE INDEX idx_member_assignments_constituency ON member_assignments(constituency_id);
CREATE INDEX idx_member_assignments_station ON member_assignments(station_id);

-- ============================================
-- Triggers for Updated Timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_station_metadata_updated_at BEFORE UPDATE ON station_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views for Result Aggregation
-- ============================================

-- Station Results Summary
CREATE OR REPLACE VIEW v_station_results AS
SELECT 
    s.id as station_id,
    s.name as station_name,
    c.id as constituency_id,
    c.name as constituency_name,
    r.id as region_id,
    r.name as region_name,
    p.id as participant_id,
    p.name as participant_name,
    p.short_name as participant_short_name,
    pc.name as category_name,
    COALESCE(res.vote_count, 0) as vote_count,
    COALESCE(sm.registered_voters, 0) as registered_voters,
    res.submitted_at,
    res.submitted_by
FROM stations s
INNER JOIN constituencies c ON s.constituency_id = c.id
INNER JOIN regions r ON c.region_id = r.id
CROSS JOIN participants p
INNER JOIN participant_categories pc ON p.category_id = pc.id
LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
LEFT JOIN station_metadata sm ON s.id = sm.station_id
WHERE p.is_active = true;

-- Constituency Results Summary
CREATE OR REPLACE VIEW v_constituency_results AS
SELECT 
    c.id as constituency_id,
    c.name as constituency_name,
    r.id as region_id,
    r.name as region_name,
    p.id as participant_id,
    p.name as participant_name,
    p.short_name as participant_short_name,
    pc.name as category_name,
    SUM(COALESCE(res.vote_count, 0)) as vote_count,
    SUM(COALESCE(sm.registered_voters, 0)) as registered_voters,
    COUNT(DISTINCT s.id) as total_stations,
    COUNT(DISTINCT CASE WHEN res.vote_count IS NOT NULL THEN s.id END) as stations_reported
FROM constituencies c
INNER JOIN regions r ON c.region_id = r.id
INNER JOIN stations s ON c.id = s.constituency_id
CROSS JOIN participants p
INNER JOIN participant_categories pc ON p.category_id = pc.id
LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
LEFT JOIN station_metadata sm ON s.id = sm.station_id
WHERE p.is_active = true
GROUP BY c.id, c.name, r.id, r.name, p.id, p.name, p.short_name, pc.name;

-- Region Results Summary
CREATE OR REPLACE VIEW v_region_results AS
SELECT 
    r.id as region_id,
    r.name as region_name,
    p.id as participant_id,
    p.name as participant_name,
    p.short_name as participant_short_name,
    pc.name as category_name,
    SUM(COALESCE(res.vote_count, 0)) as vote_count,
    SUM(COALESCE(sm.registered_voters, 0)) as registered_voters,
    COUNT(DISTINCT s.id) as total_stations,
    COUNT(DISTINCT CASE WHEN res.vote_count IS NOT NULL THEN s.id END) as stations_reported
FROM regions r
INNER JOIN constituencies c ON r.id = c.region_id
INNER JOIN stations s ON c.id = s.constituency_id
CROSS JOIN participants p
INNER JOIN participant_categories pc ON p.category_id = pc.id
LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
LEFT JOIN station_metadata sm ON s.id = sm.station_id
WHERE p.is_active = true
GROUP BY r.id, r.name, p.id, p.name, p.short_name, pc.name;

-- Country Results Summary
CREATE OR REPLACE VIEW v_country_results AS
SELECT 
    p.id as participant_id,
    p.name as participant_name,
    p.short_name as participant_short_name,
    pc.name as category_name,
    SUM(COALESCE(res.vote_count, 0)) as vote_count,
    SUM(COALESCE(sm.registered_voters, 0)) as registered_voters,
    COUNT(DISTINCT s.id) as total_stations,
    COUNT(DISTINCT CASE WHEN res.vote_count IS NOT NULL THEN s.id END) as stations_reported
FROM participants p
INNER JOIN participant_categories pc ON p.category_id = pc.id
CROSS JOIN stations s
LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
LEFT JOIN station_metadata sm ON s.id = sm.station_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.short_name, pc.name;

-- ============================================
-- Result Attachments (Photos of Procès Verbal)
-- ============================================
CREATE TABLE result_attachments (
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

CREATE INDEX idx_result_attachments_station ON result_attachments(station_id);
CREATE INDEX idx_result_attachments_uploaded_by ON result_attachments(uploaded_by);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE users IS 'User accounts with role-based access';
COMMENT ON TABLE regions IS 'Administrative regions of The Gambia';
COMMENT ON TABLE constituencies IS 'Electoral constituencies within regions';
COMMENT ON TABLE stations IS 'Polling stations within constituencies';
COMMENT ON TABLE participant_categories IS 'Categories for participants (party, movement, coalition, etc.)';
COMMENT ON TABLE participants IS 'Political parties, movements, coalitions, etc.';
COMMENT ON TABLE station_metadata IS 'Registered voters and population data per station';
COMMENT ON TABLE results IS 'Vote counts per participant per station';
COMMENT ON TABLE member_assignments IS 'Geographic assignments for member users (level 1/2/3)';
COMMENT ON TABLE result_attachments IS 'Photos/scans of procès verbal (official tally sheets)';

