import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/db/client';
import { employees } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { detectAndSetInitialAdmin } from '@/lib/services/admin.service';
import { isTestModeEnabledServer } from '@/lib/utils/test-mode';

/**
 * NextAuth configuration with Google OAuth
 * 
 * Features:
 * - Google OAuth authentication
 * - Email domain restriction (@copilotinnovations.com, @getboss.io)
 * - Database user verification
 * - Automatic initial admin creation
 * - Session management with user data
 * 
 * TEST MODE: When enabled (via lib/utils/test-mode.ts), allows:
 * - Credentials provider for direct sign-in without Google
 * - Any email domain (not just @copilotinnovations.com)
 * - Users created via test admin page
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(isTestModeEnabledServer() ? [CredentialsProvider({
      name: 'Test Account',
      credentials: { email: { label: 'Email', type: 'email' } },
            async authorize(credentials) {
              const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
              if (!dbUrl || dbUrl.includes('dummy') || !credentials?.email) return null;
              try {
                const [employee] = await db.select().from(employees).where(and(eq(employees.email, credentials.email), eq(employees.isActive, true))).limit(1);
                return employee ? { id: employee.id, email: employee.email, name: employee.name } : null;
              } catch (error) {
                console.error('Error in test credentials authorize:', error);
                return null;
              }
            },
    })] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Skip database queries during build time
      const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (!dbUrl || dbUrl.includes('dummy')) {
        return false;
      }

      if (!user.email) {
        return false;
      }

      // Allow emails from @copilotinnovations.com and @getboss.io domains
      const allowedDomains = ['@copilotinnovations.com', '@getboss.io'];
      if (!isTestModeEnabledServer() && !allowedDomains.some(domain => user.email!.endsWith(domain))) {
        return false;
      }

      try {
        // Buscar empleado activo en la base de datos
        const [employee] = await db
          .select()
          .from(employees)
          .where(and(eq(employees.email, user.email), eq(employees.isActive, true)))
          .limit(1);

        if (!employee) {
          if (isTestModeEnabledServer()) return false;
          const isInitialAdmin = await detectAndSetInitialAdmin(user.email, user.name || user.email.split('@')[0]);
          if (!isInitialAdmin) return false;
        }

        // Actualizar googleId si no está establecido
        if (account?.providerAccountId && (!employee || !employee.googleId)) {
          await db
            .update(employees)
            .set({ googleId: account.providerAccountId })
            .where(eq(employees.email, user.email));
        }

        return true; // Permitir sign-in
      } catch (error) {
        console.error('Error during sign-in:', error);
        return false; // Rechazar en caso de error
      }
    },
    async session({ session }) {
      const dbUrl2 = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (!dbUrl2 || dbUrl2.includes('dummy')) {
        return session;
      }

      // Agregar datos del empleado activo a la sesión
      if (session.user?.email) {
        try {
          const [employee] = await db
            .select({
              id: employees.id,
              role: employees.role,
              companyId: employees.companyId,
              name: employees.name,
            })
            .from(employees)
            .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
            .limit(1);

          if (employee) {
            // Type assertion needed because we extended the types
            const user = session.user as typeof session.user & {
              id: string;
              employeeId: string;
              role: 'employee' | 'supervisor' | 'hr';
              companyId: string;
            };
            user.id = employee.id;
            user.employeeId = employee.id;
            user.role = employee.role as 'employee' | 'supervisor' | 'hr';
            user.companyId = employee.companyId;
            user.name = employee.name;
          }
        } catch (error) {
          console.error('Error fetching user data for session:', error);
        }
      }

      return session;
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

