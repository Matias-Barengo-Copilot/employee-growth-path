import { NextRequest } from "next/server";
import { getAuthenticatedUser, requireRole } from "@/lib/middleware/auth";
import { EmployeeService } from "@/lib/services/employee.service";
import { createUserComplete } from "@/lib/services/user-creation.service";
import { CreateEmployeeDto } from "@/lib/types";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { isTestModeEnabledServer } from "@/lib/utils/test-mode";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Only HR can create users
    requireRole(user, ['hr']);

    const body = await request.json();
    const data = CreateEmployeeDto.parse(body);

    // Create user in DB (user will sign in with Google)
    const result = await createUserComplete({
      ...data,
      companyId: data.companyId || user.companyId, // Use admin's companyId if not provided
    });

    // Determine sign-in method message based on test mode
    const isTestMode = isTestModeEnabledServer();
    const signInMessage = isTestMode
      ? 'Employee created successfully. They can now sign in using their email address.'
      : 'Employee created successfully. They can now sign in with Google using their email.';

    return successResponse(
      {
        id: result.employeeId,
        message: signInMessage,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const roleFilter = searchParams.get('role'); // e.g., "supervisor,hr"
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Parse role filter
    const roles = roleFilter ? roleFilter.split(',').map(r => r.trim()) : undefined;

    const service = new EmployeeService();
    // Pass filters and pagination to service
    const result = await service.getEmployees(
      user,
      {
        companyId,
        roles,
        search,
      },
      page,
      limit
    );

    return successResponse(result);
  } catch (error) {
    logger.error('Error in GET /api/employees:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    return errorResponse(error);
  }
}

