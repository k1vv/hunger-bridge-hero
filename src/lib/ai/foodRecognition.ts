/**
 * Food Image Recognition using Google Cloud Vision API
 *
 * SETUP:
 * 1. Enable Cloud Vision API in Google Cloud Console
 * 2. Create API key
 * 3. Add to .env: VITE_GOOGLE_VISION_API_KEY=your_key
 */

const GOOGLE_VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

export interface FoodAnalysis {
  category: string;
  foodType: string;
  confidence: number;
  suggestedName: string;
  isHalal: "likely" | "unlikely" | "unknown";
  storageRecommendation: string;
  spoilageRisk: "low" | "medium" | "high";
}

// Category mapping from detected labels
const categoryKeywords: Record<string, string> = {
  bread: "Bakery & Bread",
  pastry: "Bakery & Bread",
  cake: "Bakery & Bread",
  cookie: "Bakery & Bread",
  rice: "Rice & Grains",
  grain: "Rice & Grains",
  noodle: "Rice & Grains",
  pasta: "Rice & Grains",
  vegetable: "Vegetables",
  salad: "Vegetables",
  fruit: "Fruits",
  apple: "Fruits",
  banana: "Fruits",
  orange: "Fruits",
  meat: "Meat & Poultry",
  chicken: "Meat & Poultry",
  beef: "Meat & Poultry",
  pork: "Meat & Poultry",
  fish: "Seafood",
  seafood: "Seafood",
  shrimp: "Seafood",
  milk: "Dairy",
  cheese: "Dairy",
  yogurt: "Dairy",
  drink: "Beverages",
  beverage: "Beverages",
  juice: "Beverages",
  snack: "Snacks",
  chip: "Snacks",
  dessert: "Desserts",
  "ice cream": "Desserts",
  meal: "Cooked Meals",
  dish: "Cooked Meals",
  curry: "Cooked Meals",
  soup: "Cooked Meals",
  sandwich: "Ready-to-Eat",
  burger: "Ready-to-Eat",
  pizza: "Ready-to-Eat",
};

// Storage recommendations
const storageKeywords: Record<string, string> = {
  meat: "refrigerated",
  chicken: "refrigerated",
  beef: "refrigerated",
  fish: "refrigerated",
  seafood: "refrigerated",
  milk: "refrigerated",
  dairy: "refrigerated",
  yogurt: "refrigerated",
  cheese: "refrigerated",
  "ice cream": "frozen",
  frozen: "frozen",
  bread: "room_temperature",
  rice: "room_temperature",
  canned: "room_temperature",
  dry: "room_temperature",
  soup: "keep_warm",
  curry: "keep_warm",
  hot: "keep_warm",
};

// Spoilage risk indicators
const highSpoilageKeywords = ["meat", "fish", "seafood", "dairy", "milk", "cooked", "meal"];
const mediumSpoilageKeywords = ["fruit", "vegetable", "bread", "pastry"];

// Non-halal indicators
const nonHalalKeywords = ["pork", "bacon", "ham", "lard", "gelatin"];

/**
 * Convert file to base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Analyze food image using Google Cloud Vision
 */
export async function analyzeFoodImage(imageBase64: string): Promise<FoodAnalysis> {
  if (!GOOGLE_VISION_API_KEY) {
    console.warn("Google Vision API key not configured");
    return getDefaultAnalysis();
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [
                { type: "LABEL_DETECTION", maxResults: 15 },
                { type: "OBJECT_LOCALIZATION", maxResults: 5 },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const labels = data.responses?.[0]?.labelAnnotations || [];
    const objects = data.responses?.[0]?.localizedObjectAnnotations || [];

    return mapLabelsToAnalysis(labels, objects);
  } catch (error) {
    console.error("Food recognition error:", error);
    return getDefaultAnalysis();
  }
}

/**
 * Map Vision API labels to FoodAnalysis
 */
function mapLabelsToAnalysis(labels: any[], objects: any[]): FoodAnalysis {
  const allDescriptions = [
    ...labels.map((l) => l.description.toLowerCase()),
    ...objects.map((o) => o.name.toLowerCase()),
  ];

  // Find category
  let category = "Other";
  let matchedKeyword = "";
  for (const desc of allDescriptions) {
    for (const [keyword, cat] of Object.entries(categoryKeywords)) {
      if (desc.includes(keyword)) {
        category = cat;
        matchedKeyword = keyword;
        break;
      }
    }
    if (category !== "Other") break;
  }

  // Find storage recommendation
  let storageRecommendation = "room_temperature";
  for (const desc of allDescriptions) {
    for (const [keyword, storage] of Object.entries(storageKeywords)) {
      if (desc.includes(keyword)) {
        storageRecommendation = storage;
        break;
      }
    }
    if (storageRecommendation !== "room_temperature") break;
  }

  // Determine spoilage risk
  let spoilageRisk: "low" | "medium" | "high" = "low";
  if (allDescriptions.some((d) => highSpoilageKeywords.some((k) => d.includes(k)))) {
    spoilageRisk = "high";
  } else if (allDescriptions.some((d) => mediumSpoilageKeywords.some((k) => d.includes(k)))) {
    spoilageRisk = "medium";
  }

  // Determine halal status
  let isHalal: "likely" | "unlikely" | "unknown" = "unknown";
  if (allDescriptions.some((d) => nonHalalKeywords.some((k) => d.includes(k)))) {
    isHalal = "unlikely";
  }

  // Get best food name
  const foodLabel = labels.find((l) =>
    Object.keys(categoryKeywords).some((k) => l.description.toLowerCase().includes(k))
  );
  const suggestedName = foodLabel?.description || labels[0]?.description || "Food Item";

  return {
    category,
    foodType: matchedKeyword || labels[0]?.description || "food",
    confidence: labels[0]?.score || 0.5,
    suggestedName: capitalizeFirst(suggestedName),
    isHalal,
    storageRecommendation,
    spoilageRisk,
  };
}

function getDefaultAnalysis(): FoodAnalysis {
  return {
    category: "Other",
    foodType: "food",
    confidence: 0,
    suggestedName: "",
    isHalal: "unknown",
    storageRecommendation: "room_temperature",
    spoilageRisk: "medium",
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
