# Test Suite Documentation

This directory contains comprehensive unit tests for the Leaves Management System API.

## Test Structure

```
tests/
├── setup.ts                 # Test configuration and setup
├── mocks/                   # Mock implementations
│   ├── db.ts               # Database mocks
│   └── clerk.ts            # Clerk authentication mocks
├── utils/                   # Test utilities
│   └── test-helpers.ts     # Helper functions for creating test data
├── repositories/           # Repository layer tests
│   ├── employee.repository.test.ts
│   └── leave-request.repository.test.ts
├── services/                # Service layer tests
│   ├── employee.service.test.ts
│   └── leave-request.service.test.ts
├── middleware/              # Middleware tests
│   └── auth.test.ts
└── api/                     # API route tests
    ├── employees.test.ts
    └── leave-requests.test.ts
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test --watch
```

### Run tests with UI
```bash
pnpm test:ui
```

### Run tests with coverage
```bash
pnpm test:coverage
```

### Run specific test file
```bash
pnpm test tests/services/employee.service.test.ts
```

## Test Coverage

### Repository Layer Tests
- **EmployeeRepository**: Tests for creating, finding, and querying employees
- **LeaveRequestRepository**: Tests for creating, finding, updating, and withdrawing leave requests

### Service Layer Tests
- **EmployeeService**: Tests for employee creation, retrieval, and authorization
- **LeaveRequestService**: Tests for submitting, approving, and withdrawing leave requests

### Middleware Tests
- **Auth Middleware**: Tests for authentication and authorization

### API Route Tests
- **Employees API**: Tests for employee CRUD operations
- **Leave Requests API**: Tests for leave request operations

## Test Patterns

### Mocking
- Database operations are mocked using Vitest's `vi.mock()`
- Clerk authentication is mocked to simulate different user scenarios
- Services and repositories are mocked when testing API routes

### Test Data
- Use `createMockUser()`, `createMockEmployee()`, etc. from `test-helpers.ts` for consistent test data
- Test data follows the same structure as production data

### Assertions
- Use Vitest's `expect()` for assertions
- Test both success and error cases
- Verify that mocked functions are called with correct parameters

## Writing New Tests

1. **Create test file** in the appropriate directory
2. **Import necessary mocks** and utilities
3. **Mock dependencies** using `vi.mock()`
4. **Write test cases** covering:
   - Happy paths
   - Error cases
   - Edge cases
   - Authorization checks
5. **Run tests** to ensure they pass

## Example Test

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MyService } from "@/lib/services/my.service";
import { MyRepository } from "@/lib/repositories/my.repository";

vi.mock("@/lib/repositories/my.repository");

describe("MyService", () => {
  let service: MyService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
    };
    vi.mocked(MyRepository).mockImplementation(() => mockRepository);
    service = new MyService();
  });

  it("should do something", async () => {
    mockRepository.findById.mockResolvedValue({ id: "123" });
    const result = await service.doSomething("123");
    expect(result).toBeDefined();
  });
});
```

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Clear test names**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock external dependencies**: Don't make real API calls or database queries
5. **Test edge cases**: Include boundary conditions and error scenarios
6. **Keep tests fast**: Use mocks to avoid slow operations
7. **Maintain test data**: Keep test helpers up to date with schema changes

