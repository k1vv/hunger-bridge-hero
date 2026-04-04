/**
 * Matching utilities for vendor-NGO recommendations
 * Provides both forward (NGO sees donations) and reverse (vendor sees NGOs) matching
 *
 * Now enhanced with AI-powered semantic matching using OpenAI embeddings.
 */

import {
  CATEGORY_TO_FOOD_TYPE_MAPPING,
  STORAGE_COMPATIBILITY,
} from "./constants";

import {
  calculateAIMatchScore,
  calculateAIMatchScoresBatch,
  generateMatchExplanation,
  isAIMatchingAvailable,
  type AIMatchScore,
  type AIMatchExplanation,
  type DonationItemForAI,
  type NGOProfileForAI,
} from "./ai/matching";

// Re-export the mapping from constants for backward compatibility
export const categoryToFoodType = CATEGORY_TO_FOOD_TYPE_MAPPING;

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface NGOProfile {
  id: string;
  organization_name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  food_types?: string[];
  storage_types?: string[];
  pickup_radius?: number;
  priority_needs?: string[];
  halal_only?: boolean;
  verification_status?: string;
}

export interface ReverseMatchScore {
  total: number;
  foodMatch: number;
  location: number;
  storage: number;
  priority: number;
  capacity: number;
  distance: number | null;
  // AI-enhanced fields (optional - only present when AI matching is enabled)
  aiScore?: AIMatchScore;
  aiEnhanced?: boolean;
}

// Re-export AI types for convenience
export type { AIMatchScore, AIMatchExplanation, DonationItemForAI, NGOProfileForAI };

export interface DonationItem {
  category?: string;
  storage_condition?: string;
  quantity?: number;
  unit?: string;
  halal_status?: string;
}

/**
 * Calculate reverse match score - how well an NGO matches a vendor's donation
 */
export function calculateReverseMatchScore(
  ngo: NGOProfile,
  items: DonationItem[],
  vendorLat?: number,
  vendorLng?: number
): ReverseMatchScore {
  if (items.length === 0) {
    return {
      total: 0,
      foodMatch: 0,
      location: 0,
      storage: 0,
      priority: 0,
      capacity: 0,
      distance: null,
    };
  }

  let foodMatchScore = 0;
  let locationScore = 0;
  let storageScore = 0;
  let priorityScore = 0;
  let capacityScore = 0;

  // Calculate distance
  const distance = calculateDistance(
    vendorLat ?? null,
    vendorLng ?? null,
    ngo.lat ?? null,
    ngo.lng ?? null
  );

  // 1. FOOD PREFERENCE MATCHING (0-30 points)
  const ngoFoodTypes = ngo.food_types || [];

  if (ngoFoodTypes.length === 0) {
    // NGO accepts all food types
    foodMatchScore = 22;
  } else {
    let matchingItems = 0;
    for (const item of items) {
      const itemCategory = item.category || "Other";
      const mappedTypes = categoryToFoodType[itemCategory] || ["Packaged Food"];
      const hasMatch = mappedTypes.some((type) =>
        ngoFoodTypes.some(
          (pref) => pref.toLowerCase() === type.toLowerCase()
        )
      );
      if (hasMatch) matchingItems++;
    }
    const matchRatio = matchingItems / items.length;
    foodMatchScore = Math.round(matchRatio * 30);
  }

  // 2. LOCATION/DISTANCE SCORE (0-25 points)
  if (distance !== null) {
    const pickupRadius = ngo.pickup_radius || 10; // Default 10km

    if (distance <= pickupRadius * 0.25) {
      locationScore = 25; // Very close
    } else if (distance <= pickupRadius * 0.5) {
      locationScore = 20;
    } else if (distance <= pickupRadius * 0.75) {
      locationScore = 15;
    } else if (distance <= pickupRadius) {
      locationScore = 10;
    } else if (distance <= pickupRadius * 1.5) {
      locationScore = 5; // Outside radius but close
    }
  } else {
    locationScore = 10; // Unknown distance, give base score
  }

  // 3. STORAGE COMPATIBILITY (0-20 points)
  const ngoStorageTypes = ngo.storage_types || ["Room Temperature"];

  let compatibleItems = 0;
  for (const item of items) {
    const condition = item.storage_condition || "room_temperature";
    const acceptableTypes = STORAGE_COMPATIBILITY[condition as keyof typeof STORAGE_COMPATIBILITY] || ["Room Temperature"];
    const isCompatible = acceptableTypes.some((type) =>
      ngoStorageTypes.some(
        (ngoType) => ngoType.toLowerCase() === type.toLowerCase()
      )
    );
    if (isCompatible) compatibleItems++;
  }
  storageScore = Math.round((compatibleItems / items.length) * 20);

  // 4. PRIORITY NEEDS ALIGNMENT (0-15 points)
  const priorityNeeds = ngo.priority_needs || [];
  if (priorityNeeds.length === 0) {
    priorityScore = 8; // No specific priorities
  } else {
    // Check if any item categories match priority needs
    const itemCategories = new Set(items.map((i) => i.category || "Other"));
    let priorityMatches = 0;
    for (const category of itemCategories) {
      if (
        priorityNeeds.some(
          (need) =>
            need.toLowerCase().includes(category.toLowerCase()) ||
            category.toLowerCase().includes(need.toLowerCase())
        )
      ) {
        priorityMatches++;
      }
    }
    priorityScore = Math.min(
      15,
      Math.round((priorityMatches / itemCategories.size) * 15)
    );
  }

  // 5. CAPACITY/QUANTITY HANDLING (0-10 points)
  // NGOs with verified status and storage capabilities get higher capacity scores
  if (ngo.verification_status === "verified") {
    capacityScore = 10;
  } else if (ngo.verification_status === "pending") {
    capacityScore = 5;
  } else {
    capacityScore = 2;
  }

  // Calculate total score
  const total =
    foodMatchScore +
    locationScore +
    storageScore +
    priorityScore +
    capacityScore;

  return {
    total,
    foodMatch: foodMatchScore,
    location: locationScore,
    storage: storageScore,
    priority: priorityScore,
    capacity: capacityScore,
    distance,
  };
}

/**
 * Get recommended NGOs for a vendor's donation
 */
export function getRecommendedNGOs(
  ngos: NGOProfile[],
  items: DonationItem[],
  vendorLat?: number,
  vendorLng?: number,
  limit: number = 5
): Array<NGOProfile & { score: ReverseMatchScore }> {
  if (ngos.length === 0 || items.length === 0) {
    return [];
  }

  // Filter verified NGOs
  const verifiedNGOs = ngos.filter((ngo) => ngo.verification_status === "verified");

  // Calculate scores
  const scoredNGOs = verifiedNGOs.map((ngo) => ({
    ...ngo,
    score: calculateReverseMatchScore(ngo, items, vendorLat, vendorLng),
  }));

  // Filter by minimum threshold, sort, and limit
  return scoredNGOs
    .filter((ngo) => ngo.score.total >= 20)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number | null): string {
  if (distance === null) return "Unknown";
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

// ============================================================================
// AI-ENHANCED MATCHING FUNCTIONS
// ============================================================================

/**
 * Calculate hybrid match score combining rule-based and AI scoring
 * AI scoring adds semantic understanding of food types and preferences
 */
export async function calculateHybridMatchScore(
  ngo: NGOProfile,
  items: DonationItem[],
  vendorLat?: number,
  vendorLng?: number
): Promise<ReverseMatchScore> {
  // First, calculate traditional rule-based score
  const ruleBasedScore = calculateReverseMatchScore(ngo, items, vendorLat, vendorLng);

  // If AI matching is not available, return rule-based score only
  if (!isAIMatchingAvailable()) {
    return ruleBasedScore;
  }

  try {
    // Convert items to AI format
    const aiItems: DonationItemForAI[] = items.map((item) => ({
      category: item.category,
      storage_condition: item.storage_condition,
      quantity: item.quantity,
      unit: item.unit,
      halal_status: item.halal_status,
    }));

    // Convert NGO to AI format
    const aiNgo: NGOProfileForAI = {
      id: ngo.id,
      business_name: ngo.organization_name,
      food_types: ngo.food_types,
      priority_needs: ngo.priority_needs,
      halal_only: ngo.halal_only,
    };

    // Calculate AI score
    const aiScore = await calculateAIMatchScore(aiItems, aiNgo);

    if (!aiScore) {
      return ruleBasedScore;
    }

    // Hybrid scoring: 60% rule-based + 40% AI
    // This preserves the proven rule-based logic while adding semantic understanding
    const hybridTotal = Math.round(
      ruleBasedScore.total * 0.6 + aiScore.totalAIScore * 0.4
    );

    // Enhance food match score with AI semantic matching
    const enhancedFoodMatch = Math.round(
      ruleBasedScore.foodMatch * 0.5 + (aiScore.semanticScore / 100) * 30 * 0.5
    );

    return {
      ...ruleBasedScore,
      total: hybridTotal,
      foodMatch: enhancedFoodMatch,
      aiScore,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error("Hybrid matching error, falling back to rule-based:", error);
    return ruleBasedScore;
  }
}

/**
 * Get AI-enhanced recommended NGOs for a vendor's donation
 * Uses batch processing for efficiency
 */
export async function getAIRecommendedNGOs(
  ngos: NGOProfile[],
  items: DonationItem[],
  vendorLat?: number,
  vendorLng?: number,
  limit: number = 5
): Promise<Array<NGOProfile & { score: ReverseMatchScore; explanation?: AIMatchExplanation }>> {
  if (ngos.length === 0 || items.length === 0) {
    return [];
  }

  // Filter verified NGOs
  const verifiedNGOs = ngos.filter((ngo) => ngo.verification_status === "verified");

  // Calculate rule-based scores for all NGOs first
  const scoredNGOs = verifiedNGOs.map((ngo) => ({
    ...ngo,
    score: calculateReverseMatchScore(ngo, items, vendorLat, vendorLng),
  }));

  // If AI matching is available, enhance with AI scores
  if (isAIMatchingAvailable()) {
    try {
      // Convert items to AI format
      const aiItems: DonationItemForAI[] = items.map((item) => ({
        category: item.category,
        storage_condition: item.storage_condition,
        quantity: item.quantity,
        unit: item.unit,
        halal_status: item.halal_status,
      }));

      // Convert NGOs to AI format
      const aiNgos: NGOProfileForAI[] = verifiedNGOs.map((ngo) => ({
        id: ngo.id,
        business_name: ngo.organization_name,
        food_types: ngo.food_types,
        priority_needs: ngo.priority_needs,
        halal_only: ngo.halal_only,
      }));

      // Batch calculate AI scores
      const aiScores = await calculateAIMatchScoresBatch(aiItems, aiNgos);

      // Enhance scores with AI
      scoredNGOs.forEach((ngo) => {
        const aiScore = aiScores.get(ngo.id);
        if (aiScore) {
          // Hybrid: 60% rule-based + 40% AI
          ngo.score.total = Math.round(ngo.score.total * 0.6 + aiScore.totalAIScore * 0.4);
          ngo.score.foodMatch = Math.round(
            ngo.score.foodMatch * 0.5 + (aiScore.semanticScore / 100) * 30 * 0.5
          );
          ngo.score.aiScore = aiScore;
          ngo.score.aiEnhanced = true;
        }
      });
    } catch (error) {
      console.error("AI batch scoring error, using rule-based scores:", error);
    }
  }

  // Filter, sort, and limit
  const topNGOs = scoredNGOs
    .filter((ngo) => ngo.score.total >= 20)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);

  return topNGOs;
}

/**
 * Generate AI explanation for a specific match
 */
export async function getMatchExplanation(
  ngo: NGOProfile,
  items: DonationItem[],
  aiScore?: AIMatchScore
): Promise<AIMatchExplanation | null> {
  const aiItems: DonationItemForAI[] = items.map((item) => ({
    category: item.category,
    storage_condition: item.storage_condition,
    quantity: item.quantity,
    unit: item.unit,
    halal_status: item.halal_status,
  }));

  const aiNgo: NGOProfileForAI = {
    id: ngo.id,
    business_name: ngo.organization_name,
    food_types: ngo.food_types,
    priority_needs: ngo.priority_needs,
    halal_only: ngo.halal_only,
  };

  return generateMatchExplanation(aiItems, aiNgo, aiScore);
}

/**
 * Check if AI matching is enabled
 */
export { isAIMatchingAvailable };
