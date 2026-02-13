import { db } from "@/db/client";
import { leaveApprovals, leaveRequests, employees, companies, leaveRequestProjects } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { ApproveLeaveRequestInput } from "@/lib/types";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/utils/errors";

export class LeaveApprovalRepository {
  async createApprovalsForLeaveRequest(
    leaveRequestId: string,
    companyId: string
  ) {
    // Verify leave request exists
    const [leaveRequest] = await db
      .select({
        employeeId: leaveRequests.employeeId,
      })
      .from(leaveRequests)
      .where(eq(leaveRequests.id, leaveRequestId))
      .limit(1);

    if (!leaveRequest) {
      throw new NotFoundError("Leave request not found");
    }

    // Get organization for the company
    const [company] = await db
      .select({ 
        organizationId: companies.organizationId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError("Company not found");
    }

    // Get HR employee in the same organization
    // Only one HR approval record is created - any HR can approve it
    const hrEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .innerJoin(companies, eq(employees.companyId, companies.id))
      .where(
        and(
          eq(employees.role, "hr"),
          eq(companies.organizationId, company.organizationId)
        )
      )
      .limit(1);

    // CRITICAL: Require at least HR
    if (hrEmployees.length === 0) {
      throw new ValidationError("Cannot create leave request: Organization must have at least one HR employee");
    }

    // Get PMs and Tech Leads from projects
    const projectData = await db
      .select({
        pmId: leaveRequestProjects.pmId,
        techLeadId: leaveRequestProjects.techLeadId,
      })
      .from(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, leaveRequestId));

    // Collect unique PM and Tech Lead IDs
    const pmIds = [...new Set(projectData.map(p => p.pmId).filter(Boolean) as string[])];
    const techLeadIds = [...new Set(projectData.map(p => p.techLeadId).filter(Boolean) as string[])];

    // Create a map to track which roles each approver has
    // This allows us to deduplicate approvers who have multiple roles (e.g., PM and Tech Lead)
    const approverRolesMap = new Map<string, Set<"pm" | "tech_lead">>();
    
    // Track PMs
    pmIds.forEach((pmId) => {
      if (!approverRolesMap.has(pmId)) {
        approverRolesMap.set(pmId, new Set());
      }
      approverRolesMap.get(pmId)!.add("pm");
    });
    
    // Track Tech Leads
    techLeadIds.forEach((techLeadId) => {
      if (!approverRolesMap.has(techLeadId)) {
        approverRolesMap.set(techLeadId, new Set());
      }
      approverRolesMap.get(techLeadId)!.add("tech_lead");
    });

    // Create approvals for HR and unique approvers (PMs/Tech Leads)
    // IMPORTANT: Supervisors can only approve when assigned as PM or Tech Lead in projects.
    // If an approver has multiple roles, create only ONE approval record
    // Use "pm" as the primary role if they have both roles (PM takes priority)
    const approvers = [
      ...hrEmployees.map((hr) => ({ id: hr.id, role: "hr" as const })),
      // For each unique approver, use their primary role (PM if they have both PM and Tech Lead)
      ...Array.from(approverRolesMap.entries()).map(([approverId, roles]) => {
        // If approver has both PM and Tech Lead roles, use "pm" as the role
        // This creates only ONE approval record instead of two
        const role = roles.has("pm") ? "pm" as const : "tech_lead" as const;
        return { id: approverId, role };
      }),
    ];

    // Create approval records
    const approvals = await db
      .insert(leaveApprovals)
      .values(
        approvers.map((approver) => ({
          leaveRequestId,
          approverId: approver.id,
          approverRole: approver.role,
          status: "pending" as const,
        }))
      )
      .returning();

    return approvals;
  }

  async approve(data: ApproveLeaveRequestInput & { approverId: string; approverRole: "supervisor" | "hr" | "pm" | "tech_lead" }) {
    // For HR: Find any HR approval record for this request (any HR can approve)
    // For PM, Tech Lead, Supervisor: Find the specific approver's record
    let existing;
    if (data.approverRole === "hr") {
      // HR can approve any HR approval record
      [existing] = await db
        .select()
        .from(leaveApprovals)
        .where(
          and(
            eq(leaveApprovals.leaveRequestId, data.leaveRequestId),
            eq(leaveApprovals.approverRole, "hr")
          )
        )
        .limit(1);
    } else if (data.approverRole === "pm" || data.approverRole === "tech_lead") {
      // For PM and Tech Lead: Find the approver's record
      // IMPORTANT: If someone is both PM and Tech Lead, we only create ONE approval record (with role "pm")
      // So we need to search by approverId and either "pm" or "tech_lead" role
      // This allows approval whether they're trying to approve as PM or Tech Lead
      [existing] = await db
        .select()
        .from(leaveApprovals)
        .where(
          and(
            eq(leaveApprovals.leaveRequestId, data.leaveRequestId),
            eq(leaveApprovals.approverId, data.approverId),
            // Accept either "pm" or "tech_lead" role since we deduplicate them
            or(
              eq(leaveApprovals.approverRole, "pm"),
              eq(leaveApprovals.approverRole, "tech_lead")
            )
          )
        )
        .limit(1);
    } else {
      // Supervisor must approve their specific record
      [existing] = await db
        .select()
        .from(leaveApprovals)
        .where(
          and(
            eq(leaveApprovals.leaveRequestId, data.leaveRequestId),
            eq(leaveApprovals.approverId, data.approverId),
            eq(leaveApprovals.approverRole, data.approverRole)
          )
        )
        .limit(1);
    }

    if (!existing) {
      // Get all approvals for this request for debugging
      const allApprovals = await db
        .select({
          id: leaveApprovals.id,
          approverId: leaveApprovals.approverId,
          approverRole: leaveApprovals.approverRole,
          status: leaveApprovals.status,
        })
        .from(leaveApprovals)
        .where(eq(leaveApprovals.leaveRequestId, data.leaveRequestId));

      const approverInfo = allApprovals.map(a => 
        `${a.approverRole} (${a.approverId}) - ${a.status}`
      ).join(', ');

      throw new NotFoundError(
        `Approval record not found. Looking for: ${data.approverRole} with approverId ${data.approverId}. ` +
        `Existing approvals for this request: ${approverInfo || 'none'}`
      );
    }

    // HR can change their decision (they have final authority)
    // Other approvers cannot change their decision once processed
    if (existing.status !== "pending" && data.approverRole !== "hr") {
      throw new ConflictError("Approval has already been processed");
    }

    // Update approval - for HR, update the approverId to the actual HR who approved
    const [updated] = await db
      .update(leaveApprovals)
      .set({
        approverId: data.approverId, // Update to the actual approver's ID
        status: data.status,
        comments: data.comments,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(leaveApprovals.leaveRequestId, data.leaveRequestId),
          // For HR, match by role; for others, match by approverId and role
          data.approverRole === "hr"
            ? eq(leaveApprovals.approverRole, "hr")
            : and(
                eq(leaveApprovals.approverId, data.approverId),
                eq(leaveApprovals.approverRole, data.approverRole)
              )
        )
      )
      .returning();

    return updated;
  }

  async findByLeaveRequestId(leaveRequestId: string) {
    return db
      .select({
        id: leaveApprovals.id,
        leaveRequestId: leaveApprovals.leaveRequestId,
        approverId: leaveApprovals.approverId,
        approverRole: leaveApprovals.approverRole,
        status: leaveApprovals.status,
        comments: leaveApprovals.comments,
        decidedAt: leaveApprovals.decidedAt,
        createdAt: leaveApprovals.createdAt,
        approver: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          role: employees.role,
        },
      })
      .from(leaveApprovals)
      .leftJoin(employees, eq(leaveApprovals.approverId, employees.id))
      .where(eq(leaveApprovals.leaveRequestId, leaveRequestId));
  }

  async checkAllApproved(leaveRequestId: string): Promise<boolean> {
    const approvals = await this.findByLeaveRequestId(leaveRequestId);

    if (approvals.length === 0) {
      return false;
    }

    // Get the leave request projects to determine which approvers are needed
    const projectData = await db
      .select({
        pmId: leaveRequestProjects.pmId,
        techLeadId: leaveRequestProjects.techLeadId,
      })
      .from(leaveRequestProjects)
      .where(eq(leaveRequestProjects.leaveRequestId, leaveRequestId));

    // Collect unique PM and Tech Lead IDs (same logic as createApprovalsForLeaveRequest)
    // This ensures we check for all unique approvers, not duplicates
    const pmIds = [...new Set(projectData.map(p => p.pmId).filter(Boolean) as string[])];
    const techLeadIds = [...new Set(projectData.map(p => p.techLeadId).filter(Boolean) as string[])];
    
    // Create a set of all unique approver IDs that need to approve
    // If someone is both PM and Tech Lead, they only need to approve once
    const requiredApproverIds = new Set([...pmIds, ...techLeadIds]);

    // Required approvals: HR, all unique PMs/Tech Leads
    // Note: Supervisors are included in PM/Tech Lead approvals when they are assigned to projects
    const hrApprovals = approvals.filter((a) => a.approverRole === "hr");
    
    // Get approvals from PMs and Tech Leads
    // Note: If someone is both PM and Tech Lead, they will have only ONE approval record (with role "pm")
    const pmTechLeadApprovals = approvals.filter(
      (a) => a.approverRole === "pm" || a.approverRole === "tech_lead"
    );

    // HR is always required
    if (hrApprovals.length === 0) {
      return false;
    }

    // All HR approvals must be approved (though typically there's only one)
    const allHRApproved = hrApprovals.every((a) => a.status === "approved");
    
    // All unique PM/Tech Lead approvers must have approved
    // Since we deduplicate approvers (same person = one approval), we check that all required approver IDs have an approved record
    const approvedApproverIds = new Set(
      pmTechLeadApprovals
        .filter((a) => a.status === "approved")
        .map((a) => a.approverId)
    );
    
    // Check if all required approvers have approved
    // If someone is both PM and Tech Lead, they only need one approval
    const allPMTechLeadApproved = 
      requiredApproverIds.size === 0 || 
      Array.from(requiredApproverIds).every((id) => approvedApproverIds.has(id));

    // All required approvals must be approved
    return allHRApproved && allPMTechLeadApproved;
  }

  async checkAnyRejected(leaveRequestId: string): Promise<boolean> {
    const approvals = await this.findByLeaveRequestId(leaveRequestId);
    return approvals.some((approval) => approval.status === "rejected");
  }
}

