import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { safeOrigin } from "../_shared/caller-auth.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const { tier, plan, clinic_name, clinic_id, source } = body;
    let targetClinicId: string | null = null;
    let ownerUserId = user.id;
    let clinicName = clinic_name;
    if (clinic_id) {
      const { data: clinic } = await supabaseAdmin.from("clinics").select("id,name,owner_user_id,subscription_status,subscription_stripe_id").eq("id", clinic_id).maybeSingle();
      const { data: member } = await supabaseAdmin.from("clinic_members").select("role").eq("clinic_id", clinic_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (!clinic || (clinic.owner_user_id !== user.id && !["owner", "admin"].includes(member?.role))) {
        return new Response(JSON.stringify({ error: "Seu perfil não tem autorização para assinar por esta clínica." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
      }
      targetClinicId = clinic.id;
      ownerUserId = clinic.owner_user_id;
      clinicName = clinic.name;
      if (clinic.subscription_stripe_id) {
        const key = Deno.env.get("STRIPE_SECRET_KEY");
        if (!key) throw new Error("STRIPE_SECRET_KEY not set");
        const existing = await new Stripe(key, { apiVersion: "2025-08-27.basil" }).subscriptions.retrieve(clinic.subscription_stripe_id);
        if (["active", "trialing"].includes(existing.status)) {
          const { error: syncError } = await supabaseAdmin.from("clinics").update({ subscription_status: "active" }).eq("id", targetClinicId);
          if (syncError) throw syncError;
          return new Response(JSON.stringify({ already_active: true, clinic_id: targetClinicId }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
        }
        if (["past_due", "unpaid", "incomplete", "paused"].includes(existing.status)) throw new Error("Esta clínica já possui uma assinatura pendente. Regularize em Minha Conta → Assinatura e cobrança.");
      }
    }
    
    if (!tier || !["small", "medium", "large"].includes(tier)) {
      throw new Error("Invalid tier. Must be small, medium, or large");
    }
    if (!plan || !["monthly", "annual"].includes(plan)) {
      throw new Error("Invalid plan. Must be monthly or annual");
    }
    if (!clinicName || typeof clinicName !== "string" || clinicName.trim().length === 0) {
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
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Idempotência: se já existe assinatura de clínica ativa para este
    // customer, sincroniza DB e recusa criar duplicata.
    if (customerId) {
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      const activeClinicSub = activeSubs.data.find((s: any) =>
        ["active", "trialing"].includes(s.status) &&
        (!targetClinicId || s.metadata?.clinic_id === targetClinicId || (!s.metadata?.clinic_id && s.metadata?.user_id === ownerUserId)) &&
        s.items.data.some((i: any) => Object.values(PRICE_MAP).includes(i.price?.id))
      );
      if (activeClinicSub) {
        logStep("Already has active clinic subscription — refusing to create duplicate", { subId: activeClinicSub.id });
        try {
          let update = supabaseAdmin
            .from("clinics")
            .update({ subscription_status: "active", subscription_stripe_id: activeClinicSub.id })
            .eq("owner_user_id", ownerUserId);
          if (targetClinicId) update = update.eq("id", targetClinicId);
          await update;
        } catch (e) {
          logStep("DB sync during clinic idempotency failed (non-blocking)", { error: String(e) });
        }
        return new Response(
          JSON.stringify({
            already_active: true,
            subscription_id: activeClinicSub.id,
            message: "Você já possui uma assinatura de clínica ativa.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Reaproveita Checkout Session aberta recente (< 15 min)
      try {
        const recent = await stripe.checkout.sessions.list({ customer: customerId, limit: 5 });
        const fifteenMinAgo = Math.floor(Date.now() / 1000) - 15 * 60;
        const openMatch = recent.data.find(
          (s: any) =>
            s.status === "open" &&
            s.mode === "subscription" &&
            s.created >= fifteenMinAgo &&
            s.metadata?.user_id === ownerUserId &&
            (s.metadata?.clinic_id || null) === targetClinicId &&
            s.metadata?.checkout_source === (source === "dashboard" ? "dashboard" : "landing") &&
            s.metadata?.tier === tier &&
            s.metadata?.plan === plan &&
            s.url
        );
        if (openMatch?.url) {
          logStep("Reusing recent open clinic checkout session", { sessionId: openMatch.id });
          return new Response(JSON.stringify({ url: openMatch.url, reused: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch (e) {
        logStep("Recent-session lookup failed (non-blocking)", { error: String(e) });
      }
    }

    const origin = safeOrigin(req.headers.get("origin"));

    const idempotencyKey = `create-clinic-${user.id}-${targetClinicId || "new"}-${source === "dashboard" ? "dashboard" : "landing"}-${tier}-${plan}-${Math.floor(Date.now() / 60000)}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?clinic=success`,
      cancel_url: `${origin}/dashboard?clinic=cancelled`,
      metadata: {
        user_id: ownerUserId,
        payer_user_id: user.id,
        clinic_id: targetClinicId || "",
        checkout_source: source === "dashboard" ? "dashboard" : "landing",
        type: "clinic_subscription",
        tier,
        plan,
        clinic_name: clinicName.trim(),
        max_members: String(MAX_MEMBERS[tier]),
      },
      subscription_data: {
        metadata: {
          user_id: ownerUserId,
          payer_user_id: user.id,
          clinic_id: targetClinicId || "",
          type: "clinic_subscription",
          tier,
          plan,
        },
      },
    }, { idempotencyKey });

    logStep("Checkout session created", { sessionId: session.id, idempotencyKey });

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
