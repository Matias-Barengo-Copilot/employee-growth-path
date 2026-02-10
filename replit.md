# Copilot - Employee Experience & Professional Growth App

## Overview

Copilot is a mobile-first employee experience application designed for small agency teams (10-20 people). The application strengthens workplace culture, increases role clarity and accountability, and supports continuous professional growth.

**Core Features:**
- **Team Directory** - Employee profiles with skills, interests, and working preferences
- **Goals & OKRs** - Personal goal setting and progress tracking across categories (growth, delivery, leadership, learning)
- **Recognition Snaps** - Quick peer-to-peer recognition with tagging
- **Peer Feedback** - Request and provide constructive feedback with anonymous options
- **Dashboard** - Unified view of goals, recent activity, and pending actions
- **Career Growth Journey** - Career map with milestones (4 phases), XP system, journal entries, skill radar chart, and achievement badges
- **Time Off** - Request vacation, sick days, half days, and personal time; managers/admins approve or decline; leave balance tracking per year
- **Voice Input** - Microphone buttons on text fields throughout the app (goals, journal, snaps, feedback, time-off) using OpenAI gpt-4o-mini-transcribe for speech-to-text
- **AI Coach** - Floating contextual career coach (bottom-right button) that understands user role, goals, and current page to provide personalized guidance via streaming chat

The application is built as a monorepo with a React frontend and Express backend, using PostgreSQL for data persistence and Replit Auth for authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with path aliases (`@/` for client source, `@shared/` for shared code)

**Design Decisions:**
- Mobile-first responsive design with bottom navigation on mobile, sidebar on desktop
- Component-driven architecture with reusable cards for goals, snaps, feedback, and employees
- Dialog-based workflows for creating/editing content to maintain context

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth (OpenID Connect) with session management via connect-pg-simple
- **API Pattern**: RESTful JSON API under `/api/` prefix

**Key Design Patterns:**
- Storage abstraction layer (`server/storage.ts`) for all database operations
- Employee-centric data model where users are linked to employees after authentication
- Automatic employee creation on first login with default company assignment

### Data Model
The schema uses PostgreSQL with these core entities:
- **Users** - Authentication identity (managed by Replit Auth)
- **Companies** - Organization container
- **Teams** - Groups within companies
- **Employees** - User profiles with company/team associations
- **Goals** - Personal objectives with category, status, and progress tracking
- **Snaps** - Recognition messages between employees
- **Feedback/FeedbackRequests** - Structured feedback with anonymous option
- **CareerPaths** - One per employee, tracks XP, phase (foundation/growing/leading/mastering), streaks
- **Milestones** - Career milestones grouped by phase with XP rewards and status tracking
- **MilestoneSteps** - Checklist items within milestones (10 XP each on completion)
- **JournalEntries** - Progress journal entries (15 XP each, feed streak tracking)
- **SkillAssessments** - Self-assessment with multi-dimension scoring (20 XP each)
- **TimeOffRequests** - Leave requests with type (vacation/sick/half_day/personal), date range, status (pending/approved/declined), reviewer info
- **TimeOffBalances** - Per-employee per-year leave allocations and usage (vacation: 15, sick: 10, personal: 3 days)

### Career Growth System
- XP thresholds: Foundation (0-200), Growing (200-500), Leading (500-1000), Mastering (1000+)
- 9 achievement badges computed dynamically from activity metrics
- Phase auto-recalculates on all XP-earning actions
- Ownership validation on all career resource mutations
- Demo mode (DEMO_MODE=true) bypasses auth, uses Sarah Chen as demo user

### Shared Code
The `shared/` directory contains:
- Database schema definitions (Drizzle tables and types)
- Zod schemas for validation
- Type exports used by both frontend and backend

## External Dependencies

### Database
- **PostgreSQL** - Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle Kit** - Database migrations stored in `/migrations`

### Authentication
- **Replit Auth** - OpenID Connect provider for user authentication
- **Passport.js** - Authentication middleware with OpenID Connect strategy
- **express-session** - Session management with PostgreSQL session store

### File Storage
- **Google Cloud Storage** - Object storage for file uploads (profile images, attachments)
- **Uppy** - Client-side file upload handling with presigned URL flow

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier

### Key NPM Packages
- `@tanstack/react-query` - Data fetching and caching
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `zod` - Schema validation
- `date-fns` - Date formatting
- `lucide-react` - Icon library