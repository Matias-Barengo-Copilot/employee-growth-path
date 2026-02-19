/**
 * Notification types and interfaces
 * This module defines the structure for all notification types
 */

export type NotificationChannel = "email" | "slack";

export type NotificationRecipientRole = "supervisor" | "hr" | "tech_lead";

export interface NotificationRecipient {
  id: string;
  email: string;
  name: string;
  role: NotificationRecipientRole;
  // Future: slackUserId?: string;
}

export interface NotificationPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  error?: string;
}

/**
 * Base interface for all notification providers
 */
export interface INotificationProvider {
  /**
   * Send a notification to a recipient
   */
  send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Check if this provider supports a specific notification type
   */
  supports(type: string): boolean;

  /**
   * Get the channel name (e.g., "email", "slack")
   */
  getChannel(): NotificationChannel;
}

/**
 * Leave Request Created Notification Data
 */
export interface LeaveRequestCreatedNotificationData {
  leaveRequestId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
    country: string;
  };
  leaveType: "vacation" | "personal_sick" | "unpaid" | "other";
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
  projects: Array<{
    projectName: string;
    pmId?: string;
    techLeadId?: string;
  }>;
  requestUrl: string; // URL to view the leave request
}

/**
 * Leave Alert (Slack) - sent to #cop_leaves-alerts when HR approves a leave request
 */
export interface LeaveAlertNotificationData {
  leaveRequestId: string;
  employee: { name: string; email?: string; country?: string };
  fromDate: string;
  toDate: string;
  totalDays: number;
  projects: Array<{ projectName: string }>;
  requestUrl: string;
}

/**
 * Leave Request Approved Notification Data
 */
export interface LeaveRequestApprovedNotificationData {
  leaveRequestId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
    country: string;
  };
  leaveType: "vacation" | "personal_sick" | "unpaid" | "other";
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
  approverName: string;
  approverRole: "hr" | "supervisor" | "pm" | "tech_lead";
  comments?: string;
  requestUrl: string; // URL to view the leave request
}

/**
 * Leave Request Rejected Notification Data
 */
export interface LeaveRequestRejectedNotificationData {
  leaveRequestId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
    country: string;
  };
  leaveType: "vacation" | "personal_sick" | "unpaid" | "other";
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
  approverName: string;
  approverRole: "hr" | "supervisor" | "pm" | "tech_lead";
  comments?: string;
  requestUrl: string; // URL to view the leave request
}
