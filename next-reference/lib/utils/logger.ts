/**
 * Logger utility for conditional logging
 * Logs are only shown in development or when DEBUG=true
 */

const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logs - only shown in development or when DEBUG=true
   */
  debug: (...args: unknown[]) => {
    if (DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only shown in development or when DEBUG=true
   */
  info: (...args: unknown[]) => {
    if (DEBUG) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Error logs - always shown (errors should be logged in production)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Warning logs - always shown (warnings should be logged in production)
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
};
