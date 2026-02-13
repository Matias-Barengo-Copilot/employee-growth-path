-- Add 'pm' and 'tech_lead' to approver_role enum
ALTER TYPE "approver_role" ADD VALUE IF NOT EXISTS 'pm';
ALTER TYPE "approver_role" ADD VALUE IF NOT EXISTS 'tech_lead';
