/**
 * Utility to allow specific users (e.g. company lead) to view all leave requests
 * without being HR. Used for read-only visibility; approval flows remain unchanged.
 *
 * Configure via env: VIEW_ALL_LEAVE_REQUESTS_EMAILS (comma-separated, case-insensitive).
 * Example: VIEW_ALL_LEAVE_REQUESTS_EMAILS=manan@copilotinnovations.com
 */

export function canViewAllLeaveRequests(user: { email: string }): boolean {
  const emails = process.env.VIEW_ALL_LEAVE_REQUESTS_EMAILS;
  if (!emails || typeof emails !== "string") {
    return false;
  }
  const list = emails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(user.email.toLowerCase());
}
