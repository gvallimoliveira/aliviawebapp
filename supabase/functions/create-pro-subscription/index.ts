import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { safeOrigin } from "../_shared/caller-auth.ts";
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
    let wantsTrial = false;
    try {
      const body = await req.json();
      if (body?.plan === "annual") plan = "annual";
      if (body?.trial === true) wantsTrial = true;
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
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // ── Idempotência 1: assinatura PRO já ATIVA ────────────────────────────
    // Se o customer já tem uma assinatura PRO ativa (mensal ou anual),
    // nunca criamos nova sessão. Sincronizamos o DB e devolvemos flag para
    // o front-end tratar (mostrar toast e evitar redirect ao Stripe).
    if (customerId) {
      const PRO_PRODUCT_IDS = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      const activePro = activeSubs.data.find((s: any) =>
        ["active", "trialing"].includes(s.status) &&
        s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(i.price?.product as string))
      );
      if (activePro) {
        logStep("Already has active PRO subscription — refusing to create duplicate", { subId: activePro.id });
        // Sincroniza DB imediatamente (defensivo, caso webhook tenha falhado antes)
        try {
          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );
          const updates: Record<string, any> = {
            subscription_status: "active",
            subscription_stripe_id: activePro.id,
            approved: true,
            subscription_grace_until: null,
          };
          // Se for anual, propaga expiração
          const isAnnual = activePro.items.data.some((i: any) => i.price?.recurring?.interval === "year");
          if (isAnnual && (activePro as any).current_period_end) {
            updates.pro_access_expires_at = new Date((activePro as any).current_period_end * 1000).toISOString();
          }
          await supabaseAdmin.from("professionals").update(updates).eq("user_id", user.id);
        } catch (e) {
          logStep("DB sync during idempotency check failed (non-blocking)", { error: String(e) });
        }
        return new Response(
          JSON.stringify({
            already_active: true,
            subscription_id: activePro.id,
            message: "Você já possui uma assinatura PRO ativa.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Subscribe-first: guarantee a (pending) professional row so the webhook
    // can activate it. CREFITO/academic data is collected after payment.
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      const { data: existingPro } = await admin.from("professionals").select("id").eq("user_id", user.id).maybeSingle();
      if (!existingPro) {
        const { data: prof } = await admin.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
        const fullName = (prof?.full_name || (user.user_metadata as any)?.full_name || user.email.split("@")[0] || "Profissional").toString().slice(0, 120);
        const { error: insErr } = await admin.from("professionals").insert({
          user_id: user.id, full_name: fullName, city: "", state: "", email: user.email,
          active: true, approved: false, registration_pending: true,
        });
        if (insErr) logStep("Pending professional insert failed (non-blocking)", { error: insErr.message });
        else logStep("Pending professional row created");
      }
    } catch (e) {
      logStep("Pending professional ensure failed (non-blocking)", { error: String(e) });
    }

    // Trial de 7 dias só para quem nunca teve assinatura PRO (evita trial repetido).
    let trialEligible = false;
    if (wantsTrial) {
      trialEligible = true;
      if (customerId) {
        try {
          const PRO_IDS = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];
          const past = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 50 });
          if (past.data.some((s: any) => s.items.data.some((i: any) => PRO_IDS.includes(i.price?.product as string)))) {
            trialEligible = false;
            logStep("Trial refused: customer already had PRO");
          }
        } catch (e) {
          trialEligible = false;
          logStep("Trial eligibility check failed — charging normally", { error: String(e) });
        }
      }
    }

    const origin = safeOrigin(req.headers.get("origin"));

    const successUrl = `${origin}/dashboard?tab=professional&subscription=success`;

    // ── Idempotência 2: sessão de Checkout recente e ainda aberta ─────────
    // Evita gerar segunda cobrança quando o usuário volta e clica de novo
    // no botão de comprar dentro de poucos minutos (Stripe mantém a sessão
    // válida por 24h por padrão; usamos janela de 15min para reaproveitar).
    if (customerId) {
      try {
        const recent = await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 5,
        });
        const fifteenMinAgo = Math.floor(Date.now() / 1000) - 15 * 60;
        const openMatch = recent.data.find(
          (s: any) =>
            s.status === "open" &&
            s.mode === "subscription" &&
            s.created >= fifteenMinAgo &&
            s.metadata?.user_id === user.id &&
            s.metadata?.plan === plan &&
            (s.metadata?.trial === "1") === trialEligible &&
            s.url
        );
        if (openMatch?.url) {
          logStep("Reusing recent open checkout session", { sessionId: openMatch.id });
          return new Response(JSON.stringify({ url: openMatch.url, reused: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch (e) {
        logStep("Recent-session lookup failed (non-blocking)", { error: String(e) });
      }
    }

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

    // Idempotency key na criação do Checkout Session: impede que duas
    // requisições concorrentes (double-click / retry de rede) gerem duas
    // sessões — e, portanto, duas assinaturas — para o mesmo usuário/plano
    // no mesmo minuto.
    const idempotencyKey = `create-pro-${user.id}-${plan}-${trialEligible ? "t" : "n"}-${Math.floor(Date.now() / 60000)}`;

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
      cancel_url: `${origin}/dashboard?tab=professional&subscription=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
        type: plan === "annual" ? "pro_annual" : "pro_subscription",
        trial: trialEligible ? "1" : "0",
      },
      subscription_data: {
        ...(trialEligible ? { trial_period_days: 7 } : {}),
        metadata: {
          user_id: user.id,
          plan,
          type: plan === "annual" ? "pro_annual" : "pro_subscription",
        },
      },
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey,
    });

    logStep("Checkout session created", { sessionId: session.id, idempotencyKey });

    return new Response(JSON.stringify({ url: session.url, trial: trialEligible, trial_refused: wantsTrial && !trialEligible }), {
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
