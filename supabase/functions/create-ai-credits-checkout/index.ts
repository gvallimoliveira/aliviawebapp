// Create a Stripe Checkout session for an AI credits pack (one-off).
// Webhook (`stripe-webhook` → fulfillOrder) credits the user upon "paid".
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Server-side catalog — never trust client to set prices or credit amounts.
const PACKAGES: Record<
  string,
  { price_id: string; credits: number; price_brl: number; label: string }
> = {
  starter: {
    price_id: "price_1TmRLn2HgVhVBE8UsHAPQlBe",
    credits: 25,
    price_brl: 8.0,
    label: "Pacote IA Starter (25 créditos)",
  },
  mini: {
    price_id: "price_1TmR9S2HgVhVBE8UkDiP7iTx",
    credits: 50,
    price_brl: 15.0,
    label: "Pacote IA Mini (50 créditos)",
  },
  plus: {
    price_id: "price_1TmR9i2HgVhVBE8URRd5yRSh",
    credits: 150,
    price_brl: 35.0,
    label: "Pacote IA Plus (150 créditos)",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } =
      await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user?.id || !user.email) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const packageKey = String(body?.package || "").toLowerCase();
    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Invalid package" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Reuse customer when possible
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://aliviawebapp.com.br";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/dashboard?tab=insights&ai_credits=success`,
      cancel_url: `${origin}/dashboard?tab=insights&ai_credits=canceled`,
      metadata: {
        type: "ai_credits",
        user_id: user.id,
        package_key: packageKey,
        credits: String(pkg.credits),
        price_brl: String(pkg.price_brl),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-ai-credits-checkout]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
