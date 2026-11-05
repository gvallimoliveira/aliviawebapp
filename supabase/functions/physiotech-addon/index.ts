// PhysioTech add-on for Aliv.iA professionals.
// action "status"   → current entitlement (franchise / trial / add-on)
// action "checkout" → Stripe Checkout for the discounted add-on matching the
//                     caller's base plan (30% OFF monthly, ~50% OFF annual).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeOrigin } from "../_shared/caller-auth.ts";
import { getPhysioTechEntitlement, PHYSIOTECH_PRICES } from "../_shared/physiotechEntitlement.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user?.email) return json({ error: "unauthorized" }, 401);

    const ent = await getPhysioTechEntitlement(admin, user.id, user.email);
    if (body.action !== "checkout") return json({ entitlement: ent });

    const tier = body.tier === "pro" ? "pro" : "essencial";
    if (ent.kind === "unlimited" || ent.kind === "addon") return json({ error: "already_active" }, 409);
    if (!ent.base) return json({ error: "needs_alivia_pro" }, 403);
    const price = PHYSIOTECH_PRICES[ent.base][tier];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customerId = (await stripe.customers.list({ email: user.email, limit: 1 })).data[0]?.id;
    const origin = safeOrigin(String(body.return_origin || req.headers.get("origin") || ""));
    const meta = { type: "physiotech_addon", user_id: user.id, tier, billing: ent.base };
    const session = await stripe.checkout.sessions.create({
      customer: customerId, customer_email: customerId ? undefined : user.email,
      line_items: [{ price, quantity: 1 }], mode: "subscription",
      success_url: `${origin}/dashboard?physiotech_addon=success`,
      cancel_url: `${origin}/dashboard?physiotech_addon=canceled`,
      metadata: meta, subscription_data: { metadata: meta },
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("physiotech-addon", e);
    return json({ error: "internal" }, 500);
  }
});
