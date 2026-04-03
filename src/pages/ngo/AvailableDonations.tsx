import { useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, MapPin, Clock, Package, Leaf, Thermometer, Star, Info } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { notifyVendorOfClaim } from "@/lib/notifications";

// ============================================================================
// SMART RECOMMENDATION ALGORITHM
// ============================================================================

interface NGOProfileData {
  food_types: string[] | null;
  service_area: string | null;
  storage_capacity: string | null;
  address_lat: number | null;
  address_lng: number | null;
}

interface ExtendedNGOProfile {
  foodTypes: string[];
  storageRoomTemp: boolean;
  storageRefrigerator: boolean;
  storageFreezer: boolean;
  canHandleCooked: boolean;
  hasTransport: boolean;
  pickupRadius: number;
  canUrgentPickup: boolean;
  priorityNeeds: string[];
  lat: number | null;
  lng: number | null;
}

interface ScoreBreakdown {
  total: number;
  foodMatch: number;
  urgency: number;
  storage: number;
  priority: number;
  freshness: number;
  location: number;
  distance: number | null; // in km
}

// Parse extended profile data from storage_capacity JSON
const parseExtendedProfile = (profile: NGOProfileData | null): ExtendedNGOProfile => {
  const defaults: ExtendedNGOProfile = {
    foodTypes: [],
    storageRoomTemp: true,
    storageRefrigerator: false,
    storageFreezer: false,
    canHandleCooked: true,
    hasTransport: false,
    pickupRadius: 10,
    canUrgentPickup: false,
    priorityNeeds: [],
    lat: null,
    lng: null,
  };

  if (!profile) return defaults;

  // Get food types and location from profile
  defaults.foodTypes = profile.food_types || [];
  defaults.lat = profile.address_lat;
  defaults.lng = profile.address_lng;

  // Parse extended data from storage_capacity JSON
  if (profile.storage_capacity) {
    try {
      const parsed = JSON.parse(profile.storage_capacity);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          foodTypes: profile.food_types || [],
          storageRoomTemp: parsed.storage_room_temp ?? true,
          storageRefrigerator: parsed.storage_refrigerator ?? false,
          storageFreezer: parsed.storage_freezer ?? false,
          canHandleCooked: parsed.can_handle_cooked ?? true,
          hasTransport: parsed.has_transport ?? false,
          pickupRadius: parseFloat(parsed.pickup_radius) || 10,
          canUrgentPickup: parsed.can_urgent_pickup ?? false,
          priorityNeeds: parsed.priority_needs || [],
          lat: profile.address_lat,
          lng: profile.address_lng,
        };
      }
    } catch {
      // Not JSON, use defaults
    }
  }

  return defaults;
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number | null => {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Map donation item categories to NGO food type preferences
const categoryToFoodType: Record<string, string[]> = {
  "Vegetables": ["Vegetables"],
  "Fruits": ["Fruits"],
  "Bakery": ["Bakery"],
  "Dairy": ["Dairy"],
  "Grains": ["Grains"],
  "Canned": ["Canned Food"],
  "Frozen": ["Frozen Food"],
  "Cooked": ["Cooked Meals"],
  "Beverage": ["Beverages"],
  "Ready-to-eat": ["Ready-to-eat"],
  "Other": ["Packaged Food"],
};

// Map storage conditions to required storage types
const storageRequirements: Record<string, "room" | "refrigerator" | "freezer"> = {
  "room_temperature": "room",
  "chilled": "refrigerator",
  "frozen": "freezer",
};

// Calculate recommendation score for a batch
const calculateRecommendationScore = (
  batch: any,
  ngoProfile: ExtendedNGOProfile
): ScoreBreakdown => {
  const items = (batch.donation_items || []).filter((i: any) => i.status === "available");
  if (items.length === 0) return { total: 0, foodMatch: 0, urgency: 0, storage: 0, priority: 0, freshness: 0, location: 0, distance: null };

  let foodMatchScore = 0;
  let urgencyScore = 0;
  let storageScore = 0;
  let priorityScore = 0;
  let freshnessScore = 0;
  let locationScore = 0;

  // Calculate distance between NGO and pickup location
  const distance = calculateDistance(
    ngoProfile.lat,
    ngoProfile.lng,
    batch.pickup_lat,
    batch.pickup_lng
  );

  // ============================================================================
  // 1. FOOD PREFERENCE MATCHING (0-25 points) - reduced from 30
  // ============================================================================
  if (ngoProfile.foodTypes.length === 0) {
    // No preferences = accepts all, give base score
    foodMatchScore = 17;
  } else {
    let matchingItems = 0;
    for (const item of items) {
      const itemCategory = item.category || "Other";
      const mappedTypes = categoryToFoodType[itemCategory] || ["Packaged Food"];
      const hasMatch = mappedTypes.some(type =>
        ngoProfile.foodTypes.some(pref =>
          pref.toLowerCase() === type.toLowerCase()
        )
      );
      if (hasMatch) matchingItems++;
    }
    const matchRatio = matchingItems / items.length;
    foodMatchScore = Math.round(matchRatio * 25);
  }

  // ============================================================================
  // 2. LOCATION/DISTANCE SCORE (0-20 points) - NEW
  // ============================================================================
  // Score based on distance relative to NGO's pickup radius
  if (distance !== null) {
    const pickupRadius = ngoProfile.pickupRadius || 10; // Default 10km

    if (distance <= pickupRadius * 0.25) {
      // Very close (within 25% of radius) - full points
      locationScore = 20;
    } else if (distance <= pickupRadius * 0.5) {
      // Close (within 50% of radius)
      locationScore = 16;
    } else if (distance <= pickupRadius * 0.75) {
      // Moderate (within 75% of radius)
      locationScore = 12;
    } else if (distance <= pickupRadius) {
      // Within radius but far
      locationScore = 8;
    } else if (distance <= pickupRadius * 1.5) {
      // Slightly outside radius
      locationScore = 4;
    } else {
      // Far outside radius
      locationScore = 0;
    }

    // Bonus for NGOs with transport capability
    if (ngoProfile.hasTransport && distance <= pickupRadius * 1.5) {
      locationScore = Math.min(20, locationScore + 2);
    }
  } else {
    // No location data available - give neutral score
    locationScore = 10;
  }

  // ============================================================================
  // 3. URGENCY SCORE (0-20 points) - reduced from 25
  // ============================================================================
  const highRiskCount = items.filter((i: any) => i.spoilage_risk === "high").length;
  const mediumRiskCount = items.filter((i: any) => i.spoilage_risk === "medium").length;

  // More weight for high-risk items
  urgencyScore = Math.min(20, highRiskCount * 8 + mediumRiskCount * 3);

  // Bonus if NGO can handle urgent pickups and there are urgent items
  if (ngoProfile.canUrgentPickup && highRiskCount > 0) {
    urgencyScore = Math.min(20, urgencyScore + 4);
  }

  // ============================================================================
  // 4. STORAGE COMPATIBILITY (0-15 points) - reduced from 20
  // ============================================================================
  let compatibleItems = 0;
  for (const item of items) {
    const required = storageRequirements[item.storage_condition] || "room";
    let canStore = false;

    if (required === "room" && ngoProfile.storageRoomTemp) canStore = true;
    if (required === "refrigerator" && ngoProfile.storageRefrigerator) canStore = true;
    if (required === "freezer" && ngoProfile.storageFreezer) canStore = true;

    // Check if it's cooked food and NGO can handle it
    if (item.category === "Cooked" && !ngoProfile.canHandleCooked) canStore = false;

    if (canStore) compatibleItems++;
  }
  const storageRatio = compatibleItems / items.length;
  storageScore = Math.round(storageRatio * 15);

  // ============================================================================
  // 5. PRIORITY NEEDS (0-12 points) - reduced from 15
  // ============================================================================
  if (ngoProfile.priorityNeeds.length > 0) {
    let priorityMatches = 0;
    for (const item of items) {
      const itemCategory = item.category || "Other";
      const mappedTypes = categoryToFoodType[itemCategory] || [];
      const isPriority = mappedTypes.some(type =>
        ngoProfile.priorityNeeds.some(need =>
          need.toLowerCase() === type.toLowerCase()
        )
      );
      if (isPriority) priorityMatches++;
    }
    const priorityRatio = priorityMatches / items.length;
    priorityScore = Math.round(priorityRatio * 12);
  }

  // ============================================================================
  // 6. FRESHNESS SCORE (0-8 points) - reduced from 10
  // ============================================================================
  // Based on how soon the pickup date is (earlier = fresher = better for urgent items)
  const pickupDate = new Date(batch.pickup_date);
  const today = new Date();
  const daysUntilPickup = Math.max(0, Math.floor((pickupDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysUntilPickup === 0) {
    freshnessScore = 8; // Today's pickup
  } else if (daysUntilPickup === 1) {
    freshnessScore = 6;
  } else if (daysUntilPickup <= 3) {
    freshnessScore = 4;
  } else {
    freshnessScore = 2;
  }

  // ============================================================================
  // TOTAL SCORE (0-100)
  // Food: 25 + Location: 20 + Urgency: 20 + Storage: 15 + Priority: 12 + Freshness: 8 = 100
  // ============================================================================
  const total = Math.min(100, foodMatchScore + locationScore + urgencyScore + storageScore + priorityScore + freshnessScore);

  return {
    total,
    foodMatch: foodMatchScore,
    location: locationScore,
    urgency: urgencyScore,
    storage: storageScore,
    priority: priorityScore,
    freshness: freshnessScore,
    distance: distance !== null ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal
  };
};

const AvailableDonations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [halalFilter, setHalalFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // Fetch NGO profile for notifications AND recommendations (MUST be before useMemo that uses it)
  const { data: ngoProfile } = useQuery({
    queryKey: ["ngo_profile_full", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching NGO profile for recommendations", undefined, user?.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("name, business_name, food_types, service_area, storage_capacity, address_lat, address_lng")
        .eq("id", user!.id)
        .single();

      if (error) {
        logger.ngo.error("Failed to fetch NGO profile", error.message, { code: error.code }, user?.id);
        throw error;
      }

      logger.ngo.info("Successfully fetched NGO profile", { hasLocation: !!data?.address_lat, hasFoodTypes: !!data?.food_types?.length }, user?.id);
      return data;
    },
    enabled: !!user,
  });

  // Parse extended NGO profile for recommendation algorithm
  const extendedNgoProfile = useMemo(() => parseExtendedProfile(ngoProfile), [ngoProfile]);

  // Recommended donations query - fetch all available, score client-side
  const { data: allAvailableBatches = [] } = useQuery({
    queryKey: ["all_available_batches"],
    queryFn: async () => {
      logger.ngo.info("Fetching all available donations for recommendations", undefined, user?.id);
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .in("status", ["available", "partially_claimed"])
        .order("pickup_date", { ascending: true });
      if (error) {
        logger.ngo.error("Failed to fetch donations", error.message, { code: error.code }, user?.id);
        throw error;
      }
      const vendorIds = [...new Set((data || []).map((b: any) => b.vendor_id))];
      let vendorMap: Record<string, any> = {};
      if (vendorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, business_name")
          .in("id", vendorIds);
        (profiles || []).forEach((p: any) => { vendorMap[p.id] = p; });
      }
      return (data || []).map((b: any) => ({ ...b, profiles: vendorMap[b.vendor_id] || null }));
    },
  });

  // Smart recommendations - score and sort batches based on NGO profile
  const recommended = useMemo(() => {
    if (!allAvailableBatches.length) return [];

    // Calculate scores for each batch
    const scoredBatches = allAvailableBatches
      .map((batch: any) => {
        const items = (batch.donation_items || []).filter((i: any) => i.status === "available");
        if (items.length === 0) return null;

        const scoreBreakdown = calculateRecommendationScore(batch, extendedNgoProfile);
        return {
          ...batch,
          scoreBreakdown,
          matchScore: scoreBreakdown.total,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.matchScore - a.matchScore) // Sort by score descending
      .slice(0, 10); // Top 10 recommendations

    return scoredBatches;
  }, [allAvailableBatches, extendedNgoProfile]);

  // Available donations - reuse the same data, sorted by created_at
  const batches = useMemo(() => {
    return [...allAvailableBatches].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allAvailableBatches]);

  const filtered = batches.filter((b: any) => {
    const items = b.donation_items || [];
    const availableItems = items.filter((i: any) => i.status === "available");
    if (availableItems.length === 0) return false;
    const matchesSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location.toLowerCase().includes(search.toLowerCase()) ||
      items.some((i: any) => i.food_name.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || items.some((i: any) => i.category === categoryFilter && i.status === "available");
    const matchesHalal = halalFilter === "all" || items.some((i: any) => i.halal_status === halalFilter && i.status === "available");
    return matchesSearch && matchesCategory && matchesHalal;
  });

  const toggleItem = (batchId: string, itemId: string) => {
    setSelectedItems(prev => {
      const batchSet = new Set(prev[batchId] || []);
      if (batchSet.has(itemId)) batchSet.delete(itemId); else batchSet.add(itemId);
      return { ...prev, [batchId]: batchSet };
    });
  };

  const selectAll = (batchId: string, items: any[]) => {
    const available = items.filter((i: any) => i.status === "available");
    setSelectedItems(prev => ({
      ...prev,
      [batchId]: new Set(available.map((i: any) => i.id)),
    }));
  };

  const claimMutation = useMutation({
    mutationFn: async ({ batchId, itemIds, batch }: { batchId: string; itemIds: string[]; batch: any }) => {
      const { error } = await supabase
        .from("donation_items")
        .update({ status: "claimed", claimed_by: user!.id, claimed_at: new Date().toISOString() })
        .in("id", itemIds);
      if (error) throw error;

      const { data: remaining } = await supabase
        .from("donation_items")
        .select("id")
        .eq("batch_id", batchId)
        .eq("status", "available");

      const newBatchStatus = (remaining?.length || 0) === 0 ? "reserved" : "partially_claimed";
      await supabase.from("donation_batches").update({ status: newBatchStatus }).eq("id", batchId);

      // Notify vendor
      const ngoName = ngoProfile?.business_name || ngoProfile?.name || "An NGO";
      try {
        await notifyVendorOfClaim(batch.vendor_id, ngoName, batch.batch_number, itemIds.length, batchId);
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }
    },
    onSuccess: () => {
      toast.success("Items claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["all_available_batches"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_claims"] });
      setSelectedItems({});
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const claimAllMutation = useMutation({
    mutationFn: async (batch: any) => {
      const availableItems = (batch.donation_items || []).filter((i: any) => i.status === "available");
      const ids = availableItems.map((i: any) => i.id);
      const { error } = await supabase.from("donation_items").update({ status: "claimed", claimed_by: user!.id, claimed_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
      await supabase.from("donation_batches").update({ status: "reserved" }).eq("id", batch.id);

      // Notify vendor
      const ngoName = ngoProfile?.business_name || ngoProfile?.name || "An NGO";
      try {
        await notifyVendorOfClaim(batch.vendor_id, ngoName, batch.batch_number, ids.length, batch.id);
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }
    },
    onSuccess: () => {
      toast.success("All items claimed!");
      queryClient.invalidateQueries({ queryKey: ["all_available_batches"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleClaim = (batchId: string, batch: any) => {
    const itemIds = Array.from(selectedItems[batchId] || []);
    if (itemIds.length === 0) {
      toast.error("Select at least one item to claim");
      return;
    }
    claimMutation.mutate({ batchId, itemIds, batch });
  };

  const spoilageColor = (risk: string) => {
    switch (risk) {
      case "high": case "expired": return "text-destructive bg-destructive/10";
      case "medium": return "text-warning bg-warning/10";
      default: return "text-success bg-success/10";
    }
  };

  return (
    <PageLayout title="Donations" subtitle="Recommended and available donations for your organization">
      {/* Recommended Donations — only show if NGO has set food preferences */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Recommended For You</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Recommendations are based on your profile: food preferences, storage capabilities, priority needs, and urgency.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Check if NGO has food preferences set */}
        {extendedNgoProfile.foodTypes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-warning/50 bg-warning/5 p-6 text-center">
            <Star className="h-8 w-8 text-warning mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Set Your Food Preferences</h3>
            <p className="text-xs text-muted-foreground mb-4">
              To get personalized donation recommendations, please update your profile with the types of food your organization accepts.
            </p>
            <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning hover:text-warning-foreground" onClick={() => window.location.href = "/ngo/profile"}>
              Update Profile
            </Button>
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {recommended.map((batch: any, i: number) => {
                const items = (batch.donation_items || []).filter((it: any) => it.status === "available");
                if (items.length === 0) return null;
                const score = batch.matchScore || 0;
                const breakdown = batch.scoreBreakdown as ScoreBreakdown;

                // Score color based on match quality
                const scoreColor = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-muted-foreground";
                const scoreBg = score >= 70 ? "bg-success/10" : score >= 40 ? "bg-warning/10" : "bg-muted";

                return (
                  <motion.div key={batch.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`inline-flex w-72 h-80 flex-shrink-0 flex-col rounded-xl border shadow-card whitespace-normal ${
                      score >= 70 ? "border-success/30 bg-success/5" : score >= 40 ? "border-warning/30 bg-warning/5" : "border-border bg-card"
                    }`}>
                    <div className="p-4 flex-1 min-h-0 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${scoreBg}`}>
                          <Star className={`h-4 w-4 ${scoreColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-accent truncate">{batch.batch_number}</p>
                          <p className="text-xs text-muted-foreground truncate">{batch.profiles?.business_name || batch.profiles?.name}</p>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`text-sm font-bold flex-shrink-0 ${scoreColor}`}>{score}% Match</span>
                            </TooltipTrigger>
                            <TooltipContent className="w-52">
                              <p className="text-xs font-semibold mb-2">Match Breakdown</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Food Match:</span>
                                  <span className="font-medium">{breakdown?.foodMatch || 0}/25</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Location:</span>
                                  <span className="font-medium">{breakdown?.location || 0}/20{breakdown?.distance !== null ? ` (${breakdown.distance}km)` : ""}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Urgency:</span>
                                  <span className="font-medium">{breakdown?.urgency || 0}/20</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Storage:</span>
                                  <span className="font-medium">{breakdown?.storage || 0}/15</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Priority:</span>
                                  <span className="font-medium">{breakdown?.priority || 0}/12</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Freshness:</span>
                                  <span className="font-medium">{breakdown?.freshness || 0}/8</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Match indicators */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {breakdown?.foodMatch >= 17 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">Food Match</span>
                        )}
                        {breakdown?.location >= 16 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info">Nearby</span>
                        )}
                        {breakdown?.urgency >= 12 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Urgent</span>
                        )}
                        {breakdown?.storage >= 12 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">Storage OK</span>
                        )}
                        {breakdown?.priority >= 8 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Priority Need</span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{batch.pickup_location}</span>
                          {breakdown?.distance !== null && (
                            <span className="text-[10px] text-info font-medium ml-1">({breakdown.distance}km)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 flex-shrink-0" /> {batch.pickup_date}</span>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3 flex-shrink-0" /> {items.length} items</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {items.slice(0, 4).map((item: any) => (
                          <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.spoilage_risk === "high" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                            {item.quantity} {item.unit} {item.food_name}
                          </span>
                        ))}
                        {items.length > 4 && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{items.length - 4} more</span>}
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <Button size="sm" className="w-full h-9 text-xs" onClick={() => claimAllMutation.mutate(batch)} disabled={claimAllMutation.isPending}>
                        Claim All
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              {recommended.length === 0 && (
                <div className="flex items-center justify-center w-full py-8 text-sm text-muted-foreground">
                  No matching donations found based on your preferences.
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Available Donations — vertical scroll */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Available Donations</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {["Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={halalFilter} onValueChange={setHalalFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Halal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="halal">Halal</SelectItem>
              <SelectItem value="non_halal">Non-Halal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filtered.map((batch: any, bi: number) => {
            const items = (batch.donation_items || []).filter((i: any) => i.status === "available");
            const selected = selectedItems[batch.id] || new Set();
            const isExpanded = expandedBatch === batch.id;

            return (
              <motion.div key={batch.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: bi * 0.03 }}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-accent">{batch.batch_number}</span>
                        <span className="text-sm font-medium text-foreground">— {batch.profiles?.business_name || batch.profiles?.name || "Donor"}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch.pickup_location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {batch.pickup_date}
                          {batch.pickup_time_start && ` ${batch.pickup_time_start}`}
                          {batch.pickup_time_end && ` - ${batch.pickup_time_end}`}
                        </span>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {items.length} available item(s)</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{batch.donation_type}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {items.slice(0, 5).map((item: any) => (
                      <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {item.quantity} {item.unit} {item.food_name}
                      </span>
                    ))}
                    {items.length > 5 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">+{items.length - 5} more</span>}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border">
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">Select items to claim:</p>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => selectAll(batch.id, items)}>Select All</Button>
                        </div>

                        {items.map((item: any) => (
                          <div key={item.id} className={`rounded-lg border p-3 transition-colors ${selected.has(item.id) ? "border-accent bg-accent/5" : "border-border"}`}>
                            <div className="flex items-start gap-3">
                              <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleItem(batch.id, item.id)} className="mt-0.5" />
                              {item.image_url && <img src={item.image_url} alt={item.food_name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-foreground">{item.food_name}</h4>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${spoilageColor(item.spoilage_risk)}`}>Spoilage: {item.spoilage_risk}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                  <span><strong>{item.quantity}</strong> {item.unit}</span>
                                  <span>· {item.category}</span>
                                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {item.expiry_date}{item.expiry_time && ` ${item.expiry_time}`}</span>
                                  <span className="flex items-center gap-0.5"><Thermometer className="h-3 w-3" /> {item.storage_condition?.replace("_", " ")}</span>
                                  <span className="flex items-center gap-0.5"><Leaf className="h-3 w-3" /> {item.halal_status}</span>
                                </div>
                                {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">{selected.size} of {items.length} item(s) selected</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { selectAll(batch.id, items); handleClaim(batch.id, batch); }}>
                              Claim All ({items.length})
                            </Button>
                            <Button size="sm" onClick={() => handleClaim(batch.id, batch)} disabled={selected.size === 0 || claimMutation.isPending}>
                              Claim Selected ({selected.size})
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No available donations found</div>}
        </div>
      </div>
    </PageLayout>
  );
};

export default AvailableDonations;
