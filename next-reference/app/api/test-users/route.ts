import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/middleware/auth';
import { createUserComplete } from '@/lib/services/user-creation.service';
import { CreateEmployeeDto } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@/lib/utils/errors';
import { isTestModeEnabledServer } from '@/lib/utils/test-mode';

export async function POST(request: NextRequest) {
  if (!isTestModeEnabledServer()) return errorResponse(new ForbiddenError('Test mode is not enabled'));

  try {
    const user = await getAuthenticatedUser();
    requireRole(user, ['hr']);
    const data = CreateEmployeeDto.parse(await request.json());
    const result = await createUserComplete({ ...data, companyId: data.companyId || user.companyId });
    return successResponse({ id: result.employeeId, message: 'Test user created successfully. They can now sign in using their email address (no Google OAuth required).' }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

