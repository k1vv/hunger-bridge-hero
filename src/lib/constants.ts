/**
 * Centralized Constants for FoodBridge
 *
 * This file contains all standardized constants used across the system
 * to ensure consistency between vendor donations and NGO preferences.
 */

// ============================================================================
// FOOD CATEGORIES
// ============================================================================
// These are the standard food categories used throughout the system.
// Used in: Vendor CreateDonation, NGO Profile preferences, Matching algorithm

export const FOOD_CATEGORIES = [
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
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

// Labels for display (more user-friendly descriptions)
export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  "Cooked Meals": "Cooked Meals",
  "Bakery & Bread": "Bakery & Bread",
  "Vegetables": "Vegetables",
  "Fruits": "Fruits",
  "Dairy Products": "Dairy Products",
  "Grains & Rice": "Grains & Rice",
  "Canned & Packaged": "Canned & Packaged",
  "Frozen Food": "Frozen Food",
  "Beverages": "Beverages",
  "Ready-to-Eat": "Ready-to-Eat",
  "Snacks & Desserts": "Snacks & Desserts",
  "Meat & Seafood": "Meat & Seafood",
  "Other": "Other",
};

// Short descriptions for each category
export const FOOD_CATEGORY_DESCRIPTIONS: Record<FoodCategory, string> = {
  "Cooked Meals": "Prepared hot meals, curries, rice dishes",
  "Bakery & Bread": "Bread, pastries, cakes, buns",
  "Vegetables": "Fresh vegetables, leafy greens",
  "Fruits": "Fresh fruits, cut fruits",
  "Dairy Products": "Milk, cheese, yogurt, butter",
  "Grains & Rice": "Rice, noodles, pasta, cereals",
  "Canned & Packaged": "Canned food, instant noodles, packaged goods",
  "Frozen Food": "Frozen meals, frozen meat, ice cream",
  "Beverages": "Drinks, juices, water, soft drinks",
  "Ready-to-Eat": "Sandwiches, salads, bento boxes",
  "Snacks & Desserts": "Cookies, chips, sweets, desserts",
  "Meat & Seafood": "Fresh/frozen meat, fish, seafood",
  "Other": "Other food items",
};

// ============================================================================
// STORAGE CONDITIONS
// ============================================================================
// Standard storage conditions for food items

export const STORAGE_CONDITIONS = [
  "room_temperature",
  "refrigerated",
  "frozen",
  "keep_warm",
] as const;

export type StorageCondition = typeof STORAGE_CONDITIONS[number];

export const STORAGE_CONDITION_LABELS: Record<StorageCondition, string> = {
  room_temperature: "Room Temperature",
  refrigerated: "Refrigerated",
  frozen: "Frozen",
  keep_warm: "Keep Warm",
};

export const STORAGE_CONDITION_DESCRIPTIONS: Record<StorageCondition, string> = {
  room_temperature: "Dry goods, canned food, packaged items",
  refrigerated: "Dairy, fresh produce, chilled items (0-4°C)",
  frozen: "Frozen food, ice cream, frozen meat (-18°C or below)",
  keep_warm: "Hot food that needs to stay warm (above 60°C)",
};

// ============================================================================
// NGO STORAGE TYPES
// ============================================================================
// Storage capabilities that NGOs can have

export const NGO_STORAGE_TYPES = [
  "Room Temperature",
  "Refrigerated",
  "Freezer",
  "Heated Storage",
] as const;

export type NgoStorageType = typeof NGO_STORAGE_TYPES[number];

// Mapping from donation storage condition to compatible NGO storage types
export const STORAGE_COMPATIBILITY: Record<StorageCondition, string[]> = {
  room_temperature: ["Room Temperature", "Ambient", "room", "Room"],
  refrigerated: ["Refrigerated", "Cold Storage", "chilled", "Chilled", "Fridge"],
  frozen: ["Frozen", "Freezer", "frozen", "Cold Storage"],
  keep_warm: ["Heated Storage", "Heated", "Warm", "warm", "Hot"],
};

// ============================================================================
// FOOD CATEGORY TO NGO PREFERENCE MAPPING
// ============================================================================
// Maps donation categories to terms NGOs might use in their preferences
// This enables fuzzy matching between what vendors donate and what NGOs accept

export const CATEGORY_TO_FOOD_TYPE_MAPPING: Record<string, string[]> = {
  // Standard categories
  "Cooked Meals": ["Cooked Meals", "Cooked Food", "Ready-to-Eat", "Prepared Meals", "Hot Meals"],
  "Bakery & Bread": ["Bakery & Bread", "Bakery", "Bread", "Pastries", "Baked Goods"],
  "Vegetables": ["Vegetables", "Fresh Produce", "Veggies", "Greens"],
  "Fruits": ["Fruits", "Fresh Produce", "Fresh Fruits"],
  "Dairy Products": ["Dairy Products", "Dairy", "Milk", "Cheese", "Yogurt"],
  "Grains & Rice": ["Grains & Rice", "Grains", "Rice", "Noodles", "Dry Goods", "Cereals"],
  "Canned & Packaged": ["Canned & Packaged", "Canned Food", "Packaged Food", "Non-Perishable", "Instant Food"],
  "Frozen Food": ["Frozen Food", "Frozen", "Frozen Meals"],
  "Beverages": ["Beverages", "Drinks", "Beverage", "Juices"],
  "Ready-to-Eat": ["Ready-to-Eat", "Ready to Eat", "Cooked Food", "Prepared Meals", "Sandwiches"],
  "Snacks & Desserts": ["Snacks & Desserts", "Snacks", "Desserts", "Sweets", "Cookies"],
  "Meat & Seafood": ["Meat & Seafood", "Meat", "Seafood", "Protein", "Fish"],
  "Other": ["Other", "Packaged Food", "General", "Miscellaneous"],
};

// ============================================================================
// UNITS
// ============================================================================
// Standard units for food quantities

export const FOOD_UNITS = [
  "kg",
  "g",
  "packs",
  "boxes",
  "pieces",
  "trays",
  "bags",
  "bottles",
  "litres",
  "servings",
] as const;

export type FoodUnit = typeof FOOD_UNITS[number];

export const FOOD_UNIT_LABELS: Record<FoodUnit, string> = {
  kg: "Kilograms (kg)",
  g: "Grams (g)",
  packs: "Packs",
  boxes: "Boxes",
  pieces: "Pieces",
  trays: "Trays",
  bags: "Bags",
  bottles: "Bottles",
  litres: "Litres",
  servings: "Servings",
};

// ============================================================================
// HALAL STATUS
// ============================================================================

export const HALAL_STATUS = [
  "halal",
  "non_halal",
  "unknown",
] as const;

export type HalalStatus = typeof HALAL_STATUS[number];

export const HALAL_STATUS_LABELS: Record<HalalStatus, string> = {
  halal: "Halal Certified",
  non_halal: "Non-Halal",
  unknown: "Unknown",
};

// ============================================================================
// ORGANIZATION TYPES (for NGOs)
// ============================================================================

export const ORGANIZATION_TYPES = [
  "Foodbank",
  "NGO",
  "Shelter",
  "Mosque",
  "Temple",
  "Church",
  "Community Center",
  "School",
  "Hospital",
  "Orphanage",
  "Elderly Home",
  "Other",
] as const;

export type OrganizationType = typeof ORGANIZATION_TYPES[number];

// ============================================================================
// BENEFICIARY TYPES
// ============================================================================

export const BENEFICIARY_TYPES = [
  "Homeless",
  "Low-income Families",
  "Students",
  "Refugees",
  "Elderly",
  "Orphans",
  "Disabled",
  "Single Parents",
  "Unemployed",
  "General Public",
] as const;

export type BeneficiaryType = typeof BENEFICIARY_TYPES[number];

// ============================================================================
// DISTRIBUTION TYPES
// ============================================================================

export const DISTRIBUTION_TYPES = [
  "walk-in",
  "event",
  "delivery",
  "drive-through",
] as const;

export type DistributionType = typeof DISTRIBUTION_TYPES[number];

export const DISTRIBUTION_TYPE_LABELS: Record<DistributionType, string> = {
  "walk-in": "Walk-in Distribution",
  "event": "Distribution Event",
  "delivery": "Home Delivery",
  "drive-through": "Drive-through",
};

// ============================================================================
// DISTRIBUTION FREQUENCIES
// ============================================================================

export const DISTRIBUTION_FREQUENCIES = [
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "As needed",
] as const;

export type DistributionFrequency = typeof DISTRIBUTION_FREQUENCIES[number];
