import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRO-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    // Parse plan type and optional coupon from body
    let plan: "monthly" | "annual" = "monthly";
    let couponCode: string | undefined;
    try {
      const body = await req.json();
      if (body?.plan === "annual") plan = "annual";
      if (typeof body?.coupon === "string" && body.coupon.trim()) {
        couponCode = body.coupon.trim().toUpperCase();
      }
    } catch {
      // Default to monthly
    }

    const priceId = plan === "annual"
      ? "price_1TJ42L2HgVhVBE8U2fhXuqYT"  // Annual R$804/year (subscription)
      : "price_1TJ4252HgVhVBE8URcx5fMZB";  // Monthly R$97/month

    // Both are now subscriptions (monthly or yearly)
    const sessionMode = "subscription";

    logStep("Plan selected", { plan, priceId, sessionMode });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://alivia.app";

    const successUrl = `${origin}/dashboard?subscription=success`;

    // Try to pre-apply coupon if provided
    let discounts: Array<{ promotion_code: string }> | undefined;
    if (couponCode) {
      try {
        const pcs = await stripe.promotionCodes.list({ code: couponCode, active: true, limit: 1 });
        if (pcs.data.length > 0) {
          discounts = [{ promotion_code: pcs.data[0].id }];
          logStep("Promotion code pre-applied", { code: couponCode, id: pcs.data[0].id });
        } else {
          logStep("Promotion code not found or inactive", { code: couponCode });
        }
      } catch (e) {
        logStep("Promotion code lookup failed", { error: String(e) });
      }
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: sessionMode,
      success_url: successUrl,
      cancel_url: `${origin}/dashboard?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
        type: plan === "annual" ? "pro_annual" : "pro_subscription",
      },
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
