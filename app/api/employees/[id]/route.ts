import { NextRequest } from "next/server";
import { getAuthenticatedUser, requireRole } from "@/lib/middleware/auth";
import { EmployeeService } from "@/lib/services/employee.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { UpdateEmployeeDto } from "@/lib/types";
import { NotFoundError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const service = new EmployeeService();
    const employee = await service.getEmployeeById(id, user);

    if (!employee) {
      return errorResponse(new NotFoundError("Employee not found"));
    }

    return successResponse(employee);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    const body = await request.json();
    const data = UpdateEmployeeDto.parse(body);

    const service = new EmployeeService();
    const employee = await service.updateEmployee(id, data, user);

    return successResponse(employee);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    requireRole(user, ['hr']);

    const service = new EmployeeService();
    await service.deleteEmployee(id, user);

    return successResponse({ message: 'Employee deactivated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
