/**
 * AI-Enhanced Matching Engine for FoodBridge
 *
 * Combines semantic understanding (embeddings) with rule-based scoring
 * to provide intelligent donation-NGO matching.
 *
 * Features:
 * - Semantic food type matching using embeddings
 * - AI-powered match explanations
 * - Hybrid scoring (AI + traditional rules)
 */

import {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  similarityToScore,
  isAIMatchingAvailable,
} from "./embeddings";

// Debug mode - set to true for verbose logging
const AI_DEBUG = import.meta.env.DEV;

import {
  FOOD_CATEGORY_DESCRIPTIONS,
  type FoodCategory,
} from "../constants";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-embeddings`;

// ============================================================================
// TYPES
// ============================================================================

export interface DonationItemForAI {
  food_name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  halal_status?: string;
  storage_condition?: string;
  notes?: string;
}

export interface NGOProfileForAI {
  id: string;
  business_name?: string;
  food_types?: string[];
  priority_needs?: string[];
  service_area?: string;
  notes?: string;
  halal_only?: boolean;
}

export interface AIMatchScore {
  semanticScore: number;        // 0-100: How well items semantically match NGO preferences
  explanationScore: number;     // 0-100: Contextual understanding bonus
  totalAIScore: number;         // Combined AI score (0-100)
  confidence: number;           // 0-1: How confident the AI is in this match
  matchReasons: string[];       // Why this is a good match
  warnings: string[];           // Potential concerns
}

export interface AIMatchExplanation {
  summary: string;              // One-line summary
  details: string[];            // Detailed reasons
  recommendation: "high" | "medium" | "low";
}

// ============================================================================
// TEXT GENERATION FOR EMBEDDINGS
// ============================================================================

/**
 * Generate a rich text description of donation items for embedding
 */
export function generateDonationText(items: DonationItemForAI[]): string {
  const parts: string[] = [];

  items.forEach((item) => {
    const itemParts: string[] = [];

    if (item.food_name) {
      itemParts.push(item.food_name);
    }

    if (item.category) {
      itemParts.push(item.category);
      // Add category description for richer context
      const description = FOOD_CATEGORY_DESCRIPTIONS[item.category as FoodCategory];
      if (description) {
        itemParts.push(description);
      }
    }

    if (item.quantity && item.unit) {
      itemParts.push(`${item.quantity} ${item.unit}`);
    }

    if (item.halal_status === "halal") {
      itemParts.push("halal certified");
    } else if (item.halal_status === "non_halal") {
      itemParts.push("non-halal");
    }

    if (item.storage_condition) {
      const storageMap: Record<string, string> = {
        room_temperature: "room temperature storage",
        refrigerated: "needs refrigeration",
        frozen: "frozen food",
        keep_warm: "needs to be kept warm",
      };
      itemParts.push(storageMap[item.storage_condition] || item.storage_condition);
    }

    if (item.notes) {
      itemParts.push(item.notes);
    }

    if (itemParts.length > 0) {
      parts.push(itemParts.join(", "));
    }
  });

  return parts.join(". ") || "general food donation";
}

/**
 * Generate a rich text description of NGO preferences for embedding
 */
export function generateNGOPreferenceText(ngo: NGOProfileForAI): string {
  const parts: string[] = [];

  if (ngo.business_name) {
    parts.push(`Organization: ${ngo.business_name}`);
  }

  if (ngo.food_types && ngo.food_types.length > 0) {
    parts.push(`Accepts: ${ngo.food_types.join(", ")}`);
  } else {
    parts.push("Accepts all food types");
  }

  if (ngo.priority_needs && ngo.priority_needs.length > 0) {
    parts.push(`Priority needs: ${ngo.priority_needs.join(", ")}`);
  }

  if (ngo.halal_only) {
    parts.push("Requires halal food only");
  }

  if (ngo.service_area) {
    parts.push(`Serves: ${ngo.service_area}`);
  }

  if (ngo.notes) {
    parts.push(ngo.notes);
  }

  return parts.join(". ") || "general food charity organization";
}

// ============================================================================
// AI MATCHING FUNCTIONS
// ============================================================================

/**
 * Calculate AI-enhanced match score between donation items and an NGO
 */
export async function calculateAIMatchScore(
  items: DonationItemForAI[],
  ngo: NGOProfileForAI
): Promise<AIMatchScore | null> {
  if (!isAIMatchingAvailable()) {
    if (AI_DEBUG) {
      console.log("🤖 AI Matching: Skipped (no API key)");
    }
    return null;
  }

  try {
    if (AI_DEBUG) {
      console.log("🤖 AI Matching: Starting score calculation...");
      console.log(`   Items: ${items.length}, NGO: ${ngo.business_name || ngo.id}`);
    }

    // Generate text descriptions
    const donationText = generateDonationText(items);
    const ngoText = generateNGOPreferenceText(ngo);

    if (AI_DEBUG) {
      console.log(`   Donation text: "${donationText.substring(0, 100)}..."`);
      console.log(`   NGO text: "${ngoText.substring(0, 100)}..."`);
    }

    // Generate embeddings
    const [donationEmbedding, ngoEmbedding] = await Promise.all([
      generateEmbedding(donationText),
      generateEmbedding(ngoText),
    ]);

    if (!donationEmbedding || !ngoEmbedding) {
      return null;
    }

    // Calculate semantic similarity
    const similarity = cosineSimilarity(
      donationEmbedding.embedding,
      ngoEmbedding.embedding
    );

    // Convert to score (0-100)
    const semanticScore = similarityToScore(similarity, 100);

    // Calculate additional context-based scoring
    const matchReasons: string[] = [];
    const warnings: string[] = [];
    let explanationScore = 0;

    // Check halal compatibility
    const hasNonHalal = items.some((i) => i.halal_status === "non_halal");
    if (ngo.halal_only && hasNonHalal) {
      warnings.push("NGO requires halal food but donation contains non-halal items");
      explanationScore -= 20;
    } else if (ngo.halal_only && items.every((i) => i.halal_status === "halal")) {
      matchReasons.push("All items are halal certified");
      explanationScore += 15;
    }

    // Check priority needs alignment
    if (ngo.priority_needs && ngo.priority_needs.length > 0) {
      const categories = new Set(items.map((i) => i.category).filter(Boolean));
      const matchedPriorities = ngo.priority_needs.filter((need) =>
        Array.from(categories).some(
          (cat) =>
            cat?.toLowerCase().includes(need.toLowerCase()) ||
            need.toLowerCase().includes(cat?.toLowerCase() || "")
        )
      );
      if (matchedPriorities.length > 0) {
        matchReasons.push(`Matches priority needs: ${matchedPriorities.join(", ")}`);
        explanationScore += 10 * matchedPriorities.length;
      }
    }

    // Bonus for food variety
    const uniqueCategories = new Set(items.map((i) => i.category).filter(Boolean));
    if (uniqueCategories.size >= 3) {
      matchReasons.push("Good variety of food types");
      explanationScore += 5;
    }

    // Calculate confidence based on embedding cache hits and similarity strength
    const confidence = Math.min(
      1,
      (similarity + 1) / 2 + (donationEmbedding.cached && ngoEmbedding.cached ? 0.1 : 0)
    );

    // Normalize explanation score
    explanationScore = Math.max(0, Math.min(100, 50 + explanationScore));

    // Calculate total AI score (weighted combination)
    const totalAIScore = Math.round(semanticScore * 0.7 + explanationScore * 0.3);

    if (AI_DEBUG) {
      console.log(`🤖 AI Matching: Score calculated successfully!`);
      console.log(`   Semantic: ${semanticScore}, Explanation: ${explanationScore}, Total: ${totalAIScore}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      if (matchReasons.length) console.log(`   Reasons: ${matchReasons.join(", ")}`);
      if (warnings.length) console.log(`   ⚠️ Warnings: ${warnings.join(", ")}`);
    }

    return {
      semanticScore,
      explanationScore,
      totalAIScore,
      confidence,
      matchReasons,
      warnings,
    };
  } catch (error) {
    console.error("🤖 AI Matching Error:", error);
    return null;
  }
}

/**
 * Batch calculate AI match scores for multiple NGOs
 */
export async function calculateAIMatchScoresBatch(
  items: DonationItemForAI[],
  ngos: NGOProfileForAI[]
): Promise<Map<string, AIMatchScore>> {
  const results = new Map<string, AIMatchScore>();

  if (!isAIMatchingAvailable() || ngos.length === 0) {
    return results;
  }

  try {
    // Generate donation text once
    const donationText = generateDonationText(items);

    // Generate all NGO texts
    const ngoTexts = ngos.map((ngo) => generateNGOPreferenceText(ngo));

    // Batch generate embeddings
    const allTexts = [donationText, ...ngoTexts];
    const embeddings = await generateEmbeddingsBatch(allTexts);

    const donationEmbedding = embeddings[0];
    if (!donationEmbedding) {
      return results;
    }

    // Calculate scores for each NGO
    ngos.forEach((ngo, index) => {
      const ngoEmbedding = embeddings[index + 1];
      if (!ngoEmbedding) return;

      const similarity = cosineSimilarity(donationEmbedding, ngoEmbedding);
      const semanticScore = similarityToScore(similarity, 100);

      // Simplified context scoring for batch
      const matchReasons: string[] = [];
      const warnings: string[] = [];
      let explanationScore = 50;

      // Quick halal check
      const hasNonHalal = items.some((i) => i.halal_status === "non_halal");
      if (ngo.halal_only && hasNonHalal) {
        warnings.push("Halal requirement mismatch");
        explanationScore -= 20;
      }

      const totalAIScore = Math.round(semanticScore * 0.7 + explanationScore * 0.3);

      results.set(ngo.id, {
        semanticScore,
        explanationScore,
        totalAIScore,
        confidence: (similarity + 1) / 2,
        matchReasons,
        warnings,
      });
    });

    return results;
  } catch (error) {
    console.error("Batch AI match score error:", error);
    return results;
  }
}

// ============================================================================
// MATCH EXPLANATION GENERATION (LLM-based)
// ============================================================================

/**
 * Generate a human-readable explanation for why a donation matches an NGO
 * Uses GPT for natural language generation
 */
export async function generateMatchExplanation(
  items: DonationItemForAI[],
  ngo: NGOProfileForAI,
  aiScore?: AIMatchScore
): Promise<AIMatchExplanation | null> {
  if (!OPENAI_API_KEY) {
    // Fallback to rule-based explanation
    return generateFallbackExplanation(items, ngo, aiScore);
  }

  try {
    const donationSummary = items
      .map((i) => `${i.quantity || ""} ${i.unit || ""} ${i.food_name || i.category || "food"}`.trim())
      .join(", ");

    const ngoSummary = [
      ngo.business_name || "NGO",
      ngo.food_types?.length ? `accepts ${ngo.food_types.join(", ")}` : "accepts all food",
      ngo.priority_needs?.length ? `prioritizes ${ngo.priority_needs.join(", ")}` : "",
      ngo.halal_only ? "requires halal" : "",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `You are a food donation matching assistant. Briefly explain why this donation is ${
      aiScore && aiScore.totalAIScore >= 60 ? "a good" : "a potential"
    } match.

Donation: ${donationSummary}
NGO: ${ngoSummary}
${aiScore ? `Match score: ${aiScore.totalAIScore}/100` : ""}

Respond in JSON format:
{
  "summary": "One sentence summary (max 15 words)",
  "details": ["reason 1", "reason 2"],
  "recommendation": "high" | "medium" | "low"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return generateFallbackExplanation(items, ngo, aiScore);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return generateFallbackExplanation(items, ngo, aiScore);
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || "Potential match found",
      details: parsed.details || [],
      recommendation: parsed.recommendation || "medium",
    };
  } catch (error) {
    console.error("Match explanation generation error:", error);
    return generateFallbackExplanation(items, ngo, aiScore);
  }
}

/**
 * Fallback explanation when LLM is unavailable
 */
function generateFallbackExplanation(
  items: DonationItemForAI[],
  ngo: NGOProfileForAI,
  aiScore?: AIMatchScore
): AIMatchExplanation {
  const details: string[] = [];
  let recommendation: "high" | "medium" | "low" = "medium";

  // Check food type matches
  const categories = new Set(items.map((i) => i.category).filter(Boolean));
  const ngoTypes = ngo.food_types || [];

  if (ngoTypes.length === 0) {
    details.push("NGO accepts all food types");
  } else {
    const matches = Array.from(categories).filter((cat) =>
      ngoTypes.some((type) => type.toLowerCase().includes(cat!.toLowerCase()))
    );
    if (matches.length > 0) {
      details.push(`Matches accepted types: ${matches.join(", ")}`);
    }
  }

  // Check halal
  const allHalal = items.every((i) => i.halal_status === "halal");
  if (ngo.halal_only && allHalal) {
    details.push("All items are halal certified");
  }

  // Determine recommendation
  if (aiScore) {
    if (aiScore.totalAIScore >= 70) recommendation = "high";
    else if (aiScore.totalAIScore >= 40) recommendation = "medium";
    else recommendation = "low";
  }

  const summary =
    recommendation === "high"
      ? "Excellent match for this NGO's needs"
      : recommendation === "medium"
      ? "Good potential match"
      : "Partial match - review recommended";

  return { summary, details, recommendation };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { isAIMatchingAvailable } from "./embeddings";
