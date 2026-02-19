'use client';

import { LeaveRequestsListPageContent } from '../_components/LeaveRequestsListPageContent';

/**
 * Leave Approvals – only requests that reach the user as supervisor (PM/Tech Lead).
 * Distinct route so the sidebar highlights "Leave Approvals" and not "All Leave Requests".
 */
export default function LeaveApprovalsPage() {
  return (
    <LeaveRequestsListPageContent
      view="approvals"
      pageTitle="Leave Approvals"
      pageDescription="Review and approve leave requests that require your attention"
    />
  );
}
