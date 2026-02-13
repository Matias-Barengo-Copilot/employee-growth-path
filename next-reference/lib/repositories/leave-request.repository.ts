import { db } from "@/db/client";
import {
  leaveRequests,
  leaveRequestProjects,
  leaveRequestDays,
  leaveApprovals,
  employees,
  companies,
} from "@/db/schema";
import { eq, and, desc, inArray, count, gte, lte, or, not, sql } from "drizzle-orm";
import { SubmitLeaveRequestInput, SaveDraftInput, GetLeaveRequestsQuery } from "@/lib/types";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import { calculateWorkingDays } from "@/lib/types/leave-calendar";

export class LeaveRequestRepository {
  async create(data: SubmitLeaveRequestInput & { employeeId: string }) {
    // Calculate fields from leaveDays
    let fromDate: string | undefined;
    let toDate: string | undefined;
    let totalDays: number | undefined;
    let totalWorkingDays: number | undefined;
    let totalHalfDays: number | undefined;
    let leaveType: string | undefined;

    if (data.leaveDays && data.leaveDays.length > 0) {
      // Sort dates to get fromDate and toDate
      const sortedDates = data.leaveDays.map(d => d.date).sort();
      fromDate = sortedDates[0];
      toDate = sortedDates[sortedDates.length - 1];
      
      // Calculate totals
      const workingDays = calculateWorkingDays(data.leaveDays);
      const halfDaysCount = data.leaveDays.filter(d => d.isHalfDay).length;
      
      // totalWorkingDays must be integer (round to nearest)
      totalWorkingDays = Math.round(workingDays);
      // totalHalfDays is numeric(5,2) - calculate as decimal
      totalHalfDays = halfDaysCount * 0.5;
      totalDays = Math.ceil(workingDays);
      
      // Use first leave type as primary
      leaveType = data.leaveDays[0].leaveType;
    }

    const [leaveRequest] = await db
      .insert(leaveRequests)
      .values({
        employeeId: data.employeeId,
        leaveType: (leaveType as "vacation" | "personal_sick" | "unpaid" | "other") || "vacation",
        fromDate: fromDate || new Date().toISOString().split('T')[0],
        toDate: toDate || new Date().toISOString().split('T')[0],
        totalDays: totalDays || 0,
        totalWorkingDays: totalWorkingDays ?? null,
        totalHalfDays: totalHalfDays !== undefined && totalHalfDays > 0 ? totalHalfDays.toString() : null,
        reason: data.reason ?? null,
        overallStatus: "pending",
      })
      .returning();

    // Insert individual leave days
    if (data.leaveDays && data.leaveDays.length > 0) {
      await db.insert(leaveRequestDays).values(
        data.leaveDays.map((day) => ({
          leaveRequestId: leaveRequest.id,
          date: day.date,
          leaveType: day.leaveType,
          isHalfDay: day.isHalfDay,
          halfDayPeriod: day.halfDayPeriod || null,
        }))
      );
    }

    // Insert project associations (simplified model)
    if (data.projects.length > 0) {
      await db.insert(leaveRequestProjects).values(
        data.projects.map((project) => ({
          leaveRequestId: leaveRequest.id,
          projectName: project.projectName,
          pmId: project.pmId || null,
          techLeadId: project.techLeadId || null,
        }))
      );
    }

    return leaveRequest;
  }

  async findById(id: string) {
    const [request] = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        totalWorkingDays: leaveRequests.totalWorkingDays,
        totalHalfDays: leaveRequests.totalHalfDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
        employee: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          role: employees.role,
          roleType: employees.roleType,
          companyId: employees.companyId,
          country: employees.country,
        },
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(eq(leaveRequests.id, id), eq(employees.isActive, true)))
      .limit(1);

    if (!request) {
      return null;
    }

    // Get projects (simplified model - text-based)
    const requestProjects = await db
      .select({
        id: leaveRequestProjects.id,
        projectName: leaveRequestProjects.projectName,
        pmId: leaveRequestProjects.pmId,
        techLeadId: leaveRequestProjects.techLeadId,
      })
      .from(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, id));

    // Get PM and Tech Lead details if they exist
    const pmIds = requestProjects.map(p => p.pmId).filter(Boolean) as string[];
    const techLeadIds = requestProjects.map(p => p.techLeadId).filter(Boolean) as string[];
    const allEmployeeIds = [...new Set([...pmIds, ...techLeadIds])];

    let employeeDetails: Record<string, { id: string; name: string; email: string }> = {};
    if (allEmployeeIds.length > 0) {
      const employeesData = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(and(inArray(employees.id, allEmployeeIds), eq(employees.isActive, true)));

      employeeDetails = employeesData.reduce((acc, emp) => {
        acc[emp.id] = emp;
        return acc;
      }, {} as Record<string, { id: string; name: string; email: string }>);
    }

    // Enrich projects with PM and Tech Lead details
    const enrichedProjects = requestProjects.map(project => ({
      ...project,
      pm: project.pmId ? employeeDetails[project.pmId] || null : null,
      techLead: project.techLeadId ? employeeDetails[project.techLeadId] || null : null,
    }));

    // Get approvals (only from active employees)
    const approvals = await db
      .select({
        id: leaveApprovals.id,
        approverId: leaveApprovals.approverId,
        approverRole: leaveApprovals.approverRole,
        status: leaveApprovals.status,
        comments: leaveApprovals.comments,
        decidedAt: leaveApprovals.decidedAt,
        createdAt: leaveApprovals.createdAt,
        approver: {
          id: employees.id,
          name: employees.name,
          role: employees.role,
        },
      })
      .from(leaveApprovals)
      .leftJoin(employees, eq(leaveApprovals.approverId, employees.id))
      .where(and(eq(leaveApprovals.leaveRequestId, id), eq(employees.isActive, true)));

    // Get individual leave days
    const days = await db
      .select({
        id: leaveRequestDays.id,
        date: leaveRequestDays.date,
        leaveType: leaveRequestDays.leaveType,
        isHalfDay: leaveRequestDays.isHalfDay,
        halfDayPeriod: leaveRequestDays.halfDayPeriod,
        createdAt: leaveRequestDays.createdAt,
      })
      .from(leaveRequestDays)
      .where(eq(leaveRequestDays.leaveRequestId, id))
      .orderBy(leaveRequestDays.date);

    return {
      ...request,
      projects: enrichedProjects,
      approvals,
      leaveDays: days,
    };
  }

  async countByEmployeeId(employeeId: string, query?: GetLeaveRequestsQuery): Promise<number> {
    const conditions = [eq(leaveRequests.employeeId, employeeId)];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    const [result] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .where(and(...conditions));

    return result.count;
  }

  async findByEmployeeId(employeeId: string, query?: GetLeaveRequestsQuery) {
    const conditions = [eq(leaveRequests.employeeId, employeeId)];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
      })
      .from(leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit > 0 ? limit : 1000)
      .offset(offset);

    return await queryBuilder;
  }

  async countByCompanyId(companyId: string, query?: GetLeaveRequestsQuery): Promise<number> {
    const conditions = [
      eq(employees.companyId, companyId),
      eq(employees.isActive, true), // Only show requests from active employees
    ];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    // Exclude all drafts - drafts are only visible to their creator
    // This method is used by HR viewing company requests, so they should never see drafts
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const  countQuery = db
      .select({ count: count() })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id));


    const [result] = await countQuery.where(and(...conditions));

    return result.count;
  }

  /**
   * Find leave requests where a supervisor is PM or Tech Lead for the projects
   * This is used for supervisors to see only requests they should approve
   */
  async findBySupervisorProjects(supervisorId: string, query?: GetLeaveRequestsQuery) {
    const conditions = [];

    // Filter by requests where supervisor is PM or Tech Lead
    const projectConditions = or(
      eq(leaveRequestProjects.pmId, supervisorId),
      eq(leaveRequestProjects.techLeadId, supervisorId)
    );

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;

    // Get distinct leave request IDs where supervisor is PM or Tech Lead
    const projectRequestIds = await db
      .select({ leaveRequestId: leaveRequestProjects.leaveRequestId })
      .from(leaveRequestProjects)
      .where(projectConditions);
    
    // Get unique request IDs
    const requestIds = [...new Set(projectRequestIds.map(p => p.leaveRequestId))];

    if (requestIds.length === 0) {
      return [];
    }

    // Exclude all drafts - supervisors should never see drafts
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const allConditions = [
      inArray(leaveRequests.id, requestIds),
      ...conditions
    ];

    // Filter by active employees only
    allConditions.push(eq(employees.isActive, true));

    const queryBuilder = db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
        employee: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          role: employees.role,
          roleType: employees.roleType,
          companyId: employees.companyId,
          country: employees.country,
        },
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(...allConditions))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit > 0 ? limit : 1000)
      .offset(offset);

    return await queryBuilder;
  }

  async countBySupervisorProjects(supervisorId: string, query?: GetLeaveRequestsQuery): Promise<number> {
    // Filter by requests where supervisor is PM or Tech Lead
    const projectConditions = or(
      eq(leaveRequestProjects.pmId, supervisorId),
      eq(leaveRequestProjects.techLeadId, supervisorId)
    );

    const conditions = [];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    // Get distinct leave request IDs where supervisor is PM or Tech Lead
    const projectRequestIds = await db
      .select({ leaveRequestId: leaveRequestProjects.leaveRequestId })
      .from(leaveRequestProjects)
      .where(projectConditions);
    
    // Get unique request IDs
    const requestIds = [...new Set(projectRequestIds.map(p => p.leaveRequestId))];

    if (requestIds.length === 0) {
      return 0;
    }

    // Exclude all drafts - supervisors should never see drafts
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const allConditions = [
      inArray(leaveRequests.id, requestIds),
      ...conditions
    ];

    // Filter by active employees only
    const [result] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(...allConditions, eq(employees.isActive, true)));

    return result.count;
  }

  async findByCompanyId(companyId: string, query?: GetLeaveRequestsQuery) {
    const conditions = [
      eq(employees.companyId, companyId),
      eq(employees.isActive, true), // Only show requests from active employees
    ];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    // Exclude all drafts - drafts are only visible to their creator
    // This method is used by HR viewing company requests, so they should never see drafts
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
        employee: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          role: employees.role,
          roleType: employees.roleType,
          companyId: employees.companyId,
          country: employees.country,
        },
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id));


    return await queryBuilder
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit > 0 ? limit : 1000)
      .offset(offset);
  }

  async countByOrganizationId(organizationId: string, query?: GetLeaveRequestsQuery): Promise<number> {
    const conditions = [
      eq(companies.organizationId, organizationId),
      eq(employees.isActive, true), // Only show requests from active employees
    ];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.companyId) {
      conditions.push(eq(companies.id, query.companyId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    // Exclude all drafts - drafts are only visible to their creator
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const [result] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(...conditions));

    return result.count;
  }

  async findByOrganizationId(organizationId: string, query?: GetLeaveRequestsQuery) {
    const conditions = [
      eq(companies.organizationId, organizationId),
      eq(employees.isActive, true), // Only show requests from active employees
    ];

    if (query?.status) {
      conditions.push(eq(leaveRequests.overallStatus, query.status));
    }

    if (query?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, query.employeeId));
    }

    if (query?.companyId) {
      conditions.push(eq(companies.id, query.companyId));
    }

    if (query?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, query.leaveType));
    }

    if (query?.fromDate) {
      conditions.push(gte(leaveRequests.fromDate, query.fromDate));
    }

    if (query?.toDate) {
      conditions.push(lte(leaveRequests.toDate, query.toDate));
    }

    // Exclude all drafts - drafts are only visible to their creator
    conditions.push(not(eq(leaveRequests.overallStatus, "draft")));

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
        employee: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          role: employees.role,
          roleType: employees.roleType,
          companyId: employees.companyId,
          country: employees.country,
        },
        company: {
          id: companies.id,
          name: companies.name,
        },
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit > 0 ? limit : 1000)
      .offset(offset);

    return await queryBuilder;
  }

  async updateStatus(id: string, status: "pending" | "approved" | "rejected" | "cancelled") {
    const [updated] = await db
      .update(leaveRequests)
      .set({
        overallStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Leave request not found");
    }

    return updated;
  }

  async withdraw(id: string, employeeId: string) {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.id, id), eq(leaveRequests.employeeId, employeeId)))
      .limit(1);

    if (!request) {
      throw new NotFoundError("Leave request not found");
    }

    if (request.overallStatus === "approved") {
      throw new Error("Cannot withdraw an approved leave request");
    }

    return this.updateStatus(id, "cancelled");
  }

  async saveDraft(data: SaveDraftInput & { employeeId: string }, draftId?: string) {
    // Calculate fields from leaveDays
    let fromDate: string | undefined;
    let toDate: string | undefined;
    let totalDays: number | undefined;
    let totalWorkingDays: number | undefined;
    let totalHalfDays: number | undefined;
    let leaveType: string | undefined;

    if (data.leaveDays && data.leaveDays.length > 0) {
      // Sort dates to get fromDate and toDate
      const sortedDates = data.leaveDays.map(d => d.date).sort();
      fromDate = sortedDates[0];
      toDate = sortedDates[sortedDates.length - 1];
      
      // Calculate totals
      const workingDays = calculateWorkingDays(data.leaveDays);
      const halfDaysCount = data.leaveDays.filter(d => d.isHalfDay).length;
      
      // totalWorkingDays must be integer (round to nearest)
      totalWorkingDays = Math.round(workingDays);
      // totalHalfDays is numeric(5,2) - calculate as decimal
      totalHalfDays = halfDaysCount * 0.5;
      totalDays = Math.ceil(workingDays);
      
      // Use first leave type as primary
      leaveType = data.leaveDays[0].leaveType;
    }

    // If draftId is provided, update existing draft
    if (draftId) {
      // Delete existing project associations
      await db
        .delete(leaveRequestProjects)
        .where(eq(leaveRequestProjects.leaveRequestId, draftId));

      // Delete existing leave days
      await db
        .delete(leaveRequestDays)
        .where(eq(leaveRequestDays.leaveRequestId, draftId));

      // Update draft
      const updateData: {
        leaveType?: "vacation" | "personal_sick" | "unpaid" | "other";
        fromDate?: string;
        toDate?: string;
        totalDays?: number;
        totalWorkingDays?: number | null;
        totalHalfDays?: string | null;
        reason?: string | null;
        overallStatus: "draft";
        updatedAt: Date;
      } = {
        overallStatus: "draft",
        updatedAt: new Date(),
      };

      if (leaveType) updateData.leaveType = leaveType as "vacation" | "personal_sick" | "unpaid" | "other";
      if (fromDate) updateData.fromDate = fromDate;
      if (toDate) updateData.toDate = toDate;
      if (totalDays !== undefined) updateData.totalDays = totalDays || 0;
      if (totalWorkingDays !== undefined) updateData.totalWorkingDays = totalWorkingDays;
      if (totalHalfDays !== undefined && totalHalfDays > 0) updateData.totalHalfDays = totalHalfDays.toString();
      if (data.reason !== undefined) updateData.reason = data.reason;

      const [updated] = await db
        .update(leaveRequests)
        .set(updateData)
        .where(eq(leaveRequests.id, draftId))
        .returning();

      // Insert individual leave days if provided
      if (data.leaveDays && data.leaveDays.length > 0) {
        await db.insert(leaveRequestDays).values(
          data.leaveDays.map((day) => ({
            leaveRequestId: draftId,
            date: day.date,
            leaveType: day.leaveType,
            isHalfDay: day.isHalfDay,
            halfDayPeriod: day.halfDayPeriod || null,
          }))
        );
      }

      // Insert project associations if provided (simplified model)
      if (data.projects && data.projects.length > 0) {
        await db.insert(leaveRequestProjects).values(
          data.projects.map((project) => ({
            leaveRequestId: draftId,
            projectName: project.projectName,
            pmId: project.pmId || null,
            techLeadId: project.techLeadId || null,
          }))
        );
      }

      return updated;
    }

    // Create new draft
    const [draft] = await db
      .insert(leaveRequests)
      .values({
        employeeId: data.employeeId,
        leaveType: (leaveType as "vacation" | "personal_sick" | "unpaid" | "other") || "vacation",
        fromDate: fromDate || new Date().toISOString().split('T')[0],
        toDate: toDate || new Date().toISOString().split('T')[0],
        totalDays: totalDays || 0,
        totalWorkingDays: totalWorkingDays ?? null,
        totalHalfDays: totalHalfDays !== undefined && totalHalfDays > 0 ? totalHalfDays.toString() : null,
        reason: data.reason ?? null,
        overallStatus: "draft",
      })
      .returning();

    // Insert individual leave days if provided
    if (data.leaveDays && data.leaveDays.length > 0) {
      await db.insert(leaveRequestDays).values(
        data.leaveDays.map((day) => ({
          leaveRequestId: draft.id,
          date: day.date,
          leaveType: day.leaveType,
          isHalfDay: day.isHalfDay,
          halfDayPeriod: day.halfDayPeriod || null,
        }))
      );
    }

    // Insert project associations if provided (simplified model)
    if (data.projects && data.projects.length > 0) {
      await db.insert(leaveRequestProjects).values(
        data.projects.map((project) => ({
          leaveRequestId: draft.id,
          projectName: project.projectName,
          pmId: project.pmId || null,
          techLeadId: project.techLeadId || null,
        }))
      );
    }

    return draft;
  }

  async findByEmployeeIdAndStatus(employeeId: string, status: "draft") {
    return db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        overallStatus: leaveRequests.overallStatus,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.overallStatus, status)
        )
      )
      .orderBy(desc(leaveRequests.updatedAt));
  }

  async deleteDraft(draftId: string, employeeId: string) {
    // First verify the draft exists and belongs to the employee
    const [draft] = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        overallStatus: leaveRequests.overallStatus,
      })
      .from(leaveRequests)
      .where(eq(leaveRequests.id, draftId))
      .limit(1);

    if (!draft) {
      throw new NotFoundError("Draft not found");
    }

    if (draft.employeeId !== employeeId) {
      throw new ForbiddenError("You can only delete your own drafts");
    }

    if (draft.overallStatus !== "draft") {
      throw new ValidationError("Only drafts can be deleted");
    }

    // Delete related records first (foreign key constraints)
    await db
      .delete(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, draftId));

    await db
      .delete(leaveRequestDays)
      .where(eq(leaveRequestDays.leaveRequestId, draftId));

    await db
      .delete(leaveApprovals)
      .where(eq(leaveApprovals.leaveRequestId, draftId));

    // Finally delete the draft itself
    await db
      .delete(leaveRequests)
      .where(eq(leaveRequests.id, draftId));

    return { success: true };
  }

  /**
   * Approved leave days by employee and leave type for a company in a given year.
   * Used for "Leaves total" page (current year, approved only).
   */
  async getApprovedLeaveDaysByEmployeeAndType(
    companyId: string,
    year: number
  ): Promise<Array<{ employeeId: string; leaveType: string; days: number }>> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const rows = await db
      .select({
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequestDays.leaveType,
        days: sql<number>`sum(case when ${leaveRequestDays.isHalfDay} then 0.5 else 1 end)::double precision`,
      })
      .from(leaveRequestDays)
      .innerJoin(leaveRequests, eq(leaveRequestDays.leaveRequestId, leaveRequests.id))
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(leaveRequests.overallStatus, "approved"),
          gte(leaveRequestDays.date, startDate),
          lte(leaveRequestDays.date, endDate),
          eq(employees.isActive, true)
        )
      )
      .groupBy(leaveRequests.employeeId, leaveRequestDays.leaveType);
    return rows.map((r) => ({
      employeeId: r.employeeId,
      leaveType: r.leaveType,
      days: Number(r.days) || 0,
    }));
  }
}

