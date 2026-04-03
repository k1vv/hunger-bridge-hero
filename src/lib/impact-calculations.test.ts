import { describe, it, expect } from "vitest";
import {
  calculateFoodValue,
  calculateMealsServed,
  calculateCO2Saved,
  calculateUnclaimedRisk,
  calculateAggregateImpact,
  formatImpactValue,
  FOOD_VALUE_PER_KG,
  MEALS_PER_KG,
  CO2_KG_PER_FOOD_KG,
  type UnclaimedRiskFactors,
  type FoodItem,
} from "./impact-calculations";

// ============================================================================
// calculateFoodValue Tests
// ============================================================================
describe("calculateFoodValue", () => {
  describe("basic calculations with kg unit", () => {
    it("calculates value for vegetables correctly", () => {
      expect(calculateFoodValue(10, "kg", "Vegetables")).toBe(60); // 10 * 6.00
    });

    it("calculates value for fruits correctly", () => {
      expect(calculateFoodValue(5, "kg", "Fruits")).toBe(40); // 5 * 8.00
    });

    it("calculates value for cooked food correctly", () => {
      expect(calculateFoodValue(2, "kg", "Cooked")).toBe(40); // 2 * 20.00
    });

    it("calculates value for ready-to-eat correctly", () => {
      expect(calculateFoodValue(1, "kg", "Ready-to-eat")).toBe(25); // 1 * 25.00
    });
  });

  describe("unit conversions", () => {
    it("converts grams to kg correctly", () => {
      expect(calculateFoodValue(1000, "g", "Vegetables")).toBe(6); // 1kg * 6.00
      expect(calculateFoodValue(500, "grams", "Vegetables")).toBe(3); // 0.5kg * 6.00
      expect(calculateFoodValue(2000, "gram", "Fruits")).toBe(16); // 2kg * 8.00
    });

    it("converts pieces/servings to kg (0.3kg each)", () => {
      expect(calculateFoodValue(10, "pcs", "Bakery")).toBe(45); // 10 * 0.3kg * 15.00
      expect(calculateFoodValue(10, "pieces", "Bakery")).toBe(45);
      expect(calculateFoodValue(10, "piece", "Bakery")).toBe(45);
      expect(calculateFoodValue(10, "servings", "Cooked")).toBe(60); // 10 * 0.3kg * 20.00
      expect(calculateFoodValue(10, "serving", "Cooked")).toBe(60);
    });

    it("converts boxes/packs to kg (1kg each)", () => {
      expect(calculateFoodValue(5, "boxes", "Frozen")).toBe(90); // 5 * 1kg * 18.00
      expect(calculateFoodValue(5, "box", "Frozen")).toBe(90);
      expect(calculateFoodValue(3, "packs", "Dairy")).toBe(36); // 3 * 1kg * 12.00
      expect(calculateFoodValue(3, "pack", "Dairy")).toBe(36);
    });

    it("converts liters to kg (1kg each)", () => {
      expect(calculateFoodValue(4, "liters", "Beverage")).toBe(20); // 4 * 1kg * 5.00
      expect(calculateFoodValue(4, "liter", "Beverage")).toBe(20);
      expect(calculateFoodValue(4, "l", "Beverage")).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("handles string quantity", () => {
      expect(calculateFoodValue("10", "kg", "Vegetables")).toBe(60);
    });

    it("handles invalid string quantity", () => {
      expect(calculateFoodValue("invalid", "kg", "Vegetables")).toBe(0);
    });

    it("handles zero quantity", () => {
      expect(calculateFoodValue(0, "kg", "Vegetables")).toBe(0);
    });

    it("uses default value for unknown category", () => {
      expect(calculateFoodValue(1, "kg", "UnknownCategory")).toBe(10); // default 10.00/kg
    });

    it("handles case-insensitive unit matching", () => {
      expect(calculateFoodValue(1000, "G", "Vegetables")).toBe(6);
      expect(calculateFoodValue(1000, "GRAMS", "Vegetables")).toBe(6);
    });

    it("rounds to 2 decimal places", () => {
      expect(calculateFoodValue(333, "g", "Vegetables")).toBe(2); // 0.333 * 6 = 1.998 ≈ 2
    });
  });
});

// ============================================================================
// calculateMealsServed Tests
// ============================================================================
describe("calculateMealsServed", () => {
  describe("basic calculations with kg unit", () => {
    it("calculates meals for vegetables correctly", () => {
      expect(calculateMealsServed(10, "kg", "Vegetables")).toBe(40); // 10 * 4
    });

    it("calculates meals for grains correctly (highest multiplier)", () => {
      expect(calculateMealsServed(5, "kg", "Grains")).toBe(40); // 5 * 8
    });

    it("calculates meals for ready-to-eat correctly (lowest multiplier)", () => {
      expect(calculateMealsServed(5, "kg", "Ready-to-eat")).toBe(10); // 5 * 2
    });

    it("calculates meals for bakery correctly", () => {
      expect(calculateMealsServed(2, "kg", "Bakery")).toBe(12); // 2 * 6
    });
  });

  describe("direct meal units", () => {
    it("returns pieces directly as meals", () => {
      expect(calculateMealsServed(25, "pcs", "Bakery")).toBe(25);
      expect(calculateMealsServed(25, "pieces", "Bakery")).toBe(25);
      expect(calculateMealsServed(25, "piece", "Bakery")).toBe(25);
    });

    it("returns servings directly as meals", () => {
      expect(calculateMealsServed(30, "servings", "Cooked")).toBe(30);
      expect(calculateMealsServed(30, "serving", "Cooked")).toBe(30);
      expect(calculateMealsServed(15, "meals", "Ready-to-eat")).toBe(15);
      expect(calculateMealsServed(15, "meal", "Ready-to-eat")).toBe(15);
    });
  });

  describe("unit conversions", () => {
    it("converts grams to kg correctly", () => {
      expect(calculateMealsServed(1000, "g", "Vegetables")).toBe(4); // 1kg * 4
      expect(calculateMealsServed(2000, "grams", "Fruits")).toBe(10); // 2kg * 5
    });

    it("converts boxes/packs to kg (1kg each)", () => {
      expect(calculateMealsServed(5, "boxes", "Canned")).toBe(15); // 5 * 1kg * 3
      expect(calculateMealsServed(3, "packs", "Frozen")).toBe(9); // 3 * 1kg * 3
    });

    it("converts liters to kg (1kg each)", () => {
      expect(calculateMealsServed(4, "liters", "Beverage")).toBe(16); // 4 * 1kg * 4
    });
  });

  describe("edge cases", () => {
    it("handles string quantity", () => {
      expect(calculateMealsServed("10", "kg", "Vegetables")).toBe(40);
    });

    it("handles invalid string quantity", () => {
      expect(calculateMealsServed("invalid", "kg", "Vegetables")).toBe(0);
    });

    it("uses default meals for unknown category", () => {
      expect(calculateMealsServed(1, "kg", "UnknownCategory")).toBe(3); // default 3 meals/kg
    });

    it("rounds meal count to whole number", () => {
      expect(calculateMealsServed(750, "g", "Vegetables")).toBe(3); // 0.75 * 4 = 3
    });
  });
});

// ============================================================================
// calculateCO2Saved Tests
// ============================================================================
describe("calculateCO2Saved", () => {
  describe("basic calculations with kg unit", () => {
    it("calculates CO2 for vegetables correctly", () => {
      expect(calculateCO2Saved(10, "kg", "Vegetables")).toBe(20); // 10 * 2.0
    });

    it("calculates CO2 for dairy correctly (high impact)", () => {
      expect(calculateCO2Saved(5, "kg", "Dairy")).toBe(20); // 5 * 4.0
    });

    it("calculates CO2 for fruits correctly (low impact)", () => {
      expect(calculateCO2Saved(10, "kg", "Fruits")).toBe(15); // 10 * 1.5
    });

    it("calculates CO2 for frozen correctly", () => {
      expect(calculateCO2Saved(4, "kg", "Frozen")).toBe(14); // 4 * 3.5
    });
  });

  describe("unit conversions", () => {
    it("converts grams to kg correctly", () => {
      expect(calculateCO2Saved(1000, "g", "Vegetables")).toBe(2); // 1kg * 2.0
      expect(calculateCO2Saved(2000, "grams", "Cooked")).toBe(6); // 2kg * 3.0
    });

    it("converts pieces/servings to kg (0.3kg each)", () => {
      expect(calculateCO2Saved(10, "pcs", "Bakery")).toBe(7.5); // 10 * 0.3kg * 2.5
      expect(calculateCO2Saved(10, "servings", "Cooked")).toBe(9); // 10 * 0.3kg * 3.0
    });

    it("converts boxes/packs to kg (1kg each)", () => {
      expect(calculateCO2Saved(5, "boxes", "Frozen")).toBe(17.5); // 5 * 1kg * 3.5
    });

    it("converts liters to kg (1kg each)", () => {
      expect(calculateCO2Saved(4, "liters", "Beverage")).toBe(4); // 4 * 1kg * 1.0
    });
  });

  describe("edge cases", () => {
    it("handles string quantity", () => {
      expect(calculateCO2Saved("10", "kg", "Vegetables")).toBe(20);
    });

    it("uses default CO2 for unknown category", () => {
      expect(calculateCO2Saved(1, "kg", "UnknownCategory")).toBe(2.5); // default 2.5 kg CO2/kg
    });

    it("rounds to 2 decimal places", () => {
      expect(calculateCO2Saved(333, "g", "Vegetables")).toBe(0.67); // 0.333 * 2.0 = 0.666 ≈ 0.67
    });
  });
});

// ============================================================================
// calculateUnclaimedRisk Tests
// ============================================================================
describe("calculateUnclaimedRisk", () => {
  const baseFactors: UnclaimedRiskFactors = {
    hourssincePosted: 0,
    hoursUntilExpiry: 48,
    category: "Cooked",
    spoilageRisk: "low",
    hasBeenClaimed: false,
    isWeekend: false,
  };

  describe("time since posted factor", () => {
    it("adds 0 points for newly posted items (< 6 hours)", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hourssincePosted: 5 });
      expect(result.riskScore).toBeLessThan(30);
      expect(result.reasons).not.toContain("Posted over 6 hours ago");
    });

    it("adds 5 points for items posted 6-12 hours ago", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hourssincePosted: 8 });
      expect(result.riskScore).toBeGreaterThanOrEqual(5);
    });

    it("adds 10 points for items posted 12-24 hours ago", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hourssincePosted: 18 });
      expect(result.reasons).toContain("Posted over 12 hours ago");
    });

    it("adds 20 points for items posted 24-48 hours ago", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hourssincePosted: 30 });
      expect(result.reasons).toContain("Posted over 24 hours ago");
    });

    it("adds 30 points for items posted over 48 hours ago", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hourssincePosted: 50 });
      expect(result.reasons).toContain("Posted over 48 hours ago");
    });
  });

  describe("time until expiry factor", () => {
    it("adds 35 points for already expired items", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hoursUntilExpiry: -1 });
      expect(result.reasons).toContain("Already expired!");
      // With base factors (popular category Cooked), total is around 35-40, which is medium
      // To get critical, we need more factors
      expect(result.riskScore).toBeGreaterThanOrEqual(35);
    });

    it("adds 30 points for items expiring within 6 hours", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hoursUntilExpiry: 4 });
      expect(result.reasons).toContain("Expires within 6 hours");
    });

    it("adds 20 points for items expiring within 12 hours", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hoursUntilExpiry: 10 });
      expect(result.reasons).toContain("Expires within 12 hours");
    });

    it("adds 10 points for items expiring within 24 hours", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hoursUntilExpiry: 20 });
      expect(result.reasons).toContain("Expires within 24 hours");
    });

    it("adds 0 points for items with > 24 hours until expiry", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hoursUntilExpiry: 48 });
      expect(result.reasons).not.toContain("Expires within 24 hours");
    });
  });

  describe("category popularity factor", () => {
    it("adds less points for popular categories (Cooked)", () => {
      const cookedResult = calculateUnclaimedRisk({ ...baseFactors, category: "Cooked" });
      const beverageResult = calculateUnclaimedRisk({ ...baseFactors, category: "Beverage" });
      expect(cookedResult.riskScore).toBeLessThan(beverageResult.riskScore);
    });

    it("adds more points for unpopular categories (Beverage)", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, category: "Beverage" });
      expect(result.reasons).toContain("Beverage has lower demand");
    });

    it("adds points for canned items (moderate popularity)", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, category: "Canned" });
      // Canned has popularity of 0.5, which is not < 0.5, so no demand reason
      // But it still adds some points to the risk score
      const cookedResult = calculateUnclaimedRisk({ ...baseFactors, category: "Cooked" });
      expect(result.riskScore).toBeGreaterThan(cookedResult.riskScore);
    });
  });

  describe("spoilage risk factor", () => {
    it("adds 10 points for high spoilage risk", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, spoilageRisk: "high" });
      expect(result.reasons).toContain("High spoilage risk item");
    });

    it("adds 5 points for medium spoilage risk", () => {
      const lowResult = calculateUnclaimedRisk({ ...baseFactors, spoilageRisk: "low" });
      const mediumResult = calculateUnclaimedRisk({ ...baseFactors, spoilageRisk: "medium" });
      expect(mediumResult.riskScore).toBe(lowResult.riskScore + 5);
    });

    it("adds 0 points for low spoilage risk", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, spoilageRisk: "low" });
      expect(result.reasons).not.toContain("spoilage");
    });
  });

  describe("weekend factor", () => {
    it("adds 10 points for unclaimed items on weekends", () => {
      const weekdayResult = calculateUnclaimedRisk({ ...baseFactors, isWeekend: false });
      const weekendResult = calculateUnclaimedRisk({ ...baseFactors, isWeekend: true });
      expect(weekendResult.riskScore).toBe(weekdayResult.riskScore + 10);
      expect(weekendResult.reasons).toContain("Weekend - lower NGO activity");
    });

    it("does not add weekend points if already claimed", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, isWeekend: true, hasBeenClaimed: true });
      expect(result.reasons).not.toContain("Weekend - lower NGO activity");
    });
  });

  describe("claimed status", () => {
    it("reduces risk score by 40 if already claimed", () => {
      const unclaimedResult = calculateUnclaimedRisk({ ...baseFactors, hasBeenClaimed: false });
      const claimedResult = calculateUnclaimedRisk({ ...baseFactors, hasBeenClaimed: true });
      expect(claimedResult.riskScore).toBeLessThanOrEqual(Math.max(0, unclaimedResult.riskScore - 40));
    });

    it("clears reasons and adds claimed reason", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hasBeenClaimed: true });
      expect(result.reasons).toContain("Item has been claimed");
      expect(result.reasons.length).toBe(1);
    });
  });

  describe("risk levels", () => {
    it("returns 'low' for score < 25", () => {
      const result = calculateUnclaimedRisk({ ...baseFactors, hasBeenClaimed: true });
      expect(result.riskLevel).toBe("low");
    });

    it("returns 'medium' for score 25-49", () => {
      const result = calculateUnclaimedRisk({
        ...baseFactors,
        hourssincePosted: 18, // 10 points
        hoursUntilExpiry: 20, // 10 points
        spoilageRisk: "medium", // 5 points
      });
      expect(result.riskLevel).toBe("medium");
    });

    it("returns 'high' for score 50-69", () => {
      const result = calculateUnclaimedRisk({
        ...baseFactors,
        hourssincePosted: 30, // 20 points
        hoursUntilExpiry: 10, // 20 points
        spoilageRisk: "high", // 10 points
      });
      expect(result.riskLevel).toBe("high");
    });

    it("returns 'critical' for score >= 70", () => {
      const result = calculateUnclaimedRisk({
        ...baseFactors,
        hourssincePosted: 50, // 30 points
        hoursUntilExpiry: 4, // 30 points
        spoilageRisk: "high", // 10 points
      });
      expect(result.riskLevel).toBe("critical");
    });
  });

  describe("score capping", () => {
    it("caps risk score at 100", () => {
      const result = calculateUnclaimedRisk({
        ...baseFactors,
        hourssincePosted: 100,
        hoursUntilExpiry: -10,
        spoilageRisk: "high",
        isWeekend: true,
        category: "Beverage",
      });
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// calculateAggregateImpact Tests
// ============================================================================
describe("calculateAggregateImpact", () => {
  it("calculates aggregate impact for multiple items", () => {
    const items: FoodItem[] = [
      { quantity: 10, unit: "kg", category: "Vegetables" },
      { quantity: 5, unit: "kg", category: "Fruits" },
      { quantity: 2, unit: "kg", category: "Cooked" },
    ];

    const result = calculateAggregateImpact(items);

    expect(result.totalItems).toBe(3);
    expect(result.totalValueRM).toBe(140); // 60 + 40 + 40
    expect(result.totalMeals).toBe(71); // 40 + 25 + 6 (10*4 + 5*5 + 2*3)
    expect(result.totalCO2SavedKg).toBe(33.5); // 20 + 7.5 + 6 (10*2.0 + 5*1.5 + 2*3.0)
  });

  it("handles empty array", () => {
    const result = calculateAggregateImpact([]);

    expect(result.totalItems).toBe(0);
    expect(result.totalValueRM).toBe(0);
    expect(result.totalMeals).toBe(0);
    expect(result.totalCO2SavedKg).toBe(0);
  });

  it("handles single item", () => {
    const items: FoodItem[] = [
      { quantity: 5, unit: "kg", category: "Grains" },
    ];

    const result = calculateAggregateImpact(items);

    expect(result.totalItems).toBe(1);
    expect(result.totalValueRM).toBe(20); // 5 * 4.00
    expect(result.totalMeals).toBe(40); // 5 * 8
    expect(result.totalCO2SavedKg).toBe(7.5); // 5 * 1.5
  });

  it("handles mixed units", () => {
    const items: FoodItem[] = [
      { quantity: 1000, unit: "g", category: "Vegetables" }, // 1kg
      { quantity: 10, unit: "pcs", category: "Bakery" }, // 3kg equivalent
    ];

    const result = calculateAggregateImpact(items);

    expect(result.totalItems).toBe(2);
    expect(result.totalValueRM).toBe(51); // 6 + 45
  });

  it("handles string quantities", () => {
    const items: FoodItem[] = [
      { quantity: "10", unit: "kg", category: "Vegetables" },
    ];

    const result = calculateAggregateImpact(items);
    expect(result.totalValueRM).toBe(60);
  });
});

// ============================================================================
// formatImpactValue Tests
// ============================================================================
describe("formatImpactValue", () => {
  describe("currency formatting", () => {
    it("formats currency with RM prefix", () => {
      expect(formatImpactValue(100, "currency")).toMatch(/^RM/);
    });

    it("formats currency with 2 decimal places", () => {
      expect(formatImpactValue(100.5, "currency")).toBe("RM 100.50");
    });

    it("formats large currency values with thousands separator", () => {
      const result = formatImpactValue(1234567.89, "currency");
      expect(result).toContain(",");
    });

    it("formats zero currency correctly", () => {
      expect(formatImpactValue(0, "currency")).toBe("RM 0.00");
    });
  });

  describe("meals formatting", () => {
    it("formats meals with 'meals' suffix", () => {
      expect(formatImpactValue(100, "meals")).toBe("100 meals");
    });

    it("formats large meal counts with thousands separator", () => {
      const result = formatImpactValue(1234, "meals");
      expect(result).toContain(",");
      expect(result).toContain("meals");
    });

    it("formats single meal correctly", () => {
      expect(formatImpactValue(1, "meals")).toBe("1 meals");
    });
  });

  describe("CO2 formatting", () => {
    it("formats CO2 with kg CO2 suffix", () => {
      expect(formatImpactValue(100, "co2")).toContain("kg CO");
    });

    it("formats CO2 with 1 decimal place", () => {
      expect(formatImpactValue(100.55, "co2")).toBe("100.6 kg CO₂");
    });

    it("formats zero CO2 correctly", () => {
      expect(formatImpactValue(0, "co2")).toBe("0.0 kg CO₂");
    });
  });

  describe("edge cases", () => {
    it("returns string representation for unknown type", () => {
      // @ts-expect-error Testing invalid type
      expect(formatImpactValue(100, "unknown")).toBe("100");
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================
describe("Constants", () => {
  describe("FOOD_VALUE_PER_KG", () => {
    it("has all expected categories", () => {
      const expectedCategories = [
        "Vegetables", "Fruits", "Bakery", "Dairy", "Grains",
        "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"
      ];
      expectedCategories.forEach(category => {
        expect(FOOD_VALUE_PER_KG).toHaveProperty(category);
      });
    });

    it("has positive values for all categories", () => {
      Object.values(FOOD_VALUE_PER_KG).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe("MEALS_PER_KG", () => {
    it("has all expected categories", () => {
      const expectedCategories = [
        "Vegetables", "Fruits", "Bakery", "Dairy", "Grains",
        "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"
      ];
      expectedCategories.forEach(category => {
        expect(MEALS_PER_KG).toHaveProperty(category);
      });
    });

    it("has reasonable meal counts (1-10 per kg)", () => {
      Object.values(MEALS_PER_KG).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("CO2_KG_PER_FOOD_KG", () => {
    it("has all expected categories", () => {
      const expectedCategories = [
        "Vegetables", "Fruits", "Bakery", "Dairy", "Grains",
        "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"
      ];
      expectedCategories.forEach(category => {
        expect(CO2_KG_PER_FOOD_KG).toHaveProperty(category);
      });
    });

    it("has positive CO2 values", () => {
      Object.values(CO2_KG_PER_FOOD_KG).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("dairy has higher CO2 than vegetables (realistic)", () => {
      expect(CO2_KG_PER_FOOD_KG["Dairy"]).toBeGreaterThan(CO2_KG_PER_FOOD_KG["Vegetables"]);
    });
  });
});
