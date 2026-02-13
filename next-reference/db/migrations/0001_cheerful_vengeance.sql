ALTER TABLE "employees" ADD COLUMN "is_initial_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "verification_token" varchar(255);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "verified_at" timestamp;