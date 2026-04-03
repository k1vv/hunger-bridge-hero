import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "claim_created"
  | "claim_cancelled"
  | "claim_cancelled_by_vendor"
  | "pickup_completed"
  | "donation_created"
  | "verification_approved"
  | "verification_rejected"
  | "announcement"
  | "complaint_resolved";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Creates a notification for a specific user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
}: CreateNotificationParams): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message: message || null,
    related_entity_type: relatedEntityType || null,
    related_entity_id: relatedEntityId || null,
  });

  if (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Creates notifications for multiple users
 */
export async function createNotificationForUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message?: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<void> {
  if (userIds.length === 0) return;

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    message: message || null,
    related_entity_type: relatedEntityType || null,
    related_entity_id: relatedEntityId || null,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("Failed to create notifications:", error);
    throw error;
  }
}

/**
 * Gets all users with a specific role
 */
export async function getUsersByRole(role: "vendor" | "ngo" | "admin"): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", role);

  if (error) {
    console.error("Failed to fetch users by role:", error);
    return [];
  }

  return (data || []).map((r) => r.user_id);
}

// ============================================================================
// Notification Helper Functions for Specific Use Cases
// ============================================================================

/**
 * Notify vendor when NGO claims their food items
 */
export async function notifyVendorOfClaim(
  vendorId: string,
  ngoName: string,
  batchNumber: string,
  itemCount: number,
  batchId: string
): Promise<void> {
  await createNotification({
    userId: vendorId,
    type: "claim_created",
    title: "Food Items Claimed",
    message: `${ngoName} has claimed ${itemCount} item(s) from batch ${batchNumber}. Please prepare for pickup.`,
    relatedEntityType: "donation_batch",
    relatedEntityId: batchId,
  });
}

/**
 * Notify vendor when NGO cancels a claim
 */
export async function notifyVendorOfClaimCancellation(
  vendorId: string,
  ngoName: string,
  foodName: string,
  batchNumber: string,
  itemId: string
): Promise<void> {
  await createNotification({
    userId: vendorId,
    type: "claim_cancelled",
    title: "Claim Cancelled",
    message: `${ngoName} has cancelled their claim for "${foodName}" from batch ${batchNumber}. The item is now available again.`,
    relatedEntityType: "donation_item",
    relatedEntityId: itemId,
  });
}

/**
 * Notify NGO when pickup is confirmed/completed by vendor
 */
export async function notifyNgoOfPickupComplete(
  ngoId: string,
  vendorName: string,
  foodTitle: string,
  claimId: string
): Promise<void> {
  await createNotification({
    userId: ngoId,
    type: "pickup_completed",
    title: "Pickup Completed",
    message: `Your pickup of "${foodTitle}" from ${vendorName} has been confirmed. The food is now in your possession.`,
    relatedEntityType: "claim",
    relatedEntityId: claimId,
  });
}

/**
 * Notify NGOs when a new donation matches their preferences (recommended)
 * Only notifies NGOs whose food_types overlap with the donation categories
 */
export async function notifyNgosOfNewDonation(
  vendorName: string,
  itemCategories: string[],
  pickupLocation: string,
  batchId: string
): Promise<void> {
  // Get all NGO user IDs
  const ngoUserIds = await getUsersByRole("ngo");
  if (ngoUserIds.length === 0) return;

  // Get NGO profiles with their food type preferences
  const { data: ngoProfiles, error } = await supabase
    .from("profiles")
    .select("id, food_types, service_area")
    .in("id", ngoUserIds);

  if (error) {
    console.error("Failed to fetch NGO profiles:", error);
    return;
  }

  // Find NGOs whose preferences match the donation categories
  const matchingNgoIds: string[] = [];

  for (const ngo of ngoProfiles || []) {
    // If NGO has no food_types preference, they want all types (recommend to them)
    if (!ngo.food_types || ngo.food_types.length === 0) {
      matchingNgoIds.push(ngo.id);
      continue;
    }

    // Check if any of the donation categories match NGO's preferences
    const hasMatchingCategory = itemCategories.some((category) =>
      ngo.food_types!.some((pref) =>
        pref.toLowerCase() === category.toLowerCase()
      )
    );

    if (hasMatchingCategory) {
      matchingNgoIds.push(ngo.id);
    }
  }

  if (matchingNgoIds.length === 0) return;

  // Create notifications only for matching NGOs
  const categoryList = itemCategories.slice(0, 3).join(", ");
  const categoryText = itemCategories.length > 3
    ? `${categoryList} and ${itemCategories.length - 3} more`
    : categoryList;

  await createNotificationForUsers(
    matchingNgoIds,
    "donation_created",
    "Recommended Donation Available",
    `${vendorName} has posted new items matching your preferences (${categoryText}) available for pickup at ${pickupLocation}.`,
    "donation_batch",
    batchId
  );
}

/**
 * Notify user when their verification status changes
 */
export async function notifyUserOfVerificationStatus(
  userId: string,
  status: "verified" | "rejected",
  userName?: string
): Promise<void> {
  const isApproved = status === "verified";

  await createNotification({
    userId,
    type: isApproved ? "verification_approved" : "verification_rejected",
    title: isApproved ? "Account Verified" : "Verification Rejected",
    message: isApproved
      ? "Congratulations! Your account has been verified. You now have full access to the platform."
      : "Unfortunately, your account verification was not approved. Please contact support for more information.",
    relatedEntityType: "profile",
    relatedEntityId: userId,
  });
}

/**
 * Notify users of a new announcement
 */
export async function notifyUsersOfAnnouncement(
  targetRole: "vendor" | "ngo" | "all",
  title: string,
  content: string,
  announcementId: string
): Promise<void> {
  let userIds: string[] = [];

  if (targetRole === "all") {
    const [vendors, ngos] = await Promise.all([
      getUsersByRole("vendor"),
      getUsersByRole("ngo"),
    ]);
    userIds = [...vendors, ...ngos];
  } else {
    userIds = await getUsersByRole(targetRole);
  }

  await createNotificationForUsers(
    userIds,
    "announcement",
    `Announcement: ${title}`,
    content.length > 200 ? content.substring(0, 200) + "..." : content,
    "announcement",
    announcementId
  );
}

/**
 * Notify user when their complaint is resolved
 */
export async function notifyUserOfComplaintResolution(
  userId: string,
  complaintType: string,
  resolution: string,
  complaintId: string
): Promise<void> {
  await createNotification({
    userId,
    type: "complaint_resolved",
    title: "Complaint Resolved",
    message: `Your ${complaintType} complaint has been resolved: ${resolution.length > 150 ? resolution.substring(0, 150) + "..." : resolution}`,
    relatedEntityType: "complaint",
    relatedEntityId: complaintId,
  });
}

/**
 * Notify NGO when vendor cancels their claim due to no pickup
 */
export async function notifyNgoOfClaimCancelledByVendor(
  ngoId: string,
  vendorName: string,
  foodName: string,
  itemId: string
): Promise<void> {
  await createNotification({
    userId: ngoId,
    type: "claim_cancelled_by_vendor",
    title: "Reservation Cancelled by Vendor",
    message: `${vendorName} has cancelled your reservation for "${foodName}" because it was not picked up in time. The item is now available for others.`,
    relatedEntityType: "donation_item",
    relatedEntityId: itemId,
  });
}
