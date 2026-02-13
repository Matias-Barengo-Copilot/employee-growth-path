-- Migration: Add role_type field to employees table
-- This adds the employee_role_type enum and role_type column for classifying employees vs individual contractors

-- Add employee_role_type enum (idempotent - only creates if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role_type') THEN
        CREATE TYPE "employee_role_type" AS ENUM('employee', 'individual_contractor');
    END IF;
END $$;

-- Add role_type column to employees table with default value (idempotent - only adds if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'role_type'
    ) THEN
        ALTER TABLE "employees" 
        ADD COLUMN "role_type" "employee_role_type" NOT NULL DEFAULT 'employee';
    END IF;
END $$;

-- Set default value for existing records that might have NULL (safety check)
UPDATE "employees" 
SET "role_type" = 'employee' 
WHERE "role_type" IS NULL;
