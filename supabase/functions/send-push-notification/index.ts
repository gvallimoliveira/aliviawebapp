import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Ensure a base64url string has proper padding for Deno's stricter decoder.
 */
function ensureBase64urlPadding(str: string): string {
  const cleaned = str.trim();
  const pad = (4 - (cleaned.length % 4)) % 4;
  return cleaned + "=".repeat(pad);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKeyRaw = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!vapidPublicKeyRaw || !vapidPrivateKeyRaw) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trim whitespace/newlines that may sneak in from env vars
    const vapidPublicKey = vapidPublicKeyRaw.trim();
    const vapidPrivateKey = vapidPrivateKeyRaw.trim();

    // Authorization: accept service-role, authenticated user, or anon key (for assessment notifications)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const apikeyHeader = req.headers.get("apikey") || "";

    if (!token && !apikeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isServiceRole = token === serviceRoleKey;
    const isAnonKey = token === anonKey || apikeyHeader === anonKey;
    let callerUserId: string | null = null;

    if (!isServiceRole && !isAnonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      callerUserId = userData.user.id;
    }

    // Set VAPID details — wrap in try/catch for diagnostics
    try {
      webpush.setVapidDetails(
        "mailto:contato@aliviawebapp.com.br",
        vapidPublicKey,
        vapidPrivateKey
      );
    } catch (vapidErr: any) {
      console.error("[Push] VAPID setup failed:", vapidErr?.message, "pubKey length:", vapidPublicKey.length, "privKey length:", vapidPrivateKey.length);
      return new Response(
        JSON.stringify({ error: "VAPID key configuration error", details: vapidErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Non-service-role, non-anon callers can only target themselves
    if (!isServiceRole && !isAnonKey && callerUserId !== user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: cannot send notifications to other users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic input sanity caps to limit abuse
    const safeTitle = String(title).slice(0, 200);
    const safeBody = String(body).slice(0, 500);
    const safeUrl = url ? String(url).slice(0, 500) : "/";

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

    const payload = JSON.stringify({ title: safeTitle, body: safeBody, url: safeUrl });
    let sent = 0;
    const errors: string[] = [];
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        sent++;
        console.log(`[Push] Sent to ${sub.endpoint.slice(0, 60)}...`);
      } catch (e: any) {
        const statusCode = e?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
          console.log(`[Push] Subscription expired, removing: ${sub.endpoint.slice(0, 60)}...`);
        } else {
          errors.push(`Failed (${statusCode}): ${e?.message || e}`);
          console.error(`[Push] Error for ${sub.endpoint.slice(0, 60)}:`, e?.message);
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, cleaned: expiredEndpoints.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
