import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_TO_FOOD_TYPE_MAPPING, STORAGE_COMPATIBILITY } from "@/lib/constants";
import { logger } from "@/lib/logger";

export type NotificationType =
  | "claim_created"
  | "claim_cancelled"
  | "claim_cancelled_by_vendor"
  | "pickup_completed"
  | "donation_created"
  | "donation_recommended"
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

// ============================================================================
// NGO Recommendation Scoring for Notifications
// ============================================================================

interface DonationItemData {
  category: string;
  storage_condition: string;
  quantity: number;
  spoilage_risk?: string;
}

interface DonationBatchData {
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_date: string;
}

interface NGOProfileForScoring {
  id: string;
  food_types: string[] | null;
  address_lat: number | null;
  address_lng: number | null;
  storage_capacity: string | null;
  verification_status: string | null;
}

// Calculate distance using Haversine formula
function calculateDistanceForNotification(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number | null {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse NGO extended profile from storage_capacity JSON
function parseNGOExtendedProfile(storageCapacity: string | null) {
  const defaults = {
    storageRoomTemp: true,
    storageRefrigerator: false,
    storageFreezer: false,
    storageHeated: false,
    pickupRadius: 10,
    priorityNeeds: [] as string[],
  };

  if (!storageCapacity) return defaults;

  try {
    const parsed = JSON.parse(storageCapacity);
    return {
      storageRoomTemp: parsed.storage_room_temp ?? true,
      storageRefrigerator: parsed.storage_refrigerator ?? false,
      storageFreezer: parsed.storage_freezer ?? false,
      storageHeated: parsed.storage_heated ?? false,
      pickupRadius: parseFloat(parsed.pickup_radius) || 10,
      priorityNeeds: parsed.priority_needs || [],
    };
  } catch {
    return defaults;
  }
}

// Calculate recommendation score for an NGO
function calculateNGORecommendationScore(
  ngo: NGOProfileForScoring,
  items: DonationItemData[],
  batch: DonationBatchData
): { score: number; distance: number | null } {
  if (items.length === 0) return { score: 0, distance: null };

  const extended = parseNGOExtendedProfile(ngo.storage_capacity);
  let foodMatchScore = 0;
  let locationScore = 0;
  let storageScore = 0;
  let urgencyScore = 0;

  // Calculate distance
  const distance = calculateDistanceForNotification(
    ngo.address_lat,
    ngo.address_lng,
    batch.pickup_lat,
    batch.pickup_lng
  );

  // 1. FOOD MATCH (0-25 pts)
  const ngoFoodTypes = ngo.food_types || [];
  if (ngoFoodTypes.length === 0) {
    foodMatchScore = 17; // Accepts all
  } else {
    let matchingItems = 0;
    for (const item of items) {
      const mappedTypes = CATEGORY_TO_FOOD_TYPE_MAPPING[item.category] || ["Packaged Food"];
      const hasMatch = mappedTypes.some(type =>
        ngoFoodTypes.some(pref => pref.toLowerCase() === type.toLowerCase())
      );
      if (hasMatch) matchingItems++;
    }
    foodMatchScore = Math.round((matchingItems / items.length) * 25);
  }

  // 2. LOCATION (0-20 pts)
  if (distance !== null) {
    const pickupRadius = extended.pickupRadius;
    if (distance <= pickupRadius * 0.25) locationScore = 20;
    else if (distance <= pickupRadius * 0.5) locationScore = 16;
    else if (distance <= pickupRadius * 0.75) locationScore = 12;
    else if (distance <= pickupRadius) locationScore = 8;
    else if (distance <= pickupRadius * 1.5) locationScore = 4;
    else locationScore = 0;
  } else {
    locationScore = 10; // Unknown distance
  }

  // 3. STORAGE (0-15 pts)
  const storageMap: Record<string, string> = {
    room_temperature: "room",
    refrigerated: "refrigerator",
    frozen: "freezer",
    keep_warm: "heated",
  };

  let compatibleItems = 0;
  for (const item of items) {
    const required = storageMap[item.storage_condition] || "room";
    let canStore = false;
    if (required === "room" && extended.storageRoomTemp) canStore = true;
    if (required === "refrigerator" && extended.storageRefrigerator) canStore = true;
    if (required === "freezer" && extended.storageFreezer) canStore = true;
    if (required === "heated" && (extended.storageHeated || extended.storageRoomTemp)) canStore = true;
    if (canStore) compatibleItems++;
  }
  storageScore = Math.round((compatibleItems / items.length) * 15);

  // 4. URGENCY (0-15 pts) - based on spoilage risk
  const highRiskCount = items.filter(i => i.spoilage_risk === "high" || i.spoilage_risk === "expired").length;
  const mediumRiskCount = items.filter(i => i.spoilage_risk === "medium").length;
  urgencyScore = Math.min(15, highRiskCount * 6 + mediumRiskCount * 2);

  // Total score (max 75 for notification threshold)
  const total = foodMatchScore + locationScore + storageScore + urgencyScore;

  return { score: total, distance };
}

const NOTIFICATION_SCORE_THRESHOLD = 35; // Minimum score to notify (out of ~75)
const MAX_DISTANCE_KM = 15; // Maximum distance to notify

/**
 * Notify NGOs when a new donation matches their preferences (recommended)
 * Uses full scoring algorithm: food match, location, storage, urgency
 */
export async function notifyNgosOfNewDonation(
  vendorName: string,
  items: DonationItemData[],
  pickupLocation: string,
  batchId: string,
  batchData: DonationBatchData
): Promise<void> {
  logger.system.info("Starting NGO notification process", {
    vendorName,
    itemCount: items.length,
    batchId
  });

  // Get all NGO user IDs
  const ngoUserIds = await getUsersByRole("ngo");
  if (ngoUserIds.length === 0) {
    logger.system.info("No NGO users found to notify");
    return;
  }

  // Get NGO profiles with scoring data
  const { data: ngoProfiles, error } = await supabase
    .from("profiles")
    .select("id, food_types, address_lat, address_lng, storage_capacity, verification_status")
    .in("id", ngoUserIds)
    .eq("verification_status", "verified");

  if (error) {
    logger.system.error("Failed to fetch NGO profiles for notification", error.message);
    return;
  }

  // Calculate scores and filter NGOs
  const scoredNgos: Array<{ id: string; score: number; distance: number | null }> = [];

  for (const ngo of ngoProfiles || []) {
    const { score, distance } = calculateNGORecommendationScore(
      ngo as NGOProfileForScoring,
      items,
      batchData
    );

    // Filter by score threshold and max distance
    const withinDistance = distance === null || distance <= MAX_DISTANCE_KM;
    if (score >= NOTIFICATION_SCORE_THRESHOLD && withinDistance) {
      scoredNgos.push({ id: ngo.id, score, distance });
    }
  }

  logger.system.info("NGO notification scoring complete", {
    totalNgos: ngoProfiles?.length || 0,
    qualifiedNgos: scoredNgos.length,
    threshold: NOTIFICATION_SCORE_THRESHOLD,
    maxDistance: MAX_DISTANCE_KM
  });

  if (scoredNgos.length === 0) return;

  // Create notifications for qualified NGOs
  const categoryList = [...new Set(items.map(i => i.category))].slice(0, 3).join(", ");
  const categoryText = items.length > 3 ? `${categoryList} and more` : categoryList;

  await createNotificationForUsers(
    scoredNgos.map(n => n.id),
    "donation_recommended",
    "Recommended Donation Available",
    `${vendorName} has posted items matching your preferences (${categoryText}) near your location. Available for pickup at ${pickupLocation}.`,
    "donation_batch",
    batchId
  );

  logger.system.info("NGO notifications sent", {
    notifiedCount: scoredNgos.length,
    batchId
  });
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
