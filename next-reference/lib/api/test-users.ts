/**
 * API client functions for test users
 * Used in test mode for creating test users with any email domain
 */

export interface CreateTestUserInput {
  name: string;
  email: string;
  country: string;
  role: 'employee' | 'supervisor' | 'hr';
  employeeNumber?: string;
  joiningDate?: string;
  birthday?: string;
  companyId: string;
}

export interface CreateTestUserResponse {
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Create a test user
 * TEST MODE: Allows creating users with any email domain
 * 
 * @param data - Test user data
 * @returns Response with created user ID
 */
export async function createTestUser(
  data: CreateTestUserInput
): Promise<CreateTestUserResponse> {
  const response = await fetch('/api/test-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: { message: 'Failed to create test user' } 
    }));
    throw new Error(error.error?.message || error.message || 'Failed to create test user');
  }

  return response.json() as Promise<CreateTestUserResponse>;
}
