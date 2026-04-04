/**
 * Edge Function: Send Notification Emails
 *
 * This function is triggered by database webhooks when notifications are created.
 * It sends emails to users for important events.
 *
 * SETUP REQUIRED:
 * 1. Deploy: supabase functions deploy send-notification-email
 * 2. Set secrets:
 *    supabase secrets set RESEND_API_KEY=your_key
 *    OR
 *    supabase secrets set SENDGRID_API_KEY=your_key
 * 3. Create database webhook in Supabase Dashboard:
 *    - Table: notifications
 *    - Events: INSERT
 *    - URL: Your function URL
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
    is_read: boolean;
    created_at: string;
  };
  old_record: null | Record<string, unknown>;
}

// Email templates
const emailTemplates: Record<string, (data: any) => { subject: string; html: string }> = {
  claim: (data) => ({
    subject: `🎉 Your donation "${data.itemName}" has been claimed!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Good News!</h1>
        <p>Your donation has been claimed by an NGO.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Item:</strong> ${data.itemName}</p>
          <p><strong>Batch:</strong> ${data.batchNumber}</p>
          <p><strong>NGO:</strong> ${data.ngoName}</p>
        </div>
        <p>Please prepare the item for pickup. The NGO will contact you to arrange collection.</p>
        <a href="${data.appUrl}/vendor/pickups" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Pickups
        </a>
      </div>
    `,
  }),

  cancellation: (data) => ({
    subject: `⚠️ Claim cancelled for "${data.itemName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Claim Cancelled</h1>
        <p>An NGO has cancelled their claim on your donation.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Item:</strong> ${data.itemName}</p>
          <p><strong>Batch:</strong> ${data.batchNumber}</p>
        </div>
        <p>The item is now available for other NGOs to claim.</p>
        <a href="${data.appUrl}/vendor/donations" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Donations
        </a>
      </div>
    `,
  }),

  pickup_complete: (data) => ({
    subject: `✅ Pickup confirmed for "${data.itemName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Pickup Confirmed!</h1>
        <p>The vendor has confirmed your pickup.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Item:</strong> ${data.itemName}</p>
        </div>
        <p>The item has been automatically added to your inventory.</p>
        <a href="${data.appUrl}/ngo/inventory" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Inventory
        </a>
      </div>
    `,
  }),
};

// Send email using Resend
async function sendEmailResend(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, skipping email");
    return { success: false, error: "API key not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "FoodBridge <noreply@yourdomain.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend error:", error);
    return { success: false, error };
  }

  return { success: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Received notification:", payload);

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notification = payload.record;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name, business_name")
      .eq("id", notification.user_id)
      .single();

    if (!profile?.email) {
      console.log("No email for user:", notification.user_id);
      return new Response(JSON.stringify({ message: "No email found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email template
    const template = emailTemplates[notification.type];
    if (!template) {
      console.log("No template for type:", notification.type);
      return new Response(JSON.stringify({ message: "No template for notification type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse item name from message (simple extraction)
    const itemNameMatch = notification.message.match(/"([^"]+)"/);
    const itemName = itemNameMatch ? itemNameMatch[1] : "Item";

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    const emailData = {
      itemName,
      batchNumber: "Batch",
      ngoName: "NGO",
      appUrl,
    };

    const { subject, html } = template(emailData);

    // Send email
    const result = await sendEmailResend(profile.email, subject, html);

    console.log("Email result:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
