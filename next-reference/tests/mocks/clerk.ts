import { vi } from "vitest";

export const mockAuth = vi.fn().mockResolvedValue({
  userId: "user_test123",
});

export const mockCurrentUser = vi.fn().mockResolvedValue({
  id: "user_test123",
  emailAddresses: [{ emailAddress: "test@example.com" }],
  firstName: "Test",
  lastName: "User",
});

