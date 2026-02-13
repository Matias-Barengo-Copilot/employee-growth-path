/**
 * Notification Service
 * Orchestrates sending notifications through multiple channels
 * This service is designed to be modular and scalable for future channels (Slack, etc.)
 */
import { INotificationProvider } from "./types";
import { EmailNotificationProvider } from "./providers/email.provider";
import { SlackNotificationProvider } from "./providers/slack.provider";
import { NotificationRecipient, NotificationPayload, NotificationResult } from "./types";

export class NotificationService {
  private providers: Map<string, INotificationProvider> = new Map();

  constructor() {
    // Initialize email provider
    const emailProvider = new EmailNotificationProvider({
      from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
      replyTo: process.env.EMAIL_REPLY_TO,
    });
    this.registerProvider(emailProvider);

    // Initialize Slack provider if token and channel are configured
    const slackBotToken = process.env.BOT_USER_OAUTH_TOKEN;
    const slackChannel = process.env.SLACK_CHANNEL;
    
    if (slackBotToken && slackChannel) {
      const slackProvider = new SlackNotificationProvider({
        botToken: slackBotToken,
        channel: slackChannel,
      });
      this.registerProvider(slackProvider);
      console.log(`[NOTIFICATIONS] Slack provider initialized (channel: ${slackChannel})`);
    } else {
      if (!slackBotToken) {
        console.log("[NOTIFICATIONS] Slack provider not initialized (BOT_USER_OAUTH_TOKEN not set)");
      } else if (!slackChannel) {
        console.log("[NOTIFICATIONS] Slack provider not initialized (SLACK_CHANNEL not set)");
      }
    }
  }

  /**
   * Register a notification provider
   */
  registerProvider(provider: INotificationProvider): void {
    this.providers.set(provider.getChannel(), provider);
  }

  /**
   * Send a notification to a recipient through all available channels
   * Returns results for each channel attempted
   */
  async sendNotification(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    channels: Array<"email" | "slack"> = ["email"]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      const provider = this.providers.get(channel);
      if (!provider) {
        results.push({
          success: false,
          channel,
          recipient,
          error: `No provider registered for channel: ${channel}`,
        });
        continue;
      }

      if (!provider.supports(payload.type)) {
        results.push({
          success: false,
          channel,
          recipient,
          error: `Provider does not support notification type: ${payload.type}`,
        });
        continue;
      }

      try {
        const result = await provider.send(recipient, payload);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel,
          recipient,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Send notifications to multiple recipients
   * Useful for broadcasting to a group (e.g., all supervisors)
   * 
   * For Slack: Groups recipients by channel and sends one message per channel
   * For Email: Sends individual emails to each recipient
   */
  async sendToMultipleRecipients(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    channels: Array<"email" | "slack"> = ["email"]
  ): Promise<NotificationResult[]> {
    const allResults: NotificationResult[] = [];

    // Handle Slack separately - send one message per leave request to the default channel
    // For now, all notifications go to the same channel (for testing)
    // Later: implement DMs or role-specific channels
    if (channels.includes("slack")) {
      const slackProvider = this.providers.get("slack");
      if (slackProvider) {
        // Send one Slack message for all recipients (to the default channel)
        // Use the first recipient, but include all recipients in the message metadata
        if (recipients.length > 0) {
          const primaryRecipient = recipients[0];
          try {
            const result = await slackProvider.send(primaryRecipient, {
              ...payload,
              // Add metadata about all recipients
              data: {
                ...payload.data,
                allRecipients: recipients.map(r => ({
                  name: r.name,
                  role: r.role,
                  email: r.email,
                })),
              },
            });
            allResults.push(result);
          } catch (error) {
            allResults.push({
              success: false,
              channel: "slack",
              recipient: primaryRecipient,
              error: error instanceof Error ? error.message : "Failed to send Slack notification",
            });
          }
        }
      }
    }

    // Handle Email - send individual emails to each recipient sequentially
    // Resend API has a rate limit of 2 requests per second
    // Send emails sequentially with delays to respect the rate limit
    if (channels.includes("email")) {
      const emailProvider = this.providers.get("email");
      if (emailProvider) {
        // Calculate delay between emails: 600ms ensures we stay under 2 req/sec
        const DELAY_BETWEEN_EMAILS = 600;
        
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          
          // Add delay before sending (except for the first email)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
          }
          
          try {
            const result = await emailProvider.send(recipient, payload);
            allResults.push(result);
          } catch (error) {
            allResults.push({
              success: false,
              channel: "email",
              recipient,
              error: error instanceof Error ? error.message : "Failed to send email notification",
            });
          }
        }
      }
    }

    return allResults;
  }

  /**
   * Get all registered providers
   */
  getProviders(): INotificationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a channel is available
   */
  hasChannel(channel: "email" | "slack"): boolean {
    return this.providers.has(channel);
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

/**
 * Get the singleton notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}
