// A5: Stripe Checkout para a assinatura do Chat do Agente (R$ 14,90/mês, 150 msgs).
// Após pagamento, o stripe-webhook ativa o addon em public.profiles.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { safeOrigin } from "../_shared/caller-auth.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAT_ADDON_PRICE_ID = "price_1Tnmik2HgVhVBE8UH8xK7t5H"; // R$ 14,90/mês

function redirectToApp(origin: string, status: "error" | "canceled") {
  return new Response(null, {
    status: 303,
    headers: { Location: `${origin}/dashboard?tab=insights&chat_addon=${status}` },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormPost = contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    let shouldRedirect = false;
    let returnOrigin = "";

    if (isFormPost) {
      const form = await req.formData();
      token = String(form.get("access_token") || token);
      shouldRedirect = String(form.get("redirect") || "") === "1";
      returnOrigin = String(form.get("return_origin") || "");
    } else {
      const body = await req.json().catch(() => ({}));
      shouldRedirect = body?.redirect === true;
      returnOrigin = String(body?.return_origin || "");
    }

    const origin = safeOrigin(returnOrigin || req.headers.get("origin"));

    if (!token) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user?.id || !user.email) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: CHAT_ADDON_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?tab=insights&chat_addon=success`,
      cancel_url: `${origin}/dashboard?tab=insights&chat_addon=canceled`,
      metadata: {
        type: "chat_addon",
        user_id: user.id,
      },
      subscription_data: {
        metadata: { type: "chat_addon", user_id: user.id },
      },
    });

    if (shouldRedirect) {
      if (!session.url) return redirectToApp(origin, "error");
      return new Response(null, { status: 303, headers: { Location: session.url } });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-chat-addon-checkout]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
