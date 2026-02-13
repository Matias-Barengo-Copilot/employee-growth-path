import { LeaveRequestRepository } from "../repositories/leave-request.repository";
import { LeaveApprovalRepository } from "../repositories/leave-approval.repository";
import { EmployeeRepository } from "../repositories/employee.repository";
import {
  SubmitLeaveRequestInput,
  SaveDraftInput,
  ApproveLeaveRequestInput,
  WithdrawLeaveRequestInput,
  GetLeaveRequestsQuery,
  PaginatedResponse,
  PaginationMetadata,
} from "../types";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";
import { AuthenticatedUser } from "../middleware/auth";
import { db } from "@/db/client";
import { companies, leaveRequestProjects, employees, leaveRequestDays } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { parseLocalDate, transformLeaveRequestDates } from "@/lib/utils/date";
import { getNotificationService } from "../notifications/service";
import { getLeaveRequestRecipients } from "../notifications/helpers/get-recipients";
import { NotificationRecipient } from "../notifications/types";
import { LeaveCalendarDay } from "../types/leave-calendar";
import { LeaveRequestListItem } from "@/components/shared/leave-request/LeaveRequestsList";
import { 
  LeaveRequestCreatedNotificationData,
  LeaveRequestApprovedNotificationData,
  LeaveRequestRejectedNotificationData,
  LeaveAlertNotificationData,
} from "../notifications/types";
import { calculateVacationDaysUsed, roundVacationDays } from "../utils/vacation-days";
import { calculateLeaveDaysAvailed, roundLeaveDays, LeaveDaysAvailed } from "../utils/leave-summary";
import { canViewAllLeaveRequests } from "../utils/view-all-leave-requests";
import { logger } from "../utils/logger";

export class LeaveRequestService {
  private leaveRequestRepository: LeaveRequestRepository;
  private leaveApprovalRepository: LeaveApprovalRepository;
  private employeeRepository: EmployeeRepository;

  constructor() {
    this.leaveRequestRepository = new LeaveRequestRepository();
    this.leaveApprovalRepository = new LeaveApprovalRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  async submitLeaveRequest(data: SubmitLeaveRequestInput, user: AuthenticatedUser) {
    // Validate leaveDays
    if (!data.leaveDays || data.leaveDays.length === 0) {
      throw new ValidationError("At least one leave day is required");
    }

    // Validate that all dates are not weekends (past dates are now allowed)
    const weekendDates: string[] = [];

    for (const day of data.leaveDays) {
      // Use parseLocalDate to avoid timezone issues
      const dayDate = parseLocalDate(day.date);
      dayDate.setHours(0, 0, 0, 0);

      // Check if weekend
      const dayOfWeek = dayDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        weekendDates.push(`${day.date} (${dayNames[dayOfWeek]})`);
      }
    }

    if (weekendDates.length > 0) {
      throw new ValidationError(
        `Weekends are not allowed for leave requests. Invalid dates: ${weekendDates.join(', ')}`
      );
    }

    // Get employee info
    const employee = await this.employeeRepository.findById(user.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    if (!employee.companyId) {
      throw new ValidationError("Employee must be assigned to a company");
    }

    // Note: No validation for leave days limit - users can use as many days as needed
    // The system only tracks used vacation days for reference

    // Create leave request
    const leaveRequest = await this.leaveRequestRepository.create({
      ...data,
      employeeId: user.employeeId,
    });

    // Create approval records for supervisors and HR
    // Use employee.companyId directly (already validated above)
    await this.leaveApprovalRepository.createApprovalsForLeaveRequest(
      leaveRequest.id,
      employee.companyId
    );

    // Get the full leave request with all details for notifications
    const fullLeaveRequest = await this.leaveRequestRepository.findById(leaveRequest.id);
    if (!fullLeaveRequest) {
      throw new NotFoundError("Leave request not found after creation");
    }

    // Send notifications to PMs, Tech Leads, and HR
    // We do this asynchronously so it doesn't block the request response
    this.sendLeaveRequestNotifications(fullLeaveRequest, employee.companyId).catch(
      (error) => {
        // Log error but don't fail the request if notifications fail
        logger.error("Failed to send leave request notifications:", error);
      }
    );

    return fullLeaveRequest;
  }

  /**
   * Send notifications for a newly created leave request
   * This is called asynchronously to avoid blocking the main request
   */
  private async sendLeaveRequestNotifications(
    leaveRequest: Awaited<ReturnType<LeaveRequestRepository["findById"]>>,
    companyId: string
  ): Promise<void> {
    if (!leaveRequest || !leaveRequest.employee) return;

    // Get notification recipients (PMs, Tech Leads, HR)
    const recipients = await getLeaveRequestRecipients(
      leaveRequest.id,
      companyId
    );

    if (recipients.length === 0) {
      return;
    }

    // Get employee country from leaveRequest
    const employeeCountry = leaveRequest.employee.country || "Unknown";

    // Prepare notification payload (simplified project model)
    // Calculate date range from leaveDays for notifications
    const leaveDays = leaveRequest.leaveDays || [];
    const sortedDates = leaveDays.map(d => d.date).sort();
    const fromDate = sortedDates[0] || leaveRequest.fromDate;
    const toDate = sortedDates[sortedDates.length - 1] || leaveRequest.toDate;

    const notificationData: LeaveRequestCreatedNotificationData = {
      leaveRequestId: leaveRequest.id,
      employee: {
        id: leaveRequest.employee.id,
        name: leaveRequest.employee.name,
        email: leaveRequest.employee.email,
        country: employeeCountry,
      },
      leaveType: leaveRequest.leaveType as "vacation" | "personal_sick" | "unpaid" | "other",
      fromDate: fromDate,
      toDate: toDate,
      totalDays: ('totalWorkingDays' in leaveRequest && leaveRequest.totalWorkingDays) || leaveRequest.totalDays,
      reason: leaveRequest.reason || undefined,
      projects: leaveRequest.projects?.map((p) => ({
        projectName: p.projectName,
        pmId: p.pmId || undefined,
        techLeadId: p.techLeadId || undefined,
      })) || [],
      requestUrl: `https://leaves-tracking.copilotinnovations.com/leave-requests/${leaveRequest.id}`,
    };

    // Send notifications via email and Slack
    const notificationService = getNotificationService();
    const payload = {
      type: "leave_request_created" as const,
      data: notificationData as unknown as Record<string, unknown>,
    };

    const allResults: Array<{ success: boolean; channel: string; recipient: NotificationRecipient; error?: string }> = [];

    // Slack: no longer sent on leave request creation (only when HR approves - see sendLeaveAlertToSlack)

    // Email: send per recipient in batches (HR first, then PM, then Tech Lead) with delays for rate limiting
    const emailChannels: Array<"email" | "slack"> = ["email"];
    const hrRecipients = recipients.filter(r => r.role === "hr");
    const pmRecipients = recipients.filter(r => r.role === "supervisor");
    const techLeadRecipients = recipients.filter(r => r.role === "tech_lead");

    // Send to HR first
    if (hrRecipients.length > 0) {
      const hrResults = await notificationService.sendToMultipleRecipients(
        hrRecipients,
        payload,
        emailChannels
      );
      allResults.push(...hrResults);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send to PM after 1 second delay
    if (pmRecipients.length > 0) {
      const pmResults = await notificationService.sendToMultipleRecipients(
        pmRecipients,
        payload,
        emailChannels
      );
      allResults.push(...pmResults);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send to Tech Lead only if different from PM
    if (techLeadRecipients.length > 0) {
      const pmIds = new Set(pmRecipients.map(pm => pm.id));
      const uniqueTechLeads = techLeadRecipients.filter(tl => !pmIds.has(tl.id));
      if (uniqueTechLeads.length > 0) {
        const techLeadResults = await notificationService.sendToMultipleRecipients(
          uniqueTechLeads,
          payload,
          emailChannels
        );
        allResults.push(...techLeadResults);
      }
    }


    // Log errors if any failed
    const failed = allResults.filter(r => !r.success);
    if (failed.length > 0) {
      failed.forEach(r => {
        logger.error(`Failed to notify ${r.recipient.name} (${r.recipient.email}):`, r.error);
      });
    }
  }

  /**
   * Send approval/rejection notification email to the employee who made the leave request
   */
  private async sendApprovalNotification(
    leaveRequest: Awaited<ReturnType<LeaveRequestRepository["findById"]>>,
    approver: Awaited<ReturnType<EmployeeRepository["findById"]>>,
    approverRole: "supervisor" | "hr" | "pm" | "tech_lead",
    comments: string | undefined,
    status: "approved" | "rejected"
  ): Promise<void> {
    if (!leaveRequest || !leaveRequest.employee || !approver) return;

    // Get employee country
    const employeeCountry = leaveRequest.employee.country || "Unknown";

    // Calculate date range from leaveDays
    const leaveDays = leaveRequest.leaveDays || [];
    const sortedDates = leaveDays.map(d => d.date).sort();
    const fromDate = sortedDates[0] || leaveRequest.fromDate;
    const toDate = sortedDates[sortedDates.length - 1] || leaveRequest.toDate;

    // Get total days (prefer totalWorkingDays if available)
    const totalDays = ('totalWorkingDays' in leaveRequest && leaveRequest.totalWorkingDays) || leaveRequest.totalDays;

    const requestUrl = `https://leaves-tracking.copilotinnovations.com/leave-requests/${leaveRequest.id}`;

    // Get notification service
    const notificationService = getNotificationService();

    // Create recipient for the employee
    const employeeRecipient: NotificationRecipient = {
      id: leaveRequest.employee.id,
      email: leaveRequest.employee.email,
      name: leaveRequest.employee.name,
      role: "supervisor", // This is just for the notification system, doesn't affect functionality
    };

    if (status === "approved") {
      const notificationData: LeaveRequestApprovedNotificationData = {
        leaveRequestId: leaveRequest.id,
        employee: {
          id: leaveRequest.employee.id,
          name: leaveRequest.employee.name,
          email: leaveRequest.employee.email,
          country: employeeCountry,
        },
        leaveType: leaveRequest.leaveType as "vacation" | "personal_sick" | "unpaid" | "other",
        fromDate: fromDate,
        toDate: toDate,
        totalDays: totalDays,
        reason: leaveRequest.reason || undefined,
        approverName: approver.name,
        approverRole: approverRole,
        comments: comments,
        requestUrl: requestUrl,
      };

      const payload = {
        type: "leave_request_approved" as const,
        data: notificationData as unknown as Record<string, unknown>,
      };

      try {
        await notificationService.sendNotification(employeeRecipient, payload, ["email"]);
        logger.info(`Approval email sent to ${leaveRequest.employee.email}`);
      } catch (error) {
        logger.error(`Failed to send approval email to ${leaveRequest.employee.email}:`, error);
      }
    } else if (status === "rejected") {
      const notificationData: LeaveRequestRejectedNotificationData = {
        leaveRequestId: leaveRequest.id,
        employee: {
          id: leaveRequest.employee.id,
          name: leaveRequest.employee.name,
          email: leaveRequest.employee.email,
          country: employeeCountry,
        },
        leaveType: leaveRequest.leaveType as "vacation" | "personal_sick" | "unpaid" | "other",
        fromDate: fromDate,
        toDate: toDate,
        totalDays: totalDays,
        reason: leaveRequest.reason || undefined,
        approverName: approver.name,
        approverRole: approverRole,
        comments: comments,
        requestUrl: requestUrl,
      };

      const payload = {
        type: "leave_request_rejected" as const,
        data: notificationData as unknown as Record<string, unknown>,
      };

      try {
        await notificationService.sendNotification(employeeRecipient, payload, ["email"]);
        logger.info(`Rejection email sent to ${leaveRequest.employee.email}`);
      } catch (error) {
        logger.error(`Failed to send rejection email to ${leaveRequest.employee.email}:`, error);
      }
    }
  }

  /**
   * Send Leave Alert to Slack channel (#cop_leaves-alerts) when HR approves a leave request.
   */
  private async sendLeaveAlertToSlack(
    leaveRequest: Awaited<ReturnType<LeaveRequestRepository["findById"]>>
  ): Promise<void> {
    if (!leaveRequest?.employee) return;

    const notificationService = getNotificationService();
    if (!notificationService.hasChannel("slack")) return;

    const leaveDays = leaveRequest.leaveDays || [];
    const sortedDates = leaveDays.map((d) => d.date).sort();
    const fromDate = sortedDates[0] || leaveRequest.fromDate;
    const toDate = sortedDates[sortedDates.length - 1] || leaveRequest.toDate;
    const totalDays =
      ("totalWorkingDays" in leaveRequest && leaveRequest.totalWorkingDays) || leaveRequest.totalDays;

    const alertData: LeaveAlertNotificationData = {
      leaveRequestId: leaveRequest.id,
      employee: {
        name: leaveRequest.employee.name,
        email: leaveRequest.employee.email,
        country: leaveRequest.employee.country || "Unknown",
      },
      fromDate,
      toDate,
      totalDays,
      projects: (leaveRequest.projects || []).map((p) => ({ projectName: p.projectName })),
      requestUrl: `https://leaves-tracking.copilotinnovations.com/leave-requests/${leaveRequest.id}`,
    };

    const recipient: NotificationRecipient = {
      id: leaveRequest.employee.id,
      email: leaveRequest.employee.email,
      name: leaveRequest.employee.name,
      role: "supervisor",
    };

    await notificationService.sendNotification(
      recipient,
      { type: "leave_alert", data: alertData as unknown as Record<string, unknown> },
      ["slack"]
    );
  }

  async approveLeaveRequest(
    data: ApproveLeaveRequestInput,
    user: AuthenticatedUser
  ) {
    // Get leave request with leaveDays
    const leaveRequest = await this.leaveRequestRepository.findById(
      data.leaveRequestId
    );

    if (!leaveRequest) {
      throw new NotFoundError("Leave request not found");
    }

    // Cannot approve/reject a cancelled/withdrawn request
    if (leaveRequest.overallStatus === "cancelled") {
      throw new ValidationError("Cannot approve or reject a cancelled leave request");
    }

    // Store previous status to check if this is first approval
    const previousStatus = leaveRequest.overallStatus;

    // Check if user has permission to approve
    const employee = await this.employeeRepository.findById(user.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Determine approver role based on user role and project assignments
    // IMPORTANT: PM and Tech Lead are functional roles determined by project assignments,
    // NOT by the user's role in the database. Supervisors can only approve when assigned as PM or Tech Lead in projects.
    let approverRole: "supervisor" | "hr" | "pm" | "tech_lead" | null = null;
    
    // FIRST: Check if user is PM or Tech Lead for any project in this leave request
    // This is the primary way to determine approval permissions for ALL users
    const requestProjects = await db
      .select({
        pmId: leaveRequestProjects.pmId,
        techLeadId: leaveRequestProjects.techLeadId,
      })
      .from(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, data.leaveRequestId));

    // Check if user is PM for any project
    const isPM = requestProjects.some(p => p.pmId === user.employeeId);
    if (isPM) {
      approverRole = "pm";
    } else {
      // Check if user is Tech Lead for any project
      const isTechLead = requestProjects.some(p => p.techLeadId === user.employeeId);
      if (isTechLead) {
        approverRole = "tech_lead";
      } else {
        // If not PM/Tech Lead for this project, check their general role
        // Only HR has approval permissions based on their database role alone
        // Supervisor roles do NOT grant approval permissions - they must be PM/Tech Lead
        if (user.role === "hr") {
          approverRole = "hr";
        }
      }
    }

    if (!approverRole) {
      throw new ForbiddenError("You are not authorized to approve this leave request");
    }

    // Update approval
    await this.leaveApprovalRepository.approve({
      ...data,
      approverId: user.employeeId,
      approverRole,
    });

    // Get all approvals after update
    const allApprovals = await this.leaveApprovalRepository.findByLeaveRequestId(
      data.leaveRequestId
    );
    
    // HR has final authority - if HR decides, update status immediately
    // Status is determined by HR's decision, regardless of PM/Tech Lead decisions
    const hrApproval = allApprovals.find((a) => a.approverRole === "hr");
    
    // If HR has decided, update status immediately based on their decision
    if (hrApproval && hrApproval.status !== "pending") {
      if (hrApproval.status === "approved") {
        // HR approval sets final status to approved immediately
        // If request was previously approved, leave days were already added to used days
        if (previousStatus !== "approved" && leaveRequest.leaveDays && leaveRequest.leaveDays.length > 0) {
          const leaveDaysUsed = calculateVacationDaysUsed(leaveRequest.leaveDays.map(day => ({
            date: day.date,
            leaveType: day.leaveType,
            isHalfDay: day.isHalfDay,
            halfDayPeriod: day.halfDayPeriod === 'morning' || day.halfDayPeriod === 'afternoon' 
              ? day.halfDayPeriod 
              : undefined
          })) as LeaveCalendarDay[]);
          if (leaveDaysUsed > 0) {
            const roundedDays = roundVacationDays(leaveDaysUsed);
            await this.employeeRepository.addUsedVacationDays(leaveRequest.employeeId, roundedDays);
          }
        }
        await this.leaveRequestRepository.updateStatus(
          data.leaveRequestId,
          "approved"
        );
        
        // Send approval notification email to the employee
        await this.sendApprovalNotification(leaveRequest, employee, approverRole, data.comments, "approved");
        // Send Leave Alert to Slack channel (#cop_leaves-alerts) when HR approves
        this.sendLeaveAlertToSlack(leaveRequest).catch((err) => {
          logger.error("Failed to send leave alert to Slack:", err);
        });
      } else if (hrApproval.status === "rejected") {
        // HR rejection sets final status to rejected immediately
        // If request was previously approved, subtract the leave days from used days
        if (previousStatus === "approved" && leaveRequest.leaveDays && leaveRequest.leaveDays.length > 0) {
          const leaveDaysUsed = calculateVacationDaysUsed(leaveRequest.leaveDays.map(day => ({
            date: day.date,
            leaveType: day.leaveType,
            isHalfDay: day.isHalfDay,
            halfDayPeriod: day.halfDayPeriod === 'morning' || day.halfDayPeriod === 'afternoon' 
              ? day.halfDayPeriod 
              : undefined
          })) as LeaveCalendarDay[]);
          if (leaveDaysUsed > 0) {
            const roundedDays = roundVacationDays(leaveDaysUsed);
            await this.employeeRepository.subtractUsedVacationDays(leaveRequest.employeeId, roundedDays);
          }
        }
        await this.leaveRequestRepository.updateStatus(
          data.leaveRequestId,
          "rejected"
        );
        
        // Send rejection notification email to the employee
        await this.sendApprovalNotification(leaveRequest, employee, approverRole, data.comments, "rejected");
      }
    }
    // If HR hasn't decided yet, status remains "pending"
    // PM/Tech Lead decisions don't affect the final status - only HR's decision matters

    return this.leaveRequestRepository.findById(data.leaveRequestId);
  }

  async withdrawLeaveRequest(
    data: WithdrawLeaveRequestInput,
    user: AuthenticatedUser
  ) {
    const leaveRequest = await this.leaveRequestRepository.findById(
      data.leaveRequestId
    );

    if (!leaveRequest) {
      throw new NotFoundError("Leave request not found");
    }

    // Only the requester can withdraw
    if (leaveRequest.employeeId !== user.employeeId) {
      throw new ForbiddenError("You can only withdraw your own leave requests");
    }

    // Check if already approved by HR, PM, or Tech Lead
    const approvals = await this.leaveApprovalRepository.findByLeaveRequestId(
      data.leaveRequestId
    );
    const hrApproval = approvals.find((a) => a.approverRole === "hr");
    const pmApprovals = approvals.filter((a) => a.approverRole === "pm");
    const techLeadApprovals = approvals.filter((a) => a.approverRole === "tech_lead");
    
    const hasApprovedHR = hrApproval?.status === "approved";
    const hasApprovedPM = pmApprovals.length > 0 && pmApprovals.some((a) => a.status === "approved");
    const hasApprovedTechLead = techLeadApprovals.length > 0 && techLeadApprovals.some((a) => a.status === "approved");
    
    if (hasApprovedHR || hasApprovedPM || hasApprovedTechLead) {
      throw new ValidationError("Cannot withdraw a leave request that has been approved");
    }

    return this.leaveRequestRepository.withdraw(data.leaveRequestId, user.employeeId);
  }

  async getLeaveRequests(
    query: GetLeaveRequestsQuery,
    user: AuthenticatedUser
  ): Promise<PaginatedResponse<LeaveRequestListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let data: Array<{ createdAt: Date | string | null; updatedAt: Date | string | null; [key: string]: unknown }>;
    let total: number;

    // Supervisor with "view all" in "Leave Approvals" tab: only requests that reach them as supervisor
    const isSupervisorWithViewAll = user.role === "supervisor" && canViewAllLeaveRequests(user);
    if (isSupervisorWithViewAll && query.view === "approvals") {
      const supervisorQuery = { ...query, employeeId: undefined };
      data = await this.leaveRequestRepository.findBySupervisorProjects(user.employeeId, supervisorQuery);
      total = await this.leaveRequestRepository.countBySupervisorProjects(user.employeeId, supervisorQuery);
    }
    // HR and users with "view all" (in "All Leave Requests" or HR) see ALL requests in company
    else if (user.role === "hr" || canViewAllLeaveRequests(user)) {
      // Use user.companyId (no extra DB load); view-all users are same company as HR
      data = await this.leaveRequestRepository.findByCompanyId(user.companyId, query);
      total = await this.leaveRequestRepository.countByCompanyId(user.companyId, query);
    }
    // Supervisor in "Leave Approvals" (no view-all) or "All Requests": only requests for their projects (PM/Tech Lead)
    // Supervisor in "My Requests" can only see their own requests
    else if (user.role === "supervisor") {
      // If employeeId is provided and matches the user, show only their requests (for "My Requests" page)
      if (query.employeeId && query.employeeId === user.employeeId) {
        data = await this.leaveRequestRepository.findByEmployeeId(user.employeeId, query);
        total = await this.leaveRequestRepository.countByEmployeeId(user.employeeId, query);
      } else {
        // Otherwise, show only requests where supervisor is PM or Tech Lead (for "All Requests" page)
        // Remove employeeId from query if it doesn't match user (prevent filtering by other employees)
        const supervisorQuery = { ...query, employeeId: undefined };
        data = await this.leaveRequestRepository.findBySupervisorProjects(user.employeeId, supervisorQuery);
        total = await this.leaveRequestRepository.countBySupervisorProjects(user.employeeId, supervisorQuery);
      }
    }
    // Regular employees can only see their own requests
    else {
      // If employeeId is provided, verify it matches the user
      if (query.employeeId && query.employeeId !== user.employeeId) {
        throw new ForbiddenError("You can only view your own leave requests");
      }
      data = await this.leaveRequestRepository.findByEmployeeId(user.employeeId, query);
      total = await this.leaveRequestRepository.countByEmployeeId(user.employeeId, query);
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      logger.error('Data is not an array:', typeof data, data);
      throw new Error('Repository returned invalid data format');
    }

    // Transform dates from Date to string for LeaveRequestListItem
    const transformedData: LeaveRequestListItem[] = data.map((item: { createdAt: Date | string | null; updatedAt: Date | string | null; [key: string]: unknown }) => {
      const createdAtValue = item.createdAt;
      const updatedAtValue = item.updatedAt;
      
      const createdAt = (createdAtValue instanceof Date) 
        ? createdAtValue.toISOString() 
        : (typeof createdAtValue === 'string' ? createdAtValue : null);
      const updatedAt = (updatedAtValue instanceof Date) 
        ? updatedAtValue.toISOString() 
        : (typeof updatedAtValue === 'string' ? updatedAtValue : null);
      
      return {
        ...item,
        createdAt,
        updatedAt,
      } as LeaveRequestListItem;
    });

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      data: transformedData,
      pagination,
    };
  }

  async getLeaveRequestById(id: string, user: AuthenticatedUser) {
    const leaveRequest = await this.leaveRequestRepository.findById(id);

    if (!leaveRequest) {
      return null;
    }

    // Drafts are only visible to their creator
    if (leaveRequest.overallStatus === "draft" && leaveRequest.employeeId !== user.employeeId) {
      throw new ForbiddenError("Access denied");
    }

    // HR and users with "view all" can see all non-draft requests in their company
    if (user.role === "hr" || canViewAllLeaveRequests(user)) {
      const requestCompanyId = (leaveRequest as { employee?: { companyId?: string } }).employee?.companyId;
      if (requestCompanyId === user.companyId) {
        return leaveRequest;
      }
      throw new ForbiddenError("Access denied");
    }

    // Supervisor can see requests for employees they supervise (but not drafts)
    // Note: Currently supervisors can see any request, but ideally should check PM/Tech Lead assignment
    if (user.role === "supervisor") {
      return leaveRequest;
    }

    // Employees can see their own requests (including drafts)
    if (leaveRequest.employeeId === user.employeeId) {
      return leaveRequest;
    }

    throw new ForbiddenError("Access denied");
  }

  async saveDraft(data: SaveDraftInput, user: AuthenticatedUser, draftId?: string) {
    // Validate that draft has at least some data
    const hasLeaveDays = data.leaveDays && data.leaveDays.length > 0;
    const hasProjects = data.projects && data.projects.length > 0;
    const hasReason = data.reason && data.reason.trim().length > 0;

    if (!hasLeaveDays && !hasProjects && !hasReason) {
      throw new ValidationError("Draft must contain at least one of: leave days, projects, or reason");
    }

    // Only the employee can save their own drafts
    const draft = await this.leaveRequestRepository.saveDraft(
      { ...data, employeeId: user.employeeId },
      draftId
    );

    return this.leaveRequestRepository.findById(draft.id);
  }

  async getDrafts(user: AuthenticatedUser) {
    // Employees can only see their own drafts
    const drafts = await this.leaveRequestRepository.findByEmployeeIdAndStatus(
      user.employeeId,
      "draft"
    );

    // Get projects and leaveDays for each draft
    const draftsWithProjects = await Promise.all(
      drafts.map(async (draft) => {
        // Get projects (simplified model)
        const requestProjects = await db
          .select({
            id: leaveRequestProjects.id,
            projectName: leaveRequestProjects.projectName,
            pmId: leaveRequestProjects.pmId,
            techLeadId: leaveRequestProjects.techLeadId,
          })
          .from(leaveRequestProjects)
          .where(eq(leaveRequestProjects.leaveRequestId, draft.id));

        // Get PM and Tech Lead details if they exist
        const pmIds = requestProjects.map(p => p.pmId).filter(Boolean) as string[];
        const techLeadIds = requestProjects.map(p => p.techLeadId).filter(Boolean) as string[];
        const allEmployeeIds = [...new Set([...pmIds, ...techLeadIds])];

        const employeeDetails: Record<string, { id: string; name: string; email: string }> = {};
        if (allEmployeeIds.length > 0) {
          const employeesData = await db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
            })
            .from(employees)
            .where(inArray(employees.id, allEmployeeIds));

          employeesData.forEach(emp => {
            employeeDetails[emp.id] = emp;
          });
        }

        // Map projects with employee details
        const projectsWithDetails = requestProjects.map(p => ({
          ...p,
          pm: p.pmId ? employeeDetails[p.pmId] || null : null,
          techLead: p.techLeadId ? employeeDetails[p.techLeadId] || null : null,
        }));

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
          .where(eq(leaveRequestDays.leaveRequestId, draft.id))
          .orderBy(leaveRequestDays.date);

        return {
          ...draft,
          projects: projectsWithDetails,
          leaveDays: days,
        };
      })
    );

    // Transform dates to strings for client-side serialization
    return draftsWithProjects.map(draft => transformLeaveRequestDates(draft));
  }

  async submitDraft(draftId: string, user: AuthenticatedUser) {
    // Get the draft
    const draft = await this.leaveRequestRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError("Draft not found");
    }

    // Only the owner can submit their draft
    if (draft.employeeId !== user.employeeId) {
      throw new ForbiddenError("You can only submit your own drafts");
    }

    if (draft.overallStatus !== "draft") {
      throw new ValidationError("This is not a draft");
    }

    // Validate draft has required fields
    const hasLeaveDays = draft.leaveDays && draft.leaveDays.length > 0;
    
    if (!hasLeaveDays) {
      throw new ValidationError("Draft is incomplete. Please select at least one leave day.");
    }

    // Get projects
    const requestProjects = await db
      .select()
      .from(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, draftId));

    if (requestProjects.length === 0) {
      throw new ValidationError("Draft must have at least one project selected.");
    }

    // Get employee info (needed for validation and company ID)
    const employee = await this.employeeRepository.findById(user.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Note: No validation for leave days limit - users can use as many days as needed
    // The system only tracks used vacation days for reference

    // Update status to pending
    await this.leaveRequestRepository.updateStatus(draftId, "pending");

    if (!employee.companyId) {
      throw new ValidationError("Employee must be assigned to a company");
    }

    // Create approval records for supervisors and HR
    // Use employee.companyId directly (already validated above)
    await this.leaveApprovalRepository.createApprovalsForLeaveRequest(
      draftId,
      employee.companyId
    );

    return this.leaveRequestRepository.findById(draftId);
  }

  async deleteDraft(draftId: string, user: AuthenticatedUser) {
    // Only the owner can delete their draft
    await this.leaveRequestRepository.deleteDraft(draftId, user.employeeId);
    return { success: true };
  }

  /**
   * Get leave days availed summary for an employee
   * Returns the count of vacation and personal/sick days availed from approved requests
   */
  async getLeaveDaysAvailedSummary(employeeId: string): Promise<LeaveDaysAvailed> {
    // Get all approved leave requests for this employee (with pagination to get all)
    const approvedRequests = await this.leaveRequestRepository.findByEmployeeId(employeeId, {
      status: 'approved',
      page: 1,
      limit: 1000, // Get all approved requests
    });

    let totalVacation = 0;
    let totalPersonal = 0;

    // Calculate days availed from each approved request
    // We need to fetch each request with findById to get leaveDays
    for (const request of approvedRequests) {
      const fullRequest = await this.leaveRequestRepository.findById(request.id);
      if (fullRequest?.leaveDays && fullRequest.leaveDays.length > 0) {
        const availed = calculateLeaveDaysAvailed(fullRequest.leaveDays.map((day: { date: string; leaveType: string; isHalfDay: boolean; halfDayPeriod?: string | null }) => ({
          date: day.date,
          leaveType: day.leaveType,
          isHalfDay: day.isHalfDay,
          halfDayPeriod: day.halfDayPeriod === 'morning' || day.halfDayPeriod === 'afternoon' 
            ? day.halfDayPeriod 
            : undefined
        })) as LeaveCalendarDay[]);
        
        totalVacation += roundLeaveDays(availed.vacation);
        totalPersonal += roundLeaveDays(availed.personal);
      }
    }

    return {
      vacation: roundLeaveDays(totalVacation),
      personal: roundLeaveDays(totalPersonal),
    };
  }

  /**
   * Leave totals by employee for the current year (approved only).
   * Used by "Leaves total" page. Scope: same company as user (HR or view-all).
   */
  async getLeaveTotalsByEmployee(
    companyId: string,
    year: number
  ): Promise<
    Array<{
      employeeId: string;
      name: string;
      email: string;
      personal_sick: number;
      vacation: number;
      unpaid: number;
      other: number;
      total: number;
    }>
  > {
    const [employeesList, daysByEmployee] = await Promise.all([
      this.employeeRepository.findByCompanyId(companyId),
      this.leaveRequestRepository.getApprovedLeaveDaysByEmployeeAndType(companyId, year),
    ]);

    const map = new Map<
      string,
      { personal_sick: number; vacation: number; unpaid: number; other: number }
    >();
    for (const row of daysByEmployee) {
      if (!map.has(row.employeeId)) {
        map.set(row.employeeId, { personal_sick: 0, vacation: 0, unpaid: 0, other: 0 });
      }
      const bucket = map.get(row.employeeId)!;
      const days = Math.round(row.days * 2) / 2;
      if (row.leaveType === "personal_sick") bucket.personal_sick += days;
      else if (row.leaveType === "vacation") bucket.vacation += days;
      else if (row.leaveType === "unpaid") bucket.unpaid += days;
      else if (row.leaveType === "other") bucket.other += days;
    }

    return employeesList.map((emp) => {
      const bucket = map.get(emp.id) ?? {
        personal_sick: 0,
        vacation: 0,
        unpaid: 0,
        other: 0,
      };
      const total =
        bucket.personal_sick + bucket.vacation + bucket.unpaid + bucket.other;
      return {
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        personal_sick: bucket.personal_sick,
        vacation: bucket.vacation,
        unpaid: bucket.unpaid,
        other: bucket.other,
        total,
      };
    });
  }
}

