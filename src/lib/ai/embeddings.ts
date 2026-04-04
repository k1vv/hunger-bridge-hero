/**
 * AI Embeddings Service for FoodBridge
 *
 * Uses OpenAI's text-embedding-3-small model for semantic matching
 * between donations and NGO preferences.
 *
 * SETUP: Uses same VITE_OPENAI_API_KEY as chatbot
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// In-memory cache for embeddings (persists during session)
const embeddingCache = new Map<string, number[]>();

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
}

/**
 * Generate embedding for a text string using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult | null> {
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured - AI matching disabled");
    return null;
  }

  // Normalize and create cache key
  const normalizedText = text.trim().toLowerCase();
  const cacheKey = normalizedText;

  // Check cache first
  if (embeddingCache.has(cacheKey)) {
    return {
      embedding: embeddingCache.get(cacheKey)!,
      cached: true,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: normalizedText,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI Embeddings API error:", error);
      return null;
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;

    if (!embedding) {
      console.error("No embedding returned from API");
      return null;
    }

    // Cache the result
    embeddingCache.set(cacheKey, embedding);

    return {
      embedding,
      cached: false,
    };
  } catch (error) {
    console.error("Embedding generation error:", error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch (more efficient)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!OPENAI_API_KEY || texts.length === 0) {
    return texts.map(() => null);
  }

  // Check which texts need API calls
  const normalizedTexts = texts.map(t => t.trim().toLowerCase());
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const textsToFetch: { index: number; text: string }[] = [];

  normalizedTexts.forEach((text, index) => {
    if (embeddingCache.has(text)) {
      results[index] = embeddingCache.get(text)!;
    } else {
      textsToFetch.push({ index, text });
    }
  });

  // If all cached, return early
  if (textsToFetch.length === 0) {
    return results;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: textsToFetch.map(t => t.text),
      }),
    });

    if (!response.ok) {
      console.error("OpenAI Embeddings batch API error");
      return results;
    }

    const data = await response.json();
    const embeddings = data.data || [];

    // Map results back and cache
    embeddings.forEach((item: { embedding: number[]; index: number }) => {
      const originalIndex = textsToFetch[item.index]?.index;
      const text = textsToFetch[item.index]?.text;
      if (originalIndex !== undefined && item.embedding) {
        results[originalIndex] = item.embedding;
        if (text) {
          embeddingCache.set(text, item.embedding);
        }
      }
    });

    return results;
  } catch (error) {
    console.error("Batch embedding error:", error);
    return results;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.error("Embedding dimension mismatch");
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Convert cosine similarity (-1 to 1) to a 0-100 score
 */
export function similarityToScore(similarity: number, maxPoints: number = 100): number {
  // Cosine similarity for text is typically 0.3-0.9 range
  // We normalize to 0-100 scale with some adjustment
  const normalized = (similarity + 1) / 2; // Convert -1,1 to 0,1
  const adjusted = Math.pow(normalized, 0.5); // Boost mid-range similarities
  return Math.round(adjusted * maxPoints);
}

/**
 * Clear the embedding cache (useful for testing or memory management)
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats(): { size: number; keys: string[] } {
  return {
    size: embeddingCache.size,
    keys: Array.from(embeddingCache.keys()).slice(0, 10), // First 10 keys
  };
}

/**
 * Check if AI embeddings are available (API key configured)
 */
export function isAIMatchingAvailable(): boolean {
  return !!OPENAI_API_KEY;
}
