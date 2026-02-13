export interface CompleteOnboardingResponse {
  success: boolean;
  data?: {
    message: string;
  };
  error?: {
    message: string;
  };
}

/**
 * Completa el proceso de onboarding estableciendo la contraseña
 * 
 * @param data - Datos de la contraseña
 * @returns Respuesta de la API
 */
export async function completeOnboarding(
  data: { password: string }
): Promise<CompleteOnboardingResponse> {
  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to complete onboarding');
  }

  return response.json() as Promise<CompleteOnboardingResponse>;
}

