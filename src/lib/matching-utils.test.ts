import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateReverseMatchScore,
  getRecommendedNGOs,
  formatDistance,
  categoryToFoodType,
  type NGOProfile,
  type DonationItem,
} from "./matching-utils";

describe("calculateDistance", () => {
  it("should return null when lat1 is null", () => {
    expect(calculateDistance(null, 100, 3.1, 101.6)).toBeNull();
  });

  it("should return null when lng1 is null", () => {
    expect(calculateDistance(3.1, null, 3.1, 101.6)).toBeNull();
  });

  it("should return null when lat2 is null", () => {
    expect(calculateDistance(3.1, 101.6, null, 101.6)).toBeNull();
  });

  it("should return null when lng2 is null", () => {
    expect(calculateDistance(3.1, 101.6, 3.1, null)).toBeNull();
  });

  it("should return 0 for same coordinates", () => {
    const distance = calculateDistance(3.1390, 101.6869, 3.1390, 101.6869);
    expect(distance).toBe(0);
  });

  it("should calculate distance between KL and PJ correctly", () => {
    // KLCC to Petaling Jaya (approximately 10-15km)
    const distance = calculateDistance(3.1578, 101.7123, 3.1073, 101.6067);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(20);
  });

  it("should calculate distance between KL and Penang correctly", () => {
    // KL to Penang (approximately 300-350km)
    const distance = calculateDistance(3.1390, 101.6869, 5.4141, 100.3288);
    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(400);
  });

  it("should handle negative coordinates", () => {
    const distance = calculateDistance(-6.2088, 106.8456, -7.2575, 112.7521);
    expect(distance).toBeGreaterThan(0);
  });

  it("should be symmetric (A to B = B to A)", () => {
    const distanceAB = calculateDistance(3.1390, 101.6869, 5.4141, 100.3288);
    const distanceBA = calculateDistance(5.4141, 100.3288, 3.1390, 101.6869);
    expect(distanceAB).toBeCloseTo(distanceBA!, 5);
  });
});

describe("categoryToFoodType mapping", () => {
  it("should map Cooked Meals to appropriate food types", () => {
    expect(categoryToFoodType["Cooked Meals"]).toContain("Cooked Food");
    expect(categoryToFoodType["Cooked Meals"]).toContain("Ready-to-Eat");
  });

  it("should map Vegetables correctly", () => {
    expect(categoryToFoodType["Vegetables"]).toContain("Vegetables");
    expect(categoryToFoodType["Vegetables"]).toContain("Fresh Produce");
  });

  it("should map Bakery & Bread correctly", () => {
    expect(categoryToFoodType["Bakery & Bread"]).toContain("Bakery");
    expect(categoryToFoodType["Bakery & Bread"]).toContain("Bread");
  });

  it("should have an Other category", () => {
    expect(categoryToFoodType["Other"]).toBeDefined();
    expect(categoryToFoodType["Other"]).toContain("Packaged Food");
  });

  it("should have all standardized food categories", () => {
    // These are the standardized categories from constants.ts
    const expectedCategories = [
      "Cooked Meals",
      "Bakery & Bread",
      "Vegetables",
      "Fruits",
      "Dairy Products",
      "Grains & Rice",
      "Canned & Packaged",
      "Frozen Food",
      "Beverages",
      "Ready-to-Eat",
      "Snacks & Desserts",
      "Meat & Seafood",
      "Other",
    ];
    expectedCategories.forEach((cat) => {
      expect(categoryToFoodType[cat]).toBeDefined();
    });
  });
});

describe("calculateReverseMatchScore", () => {
  const baseNGO: NGOProfile = {
    id: "ngo-1",
    organization_name: "Test NGO",
    lat: 3.1390,
    lng: 101.6869,
    food_types: ["Cooked Food", "Bakery"],
    storage_types: ["Room Temperature", "Refrigerated"],
    pickup_radius: 10,
    priority_needs: [],
    verification_status: "verified",
  };

  const baseItems: DonationItem[] = [
    { category: "Cooked Meals", storage_condition: "room_temperature", quantity: 10, unit: "kg" },
  ];

  it("should return zero score for empty items", () => {
    const score = calculateReverseMatchScore(baseNGO, []);
    expect(score.total).toBe(0);
    expect(score.foodMatch).toBe(0);
  });

  it("should give food match score for matching food types", () => {
    const score = calculateReverseMatchScore(baseNGO, baseItems);
    expect(score.foodMatch).toBeGreaterThan(0);
  });

  it("should give higher food match for all items matching", () => {
    const items: DonationItem[] = [
      { category: "Cooked Meals", storage_condition: "room_temperature" },
      { category: "Bakery & Bread", storage_condition: "room_temperature" },
    ];
    const score = calculateReverseMatchScore(baseNGO, items);
    expect(score.foodMatch).toBeGreaterThan(20);
  });

  it("should give base food match score when NGO has no food type preferences", () => {
    const ngoNoPrefs: NGOProfile = { ...baseNGO, food_types: [] };
    const score = calculateReverseMatchScore(ngoNoPrefs, baseItems);
    expect(score.foodMatch).toBe(22); // Base score when accepts all
  });

  it("should give location score based on distance", () => {
    // NGO at same location as vendor
    const score = calculateReverseMatchScore(baseNGO, baseItems, 3.1390, 101.6869);
    expect(score.location).toBe(25); // Very close = max points
    expect(score.distance).toBe(0);
  });

  it("should give lower location score for farther distances", () => {
    // Vendor 20km away (outside pickup radius)
    const score = calculateReverseMatchScore(baseNGO, baseItems, 3.3, 101.9);
    expect(score.location).toBeLessThan(25);
  });

  it("should give base location score when distance is unknown", () => {
    const score = calculateReverseMatchScore(baseNGO, baseItems);
    expect(score.location).toBe(10);
    expect(score.distance).toBeNull();
  });

  it("should calculate storage compatibility score", () => {
    const items: DonationItem[] = [
      { category: "Dairy Products", storage_condition: "refrigerated" },
    ];
    const ngoWithColdStorage: NGOProfile = {
      ...baseNGO,
      storage_types: ["Refrigerated", "Cold Storage"],
      food_types: ["Dairy Products"],
    };
    const score = calculateReverseMatchScore(ngoWithColdStorage, items);
    expect(score.storage).toBeGreaterThan(0);
  });

  it("should give full storage score when all items are compatible", () => {
    const items: DonationItem[] = [
      { category: "Cooked Meals", storage_condition: "room_temperature" },
    ];
    const score = calculateReverseMatchScore(baseNGO, items);
    expect(score.storage).toBe(20);
  });

  it("should give higher capacity score for verified NGOs", () => {
    const verifiedNGO: NGOProfile = { ...baseNGO, verification_status: "verified" };
    const pendingNGO: NGOProfile = { ...baseNGO, verification_status: "pending" };

    const verifiedScore = calculateReverseMatchScore(verifiedNGO, baseItems);
    const pendingScore = calculateReverseMatchScore(pendingNGO, baseItems);

    expect(verifiedScore.capacity).toBe(10);
    expect(pendingScore.capacity).toBe(5);
  });

  it("should calculate total score correctly", () => {
    const score = calculateReverseMatchScore(baseNGO, baseItems, 3.1390, 101.6869);
    const expectedTotal =
      score.foodMatch + score.location + score.storage + score.priority + score.capacity;
    expect(score.total).toBe(expectedTotal);
  });

  it("should handle multiple item categories", () => {
    const items: DonationItem[] = [
      { category: "Cooked Meals", storage_condition: "room_temperature" },
      { category: "Vegetables", storage_condition: "refrigerated" },
      { category: "Beverages", storage_condition: "room_temperature" },
    ];
    const score = calculateReverseMatchScore(baseNGO, items);
    expect(score.total).toBeGreaterThan(0);
  });
});

describe("getRecommendedNGOs", () => {
  const createNGO = (
    id: string,
    name: string,
    foodTypes: string[] = [],
    status: string = "verified"
  ): NGOProfile => ({
    id,
    organization_name: name,
    lat: 3.1390 + Math.random() * 0.1,
    lng: 101.6869 + Math.random() * 0.1,
    food_types: foodTypes,
    storage_types: ["Room Temperature"],
    pickup_radius: 15,
    verification_status: status,
  });

  const baseItems: DonationItem[] = [
    { category: "Cooked Meals", storage_condition: "room_temperature", quantity: 10 },
  ];

  it("should return empty array for empty NGO list", () => {
    const result = getRecommendedNGOs([], baseItems);
    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty items list", () => {
    const ngos = [createNGO("1", "NGO 1")];
    const result = getRecommendedNGOs(ngos, []);
    expect(result).toHaveLength(0);
  });

  it("should filter out non-verified NGOs", () => {
    const ngos = [
      createNGO("1", "Verified NGO", ["Cooked Food"], "verified"),
      createNGO("2", "Pending NGO", ["Cooked Food"], "pending"),
      createNGO("3", "Rejected NGO", ["Cooked Food"], "rejected"),
    ];
    const result = getRecommendedNGOs(ngos, baseItems);

    // Only verified NGOs should be included
    const ids = result.map((r) => r.id);
    expect(ids).toContain("1");
    expect(ids).not.toContain("2");
    expect(ids).not.toContain("3");
  });

  it("should sort NGOs by score (highest first)", () => {
    const ngos = [
      createNGO("1", "NGO 1", ["Packaged Food"]),
      createNGO("2", "NGO 2", ["Cooked Food", "Ready-to-Eat"]),
      createNGO("3", "NGO 3", []),
    ];
    const result = getRecommendedNGOs(ngos, baseItems);

    // Should be sorted by score descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score.total).toBeGreaterThanOrEqual(result[i].score.total);
    }
  });

  it("should limit results to specified count", () => {
    const ngos = Array.from({ length: 20 }, (_, i) =>
      createNGO(`ngo-${i}`, `NGO ${i}`, ["Cooked Food"])
    );
    const result = getRecommendedNGOs(ngos, baseItems, undefined, undefined, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should filter out NGOs with score below threshold", () => {
    const ngos = [
      createNGO("1", "Good NGO", ["Cooked Food"]),
    ];
    // Create items that will result in very low match (Meat & Seafood when NGO wants Cooked Food)
    const lowMatchItems: DonationItem[] = [
      { category: "Meat & Seafood", storage_condition: "frozen" },
    ];

    const result = getRecommendedNGOs(ngos, lowMatchItems);
    // All NGOs with score < 20 should be filtered out
    result.forEach((ngo) => {
      expect(ngo.score.total).toBeGreaterThanOrEqual(20);
    });
  });

  it("should include score breakdown in results", () => {
    const ngos = [createNGO("1", "Test NGO", ["Cooked Food"])];
    const result = getRecommendedNGOs(ngos, baseItems);

    if (result.length > 0) {
      expect(result[0].score).toBeDefined();
      expect(result[0].score.total).toBeDefined();
      expect(result[0].score.foodMatch).toBeDefined();
      expect(result[0].score.location).toBeDefined();
      expect(result[0].score.storage).toBeDefined();
    }
  });

  it("should use vendor location for distance calculation", () => {
    const ngos = [
      { ...createNGO("1", "Near NGO"), lat: 3.14, lng: 101.69 },
      { ...createNGO("2", "Far NGO"), lat: 3.5, lng: 102.0 },
    ];

    const result = getRecommendedNGOs(ngos, baseItems, 3.14, 101.69);

    // Near NGO should have better location score
    const nearNGO = result.find((r) => r.id === "1");
    const farNGO = result.find((r) => r.id === "2");

    if (nearNGO && farNGO) {
      expect(nearNGO.score.location).toBeGreaterThan(farNGO.score.location);
    }
  });

  it("should default to 5 results when limit not specified", () => {
    const ngos = Array.from({ length: 10 }, (_, i) =>
      createNGO(`ngo-${i}`, `NGO ${i}`, ["Cooked Food"])
    );
    const result = getRecommendedNGOs(ngos, baseItems);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

describe("formatDistance", () => {
  it("should return 'Unknown' for null distance", () => {
    expect(formatDistance(null)).toBe("Unknown");
  });

  it("should format distance less than 1km in meters", () => {
    expect(formatDistance(0.5)).toBe("500m");
    expect(formatDistance(0.1)).toBe("100m");
    expect(formatDistance(0.85)).toBe("850m");
  });

  it("should format distance 1km or more in kilometers", () => {
    expect(formatDistance(1)).toBe("1.0km");
    expect(formatDistance(5.5)).toBe("5.5km");
    expect(formatDistance(10.25)).toBe("10.3km");
  });

  it("should round meters to nearest integer", () => {
    expect(formatDistance(0.456)).toBe("456m");
    expect(formatDistance(0.999)).toBe("999m");
  });

  it("should round kilometers to one decimal place", () => {
    expect(formatDistance(1.234)).toBe("1.2km");
    expect(formatDistance(9.999)).toBe("10.0km");
  });

  it("should handle zero distance", () => {
    expect(formatDistance(0)).toBe("0m");
  });

  it("should handle very large distances", () => {
    expect(formatDistance(1000)).toBe("1000.0km");
  });
});

describe("Integration Tests", () => {
  it("should correctly rank NGOs for a bakery donation", () => {
    const ngos: NGOProfile[] = [
      {
        id: "bakery-specialist",
        organization_name: "Bakery Specialist NGO",
        lat: 3.14,
        lng: 101.69,
        food_types: ["Bakery", "Bread", "Pastries", "Bakery & Bread"],
        storage_types: ["Room Temperature"],
        pickup_radius: 20,
        verification_status: "verified",
      },
      {
        id: "general-ngo",
        organization_name: "General NGO",
        lat: 3.14,
        lng: 101.69,
        food_types: [],
        storage_types: ["Room Temperature"],
        pickup_radius: 20,
        verification_status: "verified",
      },
    ];

    const items: DonationItem[] = [
      { category: "Bakery & Bread", storage_condition: "room_temperature", quantity: 50 },
    ];

    const result = getRecommendedNGOs(ngos, items, 3.14, 101.69);

    // Bakery specialist should rank higher
    expect(result[0].id).toBe("bakery-specialist");
  });

  it("should prioritize closer NGOs when scores are similar", () => {
    const ngos: NGOProfile[] = [
      {
        id: "far-ngo",
        organization_name: "Far NGO",
        lat: 3.5,
        lng: 102.0,
        food_types: ["Cooked Food"],
        storage_types: ["Room Temperature"],
        pickup_radius: 50,
        verification_status: "verified",
      },
      {
        id: "near-ngo",
        organization_name: "Near NGO",
        lat: 3.14,
        lng: 101.69,
        food_types: ["Cooked Food"],
        storage_types: ["Room Temperature"],
        pickup_radius: 10,
        verification_status: "verified",
      },
    ];

    const items: DonationItem[] = [
      { category: "Cooked Meals", storage_condition: "room_temperature" },
    ];

    const result = getRecommendedNGOs(ngos, items, 3.14, 101.69);

    // Near NGO should rank higher due to distance
    expect(result[0].id).toBe("near-ngo");
  });
});
