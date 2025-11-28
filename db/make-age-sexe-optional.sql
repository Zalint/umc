-- ============================================
-- Make Age and Sexe Optional in Members Table
-- ============================================
-- Migration to make age and sexe optional fields

-- Drop existing constraints
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_age_check;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_sexe_check;

-- Make age nullable and update constraint
ALTER TABLE members 
ALTER COLUMN age DROP NOT NULL;

ALTER TABLE members 
ADD CONSTRAINT members_age_check 
CHECK (age IS NULL OR (age > 0 AND age < 150));

-- Make sexe nullable and update constraint
ALTER TABLE members 
ALTER COLUMN sexe DROP NOT NULL;

ALTER TABLE members 
ADD CONSTRAINT members_sexe_check 
CHECK (sexe IS NULL OR sexe IN ('Male', 'Female', 'Other'));

