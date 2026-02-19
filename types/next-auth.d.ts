import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: string;
    employeeId?: string;
    role?: 'employee' | 'supervisor' | 'hr';
    companyId?: string;
  }

  interface Session {
    user: {
      id?: string;
      employeeId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'employee' | 'supervisor' | 'hr';
      companyId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'employee' | 'supervisor' | 'hr';
    companyId?: string;
  }
}

