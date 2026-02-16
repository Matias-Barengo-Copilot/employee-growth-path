# CoPilot Leave Management System - Playwright Testing Context

## Application Overview

**CoPilot LMS** is a Leave Management System (LMS) built with Next.js 16, TypeScript, React, and PostgreSQL. It enables employees to submit leave requests, supervisors to approve them, and HR to manage the entire organization's leave management process.

### Tech Stack
- **Framework**: Next.js 16.1.0 (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (via Neon DB)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js (Google OAuth)
- **Form Management**: React Hook Form + Zod validation
- **Notifications**: Email (Resend) + Slack integration

---

## User Roles & Permissions

### 1. **Employee** (`employee`)
- Submit leave requests
- View own leave requests (`/requests/my-requests`)
- Withdraw own leave requests (until approved)
- **Cannot**: Approve requests, view other employees' requests, manage employees

### 2. **Supervisor** (`supervisor`)
- All Employee permissions
- View and approve leave requests for their projects (`/requests/all-requests`)
- **Cannot**: View all company requests, manage employees

### 3. **Managing Director** (`md`)
- All Supervisor permissions
- View and approve all leave requests in their company (`/requests/all-requests`)
- **Cannot**: Manage employees, view other companies' requests

### 4. **HR** (`hr`)
- View all leave requests in the organization (`/requests/all-requests`)
- Approve/reject any leave request
- Create and manage employees (`/employees`)
- **Cannot**: Submit leave requests (restricted from sidebar), view "My Requests" tab

---

## Application Routes

### Public Routes
- `/sign-in` - Sign in page (Google OAuth)
- `/sign-up` - Sign up page (if applicable)

### Dashboard Routes (Protected - Require Authentication)

#### Main Dashboard
- `/` - Dashboard home (role-specific content)

#### Leave Request Management
- `/leave-requests/submit` - Submit new leave request form
  - **Accessible by**: Employee, Supervisor, MD (HR cannot access via sidebar)
  - **Features**: Calendar-based day selection, leave type selection, project assignment, vacation days counter
  
- `/requests/my-requests` - View own leave requests
  - **Accessible by**: Employee, Supervisor, MD (HR cannot access)
  - **Features**: Filter by status, leave type, date range; Pagination
  
- `/requests/all-requests` - View and approve leave requests
  - **Accessible by**: Supervisor, MD, HR
  - **Features**: Filter by employee, status, leave type, date range; Approval actions
  
- `/leave-requests/[id]` - View leave request details
  - **Features**: Full request details, approval history, approval/rejection actions (if user can approve)
  - **Back button behavior**: 
    - If owner → "Back to My Requests"
    - If approver → "Back to All Requests"

- `/leave-requests/[id]/confirmation` - Leave request confirmation page
  - Shows after successful submission

#### Employee Management (HR Only)
- `/employees` - Employee list and management
  - **Accessible by**: HR only
  - **Features**: 
    - List view with filters (role, country, search)
    - Pagination
    - Create employee form (inline)
    - Edit employee form (inline)
    - Deactivate employee (soft delete)
    - **Note**: Filters and pagination are hidden when form is open
  
- `/employees/create` - Create new employee (alternative route)
- `/employees/[id]` - View/edit employee details

---

## Key UI Components & Features

### Leave Request Form (`/leave-requests/submit`)

#### Leave Days Availed Display
- **Location**: Prominent card at the top of the form
- **Shows**: Available vacation days / Total annual days (via "Leave Days Availed" summary)
- **Dynamic**: Updates as user selects vacation days
- **Note**: Color coding based on remaining days (Blue/Orange/Red) is not currently implemented

#### Calendar Section
- **Layout**: 2-column grid (calendar on left, info panels on right)
- **Features**:
  - Month navigation (previous/next/today)
  - Click dates to select leave type
  - Leave type dropdown per day (Vacation, Personal/Sick, Unpaid, Other)
  - Half-day options (Morning/Afternoon)
  - Weekend dates disabled
  - Leave summary below calendar (Total Applied, Personal/Sick, Vacation, Unpaid, Other, Half Days)
- **Right Panel**:
  - "How to use" instructions
  - Leave type legend (codes: v, p, u, o)

#### Project Details Section
- **Header**: "Projects *" with "Add Project" button on the right
- **Info Tip**: Blue box explaining that selecting the same person as both PM and Tech Lead sends only one email
  - **Visibility**: Only visible for supervisor role (`userRole === 'supervisor'`)
- **Fields per project**:
  - Project Name (required)
  - Project Manager (required dropdown - for submission, optional for drafts)
  - Tech Lead (required dropdown - for submission, optional for drafts)
- **Validation**: At least one project required

#### Form Actions
- Cancel button (goes back)
- Save Draft button
- Submit Leave Request button

### Leave Request List Pages

#### My Requests (`/requests/my-requests`)
- **Shows**: Only the authenticated user's own requests
- **Filters**: Status, Leave Type, Date Range
- **Features**: Pagination, status badges, view details

#### All Requests (`/requests/all-requests`)
- **Shows**: Requests based on role
  - Supervisor: Requests for their projects
  - MD: All requests in their company
  - HR: All requests in organization
- **Filters**: Employee, Status, Leave Type, Date Range
- **Features**: Approval actions, pagination

### Employee Management (`/employees`)
- **List View**:
  - Employee cards with name, email, role, country, joining date, vacation days
  - Edit/Deactivate buttons per card
  - Filters: Role, Country, Search
  - Pagination
- **Create/Edit Form** (inline):
  - When form is open, filters and pagination are hidden
  - Fields: Name, Email, Country, Role, Joining Date, Birthday
  - Note: Annual Vacation Days field is not present in the form (managed separately)
  - Save/Cancel buttons

---

## Authentication Flow

### Sign In
- **Primary**: Google OAuth

### Session Management
- Uses NextAuth.js
- Session includes: `id`, `employeeId`, `name`, `email`, `role`, `companyId`
- Protected routes require authentication via middleware

### Sign Out
- Redirects to `/sign-in`
- Clears session

---

## Key Business Rules

### Leave Request Submission
1. **Minimum Requirements**:
   - At least one leave day selected
   - At least one project assigned
   - Weekends cannot be selected

2. **Vacation Days**:
   - Tracks available vacation days
   - Shows warning if insufficient days
   - Calculates used days in real-time

3. **Project Assignment**:
   - Can assign multiple projects
   - Each project can have PM and/or Tech Lead
   - If same person is PM and Tech Lead, only one email is sent

### Leave Request Approval
1. **Multi-level Approval**:
   - Project Supervisors (if assigned)
   - MD (company level)
   - HR (final approval)

2. **Withdrawal Rules**:
   - Can only withdraw own requests
   - Cannot withdraw if already approved
   - Cannot withdraw if HR has approved

3. **Status Flow**:
   - `draft` → `pending` → `approved`/`rejected`/`cancelled`

### Employee Management
1. **HR Only**: Only HR role can create/edit/delete employees
2. **Annual Vacation Days**: Required field, defaults to 0
3. **Available Vacation Days**: Calculated based on annual days and used days

---

## API Endpoints

### Authentication
- `/api/auth/[...nextauth]` - NextAuth endpoints

### Employees
- `GET /api/employees` - List employees (filtered by role)
- `GET /api/employees/[id]` - Get employee details
- `POST /api/employees` - Create employee (HR only)
- `GET /api/employees/eligible` - Get eligible employees for PM/Tech Lead selection

### Leave Requests
- `GET /api/leave-requests` - List leave requests (filtered by role)
- `POST /api/leave-requests` - Submit leave request
- `GET /api/leave-requests/[id]` - Get leave request details
- `POST /api/leave-requests/[id]/approve` - Approve/reject leave request
- `POST /api/leave-requests/[id]/withdraw` - Withdraw leave request
- `POST /api/leave-requests/draft` - Save draft
- `GET /api/leave-requests/draft` - Get drafts
- `POST /api/leave-requests/draft/[id]/submit` - Submit draft

---

## Test Data & Environment

### Sample Data Structure
```typescript
// Employee
{
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'supervisor' | 'md' | 'hr';
  companyId: string;
  country: string;
  usedVacationDays: number;
  joiningDate?: string;
  birthday?: string;
}

// Leave Request
{
  id: string;
  employeeId: string;
  leaveType: 'vacation' | 'personal_sick' | 'unpaid' | 'other';
  fromDate: string;
  toDate: string;
  totalDays: number;
  totalWorkingDays?: number;
  overallStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  leaveDays: Array<{
    date: string;
    leaveType: 'vacation' | 'personal_sick' | 'unpaid' | 'other';
    isHalfDay: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
  }>;
  projects: Array<{
    projectName: string;
    pmId: string; // Required for submission, optional for drafts
    techLeadId: string; // Required for submission, optional for drafts
  }>;
  approvals?: Array<{
    approverRole: 'supervisor' | 'md' | 'hr' | 'pm' | 'tech_lead';
    status: 'pending' | 'approved' | 'rejected';
  }>;
}
```

---

## Common Test Scenarios

### Employee Flow
1. Sign in as employee
2. Navigate to "Submit Leave Request"
3. Select dates on calendar
4. Choose leave types
5. Add project(s) with PM/Tech Lead
6. Submit request
7. View request in "My Requests"
8. Withdraw request (if pending)

### Supervisor Flow
1. Sign in as supervisor
2. View "Approve Requests" page
3. Filter requests
4. View request details
5. Approve/reject with comments

### HR Flow
1. Sign in as HR
2. Navigate to "Employees"
3. Create new employee
4. Edit employee
5. View "All Requests"
6. Approve/reject requests

---

## UI Patterns & Selectors

### Common Selectors
- Navigation sidebar: `[data-testid="sidebar"]` or `.sidebar`
- User profile dropdown: Usually in header, shows role
- Form buttons: Look for `type="submit"` or button text
- Cards: `.card` or `[class*="Card"]`
- Badges: Status badges use color coding
- Filters: FilterBar component with dropdowns and date pickers
- Pagination: Pagination component at bottom of lists

### Form Patterns
- React Hook Form is used throughout
- Validation errors show below fields
- Required fields marked with `*`
- Form submission shows loading states

### Loading States
- Spinner icons (`Loader2` component)
- Disabled buttons during submission
- Skeleton loaders for lists

---

## Environment Variables

Key environment variables for testing:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Base URL for authentication callbacks
- `NEXTAUTH_SECRET` - Secret for NextAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `RESEND_API_KEY` - Email service API key
- `BOT_USER_OAUTH_TOKEN` - Slack bot token
- `SLACK_CHANNEL` - Slack channel ID

---

## Error Handling

### Common Error States
- **401 Unauthorized**: Not authenticated, redirects to `/sign-in`
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **400 Validation Error**: Form validation failed
- **500 Internal Error**: Server error

### Error Display
- Form errors: Shown below form fields
- API errors: Toast notifications or error messages
- Network errors: Retry mechanisms or error messages

---

## Notes for Playwright Tests

1. **Authentication**: Mock NextAuth session
2. **Role-based Testing**: Test each role's specific permissions
3. **Form Interactions**: Use React Hook Form patterns (field names, validation)
4. **Date Selection**: Calendar component requires clicking dates, then selecting leave type
5. **Filter Testing**: Test filter combinations and pagination
6. **Approval Flow**: Test multi-level approval process
7. **Responsive Design**: Test mobile and desktop views
8. **Loading States**: Wait for API calls to complete
9. **Notifications**: Check for toast messages after actions
10. **Navigation**: Verify sidebar navigation based on role

---

## Key Files for Reference

- `app/(dashboard)/layout.tsx` - Dashboard layout with sidebar
- `components/shared/leave-request/LeaveRequestForm.tsx` - Main leave request form
- `components/shared/leave-request/LeaveCalendar.tsx` - Calendar component
- `components/shared/employees/EmployeesList.tsx` - Employee management
- `lib/constants/navigation.ts` - Navigation configuration
- `lib/middleware/auth.ts` - Authentication logic
- `middleware.ts` - Route protection middleware
