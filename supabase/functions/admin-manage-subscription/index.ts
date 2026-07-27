import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADMIN-MANAGE-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

type Action = "inspect" | "cancel_at_period_end" | "cancel_now" | "downgrade_basic" | "reactivate_access";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr) throw new Error(`Auth error: ${userErr.message}`);
    const caller = userData.user;
    if (!caller?.email) throw new Error("Not authenticated");

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json().catch(() => ({}));
    const action: Action = body?.action ?? "inspect";
    const professionalId: string | undefined = body?.professional_id;
    const reason: string | undefined = body?.reason;
    const subscriptionId: string | undefined = body?.subscription_id;
    if (!professionalId) throw new Error("professional_id é obrigatório");

    const { data: pro, error: proErr } = await admin
      .from("professionals")
      .select("id, user_id, email, full_name, subscription_status, subscription_stripe_id, pro_access_expires_at, subscription_grace_until, is_partner, is_partner_account, premium_granted")
      .eq("id", professionalId)
      .maybeSingle();
    if (proErr) throw new Error(proErr.message);
    if (!pro) throw new Error("Profissional não encontrado");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ---- Always inspect Stripe first: how many ACTIVE subs does this email have?
    let customerId: string | null = null;
    let subs: any[] = [];
    if (pro.email) {
      const customers = await stripe.customers.list({ email: pro.email, limit: 1 });
      customerId = customers.data[0]?.id ?? null;
      if (customerId) {
        const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
        subs = list.data.map((s: any) => ({
          id: s.id,
          status: s.status,
          cancel_at_period_end: s.cancel_at_period_end,
          current_period_end: s.items?.data?.[0]?.current_period_end
            ? new Date(s.items.data[0].current_period_end * 1000).toISOString()
            : null,
          amount: s.items?.data?.[0]?.price?.unit_amount ?? null,
          currency: s.currency,
          product: s.items?.data?.[0]?.price?.product ?? null,
          created: new Date(s.created * 1000).toISOString(),
        }));
      }
    }
    const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
    log("inspected", { professionalId, activeCount: activeSubs.length });

    const snapshot = {
      professional: {
        id: pro.id,
        email: pro.email,
        full_name: pro.full_name,
        subscription_status: pro.subscription_status,
        subscription_stripe_id: pro.subscription_stripe_id,
        pro_access_expires_at: pro.pro_access_expires_at,
        subscription_grace_until: pro.subscription_grace_until,
        is_partner: pro.is_partner,
        is_partner_account: pro.is_partner_account,
        premium_granted: pro.premium_granted,
      },
      stripe_customer_id: customerId,
      subscriptions: subs,
      active_subscriptions: activeSubs,
      duplicate_active: activeSubs.length > 1,
    };

    if (action === "inspect") {
      return new Response(JSON.stringify(snapshot), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Guard: destructive actions on Stripe need an explicit target when duplicates exist
    let targetSubId = subscriptionId || pro.subscription_stripe_id || activeSubs[0]?.id || null;
    if ((action === "cancel_now" || action === "cancel_at_period_end") && !subscriptionId && activeSubs.length > 1) {
      return new Response(
        JSON.stringify({
          error: "duplicate_active_subscriptions",
          message: "Existe mais de uma assinatura ativa. Escolha explicitamente qual cancelar.",
          ...snapshot,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }

    let stripeResult: any = null;
    const updates: Record<string, any> = {};

    if (action === "cancel_at_period_end") {
      if (!targetSubId) throw new Error("Nenhuma assinatura Stripe encontrada para cancelar.");
      stripeResult = await stripe.subscriptions.update(targetSubId, { cancel_at_period_end: true });
      // Access is kept until the period ends — nothing to change locally.
    }

    if (action === "cancel_now") {
      if (!targetSubId) throw new Error("Nenhuma assinatura Stripe encontrada para cancelar.");
      stripeResult = await stripe.subscriptions.cancel(targetSubId);
      const remaining = activeSubs.filter((s) => s.id !== targetSubId);
      if (remaining.length === 0) {
        updates.subscription_status = "inactive";
        updates.subscription_stripe_id = null;
        updates.subscription_grace_until = null;
        updates.pro_access_expires_at = null;
      } else {
        // Duplicate charge case (ex.: Rita): keep access, just relink to the surviving sub.
        updates.subscription_stripe_id = remaining[0].id;
      }
    }

    if (action === "downgrade_basic") {
      // Local-only downgrade: does NOT touch Stripe (use cancel_* for billing).
      updates.subscription_status = "inactive";
      updates.subscription_grace_until = null;
      updates.pro_access_expires_at = null;
      updates.is_partner = false;
      updates.is_partner_account = false;
      updates.premium_granted = false;
    }

    if (action === "reactivate_access") {
      updates.subscription_status = "active";
      updates.approved = true;
      updates.subscription_grace_until = null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await admin.from("professionals").update(updates).eq("id", pro.id);
      if (updErr) throw new Error(updErr.message);
    }

    await admin.from("subscription_admin_actions").insert({
      professional_id: pro.id,
      target_user_id: pro.user_id,
      target_email: pro.email,
      action,
      reason: reason || null,
      stripe_subscription_id: targetSubId,
      stripe_result: stripeResult ? { id: stripeResult.id, status: stripeResult.status, cancel_at_period_end: stripeResult.cancel_at_period_end } : null,
      previous_status: pro.subscription_status,
      new_status: updates.subscription_status ?? pro.subscription_status,
      performed_by: caller.id,
      performed_by_email: caller.email,
    });

    log("action applied", { action, professionalId, targetSubId });

    return new Response(JSON.stringify({ ok: true, action, target_subscription_id: targetSubId, updates, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
