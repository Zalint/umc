-- ============================================
-- Add Address Column to Members Table
-- ============================================
-- Migration to add address field to members table

-- Add address column (nullable, optional field)
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS address TEXT;

