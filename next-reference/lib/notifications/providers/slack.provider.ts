/**
 * Slack notification provider using Slack Web API
 * Sends notifications to a single Slack channel
 * Later: will support DMs to individual users
 */
import { BaseNotificationProvider } from "./base.provider";
import { NotificationChannel, NotificationRecipient, NotificationPayload, NotificationResult, LeaveAlertNotificationData } from "../types";
import type { WebClient } from "@slack/web-api";

interface SlackConfig {
  botToken: string;
  channel: string; // Single channel ID for all notifications
}

export class SlackNotificationProvider extends BaseNotificationProvider {
  protected channel: NotificationChannel = "slack";
  protected supportedTypes: string[] = [
    "leave_alert", // Sent to channel when HR approves a leave request
  ];

  private config: SlackConfig;
  private slackClient: WebClient | null = null;

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  /**
   * Get or initialize Slack client
   */
  private async getSlackClient() {
    if (!this.slackClient) {
      const { WebClient } = await import('@slack/web-api');
      this.slackClient = new WebClient(this.config.botToken);
    }
    return this.slackClient;
  }

  async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // All notifications go to the same channel
      // Later: implement DMs for individual users
      const channelId = this.config.channel;

      // Get Slack message content based on notification type
      const message = this.getSlackMessage(payload.type, payload.data);

      // Send message to Slack
      const client = await this.getSlackClient();
      const result = await client.chat.postMessage({
        channel: channelId,
        ...message,
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
      }

      console.log(`✅ [SLACK] Message sent successfully to channel ${channelId}`);
      console.log(`   Message TS: ${result.ts}`);

      return {
        success: true,
        channel: this.channel,
        recipient,
      };
    } catch (error) {
      console.error("❌ [SLACK] Failed to send message:", error);
      return {
        success: false,
        channel: this.channel,
        recipient,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Slack message format for a specific notification type
   */
  private getSlackMessage(type: string, data: Record<string, unknown>) {
    switch (type) {
      case "leave_alert":
        return this.getLeaveAlertMessage(data as unknown as LeaveAlertNotificationData);
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }

  /**
   * Format Leave Alert for Slack - sent when HR approves a leave request (#cop_leaves-alerts)
   */
  private getLeaveAlertMessage(data: LeaveAlertNotificationData) {
    const { employee, fromDate, toDate, totalDays, projects, requestUrl } = data;

    const projectsList = projects
      .map((p) => `• ${p.projectName}`)
      .join("\n");

    type SlackBlock = {
      type: string;
      [key: string]: unknown;
    };
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Leave Alert",
          emoji: true,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Team member:*\n${employee.name}` },
          { type: "mrkdwn", text: `*Total days:*\n${totalDays}` },
        ],
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*From:*\n${new Date(fromDate).toLocaleDateString()}` },
          { type: "mrkdwn", text: `*To:*\n${new Date(toDate).toLocaleDateString()}` },
        ],
      },
    ];

    if (projects.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Affected Projects:*\n${projectsList}`,
        },
      });
    }

    blocks.push(
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Leave Request", emoji: true },
            style: "primary",
            url: requestUrl,
          },
        ],
      }
    );

    return {
      text: `Leave Alert: ${employee.name} - ${totalDays} days`,
      blocks,
    };
  }
}
