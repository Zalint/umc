-- ============================================
-- Add Email Column to Members Table
-- ============================================
-- Migration to add email field to members table

-- Add email column (nullable, optional field)
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create index on email for faster searches
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- Add constraint to ensure email format if provided
-- Note: PostgreSQL doesn't have built-in email validation,
-- so we'll validate in the application layer
-- But we can add a check constraint for basic format
-- Using DO block since ADD CONSTRAINT doesn't support IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_members_email_format'
  ) THEN
    ALTER TABLE members 
    ADD CONSTRAINT chk_members_email_format 
    CHECK (
      email IS NULL OR 
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    );
  END IF;
END $$;

