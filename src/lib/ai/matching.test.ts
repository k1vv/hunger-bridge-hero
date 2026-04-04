import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateDonationText,
  generateNGOPreferenceText,
  calculateAIMatchScore,
  calculateAIMatchScoresBatch,
  generateMatchExplanation,
  type DonationItemForAI,
  type NGOProfileForAI,
} from "./matching";
import * as embeddings from "./embeddings";

// Mock the embeddings module
vi.mock("./embeddings", async () => {
  const actual = await vi.importActual("./embeddings");
  return {
    ...actual,
    isAIMatchingAvailable: vi.fn(),
    generateEmbedding: vi.fn(),
    generateEmbeddingsBatch: vi.fn(),
  };
});

// Mock fetch for LLM calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AI Matching Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateDonationText", () => {
    it("should generate text from donation items", () => {
      const items: DonationItemForAI[] = [
        {
          food_name: "Nasi Lemak",
          category: "Cooked Meals",
          quantity: 50,
          unit: "packs",
          halal_status: "halal",
          storage_condition: "room_temperature",
        },
      ];

      const text = generateDonationText(items);

      expect(text).toContain("Nasi Lemak");
      expect(text).toContain("Cooked Meals");
      expect(text).toContain("50 packs");
      expect(text).toContain("halal certified");
      expect(text).toContain("room temperature storage");
    });

    it("should include category description for richer context", () => {
      const items: DonationItemForAI[] = [
        { category: "Cooked Meals" },
      ];

      const text = generateDonationText(items);

      expect(text).toContain("Cooked Meals");
      expect(text).toContain("Prepared hot meals"); // From FOOD_CATEGORY_DESCRIPTIONS
    });

    it("should handle non-halal items", () => {
      const items: DonationItemForAI[] = [
        { food_name: "Pork Ribs", halal_status: "non_halal" },
      ];

      const text = generateDonationText(items);

      expect(text).toContain("non-halal");
    });

    it("should handle multiple items", () => {
      const items: DonationItemForAI[] = [
        { food_name: "Rice", category: "Grains & Rice" },
        { food_name: "Vegetables", category: "Vegetables" },
        { food_name: "Bread", category: "Bakery & Bread" },
      ];

      const text = generateDonationText(items);

      expect(text).toContain("Rice");
      expect(text).toContain("Vegetables");
      expect(text).toContain("Bread");
    });

    it("should map storage conditions to readable text", () => {
      const testCases = [
        { condition: "room_temperature", expected: "room temperature storage" },
        { condition: "refrigerated", expected: "needs refrigeration" },
        { condition: "frozen", expected: "frozen food" },
        { condition: "keep_warm", expected: "needs to be kept warm" },
      ];

      for (const { condition, expected } of testCases) {
        const items: DonationItemForAI[] = [{ storage_condition: condition }];
        const text = generateDonationText(items);
        expect(text).toContain(expected);
      }
    });

    it("should include notes when provided", () => {
      const items: DonationItemForAI[] = [
        { food_name: "Curry", notes: "Extra spicy, best before 6pm" },
      ];

      const text = generateDonationText(items);

      expect(text).toContain("Extra spicy, best before 6pm");
    });

    it("should return default text for empty items", () => {
      const text = generateDonationText([]);
      expect(text).toBe("general food donation");
    });

    it("should handle items with minimal data", () => {
      const items: DonationItemForAI[] = [{}];
      const text = generateDonationText(items);
      // Empty item with no properties returns fallback
      expect(text).toBe("general food donation");
    });
  });

  describe("generateNGOPreferenceText", () => {
    it("should generate text from NGO profile", () => {
      const ngo: NGOProfileForAI = {
        id: "ngo-1",
        business_name: "Food Bank Malaysia",
        food_types: ["Cooked Meals", "Rice", "Vegetables"],
        priority_needs: ["Hot meals for homeless"],
        halal_only: true,
        service_area: "Kuala Lumpur",
      };

      const text = generateNGOPreferenceText(ngo);

      expect(text).toContain("Organization: Food Bank Malaysia");
      expect(text).toContain("Accepts: Cooked Meals, Rice, Vegetables");
      expect(text).toContain("Priority needs: Hot meals for homeless");
      expect(text).toContain("Requires halal food only");
      expect(text).toContain("Serves: Kuala Lumpur");
    });

    it("should indicate when NGO accepts all food types", () => {
      const ngo: NGOProfileForAI = {
        id: "ngo-1",
        food_types: [],
      };

      const text = generateNGOPreferenceText(ngo);

      expect(text).toContain("Accepts all food types");
    });

    it("should not include halal requirement when false", () => {
      const ngo: NGOProfileForAI = {
        id: "ngo-1",
        halal_only: false,
      };

      const text = generateNGOPreferenceText(ngo);

      expect(text).not.toContain("halal");
    });

    it("should include notes when provided", () => {
      const ngo: NGOProfileForAI = {
        id: "ngo-1",
        notes: "We serve 500 people daily",
      };

      const text = generateNGOPreferenceText(ngo);

      expect(text).toContain("We serve 500 people daily");
    });

    it("should return default text for minimal profile", () => {
      const ngo: NGOProfileForAI = { id: "ngo-1" };
      const text = generateNGOPreferenceText(ngo);
      expect(text).toContain("Accepts all food types");
    });
  });

  describe("calculateAIMatchScore", () => {
    const sampleItems: DonationItemForAI[] = [
      { category: "Cooked Meals", halal_status: "halal" },
    ];

    const sampleNGO: NGOProfileForAI = {
      id: "ngo-1",
      business_name: "Test NGO",
      food_types: ["Cooked Food"],
    };

    it("should return null when AI matching is not available", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(false);

      const result = await calculateAIMatchScore(sampleItems, sampleNGO);

      expect(result).toBeNull();
    });

    it("should calculate score when embeddings are available", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);

      // Mock similar embeddings (high cosine similarity)
      const mockEmbedding = Array.from({ length: 10 }, () => 0.5);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue({
        embedding: mockEmbedding,
        cached: false,
      });

      const result = await calculateAIMatchScore(sampleItems, sampleNGO);

      expect(result).not.toBeNull();
      expect(result?.semanticScore).toBeGreaterThan(0);
      expect(result?.totalAIScore).toBeGreaterThan(0);
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it("should return null when embedding generation fails", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue(null);

      const result = await calculateAIMatchScore(sampleItems, sampleNGO);

      expect(result).toBeNull();
    });

    it("should add warning for halal mismatch", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue({
        embedding: Array.from({ length: 10 }, () => 0.5),
        cached: false,
      });

      const nonHalalItems: DonationItemForAI[] = [
        { category: "Meat & Seafood", halal_status: "non_halal" },
      ];

      const halalNGO: NGOProfileForAI = {
        id: "ngo-1",
        halal_only: true,
      };

      const result = await calculateAIMatchScore(nonHalalItems, halalNGO);

      expect(result?.warnings).toContain(
        "NGO requires halal food but donation contains non-halal items"
      );
      expect(result?.explanationScore).toBeLessThan(50);
    });

    it("should add bonus for all halal items to halal-only NGO", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue({
        embedding: Array.from({ length: 10 }, () => 0.5),
        cached: false,
      });

      const halalItems: DonationItemForAI[] = [
        { category: "Cooked Meals", halal_status: "halal" },
      ];

      const halalNGO: NGOProfileForAI = {
        id: "ngo-1",
        halal_only: true,
      };

      const result = await calculateAIMatchScore(halalItems, halalNGO);

      expect(result?.matchReasons).toContain("All items are halal certified");
    });

    it("should detect priority needs alignment", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue({
        embedding: Array.from({ length: 10 }, () => 0.5),
        cached: false,
      });

      const items: DonationItemForAI[] = [
        { category: "Cooked Meals" },
        { category: "Bakery & Bread" },
      ];

      const ngo: NGOProfileForAI = {
        id: "ngo-1",
        priority_needs: ["Cooked", "Bread"],
      };

      const result = await calculateAIMatchScore(items, ngo);

      expect(result?.matchReasons.some((r) => r.includes("priority needs"))).toBe(true);
    });

    it("should give bonus for food variety", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbedding).mockResolvedValue({
        embedding: Array.from({ length: 10 }, () => 0.5),
        cached: false,
      });

      const variedItems: DonationItemForAI[] = [
        { category: "Cooked Meals" },
        { category: "Vegetables" },
        { category: "Beverages" },
      ];

      const result = await calculateAIMatchScore(variedItems, sampleNGO);

      expect(result?.matchReasons).toContain("Good variety of food types");
    });
  });

  describe("calculateAIMatchScoresBatch", () => {
    const sampleItems: DonationItemForAI[] = [
      { category: "Cooked Meals" },
    ];

    const sampleNGOs: NGOProfileForAI[] = [
      { id: "ngo-1", food_types: ["Cooked Food"] },
      { id: "ngo-2", food_types: ["Bakery"] },
      { id: "ngo-3", food_types: [] },
    ];

    it("should return empty map when AI is not available", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(false);

      const results = await calculateAIMatchScoresBatch(sampleItems, sampleNGOs);

      expect(results.size).toBe(0);
    });

    it("should return empty map for empty NGO list", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);

      const results = await calculateAIMatchScoresBatch(sampleItems, []);

      expect(results.size).toBe(0);
    });

    it("should calculate scores for multiple NGOs", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbeddingsBatch).mockResolvedValue([
        Array.from({ length: 10 }, () => 0.5), // Donation
        Array.from({ length: 10 }, () => 0.5), // NGO 1
        Array.from({ length: 10 }, () => 0.3), // NGO 2
        Array.from({ length: 10 }, () => 0.4), // NGO 3
      ]);

      const results = await calculateAIMatchScoresBatch(sampleItems, sampleNGOs);

      expect(results.size).toBe(3);
      expect(results.has("ngo-1")).toBe(true);
      expect(results.has("ngo-2")).toBe(true);
      expect(results.has("ngo-3")).toBe(true);
    });

    it("should handle halal warnings in batch mode", async () => {
      vi.mocked(embeddings.isAIMatchingAvailable).mockReturnValue(true);
      vi.mocked(embeddings.generateEmbeddingsBatch).mockResolvedValue([
        Array.from({ length: 10 }, () => 0.5),
        Array.from({ length: 10 }, () => 0.5),
      ]);

      const nonHalalItems: DonationItemForAI[] = [
        { category: "Meat & Seafood", halal_status: "non_halal" },
      ];

      const halalNGO: NGOProfileForAI[] = [
        { id: "ngo-1", halal_only: true },
      ];

      const results = await calculateAIMatchScoresBatch(nonHalalItems, halalNGO);

      expect(results.get("ngo-1")?.warnings).toContain("Halal requirement mismatch");
    });
  });

  describe("generateMatchExplanation", () => {
    const sampleItems: DonationItemForAI[] = [
      { food_name: "Nasi Lemak", quantity: 50, unit: "packs", category: "Cooked Meals" },
    ];

    const sampleNGO: NGOProfileForAI = {
      id: "ngo-1",
      business_name: "Food Bank",
      food_types: ["Cooked Food"],
    };

    beforeEach(() => {
      // Setup default mock for fetch to prevent undefined errors
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Good match",
                  details: ["Test detail"],
                  recommendation: "medium",
                }),
              },
            },
          ],
        }),
      });
    });

    it("should generate explanation result", async () => {
      const result = await generateMatchExplanation(sampleItems, sampleNGO);

      expect(result).not.toBeNull();
      expect(result?.summary).toBeDefined();
      expect(result?.details).toBeDefined();
      expect(result?.recommendation).toBeDefined();
    });

    it("should return fallback explanation on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "API error" }),
      });

      const result = await generateMatchExplanation(sampleItems, sampleNGO);

      expect(result).not.toBeNull();
      expect(result?.recommendation).toMatch(/high|medium|low/);
    });

    it("should handle successful LLM response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Great match for cooked meals",
                  details: ["Category matches", "Halal compatible"],
                  recommendation: "high",
                }),
              },
            },
          ],
        }),
      });

      const result = await generateMatchExplanation(sampleItems, sampleNGO);

      expect(result).not.toBeNull();
      expect(result?.summary).toBeDefined();
      expect(result?.recommendation).toMatch(/high|medium|low/);
    });

    it("should include AI score in recommendation", async () => {
      const highScore = {
        semanticScore: 90,
        explanationScore: 80,
        totalAIScore: 85,
        confidence: 0.9,
        matchReasons: [],
        warnings: [],
      };

      const result = await generateMatchExplanation(sampleItems, sampleNGO, highScore);

      expect(result).not.toBeNull();
    });
  });

  describe("Fallback Explanation Logic", () => {
    beforeEach(() => {
      // Mock fetch to return an error, forcing fallback logic
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Forcing fallback" }),
      });
    });

    it("should generate high recommendation for high AI scores", async () => {
      const highScore = {
        semanticScore: 90,
        explanationScore: 80,
        totalAIScore: 85,
        confidence: 0.9,
        matchReasons: [],
        warnings: [],
      };

      const result = await generateMatchExplanation(
        [{ category: "Cooked Meals" }],
        { id: "1", food_types: ["Cooked Food"] },
        highScore
      );

      expect(result?.recommendation).toBe("high");
    });

    it("should generate medium recommendation for medium AI scores", async () => {
      const mediumScore = {
        semanticScore: 60,
        explanationScore: 50,
        totalAIScore: 55,
        confidence: 0.7,
        matchReasons: [],
        warnings: [],
      };

      const result = await generateMatchExplanation(
        [{ category: "Cooked Meals" }],
        { id: "1", food_types: ["Bakery"] },
        mediumScore
      );

      expect(result?.recommendation).toBe("medium");
    });

    it("should generate low recommendation for low AI scores", async () => {
      const lowScore = {
        semanticScore: 30,
        explanationScore: 20,
        totalAIScore: 25,
        confidence: 0.4,
        matchReasons: [],
        warnings: [],
      };

      const result = await generateMatchExplanation(
        [{ category: "Meat & Seafood" }],
        { id: "1", food_types: ["Vegetables"] },
        lowScore
      );

      expect(result?.recommendation).toBe("low");
    });

    it("should include halal info in fallback details", async () => {
      const result = await generateMatchExplanation(
        [{ category: "Cooked Meals", halal_status: "halal" }],
        { id: "1", halal_only: true },
        undefined
      );

      expect(result?.details.some((d) => d.toLowerCase().includes("halal"))).toBe(true);
    });
  });
});
