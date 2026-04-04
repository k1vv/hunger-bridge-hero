/**
 * AI Embeddings Service for FoodBridge
 *
 * Calls the ai-embeddings edge function which proxies to OpenAI's
 * text-embedding-3-small model for semantic matching.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-embeddings`;

// In-memory cache for embeddings (persists during session)
const embeddingCache = new Map<string, number[]>();

// Track availability after first call
let _availabilityChecked = false;
let _isAvailable = true;

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
}

/**
 * Check if AI matching is available by verifying edge function connectivity
 */
export function isAIMatchingAvailable(): boolean {
  // We assume available until proven otherwise
  return _isAvailable && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Generate embedding for a text string via edge function
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase not configured - AI matching disabled");
    return null;
  }

  const normalizedText = text.trim().toLowerCase();

  if (embeddingCache.has(normalizedText)) {
    return { embedding: embeddingCache.get(normalizedText)!, cached: true };
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "embed", text: normalizedText }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("AI Embeddings edge function error:", response.status, err);
      _isAvailable = false;
      return null;
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;

    if (!embedding) {
      console.error("No embedding returned from edge function");
      return null;
    }

    _isAvailable = true;
    embeddingCache.set(normalizedText, embedding);
    return { embedding, cached: false };
  } catch (error) {
    console.error("Embedding generation error:", error);
    _isAvailable = false;
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || texts.length === 0) {
    return texts.map(() => null);
  }

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

  if (textsToFetch.length === 0) return results;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "embed", texts: textsToFetch.map(t => t.text) }),
    });

    if (!response.ok) {
      console.error("AI Embeddings batch error:", response.status);
      return results;
    }

    const data = await response.json();
    const embeddings = data.data || [];

    embeddings.forEach((item: { embedding: number[]; index: number }) => {
      const originalIndex = textsToFetch[item.index]?.index;
      const text = textsToFetch[item.index]?.text;
      if (originalIndex !== undefined && item.embedding) {
        results[originalIndex] = item.embedding;
        if (text) embeddingCache.set(text, item.embedding);
      }
    });

    _isAvailable = true;
    return results;
  } catch (error) {
    console.error("Batch embedding error:", error);
    return results;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
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
  const normalized = (similarity + 1) / 2;
  const adjusted = Math.pow(normalized, 0.5);
  return Math.round(adjusted * maxPoints);
}

/**
 * Clear the embedding cache
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
    keys: Array.from(embeddingCache.keys()).slice(0, 10),
  };
}
