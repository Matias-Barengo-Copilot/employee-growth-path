import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { User, Employee } from "@shared/schema";
import { setupAuth } from "./replit_integrations/auth";

interface AuthUser {
  claims?: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  employee?: Employee;
}

async function ensureEmployee(req: AuthenticatedRequest, res: Response): Promise<Employee | null> {
  const authUser = req.user as AuthUser;
  
  if (!authUser?.claims?.sub) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const userId = authUser.claims.sub;
  const user = await storage.getUser(userId);
  
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }

  let employee = await storage.getEmployeeByUserId(user.id);
  
  if (!employee) {
    const defaultCompany = await storage.getDefaultCompany();
    if (!defaultCompany) {
      res.status(500).json({ error: "Company not configured" });
      return null;
    }

    employee = await storage.createEmployee({
      userId: user.id,
      companyId: defaultCompany.id,
      email: user.email || `user-${user.id}@copilot.io`,
      firstName: user.firstName || "New",
      lastName: user.lastName || "User",
      profileImageUrl: user.profileImageUrl,
      role: "member",
    });
  }

  return employee;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth before other routes
  await setupAuth(app);

  app.get("/api/profile", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    res.json(employee);
  });

  app.patch("/api/profile", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      title: z.string().optional(),
      location: z.string().optional(),
      timezone: z.string().optional(),
      slackHandle: z.string().optional(),
      whatIDo: z.string().optional(),
      workingPreferences: z.string().optional(),
      currentlyWorkingOn: z.string().optional(),
      strengths: z.array(z.string()).optional(),
      funFacts: z.array(z.string()).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const updated = await storage.updateEmployee(employee.id, parsed.data);
    res.json(updated);
  });

  app.get("/api/dashboard", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const [goals, snapsReceived, snapsSent, incomingRequests] = await Promise.all([
      storage.getGoalsByEmployee(employee.id),
      storage.getSnapsByRecipient(employee.id),
      storage.getSnapsBySender(employee.id),
      storage.getFeedbackRequestsByResponder(employee.id),
    ]);

    const companyEmployees = await storage.getEmployeesByCompany(employee.companyId);
    const employeeMap = new Map(companyEmployees.map(e => [e.id, e]));

    const allSnaps = await storage.getSnapsByCompany(employee.companyId);
    const recentSnaps = allSnaps.slice(0, 5).map(snap => ({
      ...snap,
      sender: employeeMap.get(snap.senderId),
      recipient: employeeMap.get(snap.recipientId),
    }));

    const pendingFeedbackRequests = incomingRequests.filter(r => r.status === "pending");

    res.json({
      employee,
      goals,
      recentSnaps,
      pendingFeedbackRequests,
      stats: {
        totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === "completed").length,
        snapsReceived: snapsReceived.length,
        snapsGiven: snapsSent.length,
      },
    });
  });

  app.get("/api/directory", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const [employees, teams] = await Promise.all([
      storage.getEmployeesByCompany(employee.companyId),
      storage.getTeamsByCompany(employee.companyId),
    ]);

    res.json({ employees, teams });
  });

  app.get("/api/employees/:id", async (req: AuthenticatedRequest, res) => {
    const currentEmployee = await ensureEmployee(req, res);
    if (!currentEmployee) return;

    const employee = await storage.getEmployeeById(req.params.id);
    if (!employee || employee.companyId !== currentEmployee.companyId) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const [teams, manager, goals, snapsReceived] = await Promise.all([
      storage.getTeamsByCompany(employee.companyId),
      employee.managerId ? storage.getEmployeeById(employee.managerId) : null,
      storage.getGoalsByEmployee(employee.id),
      storage.getSnapsByRecipient(employee.id),
    ]);

    const team = teams.find(t => t.id === employee.teamId) || null;
    const companyEmployees = await storage.getEmployeesByCompany(employee.companyId);
    const employeeMap = new Map(companyEmployees.map(e => [e.id, e]));

    res.json({
      employee,
      team,
      manager,
      goals: goals.filter(g => g.visibility === "team"),
      snapsReceived: snapsReceived.map(s => ({
        ...s,
        sender: employeeMap.get(s.senderId),
      })),
      isCurrentUser: employee.id === currentEmployee.id,
    });
  });

  app.get("/api/goals", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const goals = await storage.getGoalsByEmployee(employee.id);
    res.json({ goals, currentEmployee: employee });
  });

  app.post("/api/goals", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["growth", "delivery", "leadership", "learning"]),
      status: z.enum(["not_started", "on_track", "at_risk", "completed"]),
      visibility: z.enum(["private", "manager", "team"]),
      progress: z.number().min(0).max(100),
      quarter: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const goal = await storage.createGoal({
      ...parsed.data,
      employeeId: employee.id,
      companyId: employee.companyId,
    });

    res.status(201).json(goal);
  });

  app.patch("/api/goals/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const goal = await storage.getGoalById(req.params.id);
    if (!goal || goal.employeeId !== employee.id) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.enum(["growth", "delivery", "leadership", "learning"]).optional(),
      status: z.enum(["not_started", "on_track", "at_risk", "completed"]).optional(),
      visibility: z.enum(["private", "manager", "team"]).optional(),
      progress: z.number().min(0).max(100).optional(),
      quarter: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const updated = await storage.updateGoal(goal.id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/goals/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const goal = await storage.getGoalById(req.params.id);
    if (!goal || goal.employeeId !== employee.id) {
      return res.status(404).json({ error: "Goal not found" });
    }

    await storage.deleteGoal(goal.id);
    res.status(204).send();
  });

  app.get("/api/snaps", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const [snapsReceived, snapsSent, allSnaps, companyEmployees] = await Promise.all([
      storage.getSnapsByRecipient(employee.id),
      storage.getSnapsBySender(employee.id),
      storage.getSnapsByCompany(employee.companyId),
      storage.getEmployeesByCompany(employee.companyId),
    ]);

    const employeeMap = new Map(companyEmployees.map(e => [e.id, e]));

    res.json({
      snapsReceived: snapsReceived.map(s => ({ ...s, sender: employeeMap.get(s.senderId) })),
      snapsSent: snapsSent.map(s => ({ ...s, recipient: employeeMap.get(s.recipientId) })),
      allSnaps: allSnaps.map(s => ({
        ...s,
        sender: employeeMap.get(s.senderId),
        recipient: employeeMap.get(s.recipientId),
      })),
      employees: companyEmployees,
      currentEmployee: employee,
    });
  });

  app.post("/api/snaps", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      recipientId: z.string(),
      message: z.string().min(1).max(500),
      tags: z.array(z.string()).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const recipient = await storage.getEmployeeById(parsed.data.recipientId);
    if (!recipient || recipient.companyId !== employee.companyId) {
      return res.status(400).json({ error: "Invalid recipient" });
    }

    const snap = await storage.createSnap({
      senderId: employee.id,
      recipientId: parsed.data.recipientId,
      companyId: employee.companyId,
      message: parsed.data.message,
      tags: parsed.data.tags || [],
    });

    res.status(201).json(snap);
  });

  app.get("/api/feedback", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const [feedbackReceived, feedbackGiven, incomingRequests, outgoingRequests, companyEmployees] = await Promise.all([
      storage.getFeedbackByRecipient(employee.id),
      storage.getFeedbackBySender(employee.id),
      storage.getFeedbackRequestsByResponder(employee.id),
      storage.getFeedbackRequestsByRequester(employee.id),
      storage.getEmployeesByCompany(employee.companyId),
    ]);

    const employeeMap = new Map(companyEmployees.map(e => [e.id, e]));

    res.json({
      feedbackReceived: feedbackReceived.map(f => ({
        ...f,
        sender: f.isAnonymous ? null : employeeMap.get(f.senderId),
      })),
      feedbackGiven: feedbackGiven.map(f => ({
        ...f,
        recipient: employeeMap.get(f.recipientId),
      })),
      incomingRequests: incomingRequests.map(r => ({
        ...r,
        requester: employeeMap.get(r.requesterId),
      })),
      outgoingRequests: outgoingRequests.map(r => ({
        ...r,
        responder: employeeMap.get(r.responderId),
      })),
      employees: companyEmployees,
      currentEmployee: employee,
    });
  });

  app.post("/api/feedback", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      recipientId: z.string(),
      keepDoing: z.string().optional(),
      considerImproving: z.string().optional(),
      isAnonymous: z.boolean(),
      tags: z.array(z.string()).optional(),
      requestId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    if (!parsed.data.keepDoing && !parsed.data.considerImproving) {
      return res.status(400).json({ error: "Please provide at least one type of feedback" });
    }

    const recipient = await storage.getEmployeeById(parsed.data.recipientId);
    if (!recipient || recipient.companyId !== employee.companyId) {
      return res.status(400).json({ error: "Invalid recipient" });
    }

    const fb = await storage.createFeedback({
      senderId: employee.id,
      recipientId: parsed.data.recipientId,
      companyId: employee.companyId,
      keepDoing: parsed.data.keepDoing,
      considerImproving: parsed.data.considerImproving,
      isAnonymous: parsed.data.isAnonymous,
      tags: parsed.data.tags || [],
      requestId: parsed.data.requestId,
    });

    if (parsed.data.requestId) {
      await storage.updateFeedbackRequestStatus(parsed.data.requestId, "completed");
    }

    res.status(201).json(fb);
  });

  app.patch("/api/feedback/:id/read", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    await storage.markFeedbackAsRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/feedback/request", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      responderId: z.string(),
      prompt: z.string().optional(),
      deadline: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const responder = await storage.getEmployeeById(parsed.data.responderId);
    if (!responder || responder.companyId !== employee.companyId) {
      return res.status(400).json({ error: "Invalid responder" });
    }

    const request = await storage.createFeedbackRequest({
      requesterId: employee.id,
      responderId: parsed.data.responderId,
      companyId: employee.companyId,
      prompt: parsed.data.prompt,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      status: "pending",
    });

    res.status(201).json(request);
  });

  return httpServer;
}
