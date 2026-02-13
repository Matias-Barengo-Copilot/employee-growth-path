import { describe, it, expect } from 'vitest';
import { getNavigationItemsByRole } from '../navigation';

describe('getNavigationItemsByRole', () => {
  it('should return correct items for employee role', () => {
    const items = getNavigationItemsByRole('employee');
    
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual([
      'Submit Leave Request',
      'My Requests',
    ]);
  });

  it('should return correct items for supervisor role', () => {
    const items = getNavigationItemsByRole('supervisor');
    
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.map((item) => item.label)).toContain('Submit Leave Request');
    expect(items.map((item) => item.label)).toContain('My Requests');
    expect(items.map((item) => item.label)).toContain('Approve Requests');
    expect(items.map((item) => item.label)).toContain('Other Requests');
  });

  // Note: MD role has been removed and merged with HR role
  // This test is kept for historical reference but should be updated if needed

  it('should return correct items for hr role', () => {
    const items = getNavigationItemsByRole('hr');
    
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.map((item) => item.label)).toContain('Leave Approvals');
    expect(items.map((item) => item.label)).toContain('Members');
    expect(items.map((item) => item.label)).toContain('Settings');
    // HR should NOT have access to Submit Leave Request or My Requests
    expect(items.map((item) => item.label)).not.toContain('Submit Leave Request');
    expect(items.map((item) => item.label)).not.toContain('My Requests');
  });

  it('should not include hr-only items for employee role', () => {
    const items = getNavigationItemsByRole('employee');
    
    expect(items.map((item) => item.label)).not.toContain('Create Employee');
    expect(items.map((item) => item.label)).not.toContain('All Requests');
    expect(items.map((item) => item.label)).not.toContain('Settings');
  });
});

