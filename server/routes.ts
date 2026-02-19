import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { User, Employee, Activity, CareerPath, Milestone, MilestoneStep } from "@shared/schema";
import { setupAuth } from "./replit_integrations/auth";
import { openai, ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import { awardXp, checkAndAwardVarietyBonus, checkAndAwardStreakBonus, getWeeklyXpSummary, getSeasonLevel, getCurrentSeason, type AwardXpResult } from "./xp-engine";

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

// Demo mode - set to true to bypass authentication
const DEMO_MODE = true;

async function ensureEmployee(req: AuthenticatedRequest, res: Response): Promise<Employee | null> {
  // In demo mode, return the first employee (Sarah Chen - CEO)
  if (DEMO_MODE) {
    const demoEmployee = await storage.getDemoEmployee();
    if (demoEmployee) {
      return demoEmployee;
    }
  }

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
      profileImageUrl: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const updated = await storage.updateEmployee(employee.id, parsed.data);

    await storage.createActivity({
      companyId: employee.companyId,
      actorId: employee.id,
      type: "profile_updated",
      metadata: JSON.stringify({ employeeName: `${employee.firstName} ${employee.lastName}` }),
    });

    res.json(updated);
  });

  app.get("/api/dashboard", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const [goals, snapsReceived, snapsSent, incomingRequests, feedbackReceived, feedbackGiven] = await Promise.all([
      storage.getGoalsByEmployee(employee.id),
      storage.getSnapsByRecipient(employee.id),
      storage.getSnapsBySender(employee.id),
      storage.getFeedbackRequestsByResponder(employee.id),
      storage.getFeedbackByRecipient(employee.id),
      storage.getFeedbackBySender(employee.id),
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

    const recentFeedback = feedbackReceived.slice(0, 3).map(f => ({
      ...f,
      sender: f.isAnonymous ? null : employeeMap.get(f.senderId),
    }));

    res.json({
      employee,
      goals,
      recentSnaps,
      recentFeedback,
      pendingFeedbackRequests,
      stats: {
        totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === "completed").length,
        snapsReceived: snapsReceived.length,
        snapsGiven: snapsSent.length,
        feedbackReceived: feedbackReceived.length,
        feedbackGiven: feedbackGiven.length,
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

    await storage.createActivity({
      companyId: employee.companyId,
      actorId: employee.id,
      type: "goal_created",
      targetId: goal.id,
      metadata: JSON.stringify({ goalTitle: goal.title, category: goal.category }),
    });

    const xpResult = await awardXp({
      employee,
      category: "goal_create",
      targetId: goal.id,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...goal, xpAwarded: xpResult.xpAwarded });
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

    let xpAwarded = 0;
    if (parsed.data.status === "completed" && goal.status !== "completed") {
      await storage.createActivity({
        companyId: employee.companyId,
        actorId: employee.id,
        type: "goal_completed",
        targetId: goal.id,
        metadata: JSON.stringify({ goalTitle: goal.title, category: goal.category }),
      });
      const xpResult = await awardXp({
        employee,
        category: "goal_complete",
        targetId: goal.id,
      });
      xpAwarded = xpResult.xpAwarded;
    } else if (parsed.data.progress !== undefined || parsed.data.status !== undefined) {
      const xpResult = await awardXp({
        employee,
        category: "goal_update",
        targetId: goal.id,
      });
      xpAwarded = xpResult.xpAwarded;
    }

    if (xpAwarded > 0) {
      await checkAndAwardVarietyBonus(employee);
      await checkAndAwardStreakBonus(employee);
    }

    res.json({ ...updated, xpAwarded });
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

    await storage.createActivity({
      companyId: employee.companyId,
      actorId: employee.id,
      type: "snap_sent",
      targetId: parsed.data.recipientId,
      metadata: JSON.stringify({ recipientName: `${recipient.firstName} ${recipient.lastName}`, tags: parsed.data.tags }),
    });

    const senderXp = await awardXp({
      employee,
      category: "snap_give",
      recipientId: parsed.data.recipientId,
      targetId: snap.id,
      contentLength: parsed.data.message.length,
    });

    const recipientXp = await awardXp({
      employee: recipient,
      category: "snap_receive",
      targetId: snap.id,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...snap, xpAwarded: senderXp.xpAwarded });
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

    await storage.createActivity({
      companyId: employee.companyId,
      actorId: employee.id,
      type: "feedback_given",
      targetId: parsed.data.recipientId,
      metadata: JSON.stringify({ recipientName: `${recipient.firstName} ${recipient.lastName}`, isAnonymous: parsed.data.isAnonymous }),
    });

    const totalContentLength = (parsed.data.keepDoing?.length || 0) + (parsed.data.considerImproving?.length || 0);
    const xpResult = await awardXp({
      employee,
      category: "feedback_give",
      recipientId: parsed.data.recipientId,
      targetId: fb.id,
      contentLength: totalContentLength,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...fb, xpAwarded: xpResult.xpAwarded });
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

    await storage.createActivity({
      companyId: employee.companyId,
      actorId: employee.id,
      type: "feedback_requested",
      targetId: parsed.data.responderId,
      metadata: JSON.stringify({ responderName: `${responder.firstName} ${responder.lastName}` }),
    });

    const xpResult = await awardXp({
      employee,
      category: "feedback_request",
      targetId: request.id,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...request, xpAwarded: xpResult.xpAwarded });
  });

  app.get("/api/activities", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const limit = parseInt(req.query.limit as string) || 50;
    const activitiesData = await storage.getActivitiesByCompany(employee.companyId, limit);
    const companyEmployees = await storage.getEmployeesByCompany(employee.companyId);
    const employeeMap = new Map(companyEmployees.map(e => [e.id, e]));

    const enriched = activitiesData.map(activity => ({
      ...activity,
      actor: employeeMap.get(activity.actorId),
      target: activity.targetId ? employeeMap.get(activity.targetId) : undefined,
      parsedMetadata: activity.metadata ? JSON.parse(activity.metadata) : {},
    }));

    res.json({ activities: enriched });
  });

  // ==================== XP SUMMARY ====================

  app.get("/api/xp/summary", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }

    const season = getCurrentSeason();
    const maybeResetSeason = (careerPath.seasonQuarter !== season.quarter || careerPath.seasonYear !== season.year);
    const seasonXp = maybeResetSeason ? 0 : careerPath.seasonXp;

    const level = getSeasonLevel(seasonXp);
    const weeklySummary = await getWeeklyXpSummary(employee.id);

    res.json({
      seasonXp,
      lifetimeXp: careerPath.lifetimeXp,
      level,
      weekly: weeklySummary,
      season: {
        quarter: season.quarter,
        year: season.year,
      },
      consistencyStreak: careerPath.consistencyStreak,
    });
  });

  // ==================== CAREER GROWTH ROUTES ====================

  app.get("/api/career", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }

    const pathMilestones = await storage.getMilestonesByCareerPath(careerPath.id);
    const allSteps: Record<string, MilestoneStep[]> = {};
    for (const m of pathMilestones) {
      allSteps[m.id] = await storage.getStepsByMilestone(m.id);
    }

    const journalEntryList = await storage.getJournalEntriesByEmployee(employee.id);
    const assessments = await storage.getSkillAssessmentsByEmployee(employee.id);

    const completedMilestones = pathMilestones.filter(m => m.status === "completed").length;
    const totalSteps = Object.values(allSteps).flat();
    const completedSteps = totalSteps.filter(s => s.isCompleted).length;
    const journalCount = journalEntryList.length;

    const badges = computeBadges(completedMilestones, careerPath.currentStreak, careerPath.longestStreak, journalCount, assessments.length, pathMilestones, completedSteps);

    res.json({
      careerPath,
      milestones: pathMilestones.map(m => ({
        ...m,
        steps: allSteps[m.id] || [],
      })),
      journalEntries: journalEntryList,
      skillAssessments: assessments,
      badges,
      stats: {
        totalMilestones: pathMilestones.length,
        completedMilestones,
        totalSteps: totalSteps.length,
        completedSteps,
        journalCount,
        assessmentCount: assessments.length,
      },
    });
  });

  app.post("/api/career/milestones", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }

    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      phase: z.enum(["foundation", "growing", "leading", "mastering"]),
      position: z.number().optional(),
      xpReward: z.number().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const existingMilestones = await storage.getMilestonesByCareerPath(careerPath.id);
    const position = parsed.data.position ?? existingMilestones.filter(m => m.phase === parsed.data.phase).length;

    const milestone = await storage.createMilestone({
      careerPathId: careerPath.id,
      phase: parsed.data.phase,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "active",
      position,
      xpReward: parsed.data.xpReward ?? 50,
    });

    res.status(201).json(milestone);
  });

  app.patch("/api/career/milestones/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const milestone = await storage.getMilestoneById(req.params.id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath || milestone.careerPathId !== careerPath.id) {
      return res.status(403).json({ error: "Not your milestone" });
    }

    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["locked", "active", "completed"]).optional(),
      position: z.number().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const updateData: Record<string, unknown> = { ...parsed.data };
    let xpAwarded = 0;
    if (parsed.data.status === "completed" && milestone.status !== "completed") {
      updateData.completedAt = new Date();
      const xpResult = await awardXp({
        employee,
        category: "milestone_complete",
        targetId: milestone.id,
        customXp: milestone.xpReward,
      });
      xpAwarded = xpResult.xpAwarded;
      await checkAndAwardVarietyBonus(employee);
      await checkAndAwardStreakBonus(employee);
    }

    const updated = await storage.updateMilestone(milestone.id, updateData as any);
    res.json({ ...updated, xpAwarded });
  });

  app.delete("/api/career/milestones/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const milestone = await storage.getMilestoneById(req.params.id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath || milestone.careerPathId !== careerPath.id) {
      return res.status(403).json({ error: "Not your milestone" });
    }

    await storage.deleteMilestone(milestone.id);
    res.status(204).send();
  });

  app.post("/api/career/milestones/:id/steps", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const milestone = await storage.getMilestoneById(req.params.id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath || milestone.careerPathId !== careerPath.id) {
      return res.status(403).json({ error: "Not your milestone" });
    }

    const schema = z.object({ title: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const step = await storage.createMilestoneStep({
      milestoneId: milestone.id,
      title: parsed.data.title,
    });

    res.status(201).json(step);
  });

  app.patch("/api/career/steps/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const step = await storage.getMilestoneStepById(req.params.id);
    if (!step) return res.status(404).json({ error: "Step not found" });

    const milestone = await storage.getMilestoneById(step.milestoneId);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath || milestone.careerPathId !== careerPath.id) {
      return res.status(403).json({ error: "Not your step" });
    }

    const schema = z.object({
      title: z.string().optional(),
      isCompleted: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const updateData: Record<string, unknown> = { ...parsed.data };
    let xpAwarded = 0;
    if (parsed.data.isCompleted === true && !step.isCompleted) {
      updateData.completedAt = new Date();
      const xpResult = await awardXp({
        employee,
        category: "milestone_step",
        targetId: step.id,
      });
      xpAwarded = xpResult.xpAwarded;
      await checkAndAwardVarietyBonus(employee);
      await checkAndAwardStreakBonus(employee);
    }

    const updated = await storage.updateMilestoneStep(req.params.id, updateData as any);
    res.json({ ...updated, xpAwarded });
  });

  app.delete("/api/career/steps/:id", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const step = await storage.getMilestoneStepById(req.params.id);
    if (!step) return res.status(404).json({ error: "Step not found" });

    const milestone = await storage.getMilestoneById(step.milestoneId);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath || milestone.careerPathId !== careerPath.id) {
      return res.status(403).json({ error: "Not your step" });
    }

    await storage.deleteMilestoneStep(req.params.id);
    res.status(204).send();
  });

  app.get("/api/career/journal", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    const entries = await storage.getJournalEntriesByEmployee(employee.id);
    res.json({ entries });
  });

  app.post("/api/career/journal", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      whatLearned: z.string().optional(),
      whatAccomplished: z.string().optional(),
      whatsNext: z.string().optional(),
      milestoneId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    if (!parsed.data.whatLearned && !parsed.data.whatAccomplished && !parsed.data.whatsNext) {
      return res.status(400).json({ error: "Please fill in at least one field" });
    }

    const entry = await storage.createJournalEntry({
      employeeId: employee.id,
      companyId: employee.companyId,
      milestoneId: parsed.data.milestoneId,
      whatLearned: parsed.data.whatLearned,
      whatAccomplished: parsed.data.whatAccomplished,
      whatsNext: parsed.data.whatsNext,
    });

    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (careerPath) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = careerPath.lastJournalDate ? new Date(careerPath.lastJournalDate) : null;
      let newStreak = careerPath.currentStreak;

      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(careerPath.longestStreak, newStreak);
      await storage.updateCareerPath(careerPath.id, {
        currentStreak: newStreak,
        longestStreak,
        lastJournalDate: new Date(),
      });
    }

    const xpResult = await awardXp({
      employee,
      category: "journal",
      targetId: entry.id,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...entry, xpAwarded: xpResult.xpAwarded });
  });

  app.get("/api/career/skills", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    const assessments = await storage.getSkillAssessmentsByEmployee(employee.id);
    res.json({ assessments });
  });

  app.post("/api/career/skills", async (req: AuthenticatedRequest, res) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      dimensions: z.array(z.object({
        name: z.string(),
        score: z.number().min(1).max(10),
      })).min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const assessment = await storage.createSkillAssessment({
      employeeId: employee.id,
      companyId: employee.companyId,
      dimensions: parsed.data.dimensions,
    });

    const xpResult = await awardXp({
      employee,
      category: "skill_assessment",
      targetId: assessment.id,
    });

    await checkAndAwardVarietyBonus(employee);
    await checkAndAwardStreakBonus(employee);

    res.status(201).json({ ...assessment, xpAwarded: xpResult.xpAwarded });
  });

  // ===== TIME OFF =====

  app.get("/api/time-off/requests", async (req: AuthenticatedRequest, res: Response) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    const requests = await storage.getTimeOffRequestsByEmployee(employee.id);
    res.json(requests);
  });

  app.get("/api/time-off/balance", async (req: AuthenticatedRequest, res: Response) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    const year = new Date().getFullYear();
    let balance = await storage.getTimeOffBalance(employee.id, year);
    if (!balance) {
      balance = await storage.createTimeOffBalance({
        employeeId: employee.id,
        companyId: employee.companyId,
        year,
        vacationTotal: 15,
        vacationUsed: 0,
        sickTotal: 10,
        sickUsed: 0,
        personalTotal: 3,
        personalUsed: 0,
      });
    }
    res.json(balance);
  });

  app.get("/api/time-off/pending", async (req: AuthenticatedRequest, res: Response) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;
    if (employee.role !== "admin" && employee.role !== "manager") {
      return res.status(403).json({ error: "Not authorized to view pending requests" });
    }
    const pending = await storage.getPendingTimeOffRequestsForReviewer(employee.companyId);
    const allEmployees = await storage.getEmployeesByCompany(employee.companyId);
    const enriched = pending.map(r => {
      const emp = allEmployees.find(e => e.id === r.employeeId);
      return { ...r, employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown", employeeTitle: emp?.title || "" };
    });
    res.json(enriched);
  });

  app.post("/api/time-off/requests", async (req: AuthenticatedRequest, res: Response) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    const schema = z.object({
      type: z.enum(["vacation", "sick", "half_day", "personal"]),
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request data", details: parsed.error.errors });
    }

    const { type, startDate, endDate, reason } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    if (start > end) {
      return res.status(400).json({ error: "Start date must be before or equal to end date" });
    }

    const totalDays = type === "half_day" ? 0.5 : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const request = await storage.createTimeOffRequest({
      employeeId: employee.id,
      companyId: employee.companyId,
      type,
      startDate: start,
      endDate: end,
      reason: reason || null,
      status: "pending",
      reviewedBy: null,
      reviewNote: null,
      reviewedAt: null,
      totalDays,
    });

    res.status(201).json(request);
  });

  app.patch("/api/time-off/requests/:id", async (req: AuthenticatedRequest, res: Response) => {
    const employee = await ensureEmployee(req, res);
    if (!employee) return;

    if (employee.role !== "admin" && employee.role !== "manager") {
      return res.status(403).json({ error: "Not authorized to review requests" });
    }

    const schema = z.object({
      status: z.enum(["approved", "declined"]),
      reviewNote: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data" });
    }

    const request = await storage.getTimeOffRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (request.companyId !== employee.companyId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already reviewed" });
    }

    const updated = await storage.updateTimeOffRequest(request.id, {
      status: parsed.data.status,
      reviewedBy: employee.id,
      reviewNote: parsed.data.reviewNote || null,
      reviewedAt: new Date(),
    });

    if (parsed.data.status === "approved") {
      const year = new Date(request.startDate).getFullYear();
      let balance = await storage.getTimeOffBalance(request.employeeId, year);
      if (!balance) {
        balance = await storage.createTimeOffBalance({
          employeeId: request.employeeId,
          companyId: request.companyId,
          year,
          vacationTotal: 15, vacationUsed: 0,
          sickTotal: 10, sickUsed: 0,
          personalTotal: 3, personalUsed: 0,
        });
      }

      const balanceType = request.type === "half_day" ? "personal" : request.type;
      const usedField = `${balanceType}Used` as "vacationUsed" | "sickUsed" | "personalUsed";
      const currentUsed = balance[usedField] || 0;
      await storage.updateTimeOffBalance(balance.id, {
        [usedField]: currentUsed + request.totalDays,
      });
    }

    res.json(updated);
  });

  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      const { audio } = req.body;
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Missing audio data" });
      }
      const audioBuffer = Buffer.from(audio, "base64");
      const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
      const text = await speechToText(buffer, format);
      res.json({ text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  app.post("/api/coach", async (req: Request, res: Response) => {
    try {
      const { messages, context } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages required" });
      }

      const employee = await storage.getDemoEmployee();
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const employeeGoals = await storage.getGoalsByEmployee(employee.id);
      const activeGoals = employeeGoals.filter(g => g.status !== "completed");

      let contextInfo = `You are an AI career coach for ${employee.firstName} ${employee.lastName}, who works as ${employee.title || "a team member"}.`;
      contextInfo += `\n\nTheir current goals:\n${activeGoals.map(g => `- ${g.title} (${g.category}, ${g.progress}% done)`).join("\n") || "No active goals yet."}`;

      if (context?.page) {
        const pageContextMap: Record<string, string> = {
          goals: "The user is on the Goals page. Help them set meaningful goals, refine existing ones, or suggest SMART goals based on their role.",
          career: "The user is on the Career Growth page. Help them plan career development, suggest milestones, and discuss growth strategies.",
          feedback: "The user is on the Feedback page. Help them craft constructive feedback, prepare for giving/receiving feedback.",
          snaps: "The user is on the Recognition page. Help them write meaningful recognition messages for teammates.",
          home: "The user is on the Dashboard. Give them an overview of their progress and suggest next actions.",
          directory: "The user is browsing the Team Directory. Help them understand team dynamics and collaboration opportunities.",
        };
        contextInfo += `\n\n${pageContextMap[context.page] || "Help the user with their professional development."}`;
      }

      const systemPrompt = `${contextInfo}

You are a supportive, knowledgeable career coach. Keep responses concise (2-4 sentences unless asked for more detail). Be specific and actionable. Use a warm but professional tone. When suggesting goals, make them SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Never use emoji.`;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        stream: true,
        max_tokens: 500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Coach error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Coach unavailable" });
      } else {
        res.end();
      }
    }
  });

  return httpServer;
}

function getPhaseForXp(xp: number): "foundation" | "growing" | "leading" | "mastering" {
  if (xp >= 1000) return "mastering";
  if (xp >= 500) return "leading";
  if (xp >= 200) return "growing";
  return "foundation";
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

function computeBadges(
  completedMilestones: number,
  currentStreak: number,
  longestStreak: number,
  journalCount: number,
  assessmentCount: number,
  allMilestones: Milestone[],
  completedSteps: number,
): Badge[] {
  return [
    {
      id: "first_milestone",
      name: "First Steps",
      description: "Complete your first milestone",
      icon: "flag",
      earned: completedMilestones >= 1,
    },
    {
      id: "trailblazer",
      name: "Trailblazer",
      description: "Complete 5 milestones",
      icon: "map",
      earned: completedMilestones >= 5,
    },
    {
      id: "summit_seeker",
      name: "Summit Seeker",
      description: "Complete 10 milestones",
      icon: "mountain",
      earned: completedMilestones >= 10,
    },
    {
      id: "reflection_starter",
      name: "Reflection Starter",
      description: "Write your first journal entry",
      icon: "book-open",
      earned: journalCount >= 1,
    },
    {
      id: "weekly_writer",
      name: "Weekly Writer",
      description: "Maintain a 7-day journal streak",
      icon: "flame",
      earned: longestStreak >= 7,
    },
    {
      id: "month_of_growth",
      name: "Month of Growth",
      description: "Maintain a 30-day journal streak",
      icon: "crown",
      earned: longestStreak >= 30,
    },
    {
      id: "step_master",
      name: "Step Master",
      description: "Complete 25 milestone steps",
      icon: "check-check",
      earned: completedSteps >= 25,
    },
    {
      id: "skill_explorer",
      name: "Skill Explorer",
      description: "Complete your first skill assessment",
      icon: "radar",
      earned: assessmentCount >= 1,
    },
    {
      id: "consistent_grower",
      name: "Consistent Grower",
      description: "Complete 3 skill assessments over time",
      icon: "trending-up",
      earned: assessmentCount >= 3,
    },
  ];
}
