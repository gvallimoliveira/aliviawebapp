import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { paidCreditPackage } from "../_shared/ai-credit-catalog.ts";
import { provisionClinic, resolveMaxMembers } from "../_shared/clinicProvisioning.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const log = (step: string, details?: any) => {
  console.log(`[stripe-webhook] ${step}`, details ? JSON.stringify(details) : "");
};

/** Central admin alert (Telegram / e-mail / push). Never blocks the webhook. */
async function notifyAdmin(payload: Record<string, unknown>) {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resp = await fetch(`${url}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        // Service-role bearer alone is rejected by notify-admin in this runtime;
        // the internal secret is the authoritative server-to-server credential.
        "x-internal-secret": Deno.env.get("INTERNAL_ALERT_SECRET") ?? "",
      },
      body: JSON.stringify({ action: "alert", ...payload }),
    });
    const out = await resp.text();
    if (!resp.ok) console.error("notifyAdmin rejected", resp.status, out.slice(0, 200));
  } catch (e) {
    log("notifyAdmin failed (non-blocking)", { error: String(e) });
  }
}

const brl = (cents?: number | null, currency?: string | null) =>
  cents === null || cents === undefined
    ? "—"
    : `${(currency || "brl").toUpperCase()} ${(cents / 100).toFixed(2)}`;

async function alertSale(session: Stripe.Checkout.Session, kind: string) {
  const email =
    session.customer_details?.email || session.customer_email || "—";
  await notifyAdmin({
    event_type: "stripe_sale",
    title: kind === "async" ? "💰 Pagamento (boleto/pix) confirmado" : "💰 Nova venda confirmada",
    ref: session.id,
    fields: {
      "Cliente": session.customer_details?.name || "—",
      "E-mail": email,
      "Produto": session.metadata?.type || "—",
      "Valor": brl(session.amount_total, session.currency),
      "Modo": session.mode,
    },
    url: "https://dashboard.stripe.com/payments",
  });
}

/**
 * Avisa o admin sobre mudanças relevantes de assinatura (cancelamento agendado,
 * cancelamento efetivo, retomada, troca de plano) — inclusive quando feitas
 * direto no portal Stripe, fora do app.
 */
async function alertSubscriptionChange(
  sub: Stripe.Subscription,
  eventType: string,
  prev: Record<string, any>,
) {
  let title: string | null = null;

  if (eventType === "customer.subscription.deleted") {
    title = "🚪 Assinatura encerrada";
  } else if ("cancel_at_period_end" in prev) {
    title = sub.cancel_at_period_end ? "🚪 Cancelamento agendado" : "↩️ Cancelamento desfeito";
  } else if (prev.items) {
    title = "🔁 Plano da assinatura alterado";
  } else if (prev.status && sub.status !== prev.status) {
    title = `ℹ️ Status da assinatura: ${sub.status}`;
  }

  if (!title) return; // renovações comuns não geram alerta

  let email = "—";
  try {
    const customer = await stripe.customers.retrieve(sub.customer as string);
    email = (customer as any)?.email || "—";
  } catch {
    // ignore
  }

  const item = sub.items.data[0];
  await notifyAdmin({
    event_type: "subscription_change",
    title,
    ref: sub.id,
    fields: {
      "E-mail": email,
      "Status": sub.status,
      "Valor": brl(item?.price?.unit_amount ?? null, sub.currency),
      "Intervalo": (item?.price?.recurring?.interval as string) || "—",
      "Fim do período": (sub as any).current_period_end
        ? new Date((sub as any).current_period_end * 1000).toLocaleDateString("pt-BR")
        : "—",
    },
    url: "https://dashboard.stripe.com/subscriptions",
  });
}




serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("ERROR", "Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("ERROR", "STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log("ERROR", `Signature verification failed: ${err}`);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_succeeded":
        await handleAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
        await handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.deleted":
      case "customer.subscription.updated":
        EdgeRuntime.waitUntil(
          alertSubscriptionChange(
            event.data.object as Stripe.Subscription,
            event.type,
            (event.data as any).previous_attributes || {},
          ),
        );
        await handleSubscriptionLifecycle(event.data.object as Stripe.Subscription, event.type);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        if (event.type === "invoice.payment_failed") {
          const inv = event.data.object as Stripe.Invoice;
          EdgeRuntime.waitUntil(
            notifyAdmin({
              event_type: "stripe_payment_failed",
              title: "⚠️ Cobrança recusada",
              ref: inv.id,
              fields: {
                "E-mail": (inv as any).customer_email || "—",
                "Valor": brl(inv.amount_due ?? 0, inv.currency),
                "Tentativa": String((inv as any).attempt_count ?? "—"),
              },
              url: "https://dashboard.stripe.com/invoices",
            }),
          );
        }
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, event.type);
        break;


      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        EdgeRuntime.waitUntil(
          notifyAdmin({
            event_type: "stripe_refund",
            title: "↩️ Reembolso processado",
            ref: charge.id,
            fields: {
              "E-mail": charge.billing_details?.email || charge.receipt_email || "—",
              "Reembolsado": brl(charge.amount_refunded, charge.currency),
              "Valor original": brl(charge.amount, charge.currency),
            },
            url: "https://dashboard.stripe.com/payments",
          }),
        );
        break;
      }
      default:
        log("Unhandled event type", { type: event.type });

    }
  } catch (err) {
    log("ERROR processing event", { type: event.type, error: String(err) });
    return new Response("Error processing event", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;

  log("checkout.session.completed", {
    paymentType,
    userId,
    paymentStatus: session.payment_status,
    mode: session.mode,
  });

  if (session.payment_status === "paid") {
    await fulfillOrder(session);
    EdgeRuntime.waitUntil(alertSale(session, "sync"));
  } else {
    log("Async payment pending", { paymentType, userId });
  }
}

async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  log("async_payment_succeeded", {
    type: session.metadata?.type,
    userId,
  });
  await fulfillOrder(session);
  EdgeRuntime.waitUntil(alertSale(session, "async"));


  if (userId) {
    await sendPushToUser(userId, {
      title: "✅ Pagamento confirmado!",
      body: "Seu boleto foi compensado. Seu acesso já está liberado!",
      url: "/dashboard",
    });
  }
}

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;
  const pendingAssessmentId = session.metadata?.pending_assessment_id;

  log("async_payment_failed", { paymentType, userId, pendingAssessmentId });

  if (paymentType === "pro_treatment") {
    const assessmentId = session.metadata?.assessment_id;
    if (assessmentId) {
      await supabase
        .from("assessments")
        .update({ payment_status: "payment_failed" })
        .eq("id", assessmentId);
      log("Assessment marked as payment_failed", { assessmentId });
    }
  }

  if (pendingAssessmentId) {
    await supabase
      .from("assessments")
      .update({ payment_status: "payment_failed" })
      .eq("id", pendingAssessmentId);
    log("Pending assessment marked as payment_failed", { pendingAssessmentId });
  }

  if (userId) {
    await sendPushToUser(userId, {
      title: "⚠️ Boleto expirado",
      body: "Seu boleto não foi pago a tempo. Gere um novo para continuar.",
      url: "/dashboard",
    });
  }
}

async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string; url: string; category?: string },
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        url: notification.url,
        category: notification.category ?? "billing",
      }),
    });

    const result = await response.text();
    log("Push notification sent", { userId, result });
  } catch (e) {
    log("ERROR sending push notification", { userId, error: String(e) });
  }
}

/** Resolve the app user behind a Stripe subscription (professional or clinic owner). */
async function userIdForSubscription(subscriptionId: string | null): Promise<string | null> {
  if (!subscriptionId) return null;
  const { data: pro } = await supabase
    .from("professionals")
    .select("user_id")
    .eq("subscription_stripe_id", subscriptionId)
    .maybeSingle();
  if (pro?.user_id) return pro.user_id;
  const { data: clinic } = await supabase
    .from("clinics")
    .select("owner_user_id")
    .eq("subscription_stripe_id", subscriptionId)
    .maybeSingle();
  return clinic?.owner_user_id ?? null;
}

/** Renewal confirmed / payment failed notices for the subscriber (not the admin). */
async function handleInvoiceEvent(invoice: Stripe.Invoice, eventType: string) {
  const subId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id ?? null;
  const userId = await userIdForSubscription(subId);
  if (!userId) {
    log("Invoice event without matching user", { type: eventType, sub: subId });
    return;
  }

  const amount = brl(invoice.amount_due ?? invoice.amount_paid ?? 0, invoice.currency || "brl");

  if (eventType === "invoice.paid") {
    // Only the recurring renewals — the first invoice is already covered by checkout.
    if ((invoice as any).billing_reason === "subscription_create") return;
    await sendPushToUser(userId, {
      title: "✅ Assinatura renovada",
      body: `Sua renovação de ${amount} foi confirmada. Acesso segue ativo.`,
      url: "/dashboard",
      category: "billing",
    });
    return;
  }

  if (eventType === "invoice.payment_failed") {
    await sendPushToUser(userId, {
      title: "⚠️ Cobrança recusada",
      body: `Não conseguimos cobrar ${amount}. Atualize seu pagamento para não perder o acesso.`,
      url: "/dashboard",
      category: "billing",
    });
  }
}


/**
 * Process referral code ONLY after confirmed payment.
 * Creates reward, coupon, applies to active subscription, sends push.
 */
async function processReferral(session: Stripe.Checkout.Session) {
  const referralCode = session.metadata?.referral_code;
  const userId = session.metadata?.user_id;
  if (!referralCode || !userId) return;

  log("Processing referral", { referralCode, userId });

  // Look up the referral code
  const { data: codeData } = await supabase
    .from("referral_codes")
    .select("id, user_id, code")
    .eq("code", referralCode)
    .single();

  if (!codeData || codeData.user_id === userId) {
    log("Invalid referral code or self-referral", { referralCode });
    return;
  }

  // Check if this referred user already has a reward (prevent duplicates)
  const { data: existingReward } = await supabase
    .from("referral_rewards")
    .select("id")
    .eq("referred_user_id", userId)
    .limit(1)
    .single();

  if (existingReward) {
    log("Referral reward already exists for this user", { userId });
    return;
  }

  // Create the reward record
  await supabase.from("referral_rewards").insert({
    referrer_user_id: codeData.user_id,
    referred_user_id: userId,
    referral_code_id: codeData.id,
    status: "pending",
    discount_percent: 20,
  });

  // Create Stripe coupon for the referrer
  const coupon = await stripe.coupons.create({
    percent_off: 20,
    duration: "once",
    name: `Referral discount for ${codeData.code}`,
  });

  // Update reward to rewarded with coupon
  await supabase
    .from("referral_rewards")
    .update({
      status: "rewarded",
      stripe_coupon_id: coupon.id,
      rewarded_at: new Date().toISOString(),
    })
    .eq("referrer_user_id", codeData.user_id)
    .eq("referred_user_id", userId)
    .eq("status", "pending");

  log("Referral reward created", { referrerUserId: codeData.user_id, couponId: coupon.id });

  // Apply coupon to referrer's active subscription if they have one
  try {
    await applyReferralToSubscriber(codeData.user_id, coupon.id);
  } catch (e) {
    log("Error applying coupon to subscriber", { error: String(e) });
  }

  // Send push notification to referrer
  try {
    await sendPushToUser(codeData.user_id, {
      title: "🎉 Você ganhou desconto!",
      body: "Um amigo usou seu link! Você ganhou 20% de desconto na próxima cobrança.",
      url: "/dashboard",
    });
  } catch (e) {
    log("Error sending referral push", { error: String(e) });
  }
}

/**
 * If the referrer has an active Stripe subscription, apply the coupon directly.
 */
async function applyReferralToSubscriber(referrerUserId: string, couponId: string) {
  const { data: referrerAuth } = await supabase.auth.admin.getUserById(referrerUserId);
  if (!referrerAuth?.user?.email) return;

  const customers = await stripe.customers.list({ email: referrerAuth.user.email, limit: 1 });
  if (customers.data.length === 0) return;

  const customerId = customers.data[0].id;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    const subscription = subscriptions.data[0];
    log(`Applying coupon ${couponId} to subscription ${subscription.id}`);
    await stripe.subscriptions.update(subscription.id, { coupon: couponId });

    await supabase
      .from("referral_rewards")
      .update({ status: "used" })
      .eq("referrer_user_id", referrerUserId)
      .eq("stripe_coupon_id", couponId);
  }
}

/**
 * Fulfill the order based on the payment type stored in session metadata.
 */
async function fulfillOrder(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;

  log("Fulfilling order", { paymentType, userId });

  // Process referral ONLY on confirmed payment
  try {
    await processReferral(session);
  } catch (e) {
    log("ERROR processing referral (non-blocking)", { error: String(e) });
  }

  switch (paymentType) {
    case "pro_treatment": {
      const assessmentId = session.metadata?.assessment_id;
      if (assessmentId) {
        await supabase
          .from("assessments")
          .update({ payment_status: "treatment_paid" })
          .eq("id", assessmentId);
        log("Pro treatment fulfilled", { assessmentId });
      }
      break;
    }

    case "pro_lifetime_treatment": {
      const professionalId = session.metadata?.professional_id;
      if (professionalId) {
        await supabase
          .from("professionals")
          .update({ lifetime_treatment: true })
          .eq("id", professionalId);
        log("Pro lifetime treatment fulfilled", { professionalId });
      } else if (userId) {
        await supabase
          .from("professionals")
          .update({ lifetime_treatment: true })
          .eq("user_id", userId);
        log("Pro lifetime treatment fulfilled via user_id fallback", { userId });
      }
      break;
    }

    case "pro_subscription": {
      if (userId) {
        const subscriptionId = session.subscription as string || null;
        await supabase
          .from("professionals")
          .update({
            subscription_status: "active",
            subscription_stripe_id: subscriptionId,
            approved: true,
          })
          .eq("user_id", userId);
        log("Pro subscription fulfilled", { userId, subscriptionId });
      }
      break;
    }

    case "pro_annual": {
      if (userId) {
        let expiresAt: string;
        
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
            log("Got expiry from Stripe subscription", { expiresAt });
          } catch (err) {
            const fallback = new Date();
            fallback.setFullYear(fallback.getFullYear() + 1);
            expiresAt = fallback.toISOString();
            log("Fallback expiry +1 year", { expiresAt, error: String(err) });
          }
        } else {
          const fallback = new Date();
          fallback.setFullYear(fallback.getFullYear() + 1);
          expiresAt = fallback.toISOString();
        }

        await supabase
          .from("professionals")
          .update({
            subscription_status: "active",
            subscription_stripe_id: session.subscription as string || null,
            approved: true,
            pro_access_expires_at: expiresAt,
          })
          .eq("user_id", userId);
        log("Pro annual fulfilled", { userId, expiresAt });
      }
      break;
    }

    case "premium_single":
    case undefined: {
      if (userId) {
        const pendingAssessmentId = session.metadata?.pending_assessment_id;

        if (pendingAssessmentId) {
          const { data: pendingAssessment } = await supabase
            .from("assessments")
            .select("id, pending_upgrade_data")
            .eq("id", pendingAssessmentId)
            .eq("user_id", userId)
            .eq("payment_status", "awaiting_payment")
            .single();

          if (pendingAssessment) {
            await supabase
              .from("assessments")
              .update({
                payment_status: "paid",
                paid_at: new Date().toISOString(),
                pending_upgrade_data: null,
              })
              .eq("id", pendingAssessmentId);
            log("Pending assessment promoted to paid", { pendingAssessmentId, userId });
            break;
          }
        }

        const { data: awaitingAssessment } = await supabase
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "premium")
          .eq("payment_status", "awaiting_payment")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (awaitingAssessment) {
          await supabase
            .from("assessments")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              pending_upgrade_data: null,
            })
            .eq("id", awaitingAssessment.id);
          log("Awaiting assessment promoted to paid", { assessmentId: awaitingAssessment.id, userId });
          break;
        }

        const { data: existingAssessment } = await supabase
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "premium")
          .eq("payment_status", "paid")
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!existingAssessment) {
          await supabase.from("assessments").insert({
            user_id: userId,
            type: "premium",
            status: "in_progress",
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          });
          log("Premium assessment created", { userId });
        } else {
          log("Premium assessment already exists", { userId });
        }
      }
      break;
    }

    case "clinic_subscription": {
      if (userId) {
        const r = await provisionClinic(supabase, {
          userId,
          clinicId: session.metadata?.clinic_id || null,
          clinicName: session.metadata?.clinic_name,
          maxMembers: resolveMaxMembers(session.metadata?.max_members),
          subscriptionId: (session.subscription as string) || null,
        });
        log(r.created ? "Clinic created with owner" : "Clinic subscription updated", { clinicId: r.clinicId, userId });
      }
      break;
    }

    case "ai_credits": {
      if (!userId) {
        log("ai_credits: missing user_id", { sessionId: session.id });
        break;
      }
      const packageKey = session.metadata?.package_key || "";
      if (session.payment_status !== "paid" || session.currency !== "brl") throw new Error("Invalid paid credit package");
      const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
      const pkg = paidCreditPackage(packageKey, lines.data[0]?.price?.id, session.amount_total);
      if (!pkg || lines.data.length !== 1 || lines.data[0]?.quantity !== 1) throw new Error("Credit package line item mismatch");
      const credits = pkg.credits;
      const priceBrl = pkg.price_brl;

      const { data: fulfilled, error: fulfillError } = await supabase.rpc("fulfill_ai_credit_package", {
        _user_id: userId, _clinic_id: session.metadata?.clinic_id || null,
        _session: session.id, _payment: (session.payment_intent as string) || null,
        _key: packageKey, _credits: credits, _price: priceBrl,
      });
      if (fulfillError) throw new Error(`Credit fulfillment failed: ${fulfillError.message}`);
      if (!fulfilled) break;

      log("ai_credits fulfilled", { userId, credits, packageKey });

      await sendPushToUser(userId, {
        title: "✨ Créditos de IA adicionados!",
        body: `+${credits} créditos disponíveis para usar nas funções de IA.`,
        url: "/dashboard?tab=insights",
      });
      break;
    }

    case "chat_addon": {
      // A5: assinatura do Chat do Agente. Ativa o addon; o handler de lifecycle
      // (handleSubscriptionLifecycle) cuida de cancelamentos/renovações.
      if (!userId) {
        log("chat_addon: missing user_id", { sessionId: session.id });
        break;
      }
      const subId = (session.subscription as string) || null;
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from("profiles")
        .update({
          chat_addon_status: "active",
          chat_addon_period_start: periodStart.toISOString(),
          chat_addon_period_end: periodEnd.toISOString(),
          chat_addon_msgs_used: 0,
          chat_addon_quota: 150,
          chat_addon_stripe_subscription_id: subId,
        })
        .eq("user_id", userId);

      await supabase.from("ai_credit_transactions").insert({
        user_id: userId,
        transaction_type: "subscription",
        product_key: "chat_addon_monthly",
        amount_brl: 14.9,
        credits_delta: 0,
        transcriptions_delta: 0,
        stripe_session_id: session.id,
        notes: "Assinatura Chat do Agente (150 msgs/mês) ativada",
      });

      log("chat_addon activated", { userId, subId });
      await sendPushToUser(userId, {
        title: "💬 Chat do Agente ativado!",
        body: "Você tem 150 mensagens/mês inclusas. Bom uso!",
        url: "/dashboard?tab=insights",
      });
      break;
    }

    case "physiotech_addon": {
      const meta = (session.metadata || {}) as Record<string, string>;
      if (!userId) { log("physiotech_addon: missing user_id"); break; }
      const end = new Date();
      if (meta.billing === "annual") end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
      await supabase.from("physiotech_addons").upsert({
        user_id: userId, tier: meta.tier === "pro" ? "pro" : "essencial",
        billing: meta.billing === "annual" ? "annual" : "monthly", status: "active",
        stripe_subscription_id: (session.subscription as string) || null,
        current_period_end: end.toISOString(), updated_at: new Date().toISOString(),
      });
      log("physiotech_addon activated", { userId, tier: meta.tier });
      break;
    }

    default:
      log("Unknown payment type, skipping fulfillment", { paymentType });
  }
}

/**
 * Reage a customer.subscription.deleted/updated:
 * - PRO pessoal: aplica janela de carência de 7 dias antes de derrubar acesso.
 * - Clinic subscription: marca como inactive (sem grace, dono recontrata).
 * Mantém o DB em sincronia com o Stripe sem depender do usuário abrir o app.
 */
async function handleSubscriptionLifecycle(sub: Stripe.Subscription, eventType: string) {
  const proProductIds = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];
  const chatAddonProductId = "prod_UnNT6mwJcRis9B";
  const isProSub = sub.items.data.some((i: any) => proProductIds.includes(i.price?.product as string));
  const isChatAddonSub = sub.items.data.some((i: any) => i.price?.product === chatAddonProductId);
  const isActive = sub.status === "active" || sub.status === "trialing";

  log("subscription lifecycle", { eventType, subId: sub.id, status: sub.status, isProSub, isChatAddonSub });

  // PhysioTech add-on lifecycle (identified by subscription metadata)
  if ((sub.metadata as any)?.type === "physiotech_addon") {
    const uid = (sub.metadata as any)?.user_id;
    if (uid) {
      await supabase.from("physiotech_addons").update({
        status: isActive ? "active" : "inactive",
        current_period_end: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null,
        stripe_subscription_id: isActive ? sub.id : null, updated_at: new Date().toISOString(),
      }).eq("user_id", uid);
      log("physiotech_addon lifecycle", { uid, isActive });
    }
    return;
  }

  // A5: Chat addon lifecycle
  if (isChatAddonSub) {
    const userIdFromMeta = (sub.metadata as any)?.user_id || null;
    let targetUserId = userIdFromMeta;
    if (!targetUserId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("chat_addon_stripe_subscription_id", sub.id)
        .maybeSingle();
      targetUserId = prof?.user_id || null;
    }
    if (targetUserId) {
      if (isActive) {
        const periodEnd = new Date(((sub as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);
        await supabase
          .from("profiles")
          .update({
            chat_addon_status: "active",
            chat_addon_period_end: periodEnd.toISOString(),
            chat_addon_stripe_subscription_id: sub.id,
          })
          .eq("user_id", targetUserId);
        log("chat_addon renewed", { userId: targetUserId });
      } else {
        await supabase
          .from("profiles")
          .update({
            chat_addon_status: "inactive",
            chat_addon_stripe_subscription_id: null,
          })
          .eq("user_id", targetUserId);
        log("chat_addon deactivated", { userId: targetUserId });
      }
    } else {
      log("chat_addon: no user matched", { subId: sub.id });
    }
    return;
  }


  if (isProSub) {
    // Encontra o profissional pelo subscription_stripe_id OU pelo customer email
    let proRow: any = null;
    const { data: byId } = await supabase
      .from("professionals")
      .select("id, user_id, subscription_status, subscription_grace_until")
      .eq("subscription_stripe_id", sub.id)
      .maybeSingle();
    proRow = byId;

    if (!proRow && sub.customer) {
      try {
        const customer = await stripe.customers.retrieve(sub.customer as string);
        const email = (customer as any)?.email;
        if (email) {
          const { data: authUser } = await supabase.auth.admin.listUsers();
          const match = authUser?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) {
            const { data: byEmail } = await supabase
              .from("professionals")
              .select("id, user_id, subscription_status, subscription_grace_until")
              .eq("user_id", match.id)
              .maybeSingle();
            proRow = byEmail;
          }
        }
      } catch (e) {
        log("Customer lookup failed", { error: String(e) });
      }
    }

    if (!proRow) {
      log("No professional row matched for PRO subscription event", { subId: sub.id });
      return;
    }

    if (isActive && eventType === "customer.subscription.updated") {
      // renovação / reativação
      await supabase
        .from("professionals")
        .update({
          subscription_status: "active",
          subscription_stripe_id: sub.id,
          approved: true,
          subscription_grace_until: null,
        })
        .eq("id", proRow.id);
      log("PRO subscription reactivated", { proId: proRow.id });
      return;
    }

    // Cancelada / expirada / inadimplente — aplicar carência se ainda não houver
    const wasActive = proRow.subscription_status === "active";
    const existingGrace = proRow.subscription_grace_until ? new Date(proRow.subscription_grace_until) : null;
    const stillInGrace = existingGrace && existingGrace > new Date();

    const updates: Record<string, any> = {
      subscription_status: "inactive",
      subscription_stripe_id: null,
    };
    if (wasActive && !stillInGrace) {
      updates.subscription_grace_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    await supabase.from("professionals").update(updates).eq("id", proRow.id);
    log("PRO subscription deactivated", { proId: proRow.id, graceApplied: !!updates.subscription_grace_until });

    if (proRow.user_id && eventType === "customer.subscription.deleted") {
      await sendPushToUser(proRow.user_id, {
        title: "⚠️ Assinatura PRO cancelada",
        body: "Você tem 7 dias de tolerância antes de perder acesso. Renove para continuar.",
        url: "/account",
      });
    }
    return;
  }

  // Clinic subscription
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, owner_user_id, subscription_status")
    .eq("subscription_stripe_id", sub.id)
    .maybeSingle();

  if (clinic) {
    if (isActive) {
      await supabase
        .from("clinics")
        .update({ subscription_status: "active" })
        .eq("id", clinic.id);
      log("Clinic subscription reactivated", { clinicId: clinic.id });
    } else {
      await supabase
        .from("clinics")
        .update({ subscription_status: "inactive", subscription_stripe_id: null })
        .eq("id", clinic.id);
      log("Clinic subscription deactivated", { clinicId: clinic.id });
      if (clinic.owner_user_id && eventType === "customer.subscription.deleted") {
        await sendPushToUser(clinic.owner_user_id, {
          title: "⚠️ Assinatura da clínica cancelada",
          body: "O acesso da equipe foi suspenso. Renove para reativar.",
          url: "/dashboard?tab=clinic",
        });
      }
    }
  }
}
