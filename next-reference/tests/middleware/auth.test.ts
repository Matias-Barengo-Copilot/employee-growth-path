import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAuthenticatedUser, requireRole } from "@/lib/middleware/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db/client";
import { createMockEmployee } from "../utils/test-helpers";
import type { Session } from "next-auth";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/services/admin.service", () => ({
  detectAndSetInitialAdmin: vi.fn().mockResolvedValue(false),
}));

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthenticatedUser", () => {
    it("should return authenticated user", async () => {
      const mockSession = {
        user: {
          email: "test@example.com",
          name: "Test User",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockSession as Session | null);

      const mockEmployee = createMockEmployee({ email: "test@example.com" });
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockEmployee]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await getAuthenticatedUser();

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(mockEmployee.id);
      expect(result.email).toBe("test@example.com");
    });

    it("should throw UnauthorizedError if session is missing", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if email is missing", async () => {
      const mockSession = {
        user: {
          name: "Test User",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockSession as Session | null);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if employee record not found", async () => {
      const mockSession = {
        user: {
          email: "test@example.com",
          name: "Test User",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockSession as Session | null);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("requireRole", () => {
    it("should not throw if user has required role", () => {
      const user = {
        employeeId: "emp_test123",
        role: "hr" as const,
        companyId: "company_test123",
        email: "test@example.com",
        name: "Test User",
      };

      expect(() => requireRole(user, ["hr"])).not.toThrow();
    });

    it("should throw ForbiddenError if user does not have required role", () => {
      const user = {
        employeeId: "emp_test123",
        role: "employee" as const,
        companyId: "company_test123",
        email: "test@example.com",
        name: "Test User",
      };

      expect(() => requireRole(user, ["hr"])).toThrow(ForbiddenError);
    });
  });
});
