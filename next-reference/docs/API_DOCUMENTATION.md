# Leaves Management System API Documentation

## Architecture

The API follows clean architecture principles with three main layers:

1. **Repository Layer** (`lib/repositories/`) - Data access layer
2. **Service Layer** (`lib/services/`) - Business logic layer
3. **Controller Layer** (`app/api/`) - HTTP request/response handling

## Authentication

All endpoints require NextAuth authentication. The authentication middleware (`lib/middleware/auth.ts`) extracts the authenticated user and their employee record from the database.

## API Endpoints

### Employees

#### Create Employee (HR Only)
```
POST /api/employees
```

**Request Body:**
```json
{
  "googleId": "user_xxx",
  "companyId": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "country": "USA",
  "role": "employee" | "supervisor" | "md" | "hr",
  "employeeNumber": "EMP001" // optional
}
```

**Response:** Created employee object

**Authorization:** HR only

---

#### Get Employees
```
GET /api/employees
```

**Response:** List of employees based on user role:
- HR: All employees
- MD: Employees in their company
- Others: Only themselves

---

#### Get Employee by ID
```
GET /api/employees/[id]
```

**Response:** Employee details

**Authorization:** 
- HR: Can see all
- MD: Can see employees in their company
- Others: Can only see themselves

---

### Leave Requests

#### Submit Leave Request
```
POST /api/leave-requests
```

**Request Body:**
```json
{
  "leaveType": "annual" | "sick" | "unpaid" | "other",
  "fromDate": "2024-01-15",
  "toDate": "2024-01-20",
  "totalDays": 5,
  "reason": "Vacation", // optional
  "projects": [
    {
      "projectId": "uuid",
      "informedPm": true,
      "informedTechLead": false
    }
  ]
}
```

**Response:** Created leave request with approval records

**Authorization:** All authenticated users

**Notes:**
- Automatically creates approval records for:
  - Project supervisors
  - Company MD
  - HR
- Leave is only approved when ALL approvers approve

---

#### Get Leave Requests
```
GET /api/leave-requests?status=pending&employeeId=xxx&companyId=xxx&page=1&limit=10
```

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected, cancelled)
- `employeeId`: Filter by employee ID
- `companyId`: Filter by company ID
- `organizationId`: Filter by organization ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:** List of leave requests based on user role:
- HR: All requests in organization
- MD: All requests in their company
- Supervisor: Requests for their projects
- Employee: Only their own requests

---

#### Get Leave Request by ID
```
GET /api/leave-requests/[id]
```

**Response:** Leave request details with projects and approvals

**Authorization:**
- HR: Can see all
- MD: Can see requests in their company
- Supervisor: Can see requests for their projects
- Employee: Can see their own requests

---

#### Approve Leave Request
```
POST /api/leave-requests/[id]/approve
```

**Request Body:**
```json
{
  "status": "approved" | "rejected",
  "comments": "Looks good" // optional
}
```

**Response:** Updated leave request

**Authorization:**
- HR: Can approve any request
- MD: Can approve requests in their company
- Supervisor: Can approve requests for their projects

**Notes:**
- Leave request status is automatically updated to "approved" when ALL approvers approve
- Leave request status is automatically updated to "rejected" if ANY approver rejects

---

#### Withdraw Leave Request
```
POST /api/leave-requests/[id]/withdraw
```

**Response:** Updated leave request (status: cancelled)

**Authorization:** Only the requester can withdraw

**Notes:**
- Cannot withdraw if HR, PM, or Tech Lead has already approved
- Cannot withdraw if already approved

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "errors": {} // Only for validation errors
  }
}
```

### Error Codes

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input data
- `CONFLICT` (409) - Resource conflict
- `INTERNAL_ERROR` (500) - Server error

---

## User Roles & Permissions

### Employee
- Submit leave requests
- View own leave requests
- Withdraw own leave requests (until HR approves)

### Supervisor
- All Employee permissions
- Approve leave requests for their projects
- View leave requests for their projects

### MD (Managing Director)
- All Supervisor permissions
- Approve leave requests in their company
- View all leave requests in their company

### HR (Super Admin)
- Create employees
- Approve any leave request
- View all leave requests in the organization

---

## Business Rules

1. **Multi-level Approval**: Leave requests require approval from:
   - All project supervisors
   - Company MD
   - HR

2. **Approval Status**: 
   - Leave is approved only when ALL approvers approve
   - Leave is rejected if ANY approver rejects

3. **Withdrawal**:
   - Can only withdraw own requests
   - Cannot withdraw if HR has approved
   - Cannot withdraw if already approved

4. **Project Validation**:
   - At least one project is required per leave request
   - Multiple projects can be selected per leave request
   - Project name is required (max 255 characters)
   - For submission (not drafts):
     - `pmId` (Project Manager) is required and must be a valid employee UUID
     - `techLeadId` (Tech Lead) is required and must be a valid employee UUID
     - PM and Tech Lead must belong to the employee's company
   - For drafts:
     - `pmId` and `techLeadId` are optional
     - If provided, must be valid employee UUIDs
   - PM and Tech Lead can be the same person (only one notification email will be sent)

