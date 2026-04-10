import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP: Record<string, string> = {
  "small_monthly": "price_1TKjS22HgVhVBE8UKPH1p0SR",
  "small_annual": "price_1TKjSV2HgVhVBE8UAltRZTlh",
  "medium_monthly": "price_1TKjaS2HgVhVBE8UrpLrMFVU",
  "medium_annual": "price_1TKjas2HgVhVBE8UtqMAGInP",
  "large_monthly": "price_1TKjbC2HgVhVBE8U3ANhCbHs",
  "large_annual": "price_1TKjbT2HgVhVBE8UzG25AfhI",
};

const MAX_MEMBERS: Record<string, number> = {
  small: 3,
  medium: 8,
  large: 999,
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CLINIC-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const body = await req.json();
    const { tier, plan, clinic_name } = body;
    
    if (!tier || !["small", "medium", "large"].includes(tier)) {
      throw new Error("Invalid tier. Must be small, medium, or large");
    }
    if (!plan || !["monthly", "annual"].includes(plan)) {
      throw new Error("Invalid plan. Must be monthly or annual");
    }
    if (!clinic_name || typeof clinic_name !== "string" || clinic_name.trim().length === 0) {
      throw new Error("clinic_name is required");
    }

    const priceKey = `${tier}_${plan}`;
    const priceId = PRICE_MAP[priceKey];
    if (!priceId) throw new Error("Invalid price configuration");

    logStep("Plan selected", { tier, plan, priceId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://alivia.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?clinic=success`,
      cancel_url: `${origin}/clinica?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        type: "clinic_subscription",
        tier,
        plan,
        clinic_name: clinic_name.trim(),
        max_members: String(MAX_MEMBERS[tier]),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
