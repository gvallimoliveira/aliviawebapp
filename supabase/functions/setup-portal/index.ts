import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // List existing portal configurations
    const existing = await stripe.billingPortal.configurations.list({ limit: 5 });
    
    if (existing.data.length > 0) {
      // Update the default one to ensure it's active
      const config = existing.data[0];
      const updated = await stripe.billingPortal.configurations.update(config.id, {
        business_profile: {
          headline: "Gerencie sua assinatura Aliv.iA",
        },
        features: {
          subscription_cancel: { enabled: true, mode: "at_period_end" },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price", "promotion_code"],
            proration_behavior: "create_prorations",
            products: [
              { product: "prod_U9PZeaM93PlMwb", prices: ["price_1TCrZOCBxbFcCp8IVe5xSwzq"] },
              { product: "prod_U5dB77Y8adgxGf", prices: ["price_1TCruvCBxbFcCp8IAjlnnNTO"] },
            ],
          },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
        },
      });
      return new Response(JSON.stringify({ action: "updated", id: updated.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new portal configuration
    const config = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Gerencie sua assinatura Aliv.iA",
      },
        features: {
          subscription_cancel: { enabled: true, mode: "at_period_end" },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price", "promotion_code"],
            proration_behavior: "create_prorations",
            products: [
              { product: "prod_U9PZeaM93PlMwb", prices: ["price_1TCrZOCBxbFcCp8IVe5xSwzq"] },
              { product: "prod_U5dB77Y8adgxGf", prices: ["price_1TCruvCBxbFcCp8IAjlnnNTO"] },
            ],
          },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
      },
    });

    return new Response(JSON.stringify({ action: "created", id: config.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
