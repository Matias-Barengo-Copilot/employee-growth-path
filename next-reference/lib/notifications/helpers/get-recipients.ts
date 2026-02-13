/**
 * Helper functions to get notification recipients for leave requests
 */
import { db } from "@/db/client";
import { employees, companies, leaveRequestProjects } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { NotificationRecipient } from "../types";
import { logger } from "@/lib/utils/logger";

/**
 * Deduplicate notification recipients by employee ID
 * If the same person appears multiple times (e.g., as PM and Tech Lead), only include once
 */
function deduplicateRecipients(
  recipients: NotificationRecipient[]
): NotificationRecipient[] {
  const uniqueMap = new Map<string, NotificationRecipient>();
  
  for (const recipient of recipients) {
    if (!uniqueMap.has(recipient.id)) {
      uniqueMap.set(recipient.id, recipient);
    }
  }
  
  return Array.from(uniqueMap.values());
}

/**
 * Get all notification recipients for a leave request
 * Returns PMs, Tech Leads, and HR who should be notified
 * 
 * Simplified logic:
 * - If pmId exists in project → Notify PM automatically
 * - If techLeadId exists in project → Notify Tech Lead automatically
 * - Always notify HR
 * - Deduplicate: If pmId === techLeadId, only notify once
 */
export async function getLeaveRequestRecipients(
  leaveRequestId: string,
  companyId: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  // Get company and organization info
  const [company] = await db
    .select({
      id: companies.id,
      organizationId: companies.organizationId,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    return recipients;
  }

  // Get leave request projects with pmId and techLeadId (simplified model)
  const leaveRequestProjectData = await db
    .select({
      pmId: leaveRequestProjects.pmId,
      techLeadId: leaveRequestProjects.techLeadId,
    })
    .from(leaveRequestProjects)
    .where(eq(leaveRequestProjects.leaveRequestId, leaveRequestId));

  // Collect all PM and Tech Lead IDs
  const pmIds = leaveRequestProjectData
    .map((p) => p.pmId)
    .filter((id): id is string => Boolean(id));
  
  const techLeadIds = leaveRequestProjectData
    .map((p) => p.techLeadId)
    .filter((id): id is string => Boolean(id));

  // Combine and deduplicate IDs (if same person is PM and Tech Lead)
  const allEmployeeIds = [...new Set([...pmIds, ...techLeadIds])];

  logger.debug(`[NOTIFICATIONS] Projects with PMs: ${pmIds.length}, Tech Leads: ${techLeadIds.length}, Unique: ${allEmployeeIds.length}`);

  // Get PMs and Tech Leads from employees table
  if (allEmployeeIds.length > 0) {
    const projectEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
      })
      .from(employees)
      .where(inArray(employees.id, allEmployeeIds));

    logger.debug(`[NOTIFICATIONS] Found ${projectEmployees.length} PMs/Tech Leads to notify:`, 
      projectEmployees.map(e => `${e.name} (${e.email})`));

    // Track which employee IDs we've already added to avoid duplicates
    const addedEmployeeIds = new Set<string>();

    // Add PMs
    for (const pmId of pmIds) {
      if (!addedEmployeeIds.has(pmId)) {
        const pm = projectEmployees.find((e) => e.id === pmId);
        if (pm) {
          recipients.push({
            id: pm.id,
            email: pm.email,
            name: pm.name,
            role: "supervisor" as const, // PMs are treated as supervisors for notifications
          });
          addedEmployeeIds.add(pmId);
        }
      }
    }

    // Add Tech Leads (skip if already added as PM)
    for (const techLeadId of techLeadIds) {
      if (!addedEmployeeIds.has(techLeadId)) {
        const techLead = projectEmployees.find((e) => e.id === techLeadId);
        if (techLead) {
          recipients.push({
            id: techLead.id,
            email: techLead.email,
            name: techLead.name,
            role: "tech_lead" as const,
          });
          addedEmployeeIds.add(techLeadId);
        }
      }
    }
  }

  // Get HR employees: same organization OR same company as submitter.
  // Using both criteria ensures the company's HR (e.g. sole HR with different email domain) is
  // always notified even if organizationId is inconsistent across companies.
  const hrEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(
      and(
        eq(employees.role, "hr"),
        or(
          eq(companies.organizationId, company.organizationId),
          eq(employees.companyId, companyId)
        )
      )
    );

  logger.debug(`[NOTIFICATIONS] Found ${hrEmployees.length} HR employees to notify:`, 
    hrEmployees.map(hr => `${hr.name} (${hr.email})`));

  recipients.push(
    ...hrEmployees.map((hr) => ({
      id: hr.id,
      email: hr.email,
      name: hr.name,
      role: "hr" as const,
    }))
  );

  // Deduplicate recipients (in case someone is both PM and Tech Lead, or has multiple roles)
  const uniqueRecipients = deduplicateRecipients(recipients);

  logger.debug(`[NOTIFICATIONS] Total unique recipients: ${uniqueRecipients.length}`, 
    uniqueRecipients.map(r => `${r.name} (${r.role})`).join(", "));

  return uniqueRecipients;
}
