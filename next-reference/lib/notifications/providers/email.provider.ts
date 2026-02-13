/**
 * Email notification provider using Resend
 * This is the current implementation for email notifications
 */
import { BaseNotificationProvider } from "./base.provider";
import { 
  NotificationChannel, 
  NotificationRecipient, 
  NotificationPayload, 
  NotificationResult, 
  LeaveRequestCreatedNotificationData,
  LeaveRequestApprovedNotificationData,
  LeaveRequestRejectedNotificationData
} from "../types";

// Email notification provider using Resend API
// Resend package is installed and fully integrated

interface EmailConfig {
  from: string;
  replyTo?: string;
}

export class EmailNotificationProvider extends BaseNotificationProvider {
  protected channel: NotificationChannel = "email";
  protected supportedTypes: string[] = [
    "leave_request_created",
    "leave_request_approved",
    "leave_request_rejected",
  ];

  private config: EmailConfig;

  constructor(config: EmailConfig) {
    super();
    this.config = config;
  }

  async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      this.validateRecipient(recipient);

      // Get email template based on notification type
      const emailContent = this.getEmailTemplate(payload.type, payload.data);

      // Send email using Resend API
      await this.sendEmail({
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return {
        success: true,
        channel: this.channel,
        recipient,
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        recipient,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get email template for a specific notification type
   */
  private getEmailTemplate(type: string, data: NotificationPayload["data"]) {
    switch (type) {
      case "leave_request_created":
        return this.getLeaveRequestCreatedTemplate(data as unknown as LeaveRequestCreatedNotificationData);
      case "leave_request_approved":
        return this.getLeaveRequestApprovedTemplate(data as unknown as LeaveRequestApprovedNotificationData);
      case "leave_request_rejected":
        return this.getLeaveRequestRejectedTemplate(data as unknown as LeaveRequestRejectedNotificationData);
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }

  /**
   * Template for leave request created notification
   */
  private getLeaveRequestCreatedTemplate(data: LeaveRequestCreatedNotificationData) {
    const { employee, leaveType, fromDate, toDate, totalDays, reason, projects, requestUrl } = data;

    const leaveTypeLabels: Record<string, string> = {
      annual: "Annual Leave",
      sick: "Sick Leave",
      unpaid: "Unpaid Leave",
      other: "Other Leave",
    };

    const subject = `New Leave Request on Portal from ${employee.name}`;

    const projectsList = projects
      .map(
        (p) => {
          const pmInfo = p.pmId ? "PM assigned" : "No PM";
          const techLeadInfo = p.techLeadId ? "Tech Lead assigned" : "No Tech Lead";
          return `
      <li>
        <strong>${p.projectName}</strong>
        <br>
        <span style="color: #6b7280; font-size: 14px;">${pmInfo} | ${techLeadInfo}</span>
      </li>
    `;
        }
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">New Leave Request</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Team Member Information</h2>
            <p><strong>Name:</strong> ${employee.name}</p>
            <p><strong>Email:</strong> ${employee.email}</p>
            ${employee.employeeId ? `<p><strong>Team Member ID:</strong> ${employee.employeeId}</p>` : ""}
            <p><strong>Country:</strong> ${employee.country}</p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Leave Details</h2>
            <p><strong>Type:</strong> ${leaveTypeLabels[leaveType] || leaveType}</p>
            <p><strong>From:</strong> ${new Date(fromDate).toLocaleDateString()}</p>
            <p><strong>To:</strong> ${new Date(toDate).toLocaleDateString()}</p>
            <p><strong>Total Days:</strong> ${totalDays}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          </div>

          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Affected Projects</h2>
            <ul style="list-style-type: none; padding-left: 0;">
              ${projectsList}
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1f2937;">Review Leave Request:</p>
            <p style="margin: 0; word-break: break-all; color: #2563eb; font-size: 14px;">
              ${requestUrl}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              Copy and paste this URL into your browser
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from the Leave Management System.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
New Leave Request on Portal from ${employee.name}

Team Member Information:
- Name: ${employee.name}
- Email: ${employee.email}
${employee.employeeId ? `- Team Member ID: ${employee.employeeId}` : ""}
- Country: ${employee.country}

Leave Details:
- Type: ${leaveTypeLabels[leaveType] || leaveType}
- From: ${new Date(fromDate).toLocaleDateString()}
- To: ${new Date(toDate).toLocaleDateString()}
- Total Days: ${totalDays}
${reason ? `- Reason: ${reason}` : ""}

Affected Projects:
${projects.map((p) => {
  const pmInfo = p.pmId ? "PM assigned" : "No PM";
  const techLeadInfo = p.techLeadId ? "Tech Lead assigned" : "No Tech Lead";
  return `- ${p.projectName} (${pmInfo}, ${techLeadInfo})`;
}).join("\n")}

Review the request by copying this URL into your browser:
${requestUrl}
    `;

    return { subject, html, text };
  }

  /**
   * Template for leave request approved notification
   */
  private getLeaveRequestApprovedTemplate(data: LeaveRequestApprovedNotificationData) {
    const { employee, leaveType, fromDate, toDate, totalDays, reason, approverName, approverRole, comments, requestUrl } = data;

    const leaveTypeLabels: Record<string, string> = {
      vacation: "Vacation",
      personal_sick: "Personal/Sick Leave",
      unpaid: "Unpaid Leave",
      other: "Other Leave",
    };

    const approverRoleLabels: Record<string, string> = {
      hr: "HR",
      supervisor: "Supervisor",
      pm: "Project Manager",
      tech_lead: "Tech Lead",
    };

    const subject = `Your Leave Request Has Been Approved - ${leaveTypeLabels[leaveType] || leaveType}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin-top: 0;">✓ Leave Request Approved</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
              Hello ${employee.name},
            </p>
            <p style="color: #4b5563;">
              Your leave request has been <strong style="color: #10b981;">approved</strong> by ${approverName} (${approverRoleLabels[approverRole] || approverRole}).
            </p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Leave Details</h2>
            <p><strong>Type:</strong> ${leaveTypeLabels[leaveType] || leaveType}</p>
            <p><strong>From:</strong> ${new Date(fromDate).toLocaleDateString()}</p>
            <p><strong>To:</strong> ${new Date(toDate).toLocaleDateString()}</p>
            <p><strong>Total Days:</strong> ${totalDays}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            ${comments ? `<p><strong>Comments from ${approverRoleLabels[approverRole] || approverRole}:</strong> ${comments}</p>` : ""}
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1f2937;">View Leave Request:</p>
            <p style="margin: 0; word-break: break-all; color: #2563eb; font-size: 14px;">
              ${requestUrl}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              Copy and paste this URL into your browser
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from the Leave Management System.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Leave Request Approved

Hello ${employee.name},

Your leave request has been APPROVED by ${approverName} (${approverRoleLabels[approverRole] || approverRole}).

Leave Details:
- Type: ${leaveTypeLabels[leaveType] || leaveType}
- From: ${new Date(fromDate).toLocaleDateString()}
- To: ${new Date(toDate).toLocaleDateString()}
- Total Days: ${totalDays}
${reason ? `- Reason: ${reason}` : ""}
${comments ? `- Comments from ${approverRoleLabels[approverRole] || approverRole}: ${comments}` : ""}

View your leave request by copying this URL into your browser:
${requestUrl}
    `;

    return { subject, html, text };
  }

  /**
   * Template for leave request rejected notification
   */
  private getLeaveRequestRejectedTemplate(data: LeaveRequestRejectedNotificationData) {
    const { employee, leaveType, fromDate, toDate, totalDays, reason, approverName, approverRole, comments, requestUrl } = data;

    const leaveTypeLabels: Record<string, string> = {
      vacation: "Vacation",
      personal_sick: "Personal/Sick Leave",
      unpaid: "Unpaid Leave",
      other: "Other Leave",
    };

    const approverRoleLabels: Record<string, string> = {
      hr: "HR",
      supervisor: "Supervisor",
      pm: "Project Manager",
      tech_lead: "Tech Lead",
    };

    const subject = `Your Leave Request Has Been Rejected - ${leaveTypeLabels[leaveType] || leaveType}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin-top: 0;">✗ Leave Request Rejected</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
              Hello ${employee.name},
            </p>
            <p style="color: #4b5563;">
              We regret to inform you that your leave request has been <strong style="color: #ef4444;">rejected</strong> by ${approverName} (${approverRoleLabels[approverRole] || approverRole}).
            </p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Leave Details</h2>
            <p><strong>Type:</strong> ${leaveTypeLabels[leaveType] || leaveType}</p>
            <p><strong>From:</strong> ${new Date(fromDate).toLocaleDateString()}</p>
            <p><strong>To:</strong> ${new Date(toDate).toLocaleDateString()}</p>
            <p><strong>Total Days:</strong> ${totalDays}</p>
            ${reason ? `<p><strong>Your Reason:</strong> ${reason}</p>` : ""}
            ${comments ? `<p><strong>Reason for Rejection (from ${approverRoleLabels[approverRole] || approverRole}):</strong> ${comments}</p>` : ""}
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1f2937;">View Leave Request:</p>
            <p style="margin: 0; word-break: break-all; color: #2563eb; font-size: 14px;">
              ${requestUrl}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              Copy and paste this URL into your browser
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from the Leave Management System.</p>
            <p>If you have any questions, please contact your ${approverRoleLabels[approverRole] || approverRole} or HR department.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Leave Request Rejected

Hello ${employee.name},

We regret to inform you that your leave request has been REJECTED by ${approverName} (${approverRoleLabels[approverRole] || approverRole}).

Leave Details:
- Type: ${leaveTypeLabels[leaveType] || leaveType}
- From: ${new Date(fromDate).toLocaleDateString()}
- To: ${new Date(toDate).toLocaleDateString()}
- Total Days: ${totalDays}
${reason ? `- Your Reason: ${reason}` : ""}
${comments ? `- Reason for Rejection (from ${approverRoleLabels[approverRole] || approverRole}): ${comments}` : ""}

View your leave request by copying this URL into your browser:
${requestUrl}

If you have any questions, please contact your ${approverRoleLabels[approverRole] || approverRole} or HR department.
    `;

    return { subject, html, text };
  }

  /**
   * Send email using Resend API
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || this.config.from;

    if (!resendApiKey) {
      // In development, log the email instead of sending
      console.log("📧 [NOTIFICATION] Email would be sent (RESEND_API_KEY not set):");
      console.log("   To:", options.to);
      console.log("   Subject:", options.subject);
      console.log("   From:", resendFromEmail);
      console.log("   ---");
      console.log("   To enable email sending, add RESEND_API_KEY to your .env.local");
      console.log("   For now, emails are only logged to console.");
      return;
    }

    try {
      // Import and use Resend
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);
      
      const result = await resend.emails.send({
        from: resendFromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: this.config.replyTo,
      });

      if (result.error) {
        throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
      }

      console.log("✅ [NOTIFICATION] Email sent successfully to:", options.to);
      console.log("   Email ID:", result.data?.id);
    } catch (error) {
      console.error("❌ [NOTIFICATION] Failed to send email:", error);
      throw error;
    }
  }
}
