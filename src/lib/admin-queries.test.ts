import { describe, it, expect, beforeEach, vi } from "vitest";

// Create mock functions
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      })),
    })),
  },
}));

// Import after mocking
import { fetchProfilesWithRoles, fetchComplaintsWithReporter } from "./admin-queries";

describe("Admin Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockIn.mockResolvedValue({ data: [], error: null });
  });

  // ============================================================================
  // fetchProfilesWithRoles Tests
  // ============================================================================
  describe("fetchProfilesWithRoles", () => {
    it("fetches all profiles without verification filter", async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: "user1", name: "User 1", email: "user1@test.com", verification_status: "verified" },
          { id: "user2", name: "User 2", email: "user2@test.com", verification_status: "pending" },
        ],
        error: null,
      });

      mockIn.mockResolvedValue({
        data: [
          { user_id: "user1", role: "vendor" },
          { user_id: "user2", role: "ngo" },
        ],
        error: null,
      });

      const result = await fetchProfilesWithRoles();

      expect(result).toHaveLength(2);
      expect(result[0].user_roles).toEqual([{ role: "vendor" }]);
      expect(result[1].user_roles).toEqual([{ role: "ngo" }]);
    });

    it("fetches profiles with verification status filter", async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: "user1", name: "User 1", verification_status: "pending" },
        ],
        error: null,
      });

      mockIn.mockResolvedValue({
        data: [{ user_id: "user1", role: "vendor" }],
        error: null,
      });

      const result = await fetchProfilesWithRoles("pending");

      expect(result).toHaveLength(1);
      expect(result[0].verification_status).toBe("pending");
    });

    it("returns empty array when no profiles found", async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await fetchProfilesWithRoles();

      expect(result).toEqual([]);
    });

    it("handles users with multiple roles", async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: "user1", name: "Admin User" },
        ],
        error: null,
      });

      mockIn.mockResolvedValue({
        data: [
          { user_id: "user1", role: "admin" },
          { user_id: "user1", role: "vendor" },
        ],
        error: null,
      });

      const result = await fetchProfilesWithRoles();

      expect(result[0].user_roles).toHaveLength(2);
      expect(result[0].user_roles).toContainEqual({ role: "admin" });
      expect(result[0].user_roles).toContainEqual({ role: "vendor" });
    });

    it("handles users with no roles", async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: "user1", name: "User without role" },
        ],
        error: null,
      });

      mockIn.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await fetchProfilesWithRoles();

      expect(result[0].user_roles).toEqual([]);
    });

    it("throws error when profiles query fails", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(fetchProfilesWithRoles()).rejects.toEqual({ message: "Database error" });
    });

    it("throws error when roles query fails", async () => {
      mockOrder.mockResolvedValue({
        data: [{ id: "user1", name: "User 1" }],
        error: null,
      });

      mockIn.mockResolvedValue({
        data: null,
        error: { message: "Roles query failed" },
      });

      await expect(fetchProfilesWithRoles()).rejects.toEqual({ message: "Roles query failed" });
    });
  });

  // ============================================================================
  // fetchComplaintsWithReporter Tests
  // ============================================================================
  describe("fetchComplaintsWithReporter", () => {
    it("fetches complaints with reporter details", async () => {
      // First call for complaints
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: "complaint1", reporter_id: "user1", type: "quality", status: "pending" },
          ],
          error: null,
        });

      // Profiles query
      mockIn
        .mockResolvedValueOnce({
          data: [
            { id: "user1", name: "Reporter 1", email: "r1@test.com", phone: "123", business_name: "Biz 1" },
          ],
          error: null,
        })
        // Roles query
        .mockResolvedValueOnce({
          data: [
            { user_id: "user1", role: "vendor" },
          ],
          error: null,
        });

      const result = await fetchComplaintsWithReporter();

      expect(result).toHaveLength(1);
      expect(result[0].reporter).toEqual({
        name: "Reporter 1",
        email: "r1@test.com",
        phone: "123",
        business_name: "Biz 1",
        role: "vendor",
      });
    });

    it("handles empty complaints list", async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await fetchComplaintsWithReporter();

      expect(result).toEqual([]);
    });

    it("returns null reporter when reporter profile not found", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [
          { id: "complaint1", reporter_id: "deleted_user", type: "quality" },
        ],
        error: null,
      });

      mockIn
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const result = await fetchComplaintsWithReporter();

      expect(result).toHaveLength(1);
      expect(result[0].reporter).toBeNull();
    });

    it("throws error when complaints query fails", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(fetchComplaintsWithReporter()).rejects.toEqual({ message: "Query failed" });
    });

    it("throws error when reporters query fails", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ id: "complaint1", reporter_id: "user1", type: "quality" }],
        error: null,
      });

      mockIn.mockResolvedValueOnce({
        data: null,
        error: { message: "Profiles query failed" },
      });

      await expect(fetchComplaintsWithReporter()).rejects.toEqual({ message: "Profiles query failed" });
    });

    it("throws error when roles query fails", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ id: "complaint1", reporter_id: "user1", type: "quality" }],
        error: null,
      });

      mockIn
        .mockResolvedValueOnce({
          data: [{ id: "user1", name: "Reporter", email: "r@test.com", phone: null, business_name: null }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Roles query failed" },
        });

      await expect(fetchComplaintsWithReporter()).rejects.toEqual({ message: "Roles query failed" });
    });

    it("handles reporter without role", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ id: "complaint1", reporter_id: "user1", type: "quality" }],
        error: null,
      });

      mockIn
        .mockResolvedValueOnce({
          data: [{ id: "user1", name: "Reporter", email: "r@test.com", phone: null, business_name: null }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const result = await fetchComplaintsWithReporter();

      expect(result[0].reporter?.role).toBeUndefined();
    });

    it("handles complaints with same reporter (deduplication)", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [
          { id: "complaint1", reporter_id: "user1", type: "quality" },
          { id: "complaint2", reporter_id: "user1", type: "no_show" },
        ],
        error: null,
      });

      mockIn
        .mockResolvedValueOnce({
          data: [
            { id: "user1", name: "Reporter 1", email: "r1@test.com", phone: null, business_name: null },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ user_id: "user1", role: "vendor" }],
          error: null,
        });

      const result = await fetchComplaintsWithReporter();

      expect(result).toHaveLength(2);
      expect(result[0].reporter?.name).toBe("Reporter 1");
      expect(result[1].reporter?.name).toBe("Reporter 1");
    });
  });
});
