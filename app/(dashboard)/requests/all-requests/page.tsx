'use client';

import { LeaveRequestsListPageContent } from '../_components/LeaveRequestsListPageContent';

/**
 * All Leave Requests – company-wide list (for HR / view-all users).
 * Distinct route from /requests/approvals so the sidebar highlights the correct tab.
 */
export default function AllLeaveRequestsPage() {
  return (
    <LeaveRequestsListPageContent
      view="all"
      pageTitle="All Leave Requests"
      pageDescription="View and manage all leave requests that require your attention"
    />
  );
}
