import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createNotification,
  createNotificationForUsers,
  getUsersByRole,
  notifyVendorOfClaim,
  notifyVendorOfClaimCancellation,
  notifyNgoOfPickupComplete,
  notifyNgosOfNewDonation,
  notifyUserOfVerificationStatus,
  notifyUsersOfAnnouncement,
  notifyUserOfComplaintResolution,
  notifyNgoOfClaimCancelledByVendor,
} from "./notifications";

// Mock Supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
    })),
  },
}));

// Mock console.error to avoid cluttering test output
vi.spyOn(console, "error").mockImplementation(() => {});

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain for each test
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
    });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockIn.mockReturnValue({ eq: mockEq });
  });

  // ============================================================================
  // createNotification Tests
  // ============================================================================
  describe("createNotification", () => {
    it("creates a notification with required fields", async () => {
      await createNotification({
        userId: "user123",
        type: "claim_created",
        title: "Test Title",
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user123",
        type: "claim_created",
        title: "Test Title",
        message: null,
        related_entity_type: null,
        related_entity_id: null,
      });
    });

    it("creates a notification with all fields", async () => {
      await createNotification({
        userId: "user123",
        type: "claim_created",
        title: "Test Title",
        message: "Test message",
        relatedEntityType: "donation_batch",
        relatedEntityId: "batch123",
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user123",
        type: "claim_created",
        title: "Test Title",
        message: "Test message",
        related_entity_type: "donation_batch",
        related_entity_id: "batch123",
      });
    });

    it("throws error when insert fails", async () => {
      mockInsert.mockResolvedValue({ error: { message: "Insert failed" } });

      await expect(
        createNotification({
          userId: "user123",
          type: "claim_created",
          title: "Test",
        })
      ).rejects.toEqual({ message: "Insert failed" });
    });
  });

  // ============================================================================
  // createNotificationForUsers Tests
  // ============================================================================
  describe("createNotificationForUsers", () => {
    it("creates notifications for multiple users", async () => {
      await createNotificationForUsers(
        ["user1", "user2", "user3"],
        "announcement",
        "Test Announcement",
        "Test message"
      );

      expect(mockInsert).toHaveBeenCalledWith([
        {
          user_id: "user1",
          type: "announcement",
          title: "Test Announcement",
          message: "Test message",
          related_entity_type: null,
          related_entity_id: null,
        },
        {
          user_id: "user2",
          type: "announcement",
          title: "Test Announcement",
          message: "Test message",
          related_entity_type: null,
          related_entity_id: null,
        },
        {
          user_id: "user3",
          type: "announcement",
          title: "Test Announcement",
          message: "Test message",
          related_entity_type: null,
          related_entity_id: null,
        },
      ]);
    });

    it("returns early for empty user array", async () => {
      await createNotificationForUsers([], "announcement", "Test");

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("includes related entity fields when provided", async () => {
      await createNotificationForUsers(
        ["user1"],
        "donation_created",
        "New Donation",
        "Message",
        "donation_batch",
        "batch123"
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          related_entity_type: "donation_batch",
          related_entity_id: "batch123",
        }),
      ]);
    });
  });

  // ============================================================================
  // getUsersByRole Tests
  // ============================================================================
  describe("getUsersByRole", () => {
    it("returns user IDs for specified role", async () => {
      mockEq.mockResolvedValue({
        data: [{ user_id: "user1" }, { user_id: "user2" }],
        error: null,
      });

      const result = await getUsersByRole("vendor");

      expect(result).toEqual(["user1", "user2"]);
    });

    it("returns empty array on error", async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      const result = await getUsersByRole("ngo");

      expect(result).toEqual([]);
    });

    it("returns empty array when no users found", async () => {
      mockEq.mockResolvedValue({ data: [], error: null });

      const result = await getUsersByRole("admin");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Specific Notification Helper Tests
  // ============================================================================
  describe("notifyVendorOfClaim", () => {
    it("creates notification with correct message format", async () => {
      await notifyVendorOfClaim(
        "vendor123",
        "Food Bank NGO",
        "BATCH-001",
        5,
        "batch-id-123"
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "vendor123",
          type: "claim_created",
          title: "Food Items Claimed",
          message: "Food Bank NGO has claimed 5 item(s) from batch BATCH-001. Please prepare for pickup.",
          related_entity_type: "donation_batch",
          related_entity_id: "batch-id-123",
        })
      );
    });
  });

  describe("notifyVendorOfClaimCancellation", () => {
    it("creates notification with correct message format", async () => {
      await notifyVendorOfClaimCancellation(
        "vendor123",
        "Food Bank NGO",
        "Rice",
        "BATCH-001",
        "item-id-123"
      );

      const callArg = mockInsert.mock.calls[0][0];
      expect(callArg.type).toBe("claim_cancelled");
      expect(callArg.title).toBe("Claim Cancelled");
      expect(callArg.message).toContain("Food Bank NGO has cancelled their claim");
      expect(callArg.message).toContain("Rice");
      expect(callArg.message).toContain("BATCH-001");
    });
  });

  describe("notifyNgoOfPickupComplete", () => {
    it("creates notification with correct message format", async () => {
      await notifyNgoOfPickupComplete(
        "ngo123",
        "ABC Restaurant",
        "Fresh Vegetables",
        "claim-id-123"
      );

      const callArg = mockInsert.mock.calls[0][0];
      expect(callArg.user_id).toBe("ngo123");
      expect(callArg.type).toBe("pickup_completed");
      expect(callArg.title).toBe("Pickup Completed");
      expect(callArg.message).toContain("Fresh Vegetables");
      expect(callArg.message).toContain("ABC Restaurant");
    });
  });

  describe("notifyUserOfVerificationStatus", () => {
    it("creates approval notification", async () => {
      await notifyUserOfVerificationStatus("user123", "verified", "John");

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "verification_approved",
          title: "Account Verified",
          message: expect.stringContaining("Congratulations"),
        })
      );
    });

    it("creates rejection notification", async () => {
      await notifyUserOfVerificationStatus("user123", "rejected", "John");

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "verification_rejected",
          title: "Verification Rejected",
          message: expect.stringContaining("not approved"),
        })
      );
    });
  });

  describe("notifyUserOfComplaintResolution", () => {
    it("creates notification with full resolution text", async () => {
      const shortResolution = "Issue has been addressed.";

      await notifyUserOfComplaintResolution(
        "user123",
        "quality",
        shortResolution,
        "complaint-id-123"
      );

      const callArg = mockInsert.mock.calls[0][0];
      expect(callArg.type).toBe("complaint_resolved");
      expect(callArg.title).toBe("Complaint Resolved");
      expect(callArg.message).toContain("quality complaint");
      expect(callArg.message).toContain(shortResolution);
    });

    it("truncates long resolution text", async () => {
      const longResolution = "A".repeat(200);

      await notifyUserOfComplaintResolution(
        "user123",
        "quality",
        longResolution,
        "complaint-id-123"
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("..."),
        })
      );
    });
  });

  describe("notifyNgoOfClaimCancelledByVendor", () => {
    it("creates notification with correct message", async () => {
      await notifyNgoOfClaimCancelledByVendor(
        "ngo123",
        "ABC Restaurant",
        "Fresh Bread",
        "item-id-123"
      );

      const callArg = mockInsert.mock.calls[0][0];
      expect(callArg.user_id).toBe("ngo123");
      expect(callArg.type).toBe("claim_cancelled_by_vendor");
      expect(callArg.title).toBe("Reservation Cancelled by Vendor");
      expect(callArg.message).toContain("ABC Restaurant");
      expect(callArg.message).toContain("Fresh Bread");
      expect(callArg.message).toContain("not picked up");
    });
  });

  // ============================================================================
  // notifyNgosOfNewDonation Tests (Complex matching logic)
  // ============================================================================
  describe("notifyNgosOfNewDonation", () => {
    const defaultItems = [
      { category: "Vegetables", storage_condition: "room_temperature", quantity: 10 },
    ];
    const defaultBatchData = {
      pickup_lat: 3.1390,
      pickup_lng: 101.6869,
      pickup_date: "2026-04-05",
    };

    beforeEach(() => {
      // Mock getUsersByRole to return NGO IDs
      mockEq.mockResolvedValue({
        data: [{ user_id: "ngo1" }, { user_id: "ngo2" }, { user_id: "ngo3" }],
        error: null,
      });
    });

    it("returns early if no NGOs found", async () => {
      mockEq.mockResolvedValue({ data: [], error: null });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        defaultItems,
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockIn).not.toHaveBeenCalled();
    });

    it("notifies NGOs with no food type preferences", async () => {
      mockIn.mockResolvedValue({
        data: [
          { id: "ngo1", food_types: null, address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
          { id: "ngo2", food_types: [], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
        ],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        defaultItems,
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockInsert).toHaveBeenCalled();
    });

    it("notifies only matching NGOs based on food type preferences", async () => {
      mockIn.mockResolvedValue({
        data: [
          { id: "ngo1", food_types: ["Vegetables", "Fruits"], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
          { id: "ngo2", food_types: ["Bakery", "Dairy"], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
          { id: "ngo3", food_types: ["Vegetables"], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
        ],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        [
          { category: "Vegetables", storage_condition: "room_temperature", quantity: 5 },
          { category: "Grains", storage_condition: "room_temperature", quantity: 3 },
        ],
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockInsert).toHaveBeenCalled();
    });

    it("handles case-insensitive category matching", async () => {
      mockIn.mockResolvedValue({
        data: [
          { id: "ngo1", food_types: ["vegetables"], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
        ],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        defaultItems,
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockInsert).toHaveBeenCalled();
    });

    it("formats category text correctly for 3 or fewer categories", async () => {
      mockIn.mockResolvedValue({
        data: [{ id: "ngo1", food_types: null, address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" }],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        [
          { category: "Vegetables", storage_condition: "room_temperature", quantity: 5 },
          { category: "Fruits", storage_condition: "refrigerated", quantity: 3 },
          { category: "Bakery", storage_condition: "room_temperature", quantity: 2 },
        ],
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: expect.stringContaining("Vegetables, Fruits, Bakery"),
        }),
      ]);
    });

    it("truncates category text for more than 3 categories", async () => {
      mockIn.mockResolvedValue({
        data: [{ id: "ngo1", food_types: null, address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" }],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        [
          { category: "Vegetables", storage_condition: "room_temperature", quantity: 5 },
          { category: "Fruits", storage_condition: "refrigerated", quantity: 3 },
          { category: "Bakery", storage_condition: "room_temperature", quantity: 2 },
          { category: "Dairy", storage_condition: "refrigerated", quantity: 4 },
          { category: "Grains", storage_condition: "room_temperature", quantity: 6 },
        ],
        "KL Sentral",
        "batch123",
        defaultBatchData
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: expect.stringContaining("and more"),
        }),
      ]);
    });

    it("returns early if no matching NGOs found", async () => {
      mockIn.mockResolvedValue({
        data: [
          { id: "ngo1", food_types: ["Dairy"], address_lat: 3.14, address_lng: 101.69, storage_capacity: null, verification_status: "verified" },
        ],
        error: null,
      });

      await notifyNgosOfNewDonation(
        "ABC Restaurant",
        defaultItems,
        "KL Sentral",
        "batch123",
        defaultBatchData
      );
    });
  });

  // ============================================================================
  // notifyUsersOfAnnouncement Tests
  // ============================================================================
  describe("notifyUsersOfAnnouncement", () => {
    it("notifies vendors only when targetRole is vendor", async () => {
      mockEq.mockResolvedValue({
        data: [{ user_id: "vendor1" }, { user_id: "vendor2" }],
        error: null,
      });

      await notifyUsersOfAnnouncement(
        "vendor",
        "Important Update",
        "New policy changes",
        "announcement-123"
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: "vendor1" }),
        expect.objectContaining({ user_id: "vendor2" }),
      ]);
    });

    it("notifies all users when targetRole is 'all'", async () => {
      // First call returns vendors, second call returns NGOs
      mockEq
        .mockResolvedValueOnce({
          data: [{ user_id: "vendor1" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ user_id: "ngo1" }],
          error: null,
        });

      await notifyUsersOfAnnouncement(
        "all",
        "Platform Update",
        "New features available",
        "announcement-123"
      );

      // Should have fetched both vendors and NGOs
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: "vendor1" }),
        expect.objectContaining({ user_id: "ngo1" }),
      ]);
    });

    it("truncates long content", async () => {
      mockEq.mockResolvedValue({
        data: [{ user_id: "user1" }],
        error: null,
      });

      const longContent = "A".repeat(250);

      await notifyUsersOfAnnouncement(
        "ngo",
        "Long Announcement",
        longContent,
        "announcement-123"
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: expect.stringMatching(/\.\.\.$/),
        }),
      ]);
    });

    it("keeps short content unchanged", async () => {
      mockEq.mockResolvedValue({
        data: [{ user_id: "user1" }],
        error: null,
      });

      const shortContent = "Short message";

      await notifyUsersOfAnnouncement(
        "ngo",
        "Short Announcement",
        shortContent,
        "announcement-123"
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: shortContent,
        }),
      ]);
    });
  });
});
