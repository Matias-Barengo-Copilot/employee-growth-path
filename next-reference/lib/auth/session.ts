import { authOptions } from './config';
import { getServerSession } from 'next-auth';

/**
 * Get the current session from NextAuth
 * Use this in Server Components and API routes
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the authenticated user from the session
 * Throws error if not authenticated
 */
export async function getAuthUser() {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error('Not authenticated');
  }

  return session.user;
}

