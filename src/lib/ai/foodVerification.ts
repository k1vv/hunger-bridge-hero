/**
 * AI Food Verification System
 *
 * Validates food donations before they go live:
 * - Verifies image contains actual food
 * - Checks food condition (fresh vs spoiled)
 * - Cross-validates image with form inputs
 * - Validates expiry dates and quantities
 */

const GOOGLE_VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

export interface FoodItemInput {
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  storageCondition: string;
  halalStatus: string;
  imageBase64: string;
}

export interface VerificationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  issues: VerificationIssue[];
  summary: string;
  detectedFood: string | null;
  imageAnalysis: {
    isFood: boolean;
    foodCondition: "fresh" | "questionable" | "spoiled" | "unknown";
    confidence: number;
    labels: string[];
  };
}

// Food-related labels that indicate the image contains food
const FOOD_LABELS = [
  "food", "dish", "cuisine", "meal", "snack", "ingredient", "produce",
  "fruit", "vegetable", "meat", "seafood", "bread", "rice", "noodle",
  "pasta", "soup", "salad", "dessert", "cake", "pastry", "sandwich",
  "burger", "pizza", "sushi", "curry", "stew", "breakfast", "lunch",
  "dinner", "beverage", "drink", "juice", "cooked", "baked", "fried",
  "grilled", "steamed", "roasted", "prepared food", "fast food",
  "asian food", "malaysian food", "chinese food", "indian food",
  "malay food", "nasi", "mee", "roti", "chicken", "fish", "beef",
  "pork", "lamb", "egg", "tofu", "tempeh", "sambal", "rendang"
];

// Labels that suggest spoiled/bad food
const SPOILAGE_LABELS = [
  "mold", "moldy", "rotten", "spoiled", "decay", "decomposed",
  "fungus", "bacteria", "contaminated", "expired", "stale"
];

// Labels that suggest non-food items
const NON_FOOD_LABELS = [
  "person", "human", "face", "animal", "pet", "dog", "cat",
  "furniture", "electronics", "vehicle", "building", "landscape",
  "document", "text", "screenshot", "clothing", "tool"
];

/**
 * Main verification function - validates a food item
 */
export async function verifyFoodItem(item: FoodItemInput): Promise<VerificationResult> {
  const issues: VerificationIssue[] = [];
  let score = 100;

  // Default result structure
  const result: VerificationResult = {
    passed: false,
    score: 0,
    issues: [],
    summary: "",
    detectedFood: null,
    imageAnalysis: {
      isFood: false,
      foodCondition: "unknown",
      confidence: 0,
      labels: [],
    },
  };

  // 1. Validate expiry date first (doesn't need API)
  const expiryValidation = validateExpiryDate(item.expiryDate);
  if (!expiryValidation.valid) {
    issues.push({
      field: "expiryDate",
      severity: "error",
      message: expiryValidation.message,
    });
    score -= 50;
  }

  // 2. Validate quantity
  const quantityValidation = validateQuantity(item.quantity, item.unit, item.category);
  if (!quantityValidation.valid) {
    issues.push({
      field: "quantity",
      severity: quantityValidation.severity,
      message: quantityValidation.message,
    });
    score -= quantityValidation.severity === "error" ? 30 : 10;
  }

  // 3. Analyze image with Google Vision
  if (!GOOGLE_VISION_API_KEY) {
    // No API key - skip image verification, just do basic validation
    result.passed = issues.filter(i => i.severity === "error").length === 0;
    result.score = Math.max(0, score);
    result.issues = issues;
    result.summary = result.passed
      ? "Basic validation passed (image verification skipped - no API key)"
      : `Verification failed: ${issues.filter(i => i.severity === "error").map(i => i.message).join("; ")}`;
    return result;
  }

  try {
    const imageAnalysis = await analyzeImageWithVision(item.imageBase64);
    result.imageAnalysis = imageAnalysis;
    result.detectedFood = imageAnalysis.labels[0] || null;

    // 4. Check if image contains food
    if (!imageAnalysis.isFood) {
      issues.push({
        field: "image",
        severity: "error",
        message: "Image does not appear to contain food. Please upload a clear photo of the food item.",
      });
      score -= 50;
    }

    // 5. Check food condition
    if (imageAnalysis.foodCondition === "spoiled") {
      issues.push({
        field: "image",
        severity: "error",
        message: "Food appears to be spoiled or in poor condition. We cannot accept donations of spoiled food.",
      });
      score -= 50;
    } else if (imageAnalysis.foodCondition === "questionable") {
      issues.push({
        field: "image",
        severity: "warning",
        message: "Food condition is unclear from the image. Please ensure the food is fresh and safe for consumption.",
      });
      score -= 15;
    }

    // 6. Cross-validate food name with detected labels
    if (imageAnalysis.isFood && item.foodName) {
      const nameValidation = validateFoodNameMatch(item.foodName, imageAnalysis.labels);
      if (!nameValidation.valid) {
        issues.push({
          field: "foodName",
          severity: "warning",
          message: nameValidation.message,
        });
        score -= 10;
      }
    }

    // 7. Cross-validate category with detected labels
    if (imageAnalysis.isFood && item.category) {
      const categoryValidation = validateCategoryMatch(item.category, imageAnalysis.labels);
      if (!categoryValidation.valid) {
        issues.push({
          field: "category",
          severity: "warning",
          message: categoryValidation.message,
        });
        score -= 10;
      }
    }

  } catch (error) {
    console.error("Image analysis failed:", error);
    issues.push({
      field: "image",
      severity: "warning",
      message: "Could not analyze image. Please ensure you've uploaded a clear photo.",
    });
    score -= 10;
  }

  // Calculate final result
  const hasErrors = issues.filter(i => i.severity === "error").length > 0;
  result.passed = !hasErrors && score >= 50;
  result.score = Math.max(0, Math.min(100, score));
  result.issues = issues;

  // Generate summary
  if (result.passed) {
    if (issues.length === 0) {
      result.summary = "All verification checks passed. Your donation is ready to be listed!";
    } else {
      result.summary = `Verification passed with ${issues.length} warning(s). Please review the notes below.`;
    }
  } else {
    const errorCount = issues.filter(i => i.severity === "error").length;
    result.summary = `Verification failed with ${errorCount} issue(s) that must be resolved before listing.`;
  }

  return result;
}

/**
 * Verify all items in a batch
 */
export async function verifyFoodBatch(items: FoodItemInput[]): Promise<{
  passed: boolean;
  results: VerificationResult[];
  summary: string;
}> {
  const results = await Promise.all(items.map(item => verifyFoodItem(item)));

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passed: failedCount === 0,
    results,
    summary: failedCount === 0
      ? `All ${items.length} item(s) passed verification!`
      : `${failedCount} of ${items.length} item(s) failed verification. Please fix the issues and try again.`,
  };
}

/**
 * Analyze image using Google Cloud Vision API
 */
async function analyzeImageWithVision(imageBase64: string): Promise<VerificationResult["imageAnalysis"]> {
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
              { type: "LABEL_DETECTION", maxResults: 20 },
              { type: "SAFE_SEARCH_DETECTION" },
              { type: "IMAGE_PROPERTIES" },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Vision API request failed");
  }

  const data = await response.json();
  const annotations = data.responses?.[0];

  if (!annotations) {
    throw new Error("No annotations returned");
  }

  const labels = annotations.labelAnnotations || [];
  const labelDescriptions = labels.map((l: any) => l.description.toLowerCase());
  const labelScores = labels.map((l: any) => ({ label: l.description.toLowerCase(), score: l.score }));

  // Check if image contains food
  const foodLabelsFound = labelDescriptions.filter((label: string) =>
    FOOD_LABELS.some(food => label.includes(food) || food.includes(label))
  );
  const isFood = foodLabelsFound.length >= 2 ||
    labelScores.some((l: any) => FOOD_LABELS.includes(l.label) && l.score > 0.8);

  // Check for non-food indicators
  const nonFoodLabelsFound = labelDescriptions.filter((label: string) =>
    NON_FOOD_LABELS.some(nf => label.includes(nf))
  );
  const hasNonFoodIndicators = nonFoodLabelsFound.length > 0;

  // Check for spoilage indicators
  const spoilageLabelsFound = labelDescriptions.filter((label: string) =>
    SPOILAGE_LABELS.some(sp => label.includes(sp))
  );

  // Determine food condition
  let foodCondition: "fresh" | "questionable" | "spoiled" | "unknown" = "unknown";
  if (spoilageLabelsFound.length > 0) {
    foodCondition = "spoiled";
  } else if (isFood) {
    // Check for freshness indicators
    const freshIndicators = ["fresh", "ripe", "colorful", "appetizing", "delicious"];
    const hasFreshIndicators = labelDescriptions.some((l: string) =>
      freshIndicators.some(f => l.includes(f))
    );
    foodCondition = hasFreshIndicators ? "fresh" : "questionable";
  }

  // Calculate confidence
  const avgScore = labels.length > 0
    ? labels.reduce((sum: number, l: any) => sum + l.score, 0) / labels.length
    : 0;

  return {
    isFood: isFood && !hasNonFoodIndicators,
    foodCondition,
    confidence: avgScore,
    labels: labelDescriptions.slice(0, 10),
  };
}

/**
 * Validate expiry date
 */
function validateExpiryDate(expiryDate: string): { valid: boolean; message: string } {
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (expiry < now) {
    return {
      valid: false,
      message: "Expiry date is in the past. Food must not be expired.",
    };
  }

  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilExpiry < 2) {
    return {
      valid: false,
      message: "Food expires in less than 2 hours. Please allow sufficient time for pickup.",
    };
  }

  return { valid: true, message: "" };
}

/**
 * Validate quantity is reasonable
 */
function validateQuantity(
  quantity: number,
  unit: string,
  category: string
): { valid: boolean; severity: "error" | "warning"; message: string } {
  if (quantity <= 0) {
    return {
      valid: false,
      severity: "error",
      message: "Quantity must be greater than 0.",
    };
  }

  if (quantity > 10000) {
    return {
      valid: false,
      severity: "warning",
      message: `Quantity of ${quantity} ${unit} seems unusually high. Please verify.`,
    };
  }

  return { valid: true, severity: "warning", message: "" };
}

/**
 * Validate food name matches detected labels
 */
function validateFoodNameMatch(
  foodName: string,
  detectedLabels: string[]
): { valid: boolean; message: string } {
  const nameLower = foodName.toLowerCase();
  const nameWords = nameLower.split(/\s+/);

  // Check if any word from the food name appears in labels
  const hasMatch = nameWords.some(word =>
    word.length > 2 && detectedLabels.some(label =>
      label.includes(word) || word.includes(label)
    )
  );

  // Also check common food aliases
  const aliases: Record<string, string[]> = {
    "nasi lemak": ["rice", "coconut", "sambal", "malaysian"],
    "nasi goreng": ["rice", "fried rice", "asian"],
    "mee goreng": ["noodle", "fried noodle", "asian"],
    "roti canai": ["bread", "flatbread", "indian"],
    "chicken rice": ["rice", "chicken", "poultry"],
    "burger": ["sandwich", "bun", "patty"],
    "sandwich": ["bread", "toast"],
  };

  const aliasMatch = Object.entries(aliases).some(([key, values]) => {
    if (nameLower.includes(key)) {
      return values.some(v => detectedLabels.some(l => l.includes(v)));
    }
    return false;
  });

  if (!hasMatch && !aliasMatch) {
    return {
      valid: false,
      message: `The image doesn't clearly show "${foodName}". Detected: ${detectedLabels.slice(0, 3).join(", ")}. Please verify the food name matches your image.`,
    };
  }

  return { valid: true, message: "" };
}

/**
 * Validate category matches detected labels
 */
function validateCategoryMatch(
  category: string,
  detectedLabels: string[]
): { valid: boolean; message: string } {
  const categoryMappings: Record<string, string[]> = {
    "Prepared Food": ["food", "dish", "meal", "cuisine", "cooked", "prepared"],
    "Bakery": ["bread", "pastry", "cake", "baked", "bakery", "cookie", "muffin"],
    "Fruits": ["fruit", "apple", "banana", "orange", "berry", "grape", "mango"],
    "Vegetables": ["vegetable", "salad", "greens", "carrot", "potato", "onion"],
    "Dairy": ["dairy", "milk", "cheese", "yogurt", "cream"],
    "Beverages": ["drink", "beverage", "juice", "water", "coffee", "tea"],
    "Canned Goods": ["can", "canned", "tin", "preserved"],
    "Dry Goods": ["rice", "pasta", "noodle", "grain", "cereal", "flour"],
    "Frozen": ["frozen", "ice"],
    "Meat": ["meat", "chicken", "beef", "pork", "lamb", "poultry", "fish", "seafood"],
    "Other": [],
  };

  const expectedLabels = categoryMappings[category] || [];
  if (expectedLabels.length === 0) {
    return { valid: true, message: "" }; // "Other" category always passes
  }

  const hasMatch = expectedLabels.some(expected =>
    detectedLabels.some(label => label.includes(expected) || expected.includes(label))
  );

  if (!hasMatch) {
    return {
      valid: false,
      message: `The image doesn't match the "${category}" category. Please verify the category selection.`,
    };
  }

  return { valid: true, message: "" };
}
