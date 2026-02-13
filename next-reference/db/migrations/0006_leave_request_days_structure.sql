-- Migration: Add leave_request_days table and update leave_request_projects
-- This migration implements Phase 1 of the leave request enhancement plan
-- 
-- Changes:
-- 1. Create leave_request_days table for individual day selection
-- 2. Add total_working_days and total_half_days to leave_requests
-- 3. Simplify leave_request_projects (remove project_id, add project_name, pm_id, tech_lead_id)
-- 4. Remove informed_pm and informed_tech_lead columns (notifications are now automatic)

--> statement-breakpoint
-- Step 1: Create leave_request_days table
CREATE TABLE IF NOT EXISTS "leave_request_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_request_id" uuid NOT NULL,
	"date" date NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"half_day_period" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_request_days_leave_request_id_date_unique" UNIQUE("leave_request_id","date")
);

--> statement-breakpoint
-- Step 2: Add foreign key constraint for leave_request_days
DO $$ BEGIN
 ALTER TABLE "leave_request_days" ADD CONSTRAINT "leave_request_days_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Step 3: Add new columns to leave_requests table
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "total_working_days" integer;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "total_half_days" numeric(5,2);

--> statement-breakpoint
-- Step 4: Add new columns to leave_request_projects (before dropping old ones to preserve data)
ALTER TABLE "leave_request_projects" ADD COLUMN IF NOT EXISTS "project_name" varchar(255);
ALTER TABLE "leave_request_projects" ADD COLUMN IF NOT EXISTS "pm_id" uuid;
ALTER TABLE "leave_request_projects" ADD COLUMN IF NOT EXISTS "tech_lead_id" uuid;

--> statement-breakpoint
-- Step 5: Migrate existing data: Copy project names from projects table
-- This preserves existing project associations as text
UPDATE "leave_request_projects" lrp
SET "project_name" = p."name"
FROM "projects" p
WHERE lrp."project_id" = p."id"
AND lrp."project_name" IS NULL;

--> statement-breakpoint
-- Step 6: Set project_name as NOT NULL after data migration
-- First, handle any NULL values (set to 'Unknown Project' if project_id doesn't exist)
UPDATE "leave_request_projects"
SET "project_name" = 'Unknown Project'
WHERE "project_name" IS NULL;

--> statement-breakpoint
-- Now make it NOT NULL
ALTER TABLE "leave_request_projects" ALTER COLUMN "project_name" SET NOT NULL;

--> statement-breakpoint
-- Step 7: Add foreign key constraints for pm_id and tech_lead_id
DO $$ BEGIN
 ALTER TABLE "leave_request_projects" ADD CONSTRAINT "leave_request_projects_pm_id_employees_id_fk" FOREIGN KEY ("pm_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_request_projects" ADD CONSTRAINT "leave_request_projects_tech_lead_id_employees_id_fk" FOREIGN KEY ("tech_lead_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Step 8: Drop old unique constraint and create new one
ALTER TABLE "leave_request_projects" DROP CONSTRAINT IF EXISTS "leave_request_projects_leave_request_id_project_id_unique";

--> statement-breakpoint
-- Create new unique constraint on (leave_request_id, project_name)
ALTER TABLE "leave_request_projects" ADD CONSTRAINT "leave_request_projects_leave_request_id_project_name_unique" UNIQUE("leave_request_id","project_name");

--> statement-breakpoint
-- Step 9: Drop old columns from leave_request_projects
ALTER TABLE "leave_request_projects" DROP COLUMN IF EXISTS "project_id";
ALTER TABLE "leave_request_projects" DROP COLUMN IF EXISTS "informed_pm";
ALTER TABLE "leave_request_projects" DROP COLUMN IF EXISTS "informed_tech_lead";

--> statement-breakpoint
-- Step 10: Add constraint for half_day_period (only 'morning' or 'afternoon' allowed)
ALTER TABLE "leave_request_days" ADD CONSTRAINT "leave_request_days_half_day_period_check" CHECK ("half_day_period" IN ('morning', 'afternoon') OR "half_day_period" IS NULL);
