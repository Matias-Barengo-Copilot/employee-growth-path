-- Migration: Add isActive field to employees table
-- This enables soft delete functionality for employees
-- All existing employees will be set to isActive = true by default

-- Add isActive column with default value true
ALTER TABLE "employees" 
ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;

-- Update all existing employees to be active
UPDATE "employees" 
SET "is_active" = true 
WHERE "is_active" IS NULL;

-- Create index for better query performance when filtering active employees
CREATE INDEX "idx_employees_is_active" ON "employees" ("is_active");

-- Add comment to document the field
COMMENT ON COLUMN "employees"."is_active" IS 'Indicates if the employee is active. Inactive employees are soft-deleted and should not appear in regular queries.';
