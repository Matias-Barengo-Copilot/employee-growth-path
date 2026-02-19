# Postman Collection for Copilot LMS API

This directory contains Postman collection files for testing the Leaves Management System API.

## Importing the Collection

1. Open Postman
2. Click **Import** button
3. Select `Copilot_LMS_API.postman_collection.json`
4. The collection will be imported with all endpoints

## Environment Variables

Before using the collection, set up the following environment variables:

### Required Variables

- `baseUrl` - API base URL (default: `http://localhost:3000`)

### Optional Variables (for easier testing)

- `employeeId` - Employee ID for testing
- `leaveRequestId` - Leave request ID for testing
- `companyId` - Company ID for testing
- `projectId` - Project ID for testing

## Authentication

All endpoints require Clerk authentication. Make sure you:

1. Have Clerk configured in your `.env.local` file
2. Are authenticated via Clerk in your browser/Postman
3. The authentication token is included in requests (handled automatically by Clerk middleware)

## API Endpoints

### Employees

#### 1. Create Employee (HR Only)
- **Method:** POST
- **URL:** `/api/employees`
- **Body:**
```json
{
  "clerkId": "user_2abc123def456",
  "companyId": "uuid",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "country": "USA",
  "role": "employee",
  "employeeNumber": "EMP001"
}
```
- **Roles:** `employee`, `supervisor`, `md`, `hr`

#### 2. Get All Employees
- **Method:** GET
- **URL:** `/api/employees`
- **Response:** List of employees based on user role

#### 3. Get Employee by ID
- **Method:** GET
- **URL:** `/api/employees/{id}`

### Leave Requests

#### 1. Submit Leave Request
- **Method:** POST
- **URL:** `/api/leave-requests`
- **Body:**
```json
{
  "leaveType": "annual",
  "fromDate": "2024-02-15",
  "toDate": "2024-02-20",
  "totalDays": 5,
  "reason": "Family vacation",
  "projects": [
    {
      "projectId": "uuid",
      "informedPm": true,
      "informedTechLead": false
    }
  ]
}
```
- **Leave Types:** `annual`, `sick`, `unpaid`, `other`

#### 2. Get All Leave Requests
- **Method:** GET
- **URL:** `/api/leave-requests`
- **Query Parameters:**
  - `status` - Filter by status (pending, approved, rejected, cancelled)
  - `employeeId` - Filter by employee ID
  - `companyId` - Filter by company ID
  - `organizationId` - Filter by organization ID
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10)

#### 3. Get Leave Request by ID
- **Method:** GET
- **URL:** `/api/leave-requests/{id}`

#### 4. Approve Leave Request
- **Method:** POST
- **URL:** `/api/leave-requests/{id}/approve`
- **Body:**
```json
{
  "status": "approved",
  "comments": "Approved. Enjoy your vacation!"
}
```

#### 5. Reject Leave Request
- **Method:** POST
- **URL:** `/api/leave-requests/{id}/approve`
- **Body:**
```json
{
  "status": "rejected",
  "comments": "Cannot approve due to project deadline."
}
```

#### 6. Withdraw Leave Request
- **Method:** POST
- **URL:** `/api/leave-requests/{id}/withdraw`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  }
}
```

## Error Codes

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input data
- `CONFLICT` (409) - Resource conflict
- `INTERNAL_ERROR` (500) - Server error

## Testing Workflow

### 1. Setup
- Import the collection
- Set `baseUrl` variable
- Ensure Clerk authentication is configured

### 2. Create Employee (HR)
- Use "Create Employee" endpoint
- Copy the returned `employeeId` to collection variables

### 3. Submit Leave Request
- Use "Submit Leave Request" endpoint
- Copy the returned `leaveRequestId` to collection variables

### 4. Approve Leave Request
- Use "Approve Leave Request" endpoint with the `leaveRequestId`
- Test with different roles (Supervisor, MD, HR)

### 5. View Requests
- Use "Get All Leave Requests" to see filtered results
- Use "Get Leave Request by ID" to see details

## Role-Based Testing

### Employee Role
- Can submit leave requests
- Can view own leave requests
- Can withdraw own requests (until HR approves)

### Supervisor Role
- All Employee permissions
- Can approve requests for their projects
- Can view requests for their projects

### MD Role
- All Supervisor permissions
- Can approve requests in their company
- Can view all requests in their company

### HR Role
- Can create employees
- Can approve any request
- Can view all requests in organization

## Tips

1. **Use Variables**: Set collection variables for IDs to easily reuse them across requests
2. **Test Different Roles**: Create test users with different roles to test authorization
3. **Check Responses**: Always check the response structure and status codes
4. **Error Handling**: Test error scenarios (invalid data, unauthorized access, etc.)
5. **Date Format**: Use ISO date format (YYYY-MM-DD) for dates

## Example Test Scripts

You can add test scripts in Postman to automate validation:

```javascript
// Example: Check success response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.be.true;
});

// Example: Save response data to variables
pm.test("Save leave request ID", function () {
    var jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.id) {
        pm.collectionVariables.set("leaveRequestId", jsonData.data.id);
    }
});
```

