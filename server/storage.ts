import { eq, and, desc, or } from "drizzle-orm";
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
  users,
  companies,
  teams,
  employees,
  goals,
  snaps,
  feedbackRequests,
  feedback,
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
}

export const storage = new DatabaseStorage();
