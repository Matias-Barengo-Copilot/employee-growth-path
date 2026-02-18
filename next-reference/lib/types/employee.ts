import { EmployeeRole, EmployeeRoleType } from './index';

/**
 * Employee data returned from repository queries
 */
export interface EmployeeData {
  id: string;
  companyId: string;
  name: string;
  email: string;
  country: string;
  location: string | null;
  role: EmployeeRole;
  roleType: EmployeeRoleType;
  joiningDate: string | null;
  birthday: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Employee data with company information
 */
export interface EmployeeWithCompany extends EmployeeData {
  company: {
    id: string;
    name: string;
    organizationId?: string;
  };
}

/**
 * Type for employee list results (can be EmployeeData or EmployeeWithCompany)
 */
export type EmployeeListItem = EmployeeData | EmployeeWithCompany;

