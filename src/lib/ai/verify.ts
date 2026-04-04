/**
 * AI Matching Engine Verification Utility
 *
 * Use this to verify that the AI matching engine is working correctly.
 * Can be called from browser console or used in components.
 */

import {
  generateEmbedding,
  cosineSimilarity,
  isAIMatchingAvailable,
  getEmbeddingCacheStats,
  clearEmbeddingCache,
} from "./embeddings";

import {
  generateDonationText,
  generateNGOPreferenceText,
  calculateAIMatchScore,
  generateMatchExplanation,
  type DonationItemForAI,
  type NGOProfileForAI,
} from "./matching";

export interface AIVerificationResult {
  isAvailable: boolean;
  apiKeyConfigured: boolean;
  embeddingTest: {
    success: boolean;
    latencyMs: number;
    error?: string;
  } | null;
  matchingTest: {
    success: boolean;
    score: number | null;
    latencyMs: number;
    error?: string;
  } | null;
  cacheStats: {
    size: number;
    keys: string[];
  };
}

/**
 * Run a complete verification of the AI matching engine
 */
export async function verifyAIMatching(): Promise<AIVerificationResult> {
  const result: AIVerificationResult = {
    isAvailable: isAIMatchingAvailable(),
    apiKeyConfigured: isAIMatchingAvailable(),
    embeddingTest: null,
    matchingTest: null,
    cacheStats: getEmbeddingCacheStats(),
  };

  console.log("🤖 AI Matching Engine Verification");
  console.log("==================================");
  console.log(`API Key Configured: ${result.apiKeyConfigured ? "✅ Yes" : "❌ No"}`);

  if (!result.isAvailable) {
    console.log("❌ AI Matching is NOT available (no API key)");
    console.log("💡 To enable: Add VITE_OPENAI_API_KEY to your .env file");
    return result;
  }

  // Test 1: Embedding Generation
  console.log("\n📊 Test 1: Embedding Generation");
  const embeddingStart = performance.now();
  try {
    const testText = "Test food donation: 50 packs of nasi lemak, halal certified";
    const embedding = await generateEmbedding(testText);

    if (embedding) {
      const latency = Math.round(performance.now() - embeddingStart);
      result.embeddingTest = {
        success: true,
        latencyMs: latency,
      };
      console.log(`✅ Embedding generated successfully`);
      console.log(`   Dimensions: ${embedding.embedding.length}`);
      console.log(`   Cached: ${embedding.cached}`);
      console.log(`   Latency: ${latency}ms`);
    } else {
      result.embeddingTest = {
        success: false,
        latencyMs: Math.round(performance.now() - embeddingStart),
        error: "Embedding returned null",
      };
      console.log("❌ Embedding generation failed (returned null)");
    }
  } catch (error) {
    result.embeddingTest = {
      success: false,
      latencyMs: Math.round(performance.now() - embeddingStart),
      error: error instanceof Error ? error.message : "Unknown error",
    };
    console.log(`❌ Embedding generation error: ${result.embeddingTest.error}`);
  }

  // Test 2: AI Match Scoring
  console.log("\n🎯 Test 2: AI Match Scoring");
  const matchStart = performance.now();
  try {
    const testItems: DonationItemForAI[] = [
      {
        food_name: "Nasi Lemak",
        category: "Cooked Meals",
        quantity: 50,
        unit: "packs",
        halal_status: "halal",
        storage_condition: "room_temperature",
      },
      {
        food_name: "Roti Canai",
        category: "Bakery & Bread",
        quantity: 30,
        unit: "pieces",
        halal_status: "halal",
        storage_condition: "room_temperature",
      },
    ];

    const testNGO: NGOProfileForAI = {
      id: "test-ngo",
      business_name: "Test Food Bank",
      food_types: ["Cooked Meals", "Cooked Food", "Bakery"],
      priority_needs: ["Hot meals"],
      halal_only: true,
    };

    const aiScore = await calculateAIMatchScore(testItems, testNGO);

    if (aiScore) {
      const latency = Math.round(performance.now() - matchStart);
      result.matchingTest = {
        success: true,
        score: aiScore.totalAIScore,
        latencyMs: latency,
      };
      console.log(`✅ AI Match Score calculated successfully`);
      console.log(`   Semantic Score: ${aiScore.semanticScore}/100`);
      console.log(`   Explanation Score: ${aiScore.explanationScore}/100`);
      console.log(`   Total AI Score: ${aiScore.totalAIScore}/100`);
      console.log(`   Confidence: ${(aiScore.confidence * 100).toFixed(1)}%`);
      console.log(`   Latency: ${latency}ms`);

      if (aiScore.matchReasons.length > 0) {
        console.log(`   Match Reasons: ${aiScore.matchReasons.join(", ")}`);
      }
      if (aiScore.warnings.length > 0) {
        console.log(`   ⚠️ Warnings: ${aiScore.warnings.join(", ")}`);
      }
    } else {
      result.matchingTest = {
        success: false,
        score: null,
        latencyMs: Math.round(performance.now() - matchStart),
        error: "AI Score returned null",
      };
      console.log("❌ AI Match scoring failed (returned null)");
    }
  } catch (error) {
    result.matchingTest = {
      success: false,
      score: null,
      latencyMs: Math.round(performance.now() - matchStart),
      error: error instanceof Error ? error.message : "Unknown error",
    };
    console.log(`❌ AI Match scoring error: ${result.matchingTest.error}`);
  }

  // Cache Stats
  result.cacheStats = getEmbeddingCacheStats();
  console.log("\n💾 Cache Stats");
  console.log(`   Cached embeddings: ${result.cacheStats.size}`);

  // Summary
  console.log("\n📋 Summary");
  console.log("==================================");
  const allPassed = result.embeddingTest?.success && result.matchingTest?.success;
  if (allPassed) {
    console.log("✅ AI Matching Engine is WORKING correctly!");
  } else {
    console.log("❌ AI Matching Engine has issues:");
    if (!result.embeddingTest?.success) console.log("   - Embedding generation failed");
    if (!result.matchingTest?.success) console.log("   - Match scoring failed");
  }

  return result;
}

/**
 * Quick check if AI matching is working (returns boolean)
 */
export async function isAIMatchingWorking(): Promise<boolean> {
  if (!isAIMatchingAvailable()) return false;

  try {
    const embedding = await generateEmbedding("quick test");
    return embedding !== null;
  } catch {
    return false;
  }
}

/**
 * Test semantic similarity between two texts
 */
export async function testSemanticSimilarity(
  text1: string,
  text2: string
): Promise<{ similarity: number; score: number } | null> {
  if (!isAIMatchingAvailable()) {
    console.log("❌ AI Matching not available");
    return null;
  }

  try {
    const [emb1, emb2] = await Promise.all([
      generateEmbedding(text1),
      generateEmbedding(text2),
    ]);

    if (!emb1 || !emb2) {
      console.log("❌ Failed to generate embeddings");
      return null;
    }

    const similarity = cosineSimilarity(emb1.embedding, emb2.embedding);
    const score = Math.round(((similarity + 1) / 2) * 100);

    console.log(`📊 Semantic Similarity Test`);
    console.log(`   Text 1: "${text1.substring(0, 50)}..."`);
    console.log(`   Text 2: "${text2.substring(0, 50)}..."`);
    console.log(`   Similarity: ${similarity.toFixed(4)}`);
    console.log(`   Score: ${score}/100`);

    return { similarity, score };
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
    return null;
  }
}

// Export for browser console access
if (typeof window !== "undefined") {
  (window as any).aiMatching = {
    verify: verifyAIMatching,
    isWorking: isAIMatchingWorking,
    testSimilarity: testSemanticSimilarity,
    isAvailable: isAIMatchingAvailable,
    clearCache: clearEmbeddingCache,
    getCacheStats: getEmbeddingCacheStats,
  };

  console.log("🤖 AI Matching utilities available. Run: aiMatching.verify()");
}
