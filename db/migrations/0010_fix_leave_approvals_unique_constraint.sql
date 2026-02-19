-- Fix leave_approvals unique constraint to allow same approver with multiple roles
-- This allows the same person to be both PM and Tech Lead for the same leave request

-- Drop the old unique constraint
ALTER TABLE "leave_approvals" 
DROP CONSTRAINT IF EXISTS "leave_approvals_leave_request_id_approver_id_unique";

-- Add new unique constraint that includes approver_role
ALTER TABLE "leave_approvals" 
ADD CONSTRAINT "leave_approvals_leave_request_id_approver_id_approver_role_unique" 
UNIQUE ("leave_request_id", "approver_id", "approver_role");
