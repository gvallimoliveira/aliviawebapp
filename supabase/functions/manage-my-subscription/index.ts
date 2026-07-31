import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[manage-my-subscription] ${step}`, details ? JSON.stringify(details) : "");

/** Catálogo mínimo para rotular planos e permitir upgrade mensal -> anual. */
const PRICE_CATALOG: Record<
  string,
  { label: string; kind: "pro" | "premium" | "clinic" | "addon"; interval: "month" | "year"; annual_price?: string }
> = {
  // PRO
  price_1TJ4252HgVhVBE8URcx5fMZB: { label: "Profissional PRO — Mensal", kind: "pro", interval: "month", annual_price: "price_1TJ42L2HgVhVBE8U2fhXuqYT" },
  price_1TJ42L2HgVhVBE8U2fhXuqYT: { label: "Profissional PRO — Anual", kind: "pro", interval: "year" },
  // Premium B2C
  price_1TBkbt2HgVhVBE8UWGL7zPGZ: { label: "Premium Mensal", kind: "premium", interval: "month" },
  // Clínica
  price_1TKjS22HgVhVBE8UKPH1p0SR: { label: "Clínica até 3 — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjSV2HgVhVBE8UAltRZTlh" },
  price_1TKjSV2HgVhVBE8UAltRZTlh: { label: "Clínica até 3 — Anual", kind: "clinic", interval: "year" },
  price_1TKjaS2HgVhVBE8UrpLrMFVU: { label: "Clínica 4-8 — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjas2HgVhVBE8UtqMAGInP" },
  price_1TKjas2HgVhVBE8UtqMAGInP: { label: "Clínica 4-8 — Anual", kind: "clinic", interval: "year" },
  price_1TKjbC2HgVhVBE8U3ANhCbHs: { label: "Clínica 9+ — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjbT2HgVhVBE8UzG25AfhI" },
  price_1TKjbT2HgVhVBE8UzG25AfhI: { label: "Clínica 9+ — Anual", kind: "clinic", interval: "year" },
};

async function notifyAdmin(payload: Record<string, unknown>) {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resp = await fetch(`${url}/functions/v1/notify-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: "alert", ...payload }),
    });
    await resp.text();
  } catch (e) {
    log("notifyAdmin failed (non-blocking)", { error: String(e) });
  }
}

const money = (cents?: number | null, currency?: string | null) =>
  cents === null || cents === undefined ? "—" : `${(currency || "brl").toUpperCase()} ${(cents / 100).toFixed(2)}`;

const describe = (sub: Stripe.Subscription) => {
  const item = sub.items.data[0];
  const priceId = (item?.price?.id as string) || "";
  const meta = PRICE_CATALOG[priceId];
  return {
    id: sub.id,
    status: sub.status,
    label: meta?.label || item?.price?.nickname || "Assinatura",
    kind: meta?.kind || "other",
    interval: meta?.interval || (item?.price?.recurring?.interval as string) || null,
    can_switch_to_annual: !!meta?.annual_price,
    amount: item?.price?.unit_amount ?? null,
    currency: sub.currency,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body?.action || "inspect";
    const requestedSubId: string | undefined = body?.subscription_id || undefined;
    const reason: string | null = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;

    const allowed = ["inspect", "cancel_at_period_end", "resume", "switch_to_annual"];
    if (!allowed.includes(action)) {
      return new Response(JSON.stringify({ error: "invalid_action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // O cliente Stripe é sempre resolvido pelo e-mail do próprio usuário autenticado.
    const customers = await stripe.customers.list({ email: user.email, limit: 3 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscriptions: [], customer_found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownSubs: Stripe.Subscription[] = [];
    for (const c of customers.data) {
      const list = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 20 });
      ownSubs.push(...list.data);
    }
    const liveSubs = ownSubs.filter((s) => ["active", "trialing", "past_due", "unpaid"].includes(s.status));

    if (action === "inspect") {
      return new Response(
        JSON.stringify({ customer_found: true, subscriptions: liveSubs.map(describe) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ações mutantes: a assinatura DEVE pertencer ao customer do próprio usuário.
    const target = requestedSubId
      ? liveSubs.find((s) => s.id === requestedSubId)
      : liveSubs.find((s) => s.status === "active" || s.status === "trialing");

    if (!target) {
      return new Response(JSON.stringify({ error: "subscription_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const before = describe(target);
    let updated: Stripe.Subscription;
    let title = "";

    if (action === "cancel_at_period_end") {
      updated = await stripe.subscriptions.update(target.id, { cancel_at_period_end: true });
      title = "🚪 Usuário agendou cancelamento";
    } else if (action === "resume") {
      updated = await stripe.subscriptions.update(target.id, { cancel_at_period_end: false });
      title = "↩️ Usuário desfez o cancelamento";
    } else {
      const item = target.items.data[0];
      const meta = PRICE_CATALOG[(item?.price?.id as string) || ""];
      if (!meta?.annual_price) {
        return new Response(JSON.stringify({ error: "upgrade_unavailable" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      updated = await stripe.subscriptions.update(target.id, {
        items: [{ id: item.id, price: meta.annual_price }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });
      title = "⬆️ Usuário mudou para o plano anual";
    }

    const after = describe(updated);

    // Auditoria — mesma tabela lida no painel Admin.
    const { data: proRow } = await admin
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    await admin.from("subscription_admin_actions").insert({
      professional_id: proRow?.id ?? null,
      target_user_id: user.id,
      target_email: user.email,
      action: `self_${action}`,
      reason,
      stripe_subscription_id: target.id,
      stripe_result: after as unknown as Record<string, unknown>,
      previous_status: before.cancel_at_period_end ? `${before.status}/cancel_scheduled` : before.status,
      new_status: after.cancel_at_period_end ? `${after.status}/cancel_scheduled` : after.status,
      performed_by: user.id,
      performed_by_email: user.email,
    });

    EdgeRuntime.waitUntil(
      notifyAdmin({
        event_type: "subscription_self_service",
        title,
        ref: target.id,
        fields: {
          "Usuário": user.email,
          "Plano": before.label,
          "Novo plano": after.label,
          "Ação": action,
          "Valor": money(after.amount, after.currency),
          "Fim do período": after.current_period_end
            ? new Date(after.current_period_end).toLocaleDateString("pt-BR")
            : "—",
          "Motivo": reason || "—",
        },
        url: "https://dashboard.stripe.com/subscriptions",
      }),
    );

    log("action done", { action, sub: target.id, user: user.id });

    return new Response(JSON.stringify({ ok: true, subscription: after }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
