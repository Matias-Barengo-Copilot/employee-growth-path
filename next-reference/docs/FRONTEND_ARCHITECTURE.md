# Frontend Architecture & Requirements Analysis
## CoPilot Leave Management System

**Version:** 2.0  
**Date:** January 2026  
**Last Updated:** January 23, 2026  
**Focus:** Frontend Implementation Strategy

---

## Table of Contents

1. [Requirements Analysis](#requirements-analysis)
2. [API Gap Analysis](#api-gap-analysis)
3. [Frontend Architecture](#frontend-architecture)
4. [Component Structure](#component-structure)
5. [Dashboard Structure by Role](#dashboard-structure-by-role)
6. [Reusable Components Strategy](#reusable-components-strategy)
7. [Data Flow & State Management](#data-flow--state-management)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Requirements Analysis

### 1. Core Features Required

#### 1.1 Leave Request Management
- ✅ Submit leave request (API exists and implemented)
- ✅ Withdraw leave request (API exists and implemented)
- ✅ Save draft functionality (API exists and implemented)
- ✅ Half-day option (API exists and implemented - supports morning/afternoon)
- ✅ Multi-project selection with PM/Tech Lead informed flags (API supports and implemented)

#### 1.2 Approval Workflow
- ✅ Three-level approval: Supervisor → MD → HR (API supports)
- ⚠️ **Reversal of approvals** (API missing - different from withdraw)
  - Supervisor can reverse their approval before HR final approval
  - MD can reverse their approval before HR final approval
  - HR can reverse final approval anytime
- ✅ Approval/rejection with comments (API supports)

#### 1.3 Employee Management (HR Only)
- ✅ Create employee (API exists and implemented)
- ✅ **Update employee** (API exists - PUT /api/employees/[id] implemented)
- ✅ **Get employee by ID** (API exists - GET /api/employees/[id] implemented)
- ❌ **Bulk import employees** (API missing - CSV upload)
- ✅ **Employee profile fields in schema:**
  - ✅ Birthday (exists in schema - `birthday: date`)
  - ✅ Joining Date (exists in schema - `joiningDate: date`)
  - ✅ Primary Supervisor(s) assignment (exists via `employee_supervisors` table)
  - ❌ Project assignment dates (start/end) - Not in schema

#### 1.4 Notifications
- ✅ **Slack integration** (Backend implemented - SlackNotificationProvider exists)
- ✅ **Email notifications** (Backend implemented - EmailNotificationProvider exists)
- ⚠️ Notification preferences/settings UI (not mentioned in API)

#### 1.5 Slack Automations
- ❌ **Birthday alerts** (Backend cron job, but needs admin UI for settings)
- ❌ **Work anniversary alerts** (Backend cron job, but needs admin UI for settings)
- ❌ **Admin settings page** for:
  - Channel selection
  - Enable/disable toggles
  - Time of day picker
  - Message templates

### 2. User Roles & Permissions Matrix

| Feature | Employee | Supervisor | MD | HR |
|---------|----------|------------|----|----|
| Submit Leave Request | ✅ | ✅ | ✅ | ✅ |
| Withdraw Own Request | ✅ | ✅ | ✅ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ | ✅ |
| View Other Requests | ❌ | ✅ (their projects) | ✅ (their company) | ✅ (all) |
| Approve Requests | ❌ | ✅ (their projects) | ✅ (their company) | ✅ (all) |
| Reverse Approval | ❌ | ✅ (before HR) | ✅ (before HR) | ✅ (anytime) |
| Create Employees | ❌ | ❌ | ❌ | ✅ |
| Edit Employees | ❌ | ❌ | ❌ | ✅ |
| Manage Slack Settings | ❌ | ❌ | ❌ | ✅ |

---

## API Gap Analysis

### Missing API Endpoints (Required for Full Requirements)

#### 1. Employee Management
```
✅ PUT /api/employees/[id] - Update employee (implemented)
❌ POST /api/employees/bulk-import - Bulk import (not implemented)
✅ GET /api/employees?companyId=xxx&role=xxx - Enhanced filtering (implemented)
```

**Schema Status:**
- ✅ `birthday: date` - Exists in schema
- ✅ `joiningDate: date` - Exists in schema
- ✅ `primarySupervisorIds` - Implemented via `employee_supervisors` table

#### 2. Approval Reversal
```
POST /api/leave-requests/[id]/approve/reverse
```
**Note:** Current API only supports withdraw (by employee). Reversal is different:
- Withdraw: Employee cancels entire request
- Reversal: Approver changes their approval decision

#### 3. Projects
```
GET /api/projects
GET /api/projects?companyId=xxx
GET /api/projects?employeeId=xxx (projects assigned to employee)
```
**Note:** Needed for leave request form to show available projects

#### 4. Draft Management
```
✅ POST /api/leave-requests/draft - Create draft (implemented)
✅ GET /api/leave-requests/draft - Get all drafts (implemented)
✅ PUT /api/leave-requests/draft/[id] - Update draft (implemented)
✅ DELETE /api/leave-requests/draft/[id] - Delete draft (implemented)
✅ POST /api/leave-requests/draft/[id]/submit - Submit draft (implemented)
```

#### 5. Slack Settings (Admin)
```
GET /api/settings/slack
PUT /api/settings/slack
POST /api/settings/slack/test
```

### API Endpoints Available (Ready to Use)

✅ **Employees**
- `POST /api/employees` - Create employee (HR only) - ✅ Implemented
- `GET /api/employees` - List employees (role-based) - ✅ Implemented
- `GET /api/employees/[id]` - Get employee details - ✅ Implemented
- `PUT /api/employees/[id]` - Update employee (HR only) - ✅ Implemented
- `DELETE /api/employees/[id]` - Deactivate employee (HR only) - ✅ Implemented
- `GET /api/employees/eligible` - Get eligible employees for PM/Tech Lead - ✅ Implemented

✅ **Leave Requests**
- `POST /api/leave-requests` - Submit leave request - ✅ Implemented
- `GET /api/leave-requests` - List leave requests (with filters) - ✅ Implemented
- `GET /api/leave-requests/[id]` - Get leave request details - ✅ Implemented
- `POST /api/leave-requests/[id]/approve` - Approve/reject request - ✅ Implemented
- `POST /api/leave-requests/[id]/withdraw` - Withdraw request - ✅ Implemented

✅ **Drafts**
- `POST /api/leave-requests/draft` - Create draft - ✅ Implemented
- `GET /api/leave-requests/draft` - Get all drafts - ✅ Implemented
- `PUT /api/leave-requests/draft/[id]` - Update draft - ✅ Implemented
- `DELETE /api/leave-requests/draft/[id]` - Delete draft - ✅ Implemented
- `POST /api/leave-requests/draft/[id]/submit` - Submit draft - ✅ Implemented

---

## Frontend Architecture

### Technology Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Server Components + React Query (TanStack Query) for client state
- **Forms:** React Hook Form + Zod validation
- **Authentication:** NextAuth (already integrated)
- **API Client:** Fetch API with custom wrapper for error handling

### Architecture Principles

1. **Server Components First:** Use RSC for data fetching when possible
2. **Client Components Only When Needed:** Interactivity, forms, real-time updates
3. **Component Reusability:** Shared components in `components/shared/`
4. **Role-Based Rendering:** Conditional rendering based on user role
5. **Type Safety:** Full TypeScript coverage with API response types
6. **Error Handling:** Centralized error handling and user feedback

### Folder Structure

```
app/
├── (dashboard)/                    # Protected dashboard routes
│   ├── layout.tsx                  # Dashboard layout with sidebar
│   ├── employees/                  # HR only
│   │   ├── create/
│   │   │   └── page.tsx
│   │   ├── [id]/
│   │   │   ├── edit/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx            # Employee detail view
│   │   └── page.tsx                # Employee list (HR)
│   ├── leave-requests/
│   │   ├── submit/
│   │   │   └── page.tsx            # Shared form
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Detail view (shared)
│   │   │   ├── approve/
│   │   │   │   └── page.tsx       # Approval action page
│   │   │   └── withdraw/
│   │   │       └── page.tsx       # Withdraw confirmation
│   │   └── page.tsx                # List view (role-based)
│   ├── requests/
│   │   ├── my-requests/
│   │   │   └── page.tsx            # Own requests (shared)
│   │   └── all-requests/
│   │       └── page.tsx            # Other requests (Supervisor/MD/HR)
│   └── settings/                   # HR only
│       ├── slack/
│       │   └── page.tsx            # Slack automation settings
│       └── page.tsx
├── api/                            # API routes (existing)
└── ...

components/
├── dashboard/
│   ├── sidebar/
│   │   ├── Sidebar.tsx             # Main sidebar component
│   │   ├── NavItem.tsx             # Reusable nav item
│   │   └── RoleBasedNav.tsx        # Role-based navigation
│   ├── header/
│   │   └── Header.tsx              # Dashboard header
│   └── layout/
│       └── DashboardLayout.tsx     # Wrapper component
├── shared/
│   ├── leave-request/
│   │   ├── LeaveRequestForm.tsx    # Main form (reusable)
│   │   ├── ProjectSelector.tsx     # Multi-project selector
│   │   ├── LeaveRequestCard.tsx    # Card view for lists
│   │   ├── LeaveRequestDetail.tsx  # Detail view component
│   │   ├── ApprovalHistory.tsx     # Approval timeline
│   │   ├── ApprovalActions.tsx     # Approve/reject/reverse buttons
│   │   └── WithdrawButton.tsx      # Withdraw action
│   ├── employee/
│   │   ├── EmployeeForm.tsx        # Create/edit form
│   │   ├── EmployeeCard.tsx        # Card view
│   │   ├── EmployeeDetail.tsx      # Detail view
│   │   └── BulkImportDialog.tsx    # CSV upload dialog
│   ├── filters/
│   │   ├── LeaveRequestFilters.tsx # Filter bar component
│   │   └── StatusFilter.tsx        # Status dropdown
│   ├── tables/
│   │   ├── LeaveRequestTable.tsx   # Data table component
│   │   └── EmployeeTable.tsx       # Employee data table
│   └── ui/                         # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ...
├── providers/
│   ├── QueryProvider.tsx           # React Query provider
│   └── ThemeProvider.tsx           # Theme provider
└── ui/                             # Additional UI components
    └── ...

lib/
├── api/
│   ├── client.ts                   # API client wrapper
│   ├── employees.ts                # Employee API functions
│   ├── leave-requests.ts           # Leave request API functions
│   ├── projects.ts                 # Project API functions (when available)
│   └── types.ts                    # API response types
├── hooks/
│   ├── useLeaveRequests.ts         # Custom hooks for leave requests
│   ├── useEmployees.ts             # Custom hooks for employees
│   ├── useAuth.ts                  # Auth hook (NextAuth)
│   └── useRole.ts                  # Role-based permissions hook
├── utils/
│   ├── permissions.ts              # Permission checking utilities
│   ├── date.ts                     # Date formatting utilities
│   └── validation.ts               # Zod schemas for forms
└── constants/
    ├── roles.ts                    # Role constants
    ├── leave-types.ts              # Leave type constants
    └── routes.ts                   # Route constants
```

---

## Component Structure

### 1. Shared Components (Reusable Across Roles)

#### Leave Request Components

**`LeaveRequestForm.tsx`** - Main form component
- Used by: All roles (Employee, Supervisor, MD, HR)
- Features:
  - Auto-fill employee info from auth
  - Calendar-based day selection with leave type per day
  - Half-day options (morning/afternoon) per day
  - Leave type selector (Vacation, Personal/Sick, Unpaid, Other)
  - Multi-project selector with PM/TL flags
  - Reason textarea (optional)
  - Save draft button (✅ API available and implemented)
  - Submit button
- Props: `initialData?`, `onSubmit`, `onSaveDraft?`

**`ProjectSelector.tsx`** - Multi-select project component
- Features:
  - Fetches available projects for employee's company
  - Multi-select with checkboxes
  - For each selected project:
    - "Informed PM?" radio (Yes/No)
    - "Informed Tech Lead?" radio (Yes/No)
- Props: `selectedProjects`, `onChange`, `employeeId`

**`LeaveRequestCard.tsx`** - Card view for lists
- Used in: All list views
- Displays:
  - Employee name, leave type, dates
  - Status badge
  - Quick actions (View, Approve, etc.)
- Props: `leaveRequest`, `onAction`, `userRole`

**`LeaveRequestDetail.tsx`** - Full detail view
- Used in: Detail pages
- Displays:
  - All leave request info
  - Projects with PM/TL flags
  - Approval history timeline
  - Action buttons (role-based)
- Props: `leaveRequest`, `userRole`

**`ApprovalHistory.tsx`** - Timeline component
- Displays approval/rejection history
- Shows: Approver name, role, status, comments, timestamp
- Props: `approvals`

**`ApprovalActions.tsx`** - Action buttons component
- Role-based rendering:
  - Supervisor/MD: Approve, Reject, Reverse (if approved)
  - HR: Final Approve, Final Reject, Reverse Final Approval
- Props: `leaveRequest`, `userRole`, `onApprove`, `onReject`, `onReverse`

**`WithdrawButton.tsx`** - Withdraw action
- Only visible to requester
- Only enabled if status allows withdrawal
- Props: `leaveRequest`, `onWithdraw`

#### Employee Components (HR Only)

**`CreateEmployeeForm.tsx`** - Create/edit form (actual component name)
- Fields:
  - Google ID (create only)
  - Company ID (select)
  - Name, Email, Country
  - Role (dropdown)
  - Employee Number (optional)
  - Birthday (date picker) - ✅ API supports
  - Joining Date (date picker) - ✅ API supports
  - Primary Supervisors (multi-select) - ✅ API supports via employee_supervisors table
- Props: `initialData?`, `onSubmit`, `mode: 'create' | 'edit'`

**`EmployeeCard.tsx`** - Card view
- Used in employee list
- Props: `employee`, `onEdit`, `onView`

**`EmployeeDetail.tsx`** - Detail view
- Full employee information
- Edit button (HR only)
- Props: `employee`

**`BulkImportDialog.tsx`** - CSV upload dialog
- File upload
- Column mapping UI
- Preview before import
- Props: `onImport`, `onClose`

#### Filter Components

**`LeaveRequestFilters.tsx`** - Filter bar
- Status filter (dropdown)
- Date range filter
- Employee filter (HR/MD only)
- Company filter (HR only)
- Search by employee name
- Props: `filters`, `onFilterChange`, `userRole`

**`StatusFilter.tsx`** - Status dropdown
- Props: `value`, `onChange`, `multiple?`

#### Table Components

**`LeaveRequestTable.tsx`** - Data table
- Sortable columns
- Pagination
- Row actions
- Props: `data`, `columns`, `onAction`, `pagination`

**`EmployeeTable.tsx`** - Employee data table
- Sortable, filterable
- Bulk actions (HR only)
- Props: `data`, `columns`, `onAction`

### 2. Dashboard-Specific Components

**`Sidebar.tsx`** - Navigation sidebar
- Role-based menu items
- Active route highlighting
- Collapsible (mobile)

**`RoleBasedNav.tsx`** - Generates nav items based on role
- Employee: Submit, My Requests
- Supervisor: Submit, My Requests, Approve Requests, Other Requests
- MD: Submit, My Requests, Approve Requests, Other Requests
- HR: Create Employee, Submit, Approve Requests, All Requests, Settings

**`Header.tsx`** - Dashboard header
- User info
- Notifications (future)
- Logout

### 3. Page Components (Server Components)

Each page should:
1. Fetch data using Server Components when possible
2. Use React Query for client-side data fetching when needed
3. Handle loading and error states
4. Implement role-based access control

---

## Dashboard Structure by Role

### Employee Dashboard

**Routes:**
- `/leave-requests/submit` - Submit leave request form
- `/requests/my-requests` - View own requests
- `/leave-requests/[id]` - View request detail (own only)

**Features:**
- Submit new leave request
- View own requests with status
- Withdraw own requests (until HR approves)
- View request details and approval history

**Components Used:**
- `LeaveRequestForm`
- `LeaveRequestCard`
- `LeaveRequestDetail`
- `WithdrawButton`

### Supervisor Dashboard

**Routes:**
- `/leave-requests/submit` - Submit own leave request
- `/requests/my-requests` - View own requests
- `/requests/all-requests` - View requests for their projects
- `/leave-requests/[id]` - View/approve request detail
- `/leave-requests/[id]/approve` - Approval action page

**Features:**
- All Employee features
- View requests for projects they supervise
- Approve/reject requests for their projects
- Reverse approval decision (before HR final approval)

**Components Used:**
- All Employee components
- `ApprovalActions` (Supervisor variant)
- `LeaveRequestFilters` (with project filter)

### MD Dashboard

**Routes:**
- `/leave-requests/submit` - Submit own leave request
- `/requests/my-requests` - View own requests
- `/requests/all-requests` - View all requests in company
- `/leave-requests/[id]` - View/approve request detail
- `/leave-requests/[id]/approve` - Approval action page

**Features:**
- All Supervisor features
- View all requests in their company
- Approve/reject requests after supervisors approve
- Reverse approval decision (before HR final approval)

**Components Used:**
- All Supervisor components
- `ApprovalActions` (MD variant)
- `LeaveRequestFilters` (with company filter)

### HR Dashboard

**Routes:**
- `/employees` - Employee list
- `/employees/create` - Create employee
- `/employees/[id]` - Employee detail
- `/employees/[id]/edit` - Edit employee
- `/leave-requests/submit` - Submit own leave request
- `/requests/all-requests` - View all requests
- `/leave-requests/[id]` - View/approve request detail
- `/leave-requests/[id]/approve` - Final approval action
- `/settings` - Settings page
- `/settings/slack` - Slack automation settings

**Features:**
- All MD features
- Create employees
- Edit employees
- Bulk import employees (when API available)
- View all requests in organization
- Final approve/reject requests
- Reverse final approval anytime
- Manage Slack automation settings

**Components Used:**
- All MD components
- `EmployeeForm`
- `EmployeeCard`
- `EmployeeTable`
- `BulkImportDialog`
- `ApprovalActions` (HR variant)
- Slack settings components

---

## Reusable Components Strategy

### 1. Component Hierarchy

```
Base UI Components (shadcn/ui)
    ↓
Shared Business Components (components/shared/)
    ↓
Dashboard Components (components/dashboard/)
    ↓
Page Components (app/(dashboard)/)
```

### 2. Reusability Patterns

#### Pattern 1: Composition over Configuration
- Create small, focused components
- Compose them into larger components
- Example: `LeaveRequestCard` uses `StatusBadge`, `DateRange`, `ActionButton`

#### Pattern 2: Role-Based Rendering Props
- Components accept `userRole` prop
- Conditionally render features based on role
- Example: `ApprovalActions` shows different buttons per role

#### Pattern 3: Shared Form Logic
- Extract form logic into custom hooks
- Reuse validation schemas
- Example: `useLeaveRequestForm` hook used by form component

#### Pattern 4: Data Fetching Hooks
- Custom hooks for API calls
- Shared error handling
- Example: `useLeaveRequests()`, `useEmployees()`

### 3. Component Reuse Matrix

| Component | Employee | Supervisor | MD | HR |
|-----------|----------|------------|----|----|
| LeaveRequestForm | ✅ | ✅ | ✅ | ✅ |
| LeaveRequestCard | ✅ | ✅ | ✅ | ✅ |
| LeaveRequestDetail | ✅ | ✅ | ✅ | ✅ |
| ApprovalActions | ❌ | ✅ | ✅ | ✅ |
| WithdrawButton | ✅ | ✅ | ✅ | ✅ |
| EmployeeForm | ❌ | ❌ | ❌ | ✅ |
| LeaveRequestFilters | ✅ | ✅ | ✅ | ✅ |

---

## Data Flow & State Management

### 1. Server Components (Default)

**Use for:**
- Initial page load data
- Static or rarely changing data
- SEO-critical content

**Example:**
```typescript
// app/(dashboard)/requests/my-requests/page.tsx
export default async function MyRequestsPage() {
  const user = await getAuthenticatedUser();
  const requests = await getLeaveRequests({ employeeId: user.id });
  
  return <LeaveRequestList requests={requests} />;
}
```

### 2. React Query (Client State)

**Use for:**
- Mutations (create, update, delete)
- Real-time updates
- Optimistic updates
- Cache management
- Refetching on focus/interval

**Example:**
```typescript
// lib/hooks/useLeaveRequests.ts
export function useLeaveRequests(filters: GetLeaveRequestsQuery) {
  return useQuery({
    queryKey: ['leave-requests', filters],
    queryFn: () => fetchLeaveRequests(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: submitLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });
}
```

### 3. Form State (React Hook Form)

**Use for:**
- Form validation
- Form state management
- Error handling

**Example:**
```typescript
// components/shared/leave-request/LeaveRequestForm.tsx
export function LeaveRequestForm({ onSubmit }: Props) {
  const form = useForm<SubmitLeaveRequestInput>({
    resolver: zodResolver(SubmitLeaveRequestDto),
    defaultValues: { /* ... */ },
  });
  
  // Form logic...
}
```

### 4. Global State (Minimal)

**Use for:**
- User authentication state (NextAuth)
- Theme preferences
- UI state (modals, sidebars)

**Avoid:**
- Storing server data in global state (use React Query cache)
- Duplicating API data

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Priority: Critical**

1. **Setup & Configuration**
   - ✅ Next.js App Router setup (already done)
   - ✅ TypeScript configuration (already done)
   - ✅ Tailwind CSS + shadcn/ui setup
   - ✅ React Query setup
   - ✅ API client wrapper with error handling

2. **Authentication & Authorization**
   - ✅ NextAuth integration (already done)
   - Create `useAuth` hook
   - Create `useRole` hook
   - Create permission utilities

3. **Base Components**
   - Install shadcn/ui components (button, card, dialog, form, input, select, table)
   - Create layout components (Sidebar, Header, DashboardLayout)
   - Create role-based navigation

### Phase 2: Core Features (Week 3-4)

**Priority: High**

1. **Leave Request Form**
   - `LeaveRequestForm` component
   - `ProjectSelector` component
   - Date picker with auto-calculation
   - Form validation
   - API integration

2. **Leave Request List Views**
   - `LeaveRequestCard` component
   - `LeaveRequestTable` component
   - `LeaveRequestFilters` component
   - Role-based filtering logic
   - Pagination

3. **Leave Request Detail View**
   - `LeaveRequestDetail` component
   - `ApprovalHistory` component
   - `ApprovalActions` component
   - `WithdrawButton` component
   - API integration

### Phase 3: Approval Workflow (Week 5)

**Priority: High**

1. **Approval Pages**
   - Approval action page
   - Approval confirmation dialog
   - Success/error handling
   - Redirect after approval

2. **Withdrawal Flow**
   - Withdrawal confirmation dialog
   - Success handling
   - Update UI optimistically

### Phase 4: Employee Management (Week 6)

**Priority: Medium (HR Only)**

1. **Employee CRUD**
   - `CreateEmployeeForm` component ✅
   - `EmployeeCard` component ✅
   - `EmployeesList` component ✅
   - Create employee page ✅
   - Edit employee functionality ✅ (API available and implemented)
   - Employee detail view ✅

2. **Employee List**
   - Employee list page (HR only)
   - Filters and search
   - Pagination

### Phase 5: Advanced Features (Week 7-8)

**Priority: Low (Future)**

1. ~~**Draft Management**~~ ✅ (API available and implemented)
   - ✅ Save draft functionality
   - ✅ Load draft functionality
   - ✅ Draft list view

2. **Bulk Import** (when API available)
   - `BulkImportDialog` component
   - CSV parsing
   - Column mapping UI
   - Import preview

3. **Slack Settings** (when API available)
   - Settings page
   - Slack configuration form
   - Message template editor
   - Test functionality

4. ~~**Half-Day Option**~~ ✅ (Implemented)
   - ✅ Calendar supports half-day selection per day
   - ✅ Morning/afternoon options available
   - ✅ API fully supports half-day requests

### Phase 6: Polish & Optimization (Week 9)

**Priority: Medium**

1. **Performance**
   - Optimize images
   - Code splitting
   - Lazy loading
   - Memoization where needed

2. **UX Improvements**
   - Loading states
   - Error boundaries
   - Toast notifications
   - Confirmation dialogs
   - Empty states

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support
   - Focus management

4. **Testing**
   - Component tests
   - Integration tests
   - E2E tests (critical flows)

---

## API Integration Strategy

### 1. API Client Wrapper

Create a centralized API client with:
- Base URL configuration
- Authentication headers (NextAuth session)
- Error handling
- Response parsing
- Type safety

```typescript
// lib/api/client.ts
export class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response);
    }
    
    const data = await response.json();
    return data.data; // Assuming API returns { success: true, data: T }
  }
}
```

### 2. Type-Safe API Functions

```typescript
// lib/api/leave-requests.ts
import { ApiClient } from './client';
import { SubmitLeaveRequestInput, LeaveRequest } from '@/lib/types';

const api = new ApiClient();

export async function submitLeaveRequest(
  data: SubmitLeaveRequestInput
): Promise<LeaveRequest> {
  return api.request<LeaveRequest>('/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLeaveRequests(
  query: GetLeaveRequestsQuery
): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  // Build query params...
  return api.request<LeaveRequest[]>(`/leave-requests?${params}`);
}
```

### 3. React Query Integration

```typescript
// lib/hooks/useLeaveRequests.ts
export function useLeaveRequests(query: GetLeaveRequestsQuery) {
  return useQuery({
    queryKey: ['leave-requests', query],
    queryFn: () => getLeaveRequests(query),
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: submitLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
      toast.success('Leave request submitted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

---

## Error Handling Strategy

### 1. API Error Types

```typescript
// lib/utils/errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
  }
}
```

### 2. Error Boundaries

- Create error boundary component
- Wrap pages/components that fetch data
- Show user-friendly error messages

### 3. Form Validation Errors

- Display field-level errors from API
- Show validation errors from Zod schemas
- Highlight invalid fields

### 4. User Feedback

- Toast notifications for success/error
- Loading states during API calls
- Optimistic updates where appropriate

---

## Security Considerations

### 1. Role-Based Access Control (RBAC)

- Check permissions on client side (UX)
- **Always verify on server side** (API handles this)
- Hide UI elements user can't access
- Redirect unauthorized users

### 2. Data Protection

- Don't expose sensitive data in client components
- Use Server Components for sensitive data when possible
- Sanitize user inputs
- Validate all inputs with Zod

### 3. Authentication

- NextAuth handles authentication
- All API calls include auth token
- Handle token refresh automatically

---

## Performance Optimization

### 1. Code Splitting

- Lazy load heavy components
- Route-based code splitting (automatic with Next.js)
- Component-level code splitting

### 2. Data Fetching

- Use Server Components for initial load
- React Query for caching and refetching
- Optimistic updates for better UX
- Pagination for large lists

### 3. Rendering

- Memoize expensive computations
- Use `useMemo` and `useCallback` appropriately
- Avoid unnecessary re-renders
- Virtual scrolling for long lists (if needed)

---

## Testing Strategy

### 1. Unit Tests

- Component tests (React Testing Library)
- Hook tests
- Utility function tests

### 2. Integration Tests

- Form submission flows
- API integration
- Role-based rendering

### 3. E2E Tests

- Critical user flows:
  - Submit leave request
  - Approve leave request
  - Withdraw leave request
  - Create employee (HR)

---

## Documentation Requirements

### 1. Component Documentation

- JSDoc comments for all components
- Props documentation
- Usage examples

### 2. API Integration Documentation

- API endpoint documentation
- Request/response types
- Error handling

### 3. User Guide

- How to submit leave request
- How to approve requests
- How to manage employees (HR)

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize features** based on business needs
3. **Create detailed component specs** for Phase 1-2
4. **Set up development environment** (if not done)
5. **Start implementation** following the roadmap

---

## Notes & Considerations

### Missing API Features (Backend Required)

1. ~~**Employee Update Endpoint**~~ - ✅ Implemented
2. **Project List Endpoint** - Required for leave request form (currently using project name input)
3. **Approval Reversal Endpoint** - Required for reversal workflow
4. ~~**Draft Management Endpoints**~~ - ✅ Implemented
5. **Slack Settings Endpoints** - Future feature (for admin UI)
6. ~~**Employee Schema Updates**~~ - ✅ Birthday, joining date, supervisors all exist in schema

### Frontend Implementation Status

✅ **Fully Implemented:**
- Leave request submission (API ready and frontend implemented)
- Leave request listing (API ready and frontend implemented)
- Leave request approval (API ready and frontend implemented)
- Leave request withdrawal (API ready and frontend implemented)
- Employee creation (API ready and frontend implemented)
- Employee listing (API ready and frontend implemented)
- Employee editing (API ready and frontend implemented)
- Draft management (API ready and frontend implemented)
- Half-day leave options (API ready and frontend implemented)
- Email notifications (Backend implemented)
- Slack notifications (Backend implemented)

⚠️ **Partially Implemented:**
- Project selection in form (uses project name input, no dedicated projects API)

❌ **Not Implemented:**
- Approval reversal (no API)
- Bulk employee import (no API)
- Slack settings UI (no API)
- Project assignment dates (not in schema)

---

**Document Version:** 2.0  
**Last Updated:** January 23, 2026  
**Maintained By:** Frontend Team

---

## Changelog

### Version 2.0 (January 23, 2026)
- ✅ Updated feature status: Half-day option is implemented
- ✅ Updated feature status: Draft management is implemented
- ✅ Updated feature status: Employee update endpoint exists and is implemented
- ✅ Updated feature status: Birthday and joiningDate exist in schema
- ✅ Updated feature status: Email and Slack notifications are implemented
- ✅ Updated API endpoints list to reflect current implementation
- ✅ Updated component names to match actual implementation
- ✅ Removed outdated "Frontend Blocked On" items that are now implemented

