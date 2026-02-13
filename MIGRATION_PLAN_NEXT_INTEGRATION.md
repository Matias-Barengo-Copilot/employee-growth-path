# Migration Plan: Copilot Replit App to Next.js Production App

**Document Version:** 1.1
**Date:** February 13, 2026
**Status:** Planning Phase - Do Not Execute Without Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State: Architectural Comparison](#2-current-state-architectural-comparison)
3. [Feature Mapping: What Exists Where](#3-feature-mapping-what-exists-where)
4. [Directory vs Members Analysis](#4-directory-vs-members-analysis)
5. [Time Off Implementation Analysis](#5-time-off-implementation-analysis)
6. [Backend Architecture Comparison](#6-backend-architecture-comparison)
7. [State Management Comparison](#7-state-management-comparison)
8. [Authentication & Role/Permission Systems](#8-authentication--rolepermission-systems)
9. [Database Safety & Schema Strategy](#9-database-safety--schema-strategy)
10. [Data Migration & ETL Strategy](#10-data-migration--etl-strategy)
11. [Environment Variables & Secrets](#11-environment-variables--secrets)
12. [Migration Strategy: Phased Execution Plan](#12-migration-strategy-phased-execution-plan)
13. [Reusability Assessment](#13-reusability-assessment)
14. [Risk Analysis](#14-risk-analysis)
15. [Rollback Strategy](#15-rollback-strategy)
16. [Proposed Next.js Folder Structure](#16-proposed-nextjs-folder-structure)
17. [Appendix: API Endpoint Inventory](#17-appendix-api-endpoint-inventory)

---

## 1. Executive Summary

### Objective

Consolidate the Copilot employee experience app from two codebases (Replit Express+Vite SPA and Next.js production app) into a single Next.js application that serves as the primary production system.

### Approach

Feature-by-feature migration into the existing Next.js App Router codebase. The Next.js app is the base; features from the Replit app are ported incrementally. No big-bang rewrite.

### Scope

```
┌──────────────────────────────────────────────────────────────┐
│                    REPLIT APP (Source)                        │
│                                                              │
│  Features to migrate:                                        │
│  - Goals & OKRs              - Recognition Snaps             │
│  - Peer Feedback             - Career Growth Journey         │
│  - XP Rewards System         - AI Coach (streaming)          │
│  - Voice Input (OpenAI)      - Dashboard                     │
│  - Activity Feed             - Admin Tools (planned)         │
│  - Settings                                                  │
│                                                              │
│  Already in Next.js (keep as-is):                            │
│  - Members/Directory         - Time Off                      │
│  - Authentication            - Neon DB + Drizzle             │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  NEXT.JS APP (Target)                         │
│                                                              │
│  Keep existing:                                              │
│  - Members section           - Time Off module               │
│  - Auth system               - Neon database                 │
│  - Drizzle ORM setup         - Production data               │
│                                                              │
│  Add from Replit:                                            │
│  - All features listed above                                 │
│  - Adapted to Next.js patterns                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Current State: Architectural Comparison

### Replit App (Express + Vite)

| Component | Technology | Details |
|---|---|---|
| Frontend Framework | React 18 + TypeScript | Client-side SPA |
| Routing | Wouter | 11 routes, manual registration |
| Build Tool | Vite 7.3 | Custom middleware mode in Express |
| Backend | Express 5 | 1,295 lines, ~35 API endpoints |
| Database | PostgreSQL (Replit-hosted) | Via DATABASE_URL |
| ORM | Drizzle 0.39 | 13 tables, 380-line schema |
| Auth | Replit Auth (OIDC) | Passport.js + express-session |
| State Management | TanStack Query v5 | Custom default queryFn |
| UI Library | shadcn/ui + Radix UI | ~25 Radix primitives |
| Styling | Tailwind CSS 3.4 | Dark/light theme support |
| AI Features | OpenAI SDK | Transcription + chat streaming |
| File Storage | Google Cloud Storage | Object storage via Uppy |

### Next.js App (Production Target)

| Component | Technology | Details |
|---|---|---|
| Frontend Framework | React 19 + TypeScript | Server + Client Components |
| Routing | Next.js App Router | File-system based |
| Build Tool | Next.js 16.1 | Built-in bundler |
| Backend | Next.js Route Handlers | `app/api/` directory |
| Database | Neon (PostgreSQL) | Serverless PostgreSQL |
| ORM | Drizzle | Schema definitions TBD |
| Auth | TBD (production system) | Already deployed |
| State Management | TBD | Production implementation |
| UI Library | TBD | Production implementation |
| Styling | Tailwind CSS 4 | PostCSS-based |

### Key Differences

```
                REPLIT APP                    NEXT.JS APP
                ─────────                    ───────────
React Version:  React 18                     React 19
Tailwind:       v3 (config-based)            v4 (CSS-based)
Rendering:      Client-side only (SPA)       Server + Client components
API Layer:      Express middleware            Route Handlers (app/api/)
Sessions:       express-session + pg-simple   TBD (likely cookies/JWT)
Package Mgr:    npm                          pnpm
Bundler:        Vite                         Next.js (Turbopack/Webpack)
```

---

## 3. Feature Mapping: What Exists Where

| Feature | Replit App | Next.js App | Migration Action |
|---|---|---|---|
| Employee Directory | Full (8 employees, teams, profiles) | Members section (production) | **Keep Next.js** - align data model |
| Time Off Requests | Full (request + approve/decline) | Full (production) | **Keep Next.js** - add dropdown nav from Replit design |
| Time Off Balances | Full (vacation/sick/personal tracking) | TBD | Verify parity, fill gaps if needed |
| Goals & OKRs | Full (CRUD, categories, progress) | Not implemented | **Migrate from Replit** |
| Recognition Snaps | Full (send, tags, recipient) | Not implemented | **Migrate from Replit** |
| Peer Feedback | Full (request, respond, anonymous) | Not implemented | **Migrate from Replit** |
| Career Growth | Full (phases, milestones, journal) | Not implemented | **Migrate from Replit** |
| XP Rewards | Full (engine, levels, caps, bonuses) | Not implemented | **Migrate from Replit** |
| AI Coach | Full (streaming, contextual) | Not implemented | **Migrate from Replit** |
| Voice Input | Full (OpenAI transcription) | Not implemented | **Migrate from Replit** |
| Dashboard | Full (unified activity view) | Not implemented | **Migrate from Replit** |
| Activity Feed | Full (company-wide feed) | Not implemented | **Migrate from Replit** |
| Settings | Full (theme, profile prefs) | TBD | **Migrate from Replit** |
| Admin Tools | Planned (not yet built) | Not implemented | **Build in Next.js** |

---

## 4. Directory vs Members Analysis

### Replit App: Directory

**Schema:**
```
employees table:
  id, userId, companyId, teamId, managerId, role,
  title, email, firstName, lastName, profileImageUrl,
  location, timezone, slackHandle, whatIDo,
  strengths[], funFacts[], workingPreferences,
  currentlyWorkingOn, isProfileComplete

teams table:
  id, companyId, name, description
```

**API Endpoints:**
- `GET /api/directory` - Returns all employees + teams for company
- `GET /api/employees/:id` - Returns employee with team, manager, goals, snaps

**Features:**
- Grid/list view of all employees
- Click to see detailed profile
- Shows team assignment, manager hierarchy
- Cross-references goals and snaps received

### Next.js App: Members

The production Next.js app has a Members section. Since the codebase for that is in the deployed production environment (not in `/next-reference`), the exact schema and implementation need to be confirmed by reviewing the production code.

### Reconciliation Strategy

1. **Identify overlapping fields** between Replit `employees` and Next.js members table
2. **The Next.js members table is the source of truth** - do not overwrite production data
3. **Add missing columns** to the Next.js schema (e.g., `strengths`, `funFacts`, `workingPreferences`, `whatIDo`, `slackHandle`, `currentlyWorkingOn`) via additive Drizzle migrations
4. **Never rename or drop existing columns** in the production database
5. **Map the Replit `companyId` concept** to whatever organization/tenant model exists in Next.js

---

## 5. Time Off Implementation Analysis

### Replit App Implementation

**Schema:**
```
timeOffRequests: id, employeeId, companyId, type (vacation/sick/half_day/personal),
  startDate, endDate, reason, status (pending/approved/declined),
  reviewedBy, reviewNote, reviewedAt, totalDays

timeOffBalances: id, employeeId, companyId, year,
  vacationTotal(15), vacationUsed, sickTotal(10), sickUsed,
  personalTotal(3), personalUsed
```

**API Endpoints:**
- `GET /api/time-off/requests` - Employee's own requests
- `GET /api/time-off/balance` - Employee's leave balance (auto-creates if missing)
- `GET /api/time-off/pending` - Admin/manager only: pending requests for approval
- `POST /api/time-off/requests` - Submit new request
- `PATCH /api/time-off/requests/:id` - Approve/decline (admin/manager only)

**Role Enforcement:**
- Viewing pending requests: requires `admin` or `manager` role
- Approving/declining: requires `admin` or `manager` role
- Balance auto-deduction: happens on approval

### Recommendation

Since the Next.js production app was specifically built to handle Time Off:

1. **Keep the Next.js Time Off implementation entirely**
2. **Add dropdown navigation** within the Time Off tab to expose sub-sections:
   - My Requests
   - My Balance
   - Pending Approvals (admin/manager only)
   - Team Calendar (future enhancement)
3. **Verify feature parity** with the Replit app's capabilities listed above
4. **If gaps exist**, port the specific missing functionality (e.g., balance auto-deduction, role-gated approval) from the Replit codebase

---

## 6. Backend Architecture Comparison

### Express (Replit) Pattern

```typescript
// Authentication middleware
async function ensureEmployee(req, res): Promise<Employee | null> {
  // Demo mode bypass OR Replit Auth OIDC
  // Returns employee object or sends 401/500
}

// Route handler
app.post("/api/goals", async (req, res) => {
  const employee = await ensureEmployee(req, res);
  if (!employee) return;
  // Zod validation
  // Storage layer call
  // Activity logging
  // XP award
  // Response
});
```

**Key patterns:**
- `ensureEmployee()` auth guard on every route
- Inline Zod validation per endpoint
- Storage abstraction layer (`IStorage` interface)
- Activity logging after mutations
- XP awards after qualifying actions

### Next.js Route Handler (Target) Pattern

```typescript
// app/api/goals/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request);  // Auth utility
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Zod validation
  // Storage/DB call
  // Activity logging
  // XP award
  // Return NextResponse.json(...)
}
```

### Conversion Strategy

The conversion is mechanical. For each Express route:

1. Create corresponding file in `app/api/[feature]/route.ts`
2. Replace `(req, res)` with `(request: NextRequest)` and `NextResponse`
3. Replace `ensureEmployee(req, res)` with a Next.js auth utility
4. Keep Zod validation, storage calls, XP logic identical
5. Replace `res.json()` / `res.status()` with `NextResponse.json()`

**What can be copied directly:**
- Storage layer (`storage.ts`) - pure Drizzle, no Express dependency
- XP engine (`xp-engine.ts`) - pure TypeScript, no framework dependency
- Schema definitions (`schema.ts`) - Drizzle schema, fully portable
- Zod validation schemas - framework-agnostic
- Seed data (`seed.ts`) - pure database operations

**What must be rewritten:**
- Route handlers (Express to Next.js Route Handlers)
- Auth middleware (Passport/Express-session to Next.js auth pattern)
- AI Coach streaming (WebSocket to SSE or streaming response)
- File upload handling (Express multipart to Next.js upload pattern)

---

## 7. State Management Comparison

### Replit App

```typescript
// queryClient.ts - Custom default fetcher
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),  // Uses queryKey as URL
      staleTime: Infinity,
      retry: false,
    },
  },
});

// Usage in components - queryKey IS the URL
const { data } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });

// Mutations
const mutation = useMutation({
  mutationFn: () => apiRequest("POST", "/api/goals", formData),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
});
```

### Next.js App Migration

TanStack Query works identically in Next.js client components. The pattern ports directly:

1. Keep `QueryClientProvider` in root layout (client component wrapper)
2. Keep `apiRequest` utility for mutations
3. Keep `queryKey` patterns for cache invalidation
4. Add `"use client"` directive to all components using hooks
5. Optionally leverage Server Components for initial data loading (progressive enhancement)

---

## 8. Authentication & Role/Permission Systems

### Replit App Role System

```
Roles: admin | manager | member (PostgreSQL enum)

Role Enforcement Points:
┌──────────────────────────────────────────────────────┐
│ Endpoint                     │ Required Role          │
├──────────────────────────────┼────────────────────────┤
│ GET /api/time-off/pending    │ admin OR manager       │
│ PATCH /api/time-off/:id      │ admin OR manager       │
│ All other endpoints          │ any authenticated user │
│ Own data mutations           │ ownership check only   │
└──────────────────────────────┴────────────────────────┘

Ownership checks:
- Goals: employeeId === currentEmployee.id
- Milestones: careerPath.employeeId === currentEmployee.id
- Milestone steps: via milestone ownership chain
- Feedback: senderId === currentEmployee.id
- Snaps: senderId === currentEmployee.id

Company scoping:
- All queries filtered by employee.companyId
- Cross-company data access prevented at storage layer
```

### Next.js App Auth System

The production Next.js app has its own auth system (details need to be confirmed from production codebase). Key questions to resolve:

1. **What auth provider?** (NextAuth.js, custom JWT, Clerk, etc.)
2. **How are roles stored?** (database column, JWT claim, etc.)
3. **Is there a middleware guard?** (Next.js middleware.ts)
4. **How is the user/employee linked?** (session, cookie, etc.)

### Role/Permission Mapping Strategy

```
Step 1: Document the Next.js app's existing role model
Step 2: Map Replit roles to Next.js roles

Replit Role    →    Next.js Equivalent
─────────          ──────────────────
admin              admin (or equivalent highest-privilege role)
manager            manager (or team lead equivalent)
member             member (default role for employees)

Step 3: Create a unified permission matrix
Step 4: Implement role checks as a shared utility

// lib/auth/permissions.ts
export function canApproveTimeOff(role: string): boolean {
  return role === "admin" || role === "manager";
}

export function canViewPendingRequests(role: string): boolean {
  return role === "admin" || role === "manager";
}

export function isOwner(resourceEmployeeId: string, currentEmployeeId: string): boolean {
  return resourceEmployeeId === currentEmployeeId;
}
```

### Privilege Escalation Prevention

1. **Never trust client-side role checks alone** - always verify on the server
2. **Always check ownership** before allowing mutations on personal resources
3. **Company scoping** must be enforced on every query to prevent cross-tenant access
4. **Role assignment** should only be possible by admins through a dedicated admin endpoint
5. **Default new users to "member"** role - never auto-assign elevated roles

---

## 9. Database Safety & Schema Strategy

### Critical Rule: Preserve Production Data

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SAFETY RULES                     │
│                                                              │
│  1. NEVER drop tables that contain production data           │
│  2. NEVER rename columns in production tables                │
│  3. NEVER change column types (serial ↔ varchar)             │
│  4. ONLY use additive migrations (ADD COLUMN, CREATE TABLE)  │
│  5. ALWAYS backup before schema changes                      │
│  6. Use drizzle-kit push --force for safe sync               │
│  7. Test migrations on a staging/shadow database first       │
└─────────────────────────────────────────────────────────────┘
```

### New Tables to Add (from Replit App)

These tables do NOT exist in the Next.js production database and can be safely created:

```sql
-- Safe to create (no conflicts with production)
CREATE TABLE goals (...)
CREATE TABLE snaps (...)
CREATE TABLE feedback_requests (...)
CREATE TABLE feedback (...)
CREATE TABLE activities (...)
CREATE TABLE career_paths (...)
CREATE TABLE milestones (...)
CREATE TABLE milestone_steps (...)
CREATE TABLE journal_entries (...)
CREATE TABLE skill_assessments (...)
CREATE TABLE xp_events (...)
```

### Tables That May Overlap

```
POTENTIAL CONFLICTS (verify before migrating):
┌────────────────────┬────────────────────────────────────────┐
│ Replit Table        │ Potential Next.js Equivalent           │
├────────────────────┼────────────────────────────────────────┤
│ employees          │ members (or users) table               │
│ companies          │ organizations (or tenants) table       │
│ teams              │ departments (or teams) table           │
│ timeOffRequests    │ Existing time_off table                │
│ timeOffBalances    │ Existing balances table                │
│ users (auth)       │ Existing auth/users table              │
└────────────────────┴────────────────────────────────────────┘
```

### Schema Alignment Process

```
Step 1: Export production schema
  → drizzle-kit introspect (on production Neon DB)
  → Document every existing table, column, type, constraint

Step 2: Compare with Replit schema
  → Identify exact matches, partial matches, conflicts
  → Map foreign key references

Step 3: Create additive migration plan
  → New tables: create as-is
  → Overlapping tables: ADD COLUMN only for missing fields
  → Foreign keys: reference existing production IDs

Step 4: Test on shadow database
  → Create a Neon branch (shadow copy)
  → Run migrations on shadow
  → Verify no data loss
  → Verify foreign key integrity

Step 5: Apply to production
  → Schedule during low-traffic window
  → Run drizzle-kit push
  → Verify with SELECT queries
```

### PostgreSQL Enum Safety

The Replit app defines multiple PostgreSQL enums. When adding to the production database:

```sql
-- Safe: Creating NEW enums that don't exist yet
CREATE TYPE goal_category AS ENUM ('growth', 'delivery', 'leadership', 'learning');
CREATE TYPE goal_status AS ENUM ('not_started', 'on_track', 'at_risk', 'completed');
CREATE TYPE career_phase AS ENUM ('foundation', 'growing', 'leading', 'mastering');
CREATE TYPE xp_category AS ENUM ('snap_give', 'snap_receive', ...);

-- CAUTION: If 'role' enum already exists in production
-- Verify existing values match: admin, manager, member
-- If different values exist, DO NOT recreate - extend instead
ALTER TYPE role ADD VALUE 'new_value' IF NOT EXISTS;
```

---

## 10. Data Migration & ETL Strategy

### Important Prerequisite

Before migrating any features, you must understand whether the goal is to:
- **A)** Start fresh in production (new empty tables, users build data from scratch), OR
- **B)** Migrate existing demo/development data from the Replit app's database into production

For most cases, **Option A is recommended** since the Replit app contains demo/seed data (Sarah Chen, Marcus Johnson, etc.) that should NOT go into production. Production users will create their own data organically.

### When Data Migration IS Needed

If the Replit app accumulates real user data before the migration is complete, or if specific seed data (like milestone templates or company settings) should carry over:

```
ETL Pipeline (if applicable):

Step 1: EXTRACT
  → Export Replit DB tables to JSON or CSV
  → pg_dump --data-only --table=<table> for specific tables
  → Document row counts and relationships

Step 2: TRANSFORM
  → Map Replit employee IDs to Next.js member IDs
  → Map Replit companyId to Next.js organization ID
  → Resolve foreign key references:
      employees.id  →  Next.js members.id (key mapping table)
      companies.id  →  Next.js organizations.id
      teams.id      →  Next.js teams/departments.id
  → Strip demo-mode artifacts
  → Convert timestamps to consistent timezone

Step 3: LOAD
  → Insert into Neon shadow branch FIRST
  → Validate foreign key integrity
  → Run application against shadow to verify
  → Apply to production only after full validation
```

### ID Reconciliation Strategy

The biggest challenge is mapping IDs between the two systems:

```
┌─────────────────────────────────────────────────────────────┐
│                   ID MAPPING TABLE                           │
│                                                              │
│  Create a temporary mapping table:                           │
│                                                              │
│  replit_to_nextjs_map (                                      │
│    entity_type VARCHAR,    -- 'employee', 'company', 'team'  │
│    replit_id VARCHAR,      -- UUID from Replit DB             │
│    nextjs_id VARCHAR,      -- ID from Next.js production DB  │
│  )                                                           │
│                                                              │
│  Process:                                                    │
│  1. Match employees by email (unique, reliable identifier)   │
│  2. Match companies by name/slug                             │
│  3. Match teams by name within company                       │
│  4. For unmatched entities: create new records in Next.js    │
│  5. Rewrite all foreign keys using the mapping               │
│  6. Drop mapping table after migration verified              │
└─────────────────────────────────────────────────────────────┘
```

### Tables That Need No Data Migration

These are new feature tables with no Next.js equivalent. They can be created empty:

```
goals, snaps, feedback, feedback_requests,
career_paths, milestones, milestone_steps,
journal_entries, skill_assessments, xp_events, activities
```

### Tables Requiring Careful Reconciliation

```
employees ↔ members:
  → Match by email address
  → Add missing columns to Next.js schema (additive only)
  → Do NOT overwrite existing production member data
  → Merge additional profile fields (strengths, funFacts, etc.)

time_off_requests ↔ existing leave_requests:
  → Keep Next.js data as source of truth
  → Only migrate if Replit has additional requests not in Next.js
  → Match by employee email + date range to avoid duplicates

time_off_balances ↔ existing balances:
  → Keep Next.js data as source of truth
  → Verify default allocations match (vacation:15, sick:10, personal:3)
```

### Backfill Strategy for Existing Employees

When new feature tables are created, existing Next.js employees need baseline records:

```sql
-- After creating career_paths table, backfill for existing employees:
INSERT INTO career_paths (employee_id, company_id, current_phase, xp, season_xp, lifetime_xp)
SELECT id, company_id, 'foundation', 0, 0, 0
FROM members  -- or employees, depending on Next.js table name
WHERE id NOT IN (SELECT employee_id FROM career_paths);

-- After creating time_off_balances (if not already in Next.js):
INSERT INTO time_off_balances (employee_id, company_id, year, vacation_total, vacation_used, ...)
SELECT id, company_id, 2026, 15, 0, 10, 0, 3, 0
FROM members
WHERE id NOT IN (SELECT employee_id FROM time_off_balances WHERE year = 2026);
```

---

## 11. Environment Variables & Secrets

### Required Environment Variables

| Variable | Purpose | Source | Risk if Missing |
|---|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection | Next.js production env | App cannot start |
| `SESSION_SECRET` | Session encryption | Generate securely | Auth bypass risk |
| `OPENAI_API_KEY` | AI Coach + Voice Input | OpenAI account | AI features fail gracefully |
| `NEXT_PUBLIC_APP_URL` | Public URL for callbacks | Deployment config | Auth redirects break |

### Variables from Replit App (may need equivalents)

| Replit Variable | Next.js Equivalent | Action |
|---|---|---|
| `DATABASE_URL` | Already exists (Neon) | Use existing |
| `SESSION_SECRET` | Already exists or create | Verify/create |
| `REPL_ID` | Not needed | Remove references |
| `ISSUER_URL` | Not needed (different auth) | Remove references |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Equivalent cloud storage | Configure for Next.js |
| `DEMO_MODE` | Not needed in production | Remove all demo mode code |

### Critical: DEMO_MODE Removal

The Replit app has `DEMO_MODE = true` hardcoded in both the frontend and backend. This **must be completely removed** before migrating any code to production:

```
Files with DEMO_MODE:
- server/routes.ts (line 29): const DEMO_MODE = true
- client/src/App.tsx (line 86): const DEMO_MODE = true
```

All demo mode code paths must be stripped. In production, every request must go through proper authentication.

---

## 12. Migration Strategy: Phased Execution Plan

### Pre-Migration Phase (Before Any Code Changes)

```
Duration: 1-2 days

Tasks:
□ 1. Obtain the production Next.js codebase (if not already in workspace)
□ 2. Document production database schema (drizzle-kit introspect)
□ 3. Document production auth system and role model
□ 4. Create Neon database branch for testing (shadow database)
□ 5. Set up development environment for Next.js app in Replit
□ 6. Verify production deployment pipeline works from Replit
□ 7. Create a production database backup
```

### Phase 1: Foundation - Schema & Utilities (Days 1-2)

```
Goal: Add new database tables and port reusable backend logic.
Risk: LOW (additive changes only, no UI changes)
Production Impact: NONE (tables created but unused)

Tasks:
□ 1.1 Add new Drizzle schema definitions to Next.js project:
      - goals, snaps, feedback, feedbackRequests
      - activities, careerPaths, milestones, milestoneSteps
      - journalEntries, skillAssessments, xpEvents
      - Required enums (goalCategory, goalStatus, etc.)

□ 1.2 Create additive migration (new tables only)
      - Test on Neon branch first
      - Verify existing tables untouched
      - Run drizzle-kit push on production

□ 1.3 Port storage layer:
      - Copy IStorage interface methods for new features
      - Implement DatabaseStorage methods using Drizzle
      - Adapt to Next.js database connection pattern

□ 1.4 Port XP engine (xp-engine.ts):
      - Copy directly (no framework dependencies)
      - Update imports to match Next.js paths
      - Add unit tests

□ 1.5 Create auth utility for Next.js:
      - getAuthEmployee(request) function
      - Role checking utilities
      - Ownership verification helpers

Verification:
- All new tables exist in production DB
- No existing tables modified
- Storage methods work with test queries
- XP engine passes unit tests
```

### Phase 2: Goals & OKRs (Days 3-4)

```
Goal: First fully functional feature migration.
Risk: LOW (self-contained feature, new UI pages)
Production Impact: New pages appear in navigation

Tasks:
□ 2.1 Create API Route Handlers:
      - app/api/goals/route.ts (GET, POST)
      - app/api/goals/[id]/route.ts (PATCH, DELETE)

□ 2.2 Port frontend components:
      - Goals list page (app/(authenticated)/goals/page.tsx)
      - Goal card component
      - Create/edit goal dialog
      - Add "use client" directives as needed

□ 2.3 Wire XP awards:
      - goal_create: +3 XP
      - goal_update: +2 XP
      - goal_complete: +8 XP

□ 2.4 Add to navigation sidebar/menu

Verification:
- Create, view, edit, delete goals
- XP awarded on qualifying actions
- Goals scoped to authenticated employee
- Navigation works from all pages
```

### Phase 3: Recognition Snaps (Days 5-6)

```
Goal: Peer recognition feature.
Risk: LOW (self-contained, references employees)
Production Impact: New page, new data

Tasks:
□ 3.1 Create API Route Handlers:
      - app/api/snaps/route.ts (GET, POST)

□ 3.2 Port frontend:
      - Snaps page with send/view functionality
      - Snap card component

□ 3.3 Wire XP awards:
      - snap_give: +1 XP (per-recipient cap: 2/week)
      - snap_receive: +1 XP

□ 3.4 Add activity logging

Verification:
- Send snaps to other employees
- View received snaps
- XP awarded with per-recipient cap enforced
```

### Phase 4: Peer Feedback (Days 7-8)

```
Goal: Structured feedback with request/respond flow.
Risk: LOW-MEDIUM (two-sided interaction)
Production Impact: New pages, email notifications TBD

Tasks:
□ 4.1 Create API Route Handlers:
      - app/api/feedback/route.ts (GET, POST)
      - app/api/feedback/[id]/read/route.ts (PATCH)
      - app/api/feedback/request/route.ts (POST)

□ 4.2 Port frontend:
      - Feedback page with tabs (Given/Received/Requests)
      - Feedback card, request card components
      - Anonymous feedback toggle

□ 4.3 Wire XP awards:
      - feedback_give: +3 XP (quality gate: 20+ chars)
      - feedback_request: +2 XP

Verification:
- Request feedback from colleague
- Respond to feedback request
- Mark feedback as read
- Anonymous feedback hides sender
- Quality gate enforced
```

### Phase 5: Career Growth & XP Display (Days 9-11)

```
Goal: Career journey with milestones, journal, skills, and XP visualization.
Risk: MEDIUM (complex feature with multiple sub-features)
Production Impact: Major new section

Tasks:
□ 5.1 Create API Route Handlers:
      - app/api/career/route.ts (GET)
      - app/api/career/milestones/route.ts (POST)
      - app/api/career/milestones/[id]/route.ts (PATCH, DELETE)
      - app/api/career/milestones/[id]/steps/route.ts (POST)
      - app/api/career/steps/[id]/route.ts (PATCH, DELETE)
      - app/api/career/journal/route.ts (GET, POST)
      - app/api/career/skills/route.ts (GET, POST)
      - app/api/xp/summary/route.ts (GET)

□ 5.2 Port frontend:
      - Career page (phases, milestones, journal, skills)
      - XP Level Widget (progress ring, level display)
      - XP Weekly Breakdown component
      - Skill radar chart
      - Achievement badges

□ 5.3 Wire remaining XP awards:
      - milestone_complete, milestone_step, journal, skill_assessment
      - Variety bonus (+3 XP for 3+ category groups/week)
      - Consistency streak (+2 XP/week for consecutive activity)

□ 5.4 Port XP toast notifications

Verification:
- Career page shows phases and milestones
- Can create/complete milestones and steps
- Journal entries award XP
- Skill assessments work with radar chart
- XP widget displays on dashboard
- Weekly breakdown shows correct caps and progress
- Variety and streak bonuses trigger correctly
```

### Phase 6: Dashboard & Activity Feed (Days 12-13)

```
Goal: Unified home experience.
Risk: LOW (read-only aggregation of existing data)
Production Impact: New dashboard replaces or supplements existing home

Tasks:
□ 6.1 Create API Route Handlers:
      - app/api/dashboard/route.ts (GET - aggregated data)
      - app/api/activities/route.ts (GET)

□ 6.2 Port frontend:
      - Dashboard page (goals overview, recent snaps, pending actions, XP widget)
      - Activity feed page

□ 6.3 Integrate with existing Members/Time Off data

Verification:
- Dashboard loads with real data from all features
- Activity feed shows recent actions across the company
- XP widget displays correctly
```

### Phase 7: AI Coach & Voice Input (Days 14-16)

```
Goal: Interactive AI features.
Risk: MEDIUM (external API dependency, streaming)
Production Impact: New floating component, voice buttons

Tasks:
□ 7.1 AI Coach:
      - Convert WebSocket to Server-Sent Events (SSE)
        OR use Next.js streaming Response
      - app/api/coach/route.ts (POST with streaming response)
      - Port AI Coach floating component
      - Context-awareness based on current page

□ 7.2 Voice Input:
      - app/api/transcribe/route.ts (POST)
      - Port VoiceInput component
      - Wire to text fields (goals, journal, snaps, feedback)

□ 7.3 Configure OpenAI API key in production environment

Verification:
- AI Coach responds with context-aware suggestions
- Streaming works without buffering entire response
- Voice input transcribes speech to text
- Voice buttons appear on appropriate fields
```

### Phase 8: Time Off Enhancement & Navigation (Day 17)

```
Goal: Enhance existing Time Off with dropdown navigation per user request.
Risk: LOW (enhancing existing feature)
Production Impact: UI enhancement to existing feature

Tasks:
□ 8.1 Add dropdown/tab navigation within Time Off section:
      - My Requests (existing)
      - My Balance (existing or add)
      - Pending Approvals (admin/manager only)
      - Team Calendar (future)

□ 8.2 Verify feature parity with Replit app:
      - Balance auto-creation for new years
      - Balance deduction on approval
      - Role-gated approval

Verification:
- Dropdown navigation works within Time Off
- All sub-sections accessible by role
- Existing functionality preserved
```

### Phase 9: Settings & Final Integration (Days 18-19)

```
Goal: Settings page and overall polish.
Risk: LOW
Production Impact: New settings page

Tasks:
□ 9.1 Port Settings page (theme toggle, profile preferences)
□ 9.2 Verify all navigation links work
□ 9.3 Verify dark/light mode across all new pages
□ 9.4 Performance audit (bundle size, loading times)
□ 9.5 Accessibility check
□ 9.6 Remove all DEMO_MODE references
□ 9.7 Remove all Replit-specific code (REPL_ID, ISSUER_URL, etc.)

Verification:
- Full end-to-end user journey works
- All features accessible from navigation
- No demo mode code in production
```

### Post-Migration Phase

```
Tasks:
□ 1. Full regression testing on staging
□ 2. Performance benchmarks
□ 3. Security audit (auth, role checks, data scoping)
□ 4. Deploy to production
□ 5. Monitor error rates for 48 hours
□ 6. Plan admin tools feature (new development, not migration)
```

---

## 13. Reusability Assessment

### Can Be Copied Directly (No Changes)

| File/Module | Lines | Reason |
|---|---|---|
| `server/xp-engine.ts` | 350 | Pure TypeScript, no framework deps |
| `shared/schema.ts` (new tables only) | ~250 | Drizzle schema, framework-agnostic |
| Zod validation schemas | ~200 | Used identically in Next.js |
| Seed data logic | 291 | Pure database operations |

### Can Be Adapted with Minor Changes

| File/Module | Lines | Changes Needed |
|---|---|---|
| `server/storage.ts` (IStorage + impl) | 506 | Update imports, DB connection |
| Frontend page components | ~3,600 | Add "use client", update imports |
| UI components (shadcn) | ~500 | Already compatible, update imports |
| TanStack Query hooks | ~100 | Identical in client components |

### Must Be Rewritten

| File/Module | Lines | Reason |
|---|---|---|
| Express route handlers | ~1,295 | Convert to Next.js Route Handlers |
| Auth middleware | ~150 | Different auth system entirely |
| AI Coach streaming | ~120 | WebSocket to SSE/streaming response |
| Vite-specific config | ~60 | Not applicable in Next.js |
| Replit Auth integration | ~200 | Not applicable in Next.js |

---

## 14. Risk Analysis

### High Severity Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Production data loss during schema migration | Low | Critical | Neon branching, backups before every migration |
| Auth system conflict | Medium | High | Map role systems before writing any auth code |
| Foreign key constraint failures | Medium | High | Test all migrations on shadow database first |

### Medium Severity Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Tailwind v3 to v4 styling issues | High | Medium | Test each component visually after migration |
| React 18 to 19 breaking changes | Medium | Medium | Review React 19 migration guide for each hook |
| XP engine edge cases in production | Low | Medium | Port unit tests alongside engine |
| OpenAI API rate limits | Low | Medium | Implement graceful degradation |

### Low Severity Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Bundle size increase | Medium | Low | Code-split by route (automatic in Next.js) |
| Different loading patterns (SPA vs SSR) | Medium | Low | Use "use client" consistently at first |
| pnpm vs npm dependency differences | Low | Low | Test dependency resolution |

---

## 15. Rollback Strategy

### Per-Phase Rollback

Each migration phase is designed to be independently reversible:

```
Phase 1 (Schema): 
  → Drop newly created tables (no production data in them yet)
  → Revert Drizzle schema file changes

Phase 2-6 (Feature Pages):
  → Remove new page routes (app/(authenticated)/[feature])
  → Remove new API routes (app/api/[feature])
  → Remove navigation links
  → Existing features continue working untouched

Phase 7 (AI Features):
  → Remove API routes and components
  → Remove OpenAI key from environment (no cost)
  → No database impact

Phase 8 (Time Off Enhancement):
  → Revert to original Time Off UI
  → No database impact (existing tables unchanged)
```

### Database Rollback

```
1. Neon Point-in-Time Recovery:
   → Neon supports branching and PITR
   → Before each phase, note the timestamp
   → Can restore to any point within retention window

2. Migration Scripts:
   → Keep "down" migration scripts for every "up" migration
   → Only needed for schema changes (Phase 1)
   → New tables can be dropped safely since they have no production data

3. Emergency Rollback:
   → If production data is affected, use Neon PITR immediately
   → Revert code deployment to previous version
   → Notify team of rollback
```

### Code Rollback

```
1. Git-based:
   → Each phase is a separate branch + PR
   → Revert PR to undo entire phase
   → No cross-phase dependencies in first 6 phases

2. Feature Flags (optional enhancement):
   → Wrap new navigation items in feature flags
   → Disable features without code deployment
   → Recommended for Phase 7+ (AI features)
```

---

## 16. Proposed Next.js Folder Structure

```
copilot-lms/
├── app/
│   ├── (authenticated)/           ← Auth-required layout group
│   │   ├── layout.tsx             ← Sidebar, nav, auth guard
│   │   ├── dashboard/
│   │   │   └── page.tsx           ← Unified dashboard
│   │   ├── members/               ← Existing (keep as-is)
│   │   │   └── page.tsx
│   │   ├── goals/
│   │   │   └── page.tsx           ← Migrated from Replit
│   │   ├── snaps/
│   │   │   └── page.tsx           ← Migrated from Replit
│   │   ├── feedback/
│   │   │   └── page.tsx           ← Migrated from Replit
│   │   ├── career/
│   │   │   └── page.tsx           ← Migrated from Replit
│   │   ├── time-off/              ← Existing (enhanced with dropdown)
│   │   │   └── page.tsx
│   │   ├── activity/
│   │   │   └── page.tsx           ← Migrated from Replit
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── admin/                 ← Future: admin tools
│   │       ├── layout.tsx         ← Admin-only guard
│   │       ├── people/page.tsx
│   │       └── analytics/page.tsx
│   │
│   ├── api/
│   │   ├── dashboard/route.ts
│   │   ├── goals/
│   │   │   ├── route.ts           ← GET, POST
│   │   │   └── [id]/route.ts      ← PATCH, DELETE
│   │   ├── snaps/route.ts         ← GET, POST
│   │   ├── feedback/
│   │   │   ├── route.ts           ← GET, POST
│   │   │   ├── [id]/read/route.ts
│   │   │   └── request/route.ts
│   │   ├── career/
│   │   │   ├── route.ts           ← GET (full career data)
│   │   │   ├── milestones/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── steps/route.ts
│   │   │   ├── steps/[id]/route.ts
│   │   │   ├── journal/route.ts
│   │   │   └── skills/route.ts
│   │   ├── xp/summary/route.ts
│   │   ├── activities/route.ts
│   │   ├── coach/route.ts         ← Streaming SSE
│   │   ├── transcribe/route.ts
│   │   ├── time-off/              ← Existing (keep)
│   │   │   ├── requests/route.ts
│   │   │   ├── balance/route.ts
│   │   │   └── pending/route.ts
│   │   └── members/               ← Existing (keep)
│   │
│   ├── layout.tsx                 ← Root layout
│   ├── page.tsx                   ← Landing/login
│   └── globals.css
│
├── lib/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── employees.ts       ← Existing members/employees schema
│   │   │   ├── goals.ts           ← New
│   │   │   ├── snaps.ts           ← New
│   │   │   ├── feedback.ts        ← New
│   │   │   ├── career.ts          ← New (paths, milestones, journal, skills)
│   │   │   ├── xp-events.ts       ← New
│   │   │   ├── time-off.ts        ← Existing
│   │   │   └── index.ts           ← Re-exports all schemas
│   │   ├── storage.ts             ← Ported from Replit (IStorage + impl)
│   │   └── index.ts               ← Drizzle DB connection
│   │
│   ├── xp/
│   │   └── engine.ts              ← Ported from Replit (xp-engine.ts)
│   │
│   ├── auth/
│   │   ├── session.ts             ← Next.js auth utilities
│   │   └── permissions.ts         ← Role checking, ownership validation
│   │
│   └── utils.ts                   ← Shared utilities
│
├── components/
│   ├── ui/                        ← shadcn/ui components
│   ├── features/
│   │   ├── goals/                 ← Goal-specific components
│   │   ├── snaps/                 ← Snap-specific components
│   │   ├── feedback/              ← Feedback-specific components
│   │   ├── career/                ← Career-specific components
│   │   └── xp/                    ← XP widget, breakdown, toast
│   ├── ai-coach.tsx               ← Floating AI coach
│   ├── voice-input.tsx            ← Voice recording component
│   └── sidebar.tsx                ← App navigation
│
├── hooks/
│   ├── use-auth.ts
│   ├── use-xp-toast.ts            ← Ported from Replit
│   └── use-mobile.ts
│
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 17. Appendix: API Endpoint Inventory

### All Replit App Endpoints (35 total)

```
PROFILE & DIRECTORY
  GET    /api/profile                    → Get current employee
  PATCH  /api/profile                    → Update own profile
  GET    /api/directory                  → List all employees + teams
  GET    /api/employees/:id             → Get employee detail

DASHBOARD
  GET    /api/dashboard                  → Aggregated dashboard data

GOALS
  GET    /api/goals                      → List own goals
  POST   /api/goals                      → Create goal (+3 XP)
  PATCH  /api/goals/:id                  → Update goal (+2/+8 XP)
  DELETE /api/goals/:id                  → Delete goal

RECOGNITION SNAPS
  GET    /api/snaps                      → List snaps (sent + received)
  POST   /api/snaps                      → Send snap (+1 XP give, +1 XP receive)

FEEDBACK
  GET    /api/feedback                   → List feedback (sent/received/requests)
  POST   /api/feedback                   → Give feedback (+3 XP, quality gate)
  PATCH  /api/feedback/:id/read          → Mark as read
  POST   /api/feedback/request           → Request feedback (+2 XP)

ACTIVITIES
  GET    /api/activities                 → Company activity feed

XP SYSTEM
  GET    /api/xp/summary                 → Season/lifetime XP, level, weekly breakdown

CAREER GROWTH
  GET    /api/career                     → Full career data (path, milestones, badges)
  POST   /api/career/milestones          → Create milestone
  PATCH  /api/career/milestones/:id      → Update milestone (+10 XP on complete)
  DELETE /api/career/milestones/:id      → Delete milestone
  POST   /api/career/milestones/:id/steps → Add step to milestone
  PATCH  /api/career/steps/:id           → Update step (+3 XP on complete)
  DELETE /api/career/steps/:id           → Delete step
  GET    /api/career/journal             → List journal entries
  POST   /api/career/journal             → Create entry (+5 XP)
  GET    /api/career/skills              → List skill assessments
  POST   /api/career/skills              → Create assessment (+5 XP)

TIME OFF
  GET    /api/time-off/requests          → Own requests
  GET    /api/time-off/balance           → Own balance
  GET    /api/time-off/pending           → Pending requests (admin/manager only)
  POST   /api/time-off/requests          → Submit request
  PATCH  /api/time-off/requests/:id      → Approve/decline (admin/manager only)

AI FEATURES
  POST   /api/transcribe                 → Speech-to-text
  POST   /api/coach                      → AI coach (streaming response)
```

---

## Summary: Execution Checklist

```
PRE-MIGRATION
□ Obtain production Next.js codebase
□ Document production DB schema
□ Document production auth system
□ Create Neon branch for testing
□ Create production backup

PHASE 1: Foundation (Days 1-2)
□ Add new Drizzle schemas
□ Create new tables (shadow DB → production)
□ Port storage layer
□ Port XP engine
□ Create auth utilities

PHASE 2: Goals (Days 3-4)
□ API routes + frontend + XP wiring

PHASE 3: Snaps (Days 5-6)
□ API routes + frontend + XP wiring

PHASE 4: Feedback (Days 7-8)
□ API routes + frontend + XP wiring

PHASE 5: Career & XP (Days 9-11)
□ Full career system + XP display widgets

PHASE 6: Dashboard & Activity (Days 12-13)
□ Aggregated dashboard + activity feed

PHASE 7: AI Features (Days 14-16)
□ AI Coach (SSE) + Voice Input

PHASE 8: Time Off Enhancement (Day 17)
□ Dropdown nav + feature parity check

PHASE 9: Settings & Polish (Days 18-19)
□ Settings page + DEMO_MODE removal + audit

POST-MIGRATION
□ Full regression testing
□ Security audit
□ Production deployment
□ 48-hour monitoring
```

**Estimated Total Duration: 3-4 weeks**
**Complexity: MEDIUM-HIGH**
**Risk Level: MEDIUM (mitigated by phased approach and Neon branching)**

---

*This document is the single source of truth for the migration. Update it as decisions are made and phases are completed. Do not begin any phase without verifying the pre-migration checklist is complete.*
