# AI Features for FoodBridge

## Overview

This document outlines AI features that can enhance FoodBridge, with implementation guides and free/low-cost options.

---

## 1. Food Image Recognition (Recommended First)

**What it does:** Auto-categorize food items from photos, detect food type, estimate quantity.

**Value:** Reduces manual data entry, improves accuracy, better user experience.

### Implementation Options

| Provider | Free Tier | Accuracy | Setup |
|----------|-----------|----------|-------|
| **Google Cloud Vision** | 1,000 images/month | High | API Key |
| **Clarifai** | 5,000 ops/month | High | API Key |
| **Hugging Face** | Unlimited (self-host) | Medium-High | More setup |
| **OpenAI GPT-4 Vision** | Pay-per-use (~$0.01/image) | Very High | API Key |

### Quick Implementation (Google Vision)

```typescript
// src/lib/ai/foodRecognition.ts

const GOOGLE_VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

interface FoodAnalysis {
  category: string;
  foodType: string;
  confidence: number;
  suggestedName: string;
  isHalal: 'likely' | 'unlikely' | 'unknown';
  storageRecommendation: string;
}

export async function analyzeFoodImage(imageBase64: string): Promise<FoodAnalysis> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
          ],
        }],
      }),
    }
  );

  const data = await response.json();
  const labels = data.responses[0]?.labelAnnotations || [];

  // Map labels to food categories
  return mapLabelsToFoodCategory(labels);
}

function mapLabelsToFoodCategory(labels: any[]): FoodAnalysis {
  // Category mapping logic
  const categoryMap: Record<string, string> = {
    'bread': 'Bakery & Bread',
    'rice': 'Rice & Grains',
    'vegetable': 'Vegetables',
    'fruit': 'Fruits',
    'meat': 'Meat & Poultry',
    'seafood': 'Seafood',
    'dairy': 'Dairy',
    'beverage': 'Beverages',
    'snack': 'Snacks',
    'dessert': 'Desserts',
  };

  const storageMap: Record<string, string> = {
    'meat': 'refrigerated',
    'seafood': 'refrigerated',
    'dairy': 'refrigerated',
    'ice cream': 'frozen',
    'bread': 'room_temperature',
    'fruit': 'room_temperature',
  };

  // Find best matching category
  for (const label of labels) {
    const labelLower = label.description.toLowerCase();
    for (const [key, category] of Object.entries(categoryMap)) {
      if (labelLower.includes(key)) {
        return {
          category,
          foodType: label.description,
          confidence: label.score,
          suggestedName: label.description,
          isHalal: labelLower.includes('pork') ? 'unlikely' : 'unknown',
          storageRecommendation: storageMap[key] || 'room_temperature',
        };
      }
    }
  }

  return {
    category: 'Other',
    foodType: labels[0]?.description || 'Food',
    confidence: labels[0]?.score || 0,
    suggestedName: labels[0]?.description || '',
    isHalal: 'unknown',
    storageRecommendation: 'room_temperature',
  };
}
```

### Usage in CreateDonation

```typescript
// When user uploads image
const handleImageUpload = async (file: File) => {
  // Convert to base64
  const base64 = await fileToBase64(file);

  // Analyze with AI
  const analysis = await analyzeFoodImage(base64);

  // Auto-fill form fields
  setCategory(analysis.category);
  setFoodName(analysis.suggestedName);
  setStorageCondition(analysis.storageRecommendation);

  // Show suggestion to user
  toast.info(`Detected: ${analysis.foodType}`, {
    description: `Category: ${analysis.category} (${Math.round(analysis.confidence * 100)}% confident)`,
  });
};
```

---

## 2. AI Chatbot / Assistant

**What it does:** Help users navigate the app, answer questions, assist with donations.

**Value:** Better UX, reduced support burden, 24/7 assistance.

### Implementation Options

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Ollama (Local)** | Unlimited | Privacy, no API costs |
| **OpenAI GPT-3.5** | Pay-per-use (~$0.002/1K tokens) | Quality + speed |
| **Claude API** | Pay-per-use | Longer context |
| **Google Gemini** | Free tier available | Good balance |

### Quick Implementation (OpenAI)

```typescript
// src/lib/ai/chatbot.ts

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are FoodBridge Assistant, helping users with a food donation platform.

You help:
- Vendors: Create donations, manage pickups, understand impact
- NGOs: Find donations, manage claims, track inventory
- General: Navigate the app, answer questions

Be concise, friendly, and helpful. If you don't know something, say so.

Current app features:
- Vendors can create food donation batches with multiple items
- NGOs can browse and claim available donations
- Real-time notifications for claims and pickups
- Inventory management for NGOs
- Impact reports and analytics`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function chat(
  userMessage: string,
  history: Message[] = [],
  context?: { role?: string; page?: string }
): Promise<string> {
  const contextPrompt = context
    ? `\n\nUser context: Role=${context.role || 'unknown'}, Current page=${context.page || 'unknown'}`
    : '';

  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Sorry, I could not process that.';
}
```

### Chatbot Component

```typescript
// src/components/AIChatbot.tsx

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { chat } from '@/lib/ai/chatbot';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { role } = useAuth();
  const location = useLocation();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chat(userMessage, messages, {
        role,
        page: location.pathname,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-primary text-white rounded-full shadow-lg"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-card border rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold">FoodBridge Assistant</span>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-white ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-muted p-2 rounded-lg text-sm mr-8">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="p-2 bg-primary text-white rounded-lg"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 3. Smart Matching Enhancement

**What it does:** Improve NGO-donation matching using ML instead of rule-based scoring.

**Value:** Better matches, less food waste, happier NGOs.

### Current System (Rule-based)
- Food preference matching
- Location/distance scoring
- Storage compatibility
- Urgency weighting

### AI Enhancement Options

1. **Collaborative Filtering**: Learn from past claims to predict which NGOs will claim which items
2. **Content-Based**: Use item attributes + NGO preferences for better matching
3. **Hybrid**: Combine both approaches

### Simple ML Implementation (TensorFlow.js)

```typescript
// src/lib/ai/smartMatching.ts

import * as tf from '@tensorflow/tfjs';

// Features: [foodTypeMatch, distance, storageMatch, urgency, dayOfWeek, timeOfDay]
// Label: claimProbability (0-1)

let model: tf.LayersModel | null = null;

export async function loadMatchingModel() {
  // Load pre-trained model (train separately with historical data)
  model = await tf.loadLayersModel('/models/matching/model.json');
}

export function predictClaimProbability(
  ngoId: string,
  batchId: string,
  features: number[]
): number {
  if (!model) return 0.5; // Fallback to neutral

  const tensor = tf.tensor2d([features]);
  const prediction = model.predict(tensor) as tf.Tensor;
  const probability = prediction.dataSync()[0];

  tensor.dispose();
  prediction.dispose();

  return probability;
}

// Enhance existing scoring with ML
export function enhancedMatchScore(
  ruleBasedScore: number,
  mlProbability: number,
  mlWeight: number = 0.3
): number {
  // Blend rule-based and ML scores
  return ruleBasedScore * (1 - mlWeight) + (mlProbability * 100) * mlWeight;
}
```

---

## 4. Demand Forecasting

**What it does:** Predict when/where food will be needed most.

**Value:** Better resource allocation, proactive donation requests.

### Implementation

```typescript
// src/lib/ai/demandForecast.ts

interface ForecastInput {
  dayOfWeek: number;
  month: number;
  area: string;
  historicalDemand: number[];
}

interface ForecastOutput {
  predictedDemand: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Simple time-series prediction using moving averages
export function forecastDemand(input: ForecastInput): ForecastOutput {
  const { historicalDemand } = input;

  if (historicalDemand.length < 7) {
    return { predictedDemand: 0, confidence: 0, trend: 'stable' };
  }

  // Calculate moving averages
  const ma7 = average(historicalDemand.slice(-7));
  const ma30 = historicalDemand.length >= 30
    ? average(historicalDemand.slice(-30))
    : ma7;

  // Trend detection
  const trend = ma7 > ma30 * 1.1 ? 'increasing'
    : ma7 < ma30 * 0.9 ? 'decreasing'
    : 'stable';

  // Simple prediction: recent average adjusted by day-of-week factor
  const dayFactors = [0.8, 1.0, 1.0, 1.0, 1.0, 1.2, 0.9]; // Sun-Sat
  const predictedDemand = Math.round(ma7 * dayFactors[input.dayOfWeek]);

  return {
    predictedDemand,
    confidence: Math.min(0.9, historicalDemand.length / 90), // More data = more confidence
    trend,
  };
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
```

---

## Getting Started

### Step 1: Food Image Recognition (Easiest)

1. Get Google Cloud Vision API key (free tier: 1000/month)
2. Add to `.env`: `VITE_GOOGLE_VISION_API_KEY=your_key`
3. Implement in CreateDonation page

### Step 2: AI Chatbot

1. Get OpenAI API key (or use Ollama for free local)
2. Add to `.env`: `VITE_OPENAI_API_KEY=your_key`
3. Add AIChatbot component to AppLayout

### Step 3: Enhanced Matching (Later)

1. Collect claim data for training
2. Train simple model with TensorFlow.js
3. Integrate with existing scoring system

---

## Cost Estimates (Monthly)

| Feature | Free Tier | Low Usage | Medium Usage |
|---------|-----------|-----------|--------------|
| Image Recognition | 1,000 images | $0 | $5-20 |
| Chatbot | ~50K tokens | $0-5 | $10-30 |
| Matching ML | N/A (client-side) | $0 | $0 |
| **Total** | - | **$0-5** | **$15-50** |

---

## Files Created

- `src/lib/ai/foodRecognition.ts` - Image analysis
- `src/lib/ai/chatbot.ts` - Chatbot logic
- `src/lib/ai/smartMatching.ts` - ML matching
- `src/lib/ai/demandForecast.ts` - Demand prediction
- `src/components/AIChatbot.tsx` - Chat UI component
