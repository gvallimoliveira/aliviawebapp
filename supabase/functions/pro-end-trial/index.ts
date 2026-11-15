import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const PRO_PRODUCT_IDS = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];

// Ends the caller's own PRO 7-day trial now: Stripe charges immediately and
// the full monthly AI credit quota is released.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    const user = u?.user;
    if (ue || !user?.email) return json({ error: "unauthorized" }, 401);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    if (!customerId) return json({ error: "no_trial" }, 404);
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 10 });
    const trialSub = subs.data.find((s: any) => s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(i.price?.product as string)));
    if (!trialSub) return json({ error: "no_trial" }, 404);

    // Same subscription, no new one: trial_end="now" moves the first charge
    // (the one scheduled for the end of the trial) to today and restarts the
    // billing cycle from today. There is no extra charge at the old trial end.
    // error_if_incomplete: if the card fails, Stripe rejects the change and the
    // trial stays exactly as it was. The idempotency key makes double clicks a
    // single operation.
    const updated = await stripe.subscriptions.update(trialSub.id, {
      trial_end: "now",
      payment_behavior: "error_if_incomplete",
      proration_behavior: "none",
    }, { idempotencyKey: `pro-end-trial-${trialSub.id}` });
    if (updated.status !== "active") return json({ error: "payment_failed", status: updated.status }, 402);

    await admin.from("professionals").update({
      subscription_status: "active", subscription_stripe_id: updated.id, pro_trial_ends_at: null, subscription_grace_until: null,
    }).eq("user_id", user.id);
    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PRO-END-TRIAL]", msg);
    const card = /card|payment|declin/i.test(msg);
    return json({ error: card ? "payment_failed" : "error" }, card ? 402 : 500);
  }
});
