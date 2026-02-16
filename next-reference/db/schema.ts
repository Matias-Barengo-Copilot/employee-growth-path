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
  jsonb,
  real,
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
  title: varchar("title", { length: 255 }),
  location: varchar("location", { length: 255 }),
  timezone: varchar("timezone", { length: 100 }),
  slackHandle: varchar("slack_handle", { length: 100 }),
  whatIDo: text("what_i_do"),
  workingPreferences: text("working_preferences"),
  currentlyWorkingOn: varchar("currently_working_on", { length: 500 }),
  strengths: text("strengths").array(),
  funFacts: text("fun_facts").array(),
  profileImageUrl: text("profile_image_url"),
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
  goals: many(goals),
  snapsSent: many(snaps, { relationName: "snapSender" }),
  snapsReceived: many(snaps, { relationName: "snapRecipient" }),
  feedbackGiven: many(feedback, { relationName: "feedbackSender" }),
  feedbackReceived: many(feedback, { relationName: "feedbackRecipient" }),
  feedbackRequested: many(feedbackRequests, { relationName: "feedbackRequester" }),
  feedbackResponding: many(feedbackRequests, { relationName: "feedbackResponder" }),
  careerPath: many(careerPaths),
  journalEntries: many(journalEntries),
  skillAssessments: many(skillAssessments),
  xpEvents: many(xpEvents),
  activitiesPerformed: many(activities),
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

// =============================================
// New Feature Enums
// =============================================

export const goalCategoryEnum = pgEnum("goal_category", [
  "growth",
  "delivery",
  "leadership",
  "learning",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "not_started",
  "on_track",
  "at_risk",
  "completed",
]);

export const goalVisibilityEnum = pgEnum("goal_visibility", [
  "private",
  "manager",
  "team",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "completed",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "snap_sent",
  "goal_created",
  "goal_completed",
  "feedback_given",
  "feedback_requested",
  "profile_updated",
  "member_joined",
]);

export const careerPhaseEnum = pgEnum("career_phase", [
  "foundation",
  "growing",
  "leading",
  "mastering",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "locked",
  "active",
  "completed",
]);

export const xpCategoryEnum = pgEnum("xp_category", [
  "snap_give",
  "snap_receive",
  "feedback_give",
  "feedback_request",
  "feedback_helpful",
  "goal_create",
  "goal_update",
  "goal_complete",
  "milestone_complete",
  "milestone_step",
  "journal",
  "skill_assessment",
  "variety_bonus",
  "streak_bonus",
]);

// =============================================
// New Feature Tables
// =============================================

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: goalCategoryEnum("category").notNull(),
  status: goalStatusEnum("status").notNull().default("not_started"),
  visibility: goalVisibilityEnum("visibility").notNull().default("private"),
  progress: integer("progress").default(0).notNull(),
  quarter: varchar("quarter", { length: 10 }),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const snaps = pgTable("snaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedbackRequests = pgTable("feedback_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  responderId: uuid("responder_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  prompt: text("prompt"),
  status: feedbackStatusEnum("status").notNull().default("pending"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").references(() => feedbackRequests.id),
  keepDoing: text("keep_doing"),
  considerImproving: text("consider_improving"),
  tags: text("tags").array(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  targetId: uuid("target_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const careerPaths = pgTable("career_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  currentPhase: careerPhaseEnum("current_phase").notNull().default("foundation"),
  xp: integer("xp").notNull().default(0),
  seasonXp: integer("season_xp").notNull().default(0),
  lifetimeXp: integer("lifetime_xp").notNull().default(0),
  seasonQuarter: integer("season_quarter").notNull().default(1),
  seasonYear: integer("season_year").notNull().default(2026),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastJournalDate: timestamp("last_journal_date"),
  lastActiveWeek: varchar("last_active_week", { length: 20 }),
  weeklyActionCount: integer("weekly_action_count").notNull().default(0),
  consistencyStreak: integer("consistency_streak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  careerPathId: uuid("career_path_id")
    .notNull()
    .references(() => careerPaths.id, { onDelete: "cascade" }),
  phase: careerPhaseEnum("phase").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: milestoneStatusEnum("status").notNull().default("locked"),
  position: integer("position").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(50),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestoneSteps = pgTable("milestone_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id").references(() => milestones.id),
  whatLearned: text("what_learned"),
  whatAccomplished: text("what_accomplished"),
  whatsNext: text("whats_next"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skillAssessments = pgTable("skill_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  dimensions: jsonb("dimensions")
    .notNull()
    .$type<Array<{ name: string; score: number }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const xpEvents = pgTable("xp_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  category: xpCategoryEnum("category").notNull(),
  xpAwarded: integer("xp_awarded").notNull(),
  recipientId: uuid("recipient_id"),
  targetId: uuid("target_id"),
  seasonQuarter: integer("season_quarter").notNull(),
  seasonYear: integer("season_year").notNull(),
  weekKey: varchar("week_key", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================
// New Feature Relations
// =============================================

export const goalsRelations = relations(goals, ({ one }) => ({
  employee: one(employees, {
    fields: [goals.employeeId],
    references: [employees.id],
  }),
  company: one(companies, {
    fields: [goals.companyId],
    references: [companies.id],
  }),
}));

export const snapsRelations = relations(snaps, ({ one }) => ({
  sender: one(employees, {
    fields: [snaps.senderId],
    references: [employees.id],
    relationName: "snapSender",
  }),
  recipient: one(employees, {
    fields: [snaps.recipientId],
    references: [employees.id],
    relationName: "snapRecipient",
  }),
  company: one(companies, {
    fields: [snaps.companyId],
    references: [companies.id],
  }),
}));

export const feedbackRequestsRelations = relations(
  feedbackRequests,
  ({ one }) => ({
    requester: one(employees, {
      fields: [feedbackRequests.requesterId],
      references: [employees.id],
      relationName: "feedbackRequester",
    }),
    responder: one(employees, {
      fields: [feedbackRequests.responderId],
      references: [employees.id],
      relationName: "feedbackResponder",
    }),
    company: one(companies, {
      fields: [feedbackRequests.companyId],
      references: [companies.id],
    }),
  })
);

export const feedbackRelations = relations(feedback, ({ one }) => ({
  sender: one(employees, {
    fields: [feedback.senderId],
    references: [employees.id],
    relationName: "feedbackSender",
  }),
  recipient: one(employees, {
    fields: [feedback.recipientId],
    references: [employees.id],
    relationName: "feedbackRecipient",
  }),
  company: one(companies, {
    fields: [feedback.companyId],
    references: [companies.id],
  }),
  request: one(feedbackRequests, {
    fields: [feedback.requestId],
    references: [feedbackRequests.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  actor: one(employees, {
    fields: [activities.actorId],
    references: [employees.id],
  }),
  company: one(companies, {
    fields: [activities.companyId],
    references: [companies.id],
  }),
}));

export const careerPathsRelations = relations(
  careerPaths,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [careerPaths.employeeId],
      references: [employees.id],
    }),
    company: one(companies, {
      fields: [careerPaths.companyId],
      references: [companies.id],
    }),
    milestones: many(milestones),
  })
);

export const milestonesRelations = relations(
  milestones,
  ({ one, many }) => ({
    careerPath: one(careerPaths, {
      fields: [milestones.careerPathId],
      references: [careerPaths.id],
    }),
    steps: many(milestoneSteps),
  })
);

export const milestoneStepsRelations = relations(
  milestoneSteps,
  ({ one }) => ({
    milestone: one(milestones, {
      fields: [milestoneSteps.milestoneId],
      references: [milestones.id],
    }),
  })
);

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one }) => ({
    employee: one(employees, {
      fields: [journalEntries.employeeId],
      references: [employees.id],
    }),
    company: one(companies, {
      fields: [journalEntries.companyId],
      references: [companies.id],
    }),
    milestone: one(milestones, {
      fields: [journalEntries.milestoneId],
      references: [milestones.id],
    }),
  })
);

export const skillAssessmentsRelations = relations(
  skillAssessments,
  ({ one }) => ({
    employee: one(employees, {
      fields: [skillAssessments.employeeId],
      references: [employees.id],
    }),
    company: one(companies, {
      fields: [skillAssessments.companyId],
      references: [companies.id],
    }),
  })
);

export const xpEventsRelations = relations(xpEvents, ({ one }) => ({
  employee: one(employees, {
    fields: [xpEvents.employeeId],
    references: [employees.id],
  }),
  company: one(companies, {
    fields: [xpEvents.companyId],
    references: [companies.id],
  }),
}));

