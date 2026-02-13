-- Migration: Remove old projects tables
-- This migration removes the old projects and employee_projects tables
-- that were used for structured project management.
-- The new model uses text-based project names in leave_request_projects.

-- Step 1: Drop foreign key constraints from employee_projects
ALTER TABLE "employee_projects" DROP CONSTRAINT IF EXISTS "employee_projects_employee_id_employees_id_fk";
ALTER TABLE "employee_projects" DROP CONSTRAINT IF EXISTS "employee_projects_project_id_projects_id_fk";

-- Step 2: Drop unique constraint from employee_projects
ALTER TABLE "employee_projects" DROP CONSTRAINT IF EXISTS "employee_projects_employee_id_project_id_unique";

-- Step 3: Drop employee_projects table
DROP TABLE IF EXISTS "employee_projects";

-- Step 4: Drop foreign key constraints from projects
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_company_id_companies_id_fk";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_supervisor_id_employees_id_fk";

-- Step 5: Drop projects table
DROP TABLE IF EXISTS "projects";
