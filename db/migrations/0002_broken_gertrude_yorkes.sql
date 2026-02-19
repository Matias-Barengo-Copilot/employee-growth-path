CREATE TABLE "employee_supervisors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_supervisors_employee_id_supervisor_id_unique" UNIQUE("employee_id","supervisor_id")
);
--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "employee_projects" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "employee_projects" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "joining_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "birthday" date;--> statement-breakpoint
ALTER TABLE "employee_supervisors" ADD CONSTRAINT "employee_supervisors_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_supervisors" ADD CONSTRAINT "employee_supervisors_supervisor_id_employees_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "clerk_id";--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "verification_token";--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "verified_at";--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_google_id_unique" UNIQUE("google_id");