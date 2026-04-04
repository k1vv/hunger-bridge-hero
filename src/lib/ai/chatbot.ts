/**
 * AI Chatbot for FoodBridge
 *
 * SETUP:
 * 1. Get OpenAI API key from https://platform.openai.com
 * 2. Add to .env: VITE_OPENAI_API_KEY=your_key
 *
 * ALTERNATIVE (Free):
 * Use Ollama locally - see docs/AI_FEATURES.md
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are FoodBridge Assistant, a helpful AI for a food donation platform in Malaysia.

## About FoodBridge
FoodBridge connects food vendors (restaurants, hotels, supermarkets) with NGOs to reduce food waste and help those in need.

## User Roles
- **Vendors**: Donate surplus food, manage pickups, track impact
- **NGOs**: Find and claim donations, manage inventory, distribute to beneficiaries
- **Admin**: Oversee platform, manage users, view analytics

## Key Features
- Create donation batches with multiple food items
- Smart matching recommends donations based on NGO preferences
- Real-time notifications for claims and pickups
- Inventory management for NGOs
- Beneficiary tracking for distributions
- Impact reports showing food saved and people helped

## Common Questions You Can Help With

### For Vendors:
- "How do I create a donation?" → Go to Create Donation page, fill in pickup details, add items
- "Where can I see pickups?" → Go to Pickups page to see claimed items pending collection
- "How do I confirm pickup?" → In Pickups page, click Confirm when NGO collects

### For NGOs:
- "How do I find food?" → Go to Available Donations to see all available items
- "What are recommendations?" → System suggests donations matching your food preferences
- "How to claim items?" → Expand a batch, select items, click Claim
- "Where is my inventory?" → Go to Inventory page to see received items
- "How to distribute food?" → Go to Distribution page to record distributions

### Navigation Help:
- Dashboard: Overview of your activity
- Profile: Update your organization details and preferences
- Reports: View your impact statistics

## Guidelines
- Be concise and helpful
- Use simple language
- If unsure, suggest contacting support
- For technical issues, recommend refreshing or checking internet connection
- Always be encouraging about food donation efforts!

## Malaysian Context
- Support Halal food preferences
- Understand Malaysian food types (nasi, mee, roti, etc.)
- Be culturally aware`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
  role?: "vendor" | "ngo" | "admin";
  page?: string;
  userName?: string;
}

/**
 * Send a message to the chatbot and get a response
 */
export async function chat(
  userMessage: string,
  history: ChatMessage[] = [],
  context?: ChatContext
): Promise<string> {
  // Build context addition to system prompt
  let contextAddition = "";
  if (context) {
    const parts = [];
    if (context.role) parts.push(`User role: ${context.role}`);
    if (context.page) parts.push(`Current page: ${context.page}`);
    if (context.userName) parts.push(`User name: ${context.userName}`);
    if (parts.length > 0) {
      contextAddition = `\n\n## Current Context\n${parts.join("\n")}`;
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT + contextAddition },
    ...history.slice(-10), // Keep last 10 messages for context
    { role: "user", content: userMessage },
  ];

  // If no API key, use fallback responses
  if (!OPENAI_API_KEY) {
    return getFallbackResponse(userMessage, context);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return getFallbackResponse(userMessage, context);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
  } catch (error) {
    console.error("Chat error:", error);
    return getFallbackResponse(userMessage, context);
  }
}

/**
 * Fallback responses when API is not available
 */
function getFallbackResponse(message: string, context?: ChatContext): string {
  const msgLower = message.toLowerCase();

  // Greetings
  if (msgLower.match(/^(hi|hello|hey|salam|selamat)/)) {
    return "Hello! I'm the FoodBridge Assistant. How can I help you today? You can ask me about creating donations, claiming food, managing inventory, or navigating the app.";
  }

  // Navigation help
  if (msgLower.includes("navigat") || msgLower.includes("where") || msgLower.includes("find") || msgLower.includes("how to go")) {
    // General navigation
    if (msgLower.includes("navigat") && msgLower.includes("app")) {
      if (context?.role === "vendor") {
        return "Here's how to navigate as a vendor:\n\n• **Dashboard**: Overview of your donations\n• **Create Donation**: Post new food items\n• **My Donations**: View all your batches\n• **Pickups**: Manage pending collections\n• **Profile**: Update business info\n• **Reports**: See your impact stats";
      } else if (context?.role === "ngo") {
        return "Here's how to navigate as an NGO:\n\n• **Dashboard**: Overview of your activity\n• **Available Donations**: Find and claim food\n• **My Claims**: View claimed items\n• **Inventory**: Manage received food\n• **Distribution**: Record distributions\n• **Beneficiaries**: Manage recipients\n• **Profile**: Update organization info";
      }
      return "The sidebar contains all main navigation options. Click any menu item to go to that page. Use the Dashboard for an overview of your activity.";
    }
    if (msgLower.includes("donation")) {
      return context?.role === "vendor"
        ? "To create a donation, click 'Create Donation' in the sidebar. To view your donations, go to 'My Donations'."
        : "To find available donations, go to 'Available Donations' in the sidebar. You can search and filter by category.";
    }
    if (msgLower.includes("inventory")) {
      return "Go to 'Inventory' in the sidebar to see all food items you've received.";
    }
    if (msgLower.includes("pickup")) {
      return "Go to 'Pickups' in the sidebar to manage pending pickups.";
    }
    if (msgLower.includes("profile")) {
      return "Click 'Profile' in the sidebar to update your organization details.";
    }
  }

  // How to questions
  if (msgLower.includes("how")) {
    if (msgLower.includes("claim")) {
      return "To claim items:\n1. Go to 'Available Donations'\n2. Click on a batch to expand it\n3. Select the items you want\n4. Click 'Claim Selected' or 'Claim All'";
    }
    if (msgLower.includes("create") && msgLower.includes("donation")) {
      return "To create a donation:\n1. Go to 'Create Donation'\n2. Set pickup location and time\n3. Add food items with details\n4. Click 'Create Donation'";
    }
    if (msgLower.includes("confirm") && msgLower.includes("pickup")) {
      return "When an NGO comes to collect:\n1. Go to 'Pickups'\n2. Find the item\n3. Click 'Confirm Pickup'\n4. Optionally add a photo";
    }
    if (msgLower.includes("cancel")) {
      return "To cancel a claim:\n1. Go to 'My Claims'\n2. Find the item\n3. Click 'Cancel' button\n\nThe item will become available for other NGOs.";
    }
    if (msgLower.includes("distribution") || msgLower.includes("distribute")) {
      return "To record a distribution:\n1. Go to 'Distribution' in the sidebar\n2. Select items from your inventory\n3. Choose a beneficiary or group\n4. Enter quantity and click 'Record Distribution'\n\nThis tracks who received the food.";
    }
    if (msgLower.includes("verify") && context?.role === "admin") {
      return "To verify users:\n1. Go to 'User Management'\n2. Click on a pending user\n3. Review their documents\n4. Click 'Approve' or 'Reject'\n\nUsers will be notified of your decision.";
    }
    if (msgLower.includes("analytics") || msgLower.includes("view analytics")) {
      return "To view analytics:\n1. Go to 'Analytics' in the sidebar\n2. See platform-wide statistics\n3. View donation trends, user activity\n4. Export reports if needed";
    }
    if (msgLower.includes("announcement")) {
      return "To manage announcements:\n1. Go to 'Announcements' in admin panel\n2. Click 'Create Announcement'\n3. Enter title and message\n4. Select target audience (all, vendors, NGOs)\n5. Click 'Publish'";
    }
  }

  // What questions
  if (msgLower.includes("what")) {
    if (msgLower.includes("recommendation")) {
      return "Recommendations are donations that match your preferences. Update your profile with food types you accept, and the system will show matching donations at the top of your list.";
    }
    if (msgLower.includes("status")) {
      return "Donation statuses:\n• Available: Open for claiming\n• Partially Claimed: Some items claimed\n• Reserved: All items claimed\n• Completed: All pickups done";
    }
    if (msgLower.includes("impact") || msgLower.includes("my impact")) {
      return "Your impact shows the positive difference you've made! Go to 'Reports' in the sidebar to see:\n• Total food donated/received\n• Meals provided\n• CO₂ emissions prevented\n• People helped";
    }
    if (msgLower.includes("foodbridge")) {
      return "FoodBridge is a food donation platform that connects vendors (restaurants, hotels, supermarkets) with NGOs to reduce food waste. Vendors donate surplus food, NGOs claim and distribute it to those in need. Everyone benefits!";
    }
  }

  // Thanks
  if (msgLower.match(/(thank|thanks|terima kasih)/)) {
    return "You're welcome! Happy to help. Keep up the great work reducing food waste! 🌟";
  }

  // Default
  return "I can help you with:\n• Creating and managing donations\n• Finding and claiming food\n• Managing inventory\n• Navigating the app\n\nWhat would you like to know?";
}

/**
 * Get quick action suggestions based on context
 */
export function getQuickActions(context?: ChatContext): string[] {
  if (context?.role === "vendor") {
    return [
      "How do I create a donation?",
      "Where can I see my pickups?",
      "How do I confirm pickup?",
      "What's my impact?",
      "Navigating the app",
    ];
  }

  if (context?.role === "ngo") {
    return [
      "How do I claim food?",
      "Where's my inventory?",
      "How to record distribution?",
      "What are recommendations?",
      "Navigating the app",
    ];
  }

  if (context?.role === "admin") {
    return [
      "How to verify users?",
      "How to view analytics?",
      "How to manage announcements?",
      "Navigating the app",
    ];
  }

  return [
    "How does FoodBridge work?",
    "How to get started?",
    "What is FoodBridge?",
    "Navigating the app",
  ];
}
