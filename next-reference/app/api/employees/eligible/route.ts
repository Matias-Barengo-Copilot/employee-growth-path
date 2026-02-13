import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { EmployeeRepository } from "@/lib/repositories/employee.repository";
import { successResponse, errorResponse } from "@/lib/utils/response";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(); // Get user to exclude them from the list
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    // Handle excludeEmployeeId: 
    // - If 'none' is explicitly passed, don't exclude anyone
    // - If a specific ID is passed, exclude that ID
    // - If nothing is passed, exclude current user by default (common use case)
    const excludeParam = searchParams.get('excludeEmployeeId');
    const excludeEmployeeId = excludeParam === 'none' 
      ? undefined 
      : (excludeParam || user.employeeId);

    const repository = new EmployeeRepository();
    const eligibleEmployees = await repository.findEligibleForProjectRoles(
      companyId || undefined,
      excludeEmployeeId || undefined
    );

    return successResponse(eligibleEmployees);
  } catch (error) {
    return errorResponse(error);
  }
}
