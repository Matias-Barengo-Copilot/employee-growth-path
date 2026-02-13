/**
 * Base notification provider
 * Abstract class that all notification providers should extend
 */
import { INotificationProvider, NotificationChannel, NotificationRecipient, NotificationPayload, NotificationResult } from "../types";

export abstract class BaseNotificationProvider implements INotificationProvider {
  protected abstract channel: NotificationChannel;
  protected supportedTypes: string[] = [];

  abstract send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<NotificationResult>;

  supports(type: string): boolean {
    return this.supportedTypes.includes(type);
  }

  getChannel(): NotificationChannel {
    return this.channel;
  }

  /**
   * Validate that the recipient has the required information for this channel
   */
  protected validateRecipient(recipient: NotificationRecipient): void {
    if (!recipient.email) {
      throw new Error(`Recipient ${recipient.id} is missing email address`);
    }
  }
}
