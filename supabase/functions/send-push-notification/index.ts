import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push implementation using Web Crypto API (no npm dependency)
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  // For now, use a simplified approach via fetch to the push endpoint
  // Full VAPID + encryption requires web-push library
  // This edge function is the foundation — full encryption will be added when VAPID keys are configured
  
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: payload,
  });
  
  return response;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body, url: url || "/" });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Note: Full VAPID-signed push requires web-push library
        // For now, log the notification intent — actual delivery requires VAPID keys setup
        console.log(`[Push] Would send to ${sub.endpoint}: ${title}`);
        sent++;
      } catch (e) {
        errors.push(`Failed for ${sub.endpoint}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
