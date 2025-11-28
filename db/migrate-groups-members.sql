-- ============================================
-- Migration: Add Groups and Members Feature
-- Run this on existing production databases
-- ============================================

-- ============================================
-- 1. Create Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- ============================================
-- 2. Seed Groups
-- ============================================
INSERT INTO groups (name, description) 
VALUES 
  ('Election', 'Election management and results collection'),
  ('Membership', 'Member registration and management')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. Create User Groups Junction Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_groups_user ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(group_id);

-- ============================================
-- 4. Create Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  sexe VARCHAR(20) NOT NULL CHECK (sexe IN ('Male', 'Female', 'Other')),
  occupation VARCHAR(255) NOT NULL,
  station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  constituency_id INTEGER REFERENCES constituencies(id) ON DELETE SET NULL,
  region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  comment TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_station ON members(station_id);
CREATE INDEX IF NOT EXISTS idx_members_constituency ON members(constituency_id);
CREATE INDEX IF NOT EXISTS idx_members_region ON members(region_id);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);

-- ============================================
-- 5. Add Trigger for Members Updated At
-- ============================================
-- (Assuming the function already exists from schema.sql)
CREATE TRIGGER update_members_updated_at 
BEFORE UPDATE ON members
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Assign Groups to Existing Users
-- ============================================
DO $$
DECLARE
  election_group_id INTEGER;
  membership_group_id INTEGER;
  user_record RECORD;
BEGIN
  -- Get group IDs
  SELECT id INTO election_group_id FROM groups WHERE name = 'Election';
  SELECT id INTO membership_group_id FROM groups WHERE name = 'Membership';
  
  -- Assign groups to all existing users
  FOR user_record IN SELECT id, role FROM users LOOP
    IF user_record.role = 'admin' THEN
      -- Admin gets both groups
      INSERT INTO user_groups (user_id, group_id) 
      VALUES (user_record.id, election_group_id), (user_record.id, membership_group_id)
      ON CONFLICT DO NOTHING;
    ELSE
      -- Other users get Election group by default
      INSERT INTO user_groups (user_id, group_id) 
      VALUES (user_record.id, election_group_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Migration Complete
-- ============================================

