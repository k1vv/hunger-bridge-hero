import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Building2, MapPin, CheckCircle2, Star, ThumbsUp, Truck } from "lucide-react";
import { calculateDistance, calculateReverseMatchScore, formatDistance, type DonationItem, type NGOProfile, type ReverseMatchScore } from "@/lib/matching-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

interface RecommendedNGOsProps {
  items: DonationItem[];
  vendorLat?: number;
  vendorLng?: number;
}

const MAX_DISTANCE_KM = 10; // Maximum radius for NGO matching

const RecommendedNGOs = ({ items, vendorLat, vendorLng }: RecommendedNGOsProps) => {
  // Fetch verified NGOs with their profiles
  const { data: ngos = [], isLoading, error: queryError } = useQuery({
    queryKey: ["recommended_ngos"],
    queryFn: async () => {
      logger.vendor.info("Fetching NGO user IDs from user_roles table");

      // Fetch NGO user IDs from user_roles table
      const { data: ngoRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ngo");

      if (rolesError) {
        const isRlsBlocked = rolesError.code === "PGRST301" || rolesError.message?.includes("permission denied");
        logger.vendor.error(
          "Failed to fetch NGO IDs from user_roles",
          rolesError.message,
          {
            code: rolesError.code,
            isRlsBlocked,
            hint: isRlsBlocked ? "user_roles table needs SELECT policy for authenticated users" : undefined
          }
        );
        throw rolesError;
      }

      const ngoUserIds = (ngoRoles || []).map((r: any) => r.user_id);
      logger.vendor.info("Found NGO user IDs", { count: ngoUserIds.length });

      if (ngoUserIds.length === 0) {
        logger.vendor.warn("No NGO users found in user_roles table");
        return [];
      }

      logger.vendor.info("Fetching NGO profiles from profiles table");

      // Fetch verified NGO profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ngoUserIds)
        .eq("verification_status", "verified");

      if (error) {
        const isRlsBlocked = error.code === "PGRST301" || error.message?.includes("permission denied");
        logger.vendor.error(
          "Failed to fetch NGO profiles",
          error.message,
          {
            code: error.code,
            isRlsBlocked,
            hint: isRlsBlocked ? "profiles table needs SELECT policy for authenticated users" : undefined
          }
        );
        throw error;
      }

      logger.vendor.info("Successfully fetched verified NGO profiles", { count: data?.length || 0 });

      return data || [];
    },
  });

  // Log query error if any
  if (queryError) {
    logger.vendor.error("NGO recommendation query failed", (queryError as Error).message);
  }

  // Parse NGO profiles with extended data
  const ngoProfiles: NGOProfile[] = ngos.map((ngo: any) => {
    let extendedData: any = {};
    if (ngo.storage_capacity) {
      try {
        extendedData = JSON.parse(ngo.storage_capacity);
      } catch (e) {
        // Ignore parse errors
      }
    }

    const storageTypes: string[] = [];
    if (extendedData.storage_room_temp) storageTypes.push("Room Temperature");
    if (extendedData.storage_refrigerator) storageTypes.push("Refrigerated");
    if (extendedData.storage_freezer) storageTypes.push("Freezer");
    if (extendedData.storage_heated) storageTypes.push("Heated Storage");

    return {
      id: ngo.id,
      organization_name: ngo.organization_name || ngo.business_name || ngo.name,
      address: ngo.address,
      lat: ngo.address_lat,
      lng: ngo.address_lng,
      food_types: ngo.food_types || [],
      storage_types: storageTypes.length > 0 ? storageTypes : ["Room Temperature"],
      pickup_radius: parseFloat(extendedData.pickup_radius) || 10,
      priority_needs: extendedData.priority_needs || [],
      halal_only: ngo.halal_only,
      verification_status: ngo.verification_status,
    };
  });

  // Filter items with valid categories
  const validItems = items.filter(i => i.category && i.category.trim() !== "");

  // Filter NGOs within 10km radius
  logger.vendor.info("Filtering NGOs by distance", {
    maxDistance: MAX_DISTANCE_KM,
    vendorLat,
    vendorLng,
    totalNgos: ngoProfiles.length
  });

  const ngosWithDistance = ngoProfiles.map(ngo => {
    const distance = calculateDistance(
      vendorLat ?? null,
      vendorLng ?? null,
      ngo.lat ?? null,
      ngo.lng ?? null
    );
    return { ...ngo, distance };
  });

  const ngosWithinRadius = ngosWithDistance.filter(ngo => {
    if (ngo.distance === null) {
      return true; // Include NGOs without location data
    }
    return ngo.distance <= MAX_DISTANCE_KM;
  });

  logger.vendor.info("Distance filter complete", {
    totalNgos: ngoProfiles.length,
    withinRadius: ngosWithinRadius.length,
    filteredOut: ngoProfiles.length - ngosWithinRadius.length
  });

  // Calculate match scores for NGOs within radius
  logger.vendor.info("Calculating NGO match scores", {
    validItems: validItems.length,
    ngosInRadius: ngosWithinRadius.length,
    items: validItems.map(i => ({ category: i.category, storage: i.storage_condition }))
  });

  let recommended: Array<NGOProfile & { score: ReverseMatchScore }> = [];

  if (validItems.length > 0 && ngosWithinRadius.length > 0) {
    recommended = ngosWithinRadius
      .map(ngo => ({
        ...ngo,
        score: calculateReverseMatchScore(ngo, validItems, vendorLat, vendorLng),
      }))
      .filter(ngo => ngo.score.total >= 20) // Minimum threshold
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 5); // Top 5

    logger.vendor.info("NGO matching complete", {
      recommendedCount: recommended.length,
      recommendations: recommended.map(r => ({
        name: r.organization_name,
        score: r.score.total,
        distance: r.score.distance ? `${r.score.distance.toFixed(1)}km` : "N/A",
        foodMatch: r.score.foodMatch,
        storage: r.score.storage,
        priority: r.score.priority
      }))
    });
  } else {
    logger.vendor.warn("Cannot calculate NGO matches", {
      reason: validItems.length === 0 ? "No valid items" : "No NGOs within radius",
      validItems: validItems.length,
      ngosInRadius: ngosWithinRadius.length
    });
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Don't render if no items at all
  if (items.length === 0) {
    return null;
  }

  // Check if any items have a category selected
  const hasValidItems = validItems.length > 0;

  if (!hasValidItems) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">NGO Recommendations</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Select a food category to see matching NGOs within {MAX_DISTANCE_KM}km of your location.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-accent animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Finding Nearby NGOs...</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommended.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">No Nearby NGO Matches</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No verified NGOs found within {MAX_DISTANCE_KM}km that match your donation items.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Recommended NGOs</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Within {MAX_DISTANCE_KM}km
        </span>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-2">
          {recommended.map((ngo, idx) => {
            const score = ngo.score.total;
            const scoreColor = score >= 70 ? "text-success" : score >= 40 ? "text-accent" : "text-muted-foreground";
            const scoreBg = score >= 70 ? "bg-success/10" : score >= 40 ? "bg-accent/10" : "bg-muted";

            return (
              <motion.div
                key={ngo.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-lg border p-3 ${
                  score >= 70 ? "border-success/30 bg-success/5" :
                  score >= 40 ? "border-accent/30 bg-accent/5" :
                  "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${scoreBg}`}>
                    <Building2 className={`h-5 w-5 ${scoreColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ngo.organization_name}
                      </p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    </div>

                    {ngo.address && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {ngo.address}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${scoreColor}`}>
                        <ThumbsUp className="h-3 w-3" />
                        {score}% match
                      </span>
                      {ngo.score.distance !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {formatDistance(ngo.score.distance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground">
                    <span>Food: {ngo.score.foodMatch}/30</span>
                    <span>Storage: {ngo.score.storage}/20</span>
                    <span>Priority: {ngo.score.priority}/15</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Showing NGOs within {MAX_DISTANCE_KM}km, sorted by food preference and storage match.
      </p>
    </div>
  );
};

export default RecommendedNGOs;
