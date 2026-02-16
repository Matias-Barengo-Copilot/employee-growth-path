import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/db/client';
import { employees } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { detectAndSetInitialAdmin } from '@/lib/services/admin.service';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (!dbUrl || dbUrl.includes('dummy')) {
        return false;
      }

      if (!user.email) {
        return false;
      }

      const allowedDomains = ['@copilotinnovations.com', '@getboss.io'];
      if (!allowedDomains.some(domain => user.email!.endsWith(domain))) {
        return false;
      }

      try {
        const [employee] = await db
          .select()
          .from(employees)
          .where(and(eq(employees.email, user.email), eq(employees.isActive, true)))
          .limit(1);

        if (!employee) {
          const isInitialAdmin = await detectAndSetInitialAdmin(user.email, user.name || user.email.split('@')[0]);
          if (!isInitialAdmin) return false;
        }

        if (account?.providerAccountId && (!employee || !employee.googleId)) {
          await db
            .update(employees)
            .set({ googleId: account.providerAccountId })
            .where(eq(employees.email, user.email));
        }

        return true;
      } catch (error) {
        console.error('Error during sign-in:', error);
        return false;
      }
    },
    async session({ session }) {
      const dbUrl2 = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (!dbUrl2 || dbUrl2.includes('dummy')) {
        return session;
      }

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
