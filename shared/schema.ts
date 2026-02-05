import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const roleEnum = pgEnum("role", ["admin", "manager", "member"]);
export const goalCategoryEnum = pgEnum("goal_category", ["growth", "delivery", "leadership", "learning"]);
export const goalStatusEnum = pgEnum("goal_status", ["not_started", "on_track", "at_risk", "completed"]);
export const goalVisibilityEnum = pgEnum("goal_visibility", ["private", "manager", "team"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["pending", "completed"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "snap_sent", "goal_created", "goal_completed", "feedback_given", 
  "feedback_requested", "profile_updated", "member_joined"
]);
export const careerPhaseEnum = pgEnum("career_phase", ["foundation", "growing", "leading", "mastering"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["locked", "active", "completed"]);

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  teamId: varchar("team_id").references(() => teams.id),
  managerId: varchar("manager_id"),
  role: roleEnum("role").notNull().default("member"),
  title: text("title"),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  profileImageUrl: text("profile_image_url"),
  location: text("location"),
  timezone: text("timezone"),
  slackHandle: text("slack_handle"),
  whatIDo: text("what_i_do"),
  strengths: text("strengths").array(),
  funFacts: text("fun_facts").array(),
  workingPreferences: text("working_preferences"),
  currentlyWorkingOn: text("currently_working_on"),
  isProfileComplete: boolean("is_profile_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  description: text("description"),
  category: goalCategoryEnum("category").notNull(),
  status: goalStatusEnum("status").notNull().default("not_started"),
  visibility: goalVisibilityEnum("visibility").notNull().default("private"),
  progress: integer("progress").default(0),
  quarter: text("quarter"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const snaps = pgTable("snaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => employees.id),
  recipientId: varchar("recipient_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  message: text("message").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackRequests = pgTable("feedback_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => employees.id),
  responderId: varchar("responder_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  prompt: text("prompt"),
  status: feedbackStatusEnum("status").notNull().default("pending"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => employees.id),
  recipientId: varchar("recipient_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  requestId: varchar("request_id").references(() => feedbackRequests.id),
  keepDoing: text("keep_doing"),
  considerImproving: text("consider_improving"),
  tags: text("tags").array(),
  isAnonymous: boolean("is_anonymous").default(false),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  actorId: varchar("actor_id").notNull().references(() => employees.id),
  type: activityTypeEnum("type").notNull(),
  targetId: varchar("target_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const careerPaths = pgTable("career_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  currentPhase: careerPhaseEnum("current_phase").notNull().default("foundation"),
  xp: integer("xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastJournalDate: timestamp("last_journal_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  careerPathId: varchar("career_path_id").notNull().references(() => careerPaths.id),
  phase: careerPhaseEnum("phase").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: milestoneStatusEnum("status").notNull().default("locked"),
  position: integer("position").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(50),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestoneSteps = pgTable("milestone_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  milestoneId: varchar("milestone_id").references(() => milestones.id),
  whatLearned: text("what_learned"),
  whatAccomplished: text("what_accomplished"),
  whatsNext: text("whats_next"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skillAssessments = pgTable("skill_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  dimensions: jsonb("dimensions").notNull().$type<Array<{ name: string; score: number }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

import { users } from "./models/auth";

export const companiesRelations = relations(companies, ({ many }) => ({
  teams: many(teams),
  employees: many(employees),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  company: one(companies, { fields: [teams.companyId], references: [companies.id] }),
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, { fields: [employees.companyId], references: [companies.id] }),
  team: one(teams, { fields: [employees.teamId], references: [teams.id] }),
  manager: one(employees, { fields: [employees.managerId], references: [employees.id], relationName: "managerEmployee" }),
  directReports: many(employees, { relationName: "managerEmployee" }),
  goals: many(goals),
  snapsSent: many(snaps, { relationName: "snapSender" }),
  snapsReceived: many(snaps, { relationName: "snapRecipient" }),
  feedbackGiven: many(feedback, { relationName: "feedbackSender" }),
  feedbackReceived: many(feedback, { relationName: "feedbackRecipient" }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  employee: one(employees, { fields: [goals.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [goals.companyId], references: [companies.id] }),
}));

export const snapsRelations = relations(snaps, ({ one }) => ({
  sender: one(employees, { fields: [snaps.senderId], references: [employees.id], relationName: "snapSender" }),
  recipient: one(employees, { fields: [snaps.recipientId], references: [employees.id], relationName: "snapRecipient" }),
  company: one(companies, { fields: [snaps.companyId], references: [companies.id] }),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({ one }) => ({
  requester: one(employees, { fields: [feedbackRequests.requesterId], references: [employees.id] }),
  responder: one(employees, { fields: [feedbackRequests.responderId], references: [employees.id] }),
  company: one(companies, { fields: [feedbackRequests.companyId], references: [companies.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  sender: one(employees, { fields: [feedback.senderId], references: [employees.id], relationName: "feedbackSender" }),
  recipient: one(employees, { fields: [feedback.recipientId], references: [employees.id], relationName: "feedbackRecipient" }),
  company: one(companies, { fields: [feedback.companyId], references: [companies.id] }),
  request: one(feedbackRequests, { fields: [feedback.requestId], references: [feedbackRequests.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  actor: one(employees, { fields: [activities.actorId], references: [employees.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
}));

export const careerPathsRelations = relations(careerPaths, ({ one, many }) => ({
  employee: one(employees, { fields: [careerPaths.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [careerPaths.companyId], references: [companies.id] }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  careerPath: one(careerPaths, { fields: [milestones.careerPathId], references: [careerPaths.id] }),
  steps: many(milestoneSteps),
}));

export const milestoneStepsRelations = relations(milestoneSteps, ({ one }) => ({
  milestone: one(milestones, { fields: [milestoneSteps.milestoneId], references: [milestones.id] }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  employee: one(employees, { fields: [journalEntries.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [journalEntries.companyId], references: [companies.id] }),
  milestone: one(milestones, { fields: [journalEntries.milestoneId], references: [milestones.id] }),
}));

export const skillAssessmentsRelations = relations(skillAssessments, ({ one }) => ({
  employee: one(employees, { fields: [skillAssessments.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [skillAssessments.companyId], references: [companies.id] }),
}));

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSnapSchema = createInsertSchema(snaps).omit({ id: true, createdAt: true });
export const insertFeedbackRequestSchema = createInsertSchema(feedbackRequests).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertCareerPathSchema = createInsertSchema(careerPaths).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertMilestoneStepSchema = createInsertSchema(milestoneSteps).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export const insertSkillAssessmentSchema = createInsertSchema(skillAssessments).omit({ id: true, createdAt: true });

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Snap = typeof snaps.$inferSelect;
export type InsertSnap = z.infer<typeof insertSnapSchema>;
export type FeedbackRequest = typeof feedbackRequests.$inferSelect;
export type InsertFeedbackRequest = z.infer<typeof insertFeedbackRequestSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type MilestoneStep = typeof milestoneSteps.$inferSelect;
export type InsertMilestoneStep = z.infer<typeof insertMilestoneStepSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type SkillAssessment = typeof skillAssessments.$inferSelect;
export type InsertSkillAssessment = z.infer<typeof insertSkillAssessmentSchema>;
