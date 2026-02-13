import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  date,
  integer,
  boolean,
  pgEnum,
  unique,
  numeric,
  type PgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const employeeRoleEnum = pgEnum("employee_role", [
  "employee",
  "supervisor",
  "hr",
]);

export const employeeRoleTypeEnum = pgEnum("employee_role_type", [
  "employee",
  "individual_contractor",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "vacation",
  "personal_sick",
  "unpaid",
  "other",
]);

export const leaveRequestStatusEnum = pgEnum("leave_request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const approverRoleEnum = pgEnum("approver_role", [
  "supervisor",
  "hr",
  "pm",
  "tech_lead",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

// Tables
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleId: varchar("google_id", { length: 255 }).unique(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  country: varchar("country", { length: 100 }).notNull(),
  role: employeeRoleEnum("role").notNull(),
  roleType: employeeRoleTypeEnum("role_type").default("employee").notNull(),
  joiningDate: date("joining_date"),
  birthday: date("birthday"),
  usedVacationDays: integer("used_vacation_days").default(0).notNull(),
  lastVacationResetDate: date("last_vacation_reset_date"),
  isInitialAdmin: boolean("is_initial_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSupervisors = pgTable(
  "employee_supervisors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.employeeId, t.supervisorId),
  ]
);

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  totalDays: integer("total_days").notNull(),
  totalWorkingDays: integer("total_working_days"),
  totalHalfDays: numeric("total_half_days", { precision: 5, scale: 2 }),
  reason: text("reason"),
  overallStatus: leaveRequestStatusEnum("overall_status")
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveRequestDays = pgTable(
  "leave_request_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leaveRequestId: uuid("leave_request_id")
      .notNull()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    isHalfDay: boolean("is_half_day").default(false).notNull(),
    halfDayPeriod: varchar("half_day_period", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.leaveRequestId, t.date),
  ]
);

export const leaveRequestProjects = pgTable(
  "leave_request_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leaveRequestId: uuid("leave_request_id")
      .notNull()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
    projectName: varchar("project_name", { length: 255 }).notNull(),
    pmId: uuid("pm_id").references(() => employees.id, { onDelete: "set null" }),
    techLeadId: uuid("tech_lead_id").references(() => employees.id, { onDelete: "set null" }),
  },
  (t) => [
    unique().on(t.leaveRequestId, t.projectName),
  ]
);

export const leaveApprovals = pgTable(
  "leave_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leaveRequestId: uuid("leave_request_id")
      .notNull()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
    approverId: uuid("approver_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    approverRole: approverRoleEnum("approver_role").notNull(),
    status: approvalStatusEnum("status").default("pending").notNull(),
    comments: text("comments"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Allow same approver to have multiple roles for the same leave request
    // e.g., same person can be both PM and Tech Lead
    unique().on(t.leaveRequestId, t.approverId, t.approverRole),
  ]
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  companies: many(companies),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [companies.organizationId],
    references: [organizations.id],
  }),
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
  supervisors: many(employeeSupervisors, {
    relationName: "employee_supervisors",
  }),
  supervisedEmployees: many(employeeSupervisors, {
    relationName: "supervisor_employees",
  }),
  leaveRequests: many(leaveRequests),
  leaveApprovals: many(leaveApprovals),
}));

export const leaveRequestsRelations = relations(
  leaveRequests,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [leaveRequests.employeeId],
      references: [employees.id],
    }),
    leaveRequestDays: many(leaveRequestDays),
    leaveRequestProjects: many(leaveRequestProjects),
    leaveApprovals: many(leaveApprovals),
  })
);

export const leaveRequestDaysRelations = relations(
  leaveRequestDays,
  ({ one }) => ({
    leaveRequest: one(leaveRequests, {
      fields: [leaveRequestDays.leaveRequestId],
      references: [leaveRequests.id],
    }),
  })
);

export const leaveRequestProjectsRelations = relations(
  leaveRequestProjects,
  ({ one }) => ({
    leaveRequest: one(leaveRequests, {
      fields: [leaveRequestProjects.leaveRequestId],
      references: [leaveRequests.id],
    }),
    pm: one(employees, {
      fields: [leaveRequestProjects.pmId],
      references: [employees.id],
      relationName: "project_pm",
    }),
    techLead: one(employees, {
      fields: [leaveRequestProjects.techLeadId],
      references: [employees.id],
      relationName: "project_tech_lead",
    }),
  })
);

export const leaveApprovalsRelations = relations(
  leaveApprovals,
  ({ one }) => ({
    leaveRequest: one(leaveRequests, {
      fields: [leaveApprovals.leaveRequestId],
      references: [leaveRequests.id],
    }),
    approver: one(employees, {
      fields: [leaveApprovals.approverId],
      references: [employees.id],
    }),
  })
);

export const employeeSupervisorsRelations = relations(
  employeeSupervisors,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeSupervisors.employeeId],
      references: [employees.id],
      relationName: "employee_supervisors",
    }),
    supervisor: one(employees, {
      fields: [employeeSupervisors.supervisorId],
      references: [employees.id],
      relationName: "supervisor_employees",
    }),
  })
);

