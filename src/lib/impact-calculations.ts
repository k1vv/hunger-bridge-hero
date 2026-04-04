/**
 * Impact Calculations Library
 *
 * This library provides functions for calculating:
 * - Food value estimation (RM saved)
 * - Meals served estimation
 * - Environmental impact (CO2 saved)
 * - Unclaimed risk prediction
 */

// ============================================================================
// FOOD VALUE ESTIMATION (RM per kg by category)
// ============================================================================
// Based on average Malaysia market prices (2024)
// Keys match standardized FOOD_CATEGORIES from constants.ts

export const FOOD_VALUE_PER_KG: Record<string, number> = {
  // Standardized category names
  "Cooked Meals": 20.00,         // RM 20/kg (prepared meals)
  "Bakery & Bread": 15.00,       // RM 15/kg (bread, pastries)
  "Vegetables": 6.00,            // RM 6/kg average
  "Fruits": 8.00,                // RM 8/kg average
  "Dairy Products": 12.00,       // RM 12/kg (milk, cheese, yogurt)
  "Grains & Rice": 4.00,         // RM 4/kg (rice, pasta)
  "Canned & Packaged": 10.00,    // RM 10/kg (canned goods)
  "Frozen Food": 18.00,          // RM 18/kg (frozen meals, meat)
  "Beverages": 5.00,             // RM 5/kg (drinks)
  "Ready-to-Eat": 25.00,         // RM 25/kg (ready meals)
  "Snacks & Desserts": 12.00,    // RM 12/kg (snacks, sweets)
  "Meat & Seafood": 30.00,       // RM 30/kg (meat, fish)
  "Other": 10.00,                // RM 10/kg default
  // Legacy keys for backward compatibility
  "Bakery": 15.00,
  "Dairy": 12.00,
  "Grains": 4.00,
  "Canned": 10.00,
  "Frozen": 18.00,
  "Cooked": 20.00,
  "Beverage": 5.00,
  "Ready-to-eat": 25.00,
};

// Default value if category not found
const DEFAULT_VALUE_PER_KG = 10.00;

/**
 * Calculate estimated value of food in RM
 */
export function calculateFoodValue(quantity: number | string, unit: string, category: string): number {
  const qty = typeof quantity === "string" ? parseFloat(quantity) || 0 : quantity;
  const valuePerKg = FOOD_VALUE_PER_KG[category] || DEFAULT_VALUE_PER_KG;

  // Convert to kg if needed
  let kgQuantity = qty;
  const unitLower = unit.toLowerCase();

  if (unitLower === "g" || unitLower === "grams" || unitLower === "gram") {
    kgQuantity = qty / 1000;
  } else if (unitLower === "pcs" || unitLower === "pieces" || unitLower === "piece" || unitLower === "servings" || unitLower === "serving") {
    // Estimate: 1 piece/serving ≈ 0.3 kg
    kgQuantity = qty * 0.3;
  } else if (unitLower === "boxes" || unitLower === "box" || unitLower === "packs" || unitLower === "pack") {
    // Estimate: 1 box/pack ≈ 1 kg
    kgQuantity = qty * 1;
  } else if (unitLower === "liters" || unitLower === "liter" || unitLower === "l") {
    // Estimate: 1 liter ≈ 1 kg
    kgQuantity = qty * 1;
  }

  return Math.round(kgQuantity * valuePerKg * 100) / 100;
}

// ============================================================================
// MEALS SERVED ESTIMATION
// ============================================================================
// Based on typical serving sizes (meals per kg)
// Keys match standardized FOOD_CATEGORIES from constants.ts

export const MEALS_PER_KG: Record<string, number> = {
  // Standardized category names
  "Cooked Meals": 3,             // 3 servings per kg (ready meals)
  "Bakery & Bread": 6,           // 6 servings per kg (bread slices, pastries)
  "Vegetables": 4,               // 4 servings per kg
  "Fruits": 5,                   // 5 servings per kg
  "Dairy Products": 4,           // 4 servings per kg
  "Grains & Rice": 8,            // 8 servings per kg (rice expands)
  "Canned & Packaged": 3,        // 3 servings per kg
  "Frozen Food": 3,              // 3 servings per kg
  "Beverages": 4,                // 4 servings per kg (250ml each)
  "Ready-to-Eat": 2,             // 2 servings per kg (full meals)
  "Snacks & Desserts": 8,        // 8 servings per kg (small portions)
  "Meat & Seafood": 4,           // 4 servings per kg
  "Other": 3,                    // 3 servings per kg default
  // Legacy keys for backward compatibility
  "Bakery": 6,
  "Dairy": 4,
  "Grains": 8,
  "Canned": 3,
  "Frozen": 3,
  "Cooked": 3,
  "Beverage": 4,
  "Ready-to-eat": 2,
};

const DEFAULT_MEALS_PER_KG = 3;

/**
 * Calculate estimated meals from food quantity
 */
export function calculateMealsServed(quantity: number | string, unit: string, category: string): number {
  const qty = typeof quantity === "string" ? parseFloat(quantity) || 0 : quantity;
  const mealsPerKg = MEALS_PER_KG[category] || DEFAULT_MEALS_PER_KG;

  // Convert to kg if needed
  let kgQuantity = qty;
  const unitLower = unit.toLowerCase();

  if (unitLower === "g" || unitLower === "grams" || unitLower === "gram") {
    kgQuantity = qty / 1000;
  } else if (unitLower === "pcs" || unitLower === "pieces" || unitLower === "piece") {
    // 1 piece = 1 serving directly
    return Math.round(qty);
  } else if (unitLower === "servings" || unitLower === "serving" || unitLower === "meals" || unitLower === "meal") {
    // Direct meal count
    return Math.round(qty);
  } else if (unitLower === "boxes" || unitLower === "box" || unitLower === "packs" || unitLower === "pack") {
    kgQuantity = qty * 1;
  } else if (unitLower === "liters" || unitLower === "liter" || unitLower === "l") {
    kgQuantity = qty * 1;
  }

  return Math.round(kgQuantity * mealsPerKg);
}

// ============================================================================
// ENVIRONMENTAL IMPACT (CO2 saved)
// ============================================================================
// Based on food waste environmental impact studies
// Average: 2.5 kg CO2 equivalent per kg of food waste prevented
// Keys match standardized FOOD_CATEGORIES from constants.ts

export const CO2_KG_PER_FOOD_KG: Record<string, number> = {
  // Standardized category names
  "Cooked Meals": 3.0,           // Higher (cooking energy)
  "Bakery & Bread": 2.5,         // Medium
  "Vegetables": 2.0,             // Lower carbon footprint
  "Fruits": 1.5,                 // Lower carbon footprint
  "Dairy Products": 4.0,         // Higher (animal products)
  "Grains & Rice": 1.5,          // Lower
  "Canned & Packaged": 2.0,      // Medium (processing)
  "Frozen Food": 3.5,            // Higher (cold chain)
  "Beverages": 1.0,              // Lower
  "Ready-to-Eat": 3.5,           // Higher (full processing)
  "Snacks & Desserts": 2.0,      // Medium
  "Meat & Seafood": 6.0,         // Highest (animal products)
  "Other": 2.5,                  // Average
  // Legacy keys for backward compatibility
  "Bakery": 2.5,
  "Dairy": 4.0,
  "Grains": 1.5,
  "Canned": 2.0,
  "Frozen": 3.5,
  "Cooked": 3.0,
  "Beverage": 1.0,
  "Ready-to-eat": 3.5,
};

const DEFAULT_CO2_PER_KG = 2.5;

/**
 * Calculate CO2 emissions saved (in kg CO2)
 */
export function calculateCO2Saved(quantity: number | string, unit: string, category: string): number {
  const qty = typeof quantity === "string" ? parseFloat(quantity) || 0 : quantity;
  const co2PerKg = CO2_KG_PER_FOOD_KG[category] || DEFAULT_CO2_PER_KG;

  let kgQuantity = qty;
  const unitLower = unit.toLowerCase();

  if (unitLower === "g" || unitLower === "grams" || unitLower === "gram") {
    kgQuantity = qty / 1000;
  } else if (unitLower === "pcs" || unitLower === "pieces" || unitLower === "piece" || unitLower === "servings" || unitLower === "serving") {
    kgQuantity = qty * 0.3;
  } else if (unitLower === "boxes" || unitLower === "box" || unitLower === "packs" || unitLower === "pack") {
    kgQuantity = qty * 1;
  } else if (unitLower === "liters" || unitLower === "liter" || unitLower === "l") {
    kgQuantity = qty * 1;
  }

  return Math.round(kgQuantity * co2PerKg * 100) / 100;
}

// ============================================================================
// UNCLAIMED RISK PREDICTION
// ============================================================================
// Factors that influence unclaimed risk:
// 1. Time since posted (hours)
// 2. Time until expiry (hours)
// 3. Food category popularity
// 4. Historical claim rate for similar items
// 5. Day of week (weekends may have lower claims)

export interface UnclaimedRiskFactors {
  hourssincePosted: number;
  hoursUntilExpiry: number;
  category: string;
  spoilageRisk: "low" | "medium" | "high";
  hasBeenClaimed: boolean;
  isWeekend: boolean;
}

// Category popularity (higher = more likely to be claimed)
const CATEGORY_POPULARITY: Record<string, number> = {
  "Cooked": 0.9,           // Very popular
  "Ready-to-eat": 0.85,    // Very popular
  "Bakery": 0.8,           // Popular
  "Fruits": 0.75,          // Popular
  "Dairy": 0.7,            // Moderate
  "Vegetables": 0.65,      // Moderate
  "Grains": 0.6,           // Moderate
  "Frozen": 0.55,          // Lower (requires freezer)
  "Canned": 0.5,           // Lower (less urgent)
  "Beverage": 0.45,        // Lower
  "Other": 0.5,            // Average
};

/**
 * Calculate unclaimed risk score (0-100, higher = more likely to go unclaimed)
 */
export function calculateUnclaimedRisk(factors: UnclaimedRiskFactors): {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  reasons: string[];
} {
  let riskScore = 0;
  const reasons: string[] = [];

  // Factor 1: Time since posted (max 30 points)
  // Risk increases as item sits longer without claims
  if (factors.hourssincePosted > 48) {
    riskScore += 30;
    reasons.push("Posted over 48 hours ago");
  } else if (factors.hourssincePosted > 24) {
    riskScore += 20;
    reasons.push("Posted over 24 hours ago");
  } else if (factors.hourssincePosted > 12) {
    riskScore += 10;
    reasons.push("Posted over 12 hours ago");
  } else if (factors.hourssincePosted > 6) {
    riskScore += 5;
  }

  // Factor 2: Time until expiry (max 35 points)
  // Critical if expiring soon without claims
  if (factors.hoursUntilExpiry <= 0) {
    riskScore += 35;
    reasons.push("Already expired!");
  } else if (factors.hoursUntilExpiry < 6) {
    riskScore += 30;
    reasons.push("Expires within 6 hours");
  } else if (factors.hoursUntilExpiry < 12) {
    riskScore += 20;
    reasons.push("Expires within 12 hours");
  } else if (factors.hoursUntilExpiry < 24) {
    riskScore += 10;
    reasons.push("Expires within 24 hours");
  }

  // Factor 3: Category popularity (max 15 points)
  const popularity = CATEGORY_POPULARITY[factors.category] || 0.5;
  const categoryRisk = Math.round((1 - popularity) * 15);
  riskScore += categoryRisk;
  if (popularity < 0.5) {
    reasons.push(`${factors.category} has lower demand`);
  }

  // Factor 4: Spoilage risk (max 10 points)
  if (factors.spoilageRisk === "high") {
    riskScore += 10;
    reasons.push("High spoilage risk item");
  } else if (factors.spoilageRisk === "medium") {
    riskScore += 5;
  }

  // Factor 5: Weekend effect (max 10 points)
  if (factors.isWeekend && !factors.hasBeenClaimed) {
    riskScore += 10;
    reasons.push("Weekend - lower NGO activity");
  }

  // Reduce risk if already claimed
  if (factors.hasBeenClaimed) {
    riskScore = Math.max(0, riskScore - 40);
    reasons.length = 0;
    reasons.push("Item has been claimed");
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore >= 70) {
    riskLevel = "critical";
  } else if (riskScore >= 50) {
    riskLevel = "high";
  } else if (riskScore >= 25) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    reasons,
  };
}

// ============================================================================
// AGGREGATE IMPACT CALCULATIONS
// ============================================================================

export interface FoodItem {
  quantity: number | string;
  unit: string;
  category: string;
}

export interface AggregateImpact {
  totalValueRM: number;
  totalMeals: number;
  totalCO2SavedKg: number;
  totalItems: number;
}

/**
 * Calculate aggregate impact for multiple food items
 */
export function calculateAggregateImpact(items: FoodItem[]): AggregateImpact {
  let totalValueRM = 0;
  let totalMeals = 0;
  let totalCO2SavedKg = 0;

  for (const item of items) {
    totalValueRM += calculateFoodValue(item.quantity, item.unit, item.category);
    totalMeals += calculateMealsServed(item.quantity, item.unit, item.category);
    totalCO2SavedKg += calculateCO2Saved(item.quantity, item.unit, item.category);
  }

  return {
    totalValueRM: Math.round(totalValueRM * 100) / 100,
    totalMeals: Math.round(totalMeals),
    totalCO2SavedKg: Math.round(totalCO2SavedKg * 100) / 100,
    totalItems: items.length,
  };
}

/**
 * Format impact value for display
 */
export function formatImpactValue(value: number, type: "currency" | "meals" | "co2"): string {
  switch (type) {
    case "currency":
      return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "meals":
      return `${value.toLocaleString()} meals`;
    case "co2":
      return `${value.toLocaleString("en-MY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg CO₂`;
    default:
      return value.toString();
  }
}
