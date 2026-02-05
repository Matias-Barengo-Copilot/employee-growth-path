import { eq, and, desc, or, asc } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Team,
  type InsertTeam,
  type Employee,
  type InsertEmployee,
  type Goal,
  type InsertGoal,
  type Snap,
  type InsertSnap,
  type FeedbackRequest,
  type InsertFeedbackRequest,
  type Feedback,
  type InsertFeedback,
  type Activity,
  type InsertActivity,
  type CareerPath,
  type InsertCareerPath,
  type Milestone,
  type InsertMilestone,
  type MilestoneStep,
  type InsertMilestoneStep,
  type JournalEntry,
  type InsertJournalEntry,
  type SkillAssessment,
  type InsertSkillAssessment,
  users,
  companies,
  teams,
  employees,
  goals,
  snaps,
  feedbackRequests,
  feedback,
  activities,
  careerPaths,
  milestones,
  milestoneSteps,
  journalEntries,
  skillAssessments,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;

  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  getDefaultCompany(): Promise<Company | undefined>;

  getTeamsByCompany(companyId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;

  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
  getEmployeeById(id: string): Promise<Employee | undefined>;
  getEmployeesByCompany(companyId: string): Promise<Employee[]>;
  getDemoEmployee(): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;

  getGoalsByEmployee(employeeId: string): Promise<Goal[]>;
  getGoalById(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  getSnapsByRecipient(recipientId: string): Promise<Snap[]>;
  getSnapsBySender(senderId: string): Promise<Snap[]>;
  getSnapsByCompany(companyId: string): Promise<Snap[]>;
  createSnap(snap: InsertSnap): Promise<Snap>;

  getFeedbackRequestsByRequester(requesterId: string): Promise<FeedbackRequest[]>;
  getFeedbackRequestsByResponder(responderId: string): Promise<FeedbackRequest[]>;
  getFeedbackRequestById(id: string): Promise<FeedbackRequest | undefined>;
  createFeedbackRequest(request: InsertFeedbackRequest): Promise<FeedbackRequest>;
  updateFeedbackRequestStatus(id: string, status: "pending" | "completed"): Promise<void>;

  getFeedbackByRecipient(recipientId: string): Promise<Feedback[]>;
  getFeedbackBySender(senderId: string): Promise<Feedback[]>;
  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  markFeedbackAsRead(id: string): Promise<void>;

  getActivitiesByCompany(companyId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  getCareerPathByEmployee(employeeId: string): Promise<CareerPath | undefined>;
  createCareerPath(path: InsertCareerPath): Promise<CareerPath>;
  updateCareerPath(id: string, data: Partial<InsertCareerPath>): Promise<CareerPath | undefined>;

  getMilestonesByCareerPath(careerPathId: string): Promise<Milestone[]>;
  getMilestoneById(id: string): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  getStepsByMilestone(milestoneId: string): Promise<MilestoneStep[]>;
  getMilestoneStepById(id: string): Promise<MilestoneStep | undefined>;
  createMilestoneStep(step: InsertMilestoneStep): Promise<MilestoneStep>;
  updateMilestoneStep(id: string, data: Partial<InsertMilestoneStep>): Promise<MilestoneStep | undefined>;
  deleteMilestoneStep(id: string): Promise<void>;

  getJournalEntriesByEmployee(employeeId: string): Promise<JournalEntry[]>;
  getJournalEntriesByMilestone(milestoneId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;

  getSkillAssessmentsByEmployee(employeeId: string): Promise<SkillAssessment[]>;
  createSkillAssessment(assessment: InsertSkillAssessment): Promise<SkillAssessment>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: insertUser.username,
          email: insertUser.email,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          profileImageUrl: insertUser.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getDefaultCompany(): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, "copilot-innovations"));
    return company;
  }

  async getTeamsByCompany(companyId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.companyId, companyId));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
    return employee;
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.companyId, companyId));
  }

  async getDemoEmployee(): Promise<Employee | undefined> {
    // Return Sarah Chen (the first seeded employee) for demo mode
    const [employee] = await db.select().from(employees).where(eq(employees.email, "sarah@copilot.io"));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db
      .update(employees)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async getGoalsByEmployee(employeeId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.employeeId, employeeId)).orderBy(desc(goals.createdAt));
  }

  async getGoalById(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [updated] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return updated;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async getSnapsByRecipient(recipientId: string): Promise<Snap[]> {
    return db.select().from(snaps).where(eq(snaps.recipientId, recipientId)).orderBy(desc(snaps.createdAt));
  }

  async getSnapsBySender(senderId: string): Promise<Snap[]> {
    return db.select().from(snaps).where(eq(snaps.senderId, senderId)).orderBy(desc(snaps.createdAt));
  }

  async getSnapsByCompany(companyId: string): Promise<Snap[]> {
    return db.select().from(snaps).where(eq(snaps.companyId, companyId)).orderBy(desc(snaps.createdAt));
  }

  async createSnap(snap: InsertSnap): Promise<Snap> {
    const [newSnap] = await db.insert(snaps).values(snap).returning();
    return newSnap;
  }

  async getFeedbackRequestsByRequester(requesterId: string): Promise<FeedbackRequest[]> {
    return db.select().from(feedbackRequests).where(eq(feedbackRequests.requesterId, requesterId)).orderBy(desc(feedbackRequests.createdAt));
  }

  async getFeedbackRequestsByResponder(responderId: string): Promise<FeedbackRequest[]> {
    return db.select().from(feedbackRequests).where(eq(feedbackRequests.responderId, responderId)).orderBy(desc(feedbackRequests.createdAt));
  }

  async getFeedbackRequestById(id: string): Promise<FeedbackRequest | undefined> {
    const [request] = await db.select().from(feedbackRequests).where(eq(feedbackRequests.id, id));
    return request;
  }

  async createFeedbackRequest(request: InsertFeedbackRequest): Promise<FeedbackRequest> {
    const [newRequest] = await db.insert(feedbackRequests).values(request).returning();
    return newRequest;
  }

  async updateFeedbackRequestStatus(id: string, status: "pending" | "completed"): Promise<void> {
    await db.update(feedbackRequests).set({ status }).where(eq(feedbackRequests.id, id));
  }

  async getFeedbackByRecipient(recipientId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.recipientId, recipientId)).orderBy(desc(feedback.createdAt));
  }

  async getFeedbackBySender(senderId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.senderId, senderId)).orderBy(desc(feedback.createdAt));
  }

  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(fb).returning();
    return newFeedback;
  }

  async markFeedbackAsRead(id: string): Promise<void> {
    await db.update(feedback).set({ isRead: true }).where(eq(feedback.id, id));
  }

  async getActivitiesByCompany(companyId: string, limit: number = 50): Promise<Activity[]> {
    return db.select().from(activities)
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getCareerPathByEmployee(employeeId: string): Promise<CareerPath | undefined> {
    const [path] = await db.select().from(careerPaths).where(eq(careerPaths.employeeId, employeeId));
    return path;
  }

  async createCareerPath(path: InsertCareerPath): Promise<CareerPath> {
    const [newPath] = await db.insert(careerPaths).values(path).returning();
    return newPath;
  }

  async updateCareerPath(id: string, data: Partial<InsertCareerPath>): Promise<CareerPath | undefined> {
    const [updated] = await db.update(careerPaths).set(data).where(eq(careerPaths.id, id)).returning();
    return updated;
  }

  async getMilestonesByCareerPath(careerPathId: string): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.careerPathId, careerPathId)).orderBy(asc(milestones.position));
  }

  async getMilestoneById(id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return updated;
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestoneSteps).where(eq(milestoneSteps.milestoneId, id));
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async getStepsByMilestone(milestoneId: string): Promise<MilestoneStep[]> {
    return db.select().from(milestoneSteps).where(eq(milestoneSteps.milestoneId, milestoneId)).orderBy(asc(milestoneSteps.createdAt));
  }

  async getMilestoneStepById(id: string): Promise<MilestoneStep | undefined> {
    const [step] = await db.select().from(milestoneSteps).where(eq(milestoneSteps.id, id));
    return step;
  }

  async createMilestoneStep(step: InsertMilestoneStep): Promise<MilestoneStep> {
    const [newStep] = await db.insert(milestoneSteps).values(step).returning();
    return newStep;
  }

  async updateMilestoneStep(id: string, data: Partial<InsertMilestoneStep>): Promise<MilestoneStep | undefined> {
    const [updated] = await db.update(milestoneSteps).set(data).where(eq(milestoneSteps.id, id)).returning();
    return updated;
  }

  async deleteMilestoneStep(id: string): Promise<void> {
    await db.delete(milestoneSteps).where(eq(milestoneSteps.id, id));
  }

  async getJournalEntriesByEmployee(employeeId: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.employeeId, employeeId)).orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntriesByMilestone(milestoneId: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.milestoneId, milestoneId)).orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db.insert(journalEntries).values(entry).returning();
    return newEntry;
  }

  async getSkillAssessmentsByEmployee(employeeId: string): Promise<SkillAssessment[]> {
    return db.select().from(skillAssessments).where(eq(skillAssessments.employeeId, employeeId)).orderBy(desc(skillAssessments.createdAt));
  }

  async createSkillAssessment(assessment: InsertSkillAssessment): Promise<SkillAssessment> {
    const [newAssessment] = await db.insert(skillAssessments).values(assessment).returning();
    return newAssessment;
  }
}

export const storage = new DatabaseStorage();
