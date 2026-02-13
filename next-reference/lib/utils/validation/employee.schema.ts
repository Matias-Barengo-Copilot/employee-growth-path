import { z } from 'zod';

/**
 * Schema para validación del formulario de creación de empleado
 */
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  country: z.string().min(1, 'Country is required'),
  role: z.enum(['employee', 'supervisor', 'hr'], {
    message: 'Role is required',
  }),
  roleType: z.enum(['employee', 'individual_contractor'], {
    message: 'Role Type is required',
  }),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
}).refine((data) => {
  // HR always has roleType 'employee'
  if (data.role === 'hr' && data.roleType !== 'employee') {
    return false;
  }
  return true;
}, {
  message: 'HR role must have roleType "employee"',
  path: ['roleType'],
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

