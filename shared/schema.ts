import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const roleEnum = pgEnum("role", ["admin", "manager", "member"]);
export const goalCategoryEnum = pgEnum("goal_category", ["growth", "delivery", "leadership", "learning"]);
export const goalStatusEnum = pgEnum("goal_status", ["not_started", "on_track", "at_risk", "completed"]);
export const goalVisibilityEnum = pgEnum("goal_visibility", ["private", "manager", "team"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["pending", "completed"]);

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

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSnapSchema = createInsertSchema(snaps).omit({ id: true, createdAt: true });
export const insertFeedbackRequestSchema = createInsertSchema(feedbackRequests).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });

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
