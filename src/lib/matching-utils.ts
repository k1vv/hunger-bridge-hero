/**
 * Matching utilities for vendor-NGO recommendations
 * Provides both forward (NGO sees donations) and reverse (vendor sees NGOs) matching
 */

// Category to food type mapping
export const categoryToFoodType: Record<string, string[]> = {
  "Cooked Meals": ["Cooked Food", "Ready-to-Eat"],
  "Fresh Produce": ["Fruits", "Vegetables", "Fresh Produce"],
  "Bakery & Bread": ["Bakery", "Bread", "Pastries"],
  "Dairy Products": ["Dairy", "Milk", "Cheese"],
  "Canned & Packaged": ["Packaged Food", "Canned Food", "Non-Perishable"],
  "Beverages": ["Beverages", "Drinks"],
  "Meat & Seafood": ["Meat", "Seafood", "Protein"],
  "Dry Goods": ["Rice", "Noodles", "Dry Goods", "Grains"],
  "Snacks & Desserts": ["Snacks", "Desserts", "Sweets"],
  "Baby Food": ["Baby Food", "Infant Formula"],
  Other: ["Packaged Food", "Other"],
};

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
}

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

  // ============================================================================
  // 1. FOOD PREFERENCE MATCHING (0-30 points)
  // ============================================================================
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

  // ============================================================================
  // 2. LOCATION/DISTANCE SCORE (0-25 points)
  // ============================================================================
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

  // ============================================================================
  // 3. STORAGE COMPATIBILITY (0-20 points)
  // ============================================================================
  const ngoStorageTypes = ngo.storage_types || ["Room Temperature"];
  const itemStorageTypes = new Set(
    items.map((i) => i.storage_condition || "room")
  );

  const storageMap: Record<string, string[]> = {
    room: ["Room Temperature", "Ambient", "room"],
    chilled: ["Refrigerated", "Cold Storage", "chilled"],
    frozen: ["Frozen", "Freezer", "frozen"],
    warm: ["Heated", "Warm", "warm"],
  };

  let compatibleItems = 0;
  for (const item of items) {
    const condition = item.storage_condition || "room";
    const acceptableTypes = storageMap[condition] || ["Room Temperature"];
    const isCompatible = acceptableTypes.some((type) =>
      ngoStorageTypes.some(
        (ngoType) => ngoType.toLowerCase() === type.toLowerCase()
      )
    );
    if (isCompatible) compatibleItems++;
  }
  storageScore = Math.round((compatibleItems / items.length) * 20);

  // ============================================================================
  // 4. PRIORITY NEEDS ALIGNMENT (0-15 points)
  // ============================================================================
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

  // ============================================================================
  // 5. CAPACITY/QUANTITY HANDLING (0-10 points)
  // ============================================================================
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

  const scoredNGOs = ngos
    .filter((ngo) => ngo.verification_status === "verified")
    .map((ngo) => ({
      ...ngo,
      score: calculateReverseMatchScore(ngo, items, vendorLat, vendorLng),
    }))
    .filter((ngo) => ngo.score.total >= 20) // Minimum threshold
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);

  return scoredNGOs;
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number | null): string {
  if (distance === null) return "Unknown";
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}
