import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * NextAuth API route handler
 * Handles all authentication requests (sign-in, sign-out, session, etc.)
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

