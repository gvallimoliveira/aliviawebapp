import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

/**
 * checkout.session.completed fires for all completed checkouts.
 * For card payments, payment_status = "paid" immediately.
 * For boleto/pix async, payment_status = "unpaid" (awaiting payment).
 * For subscriptions, payment_status = "paid" on successful first charge.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;

  log("checkout.session.completed", {
    paymentType,
    userId,
    paymentStatus: session.payment_status,
    mode: session.mode,
  });

  // If payment is already paid (card), fulfill immediately
  if (session.payment_status === "paid") {
    await fulfillOrder(session);
  } else {
    // Async payment (boleto) — mark as pending
    log("Async payment pending", { paymentType, userId });
    // Optionally store a pending record for tracking
  }
}

/**
 * Fires when an async payment (boleto) succeeds.
 * This is the confirmation that the boleto was actually paid.
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  log("async_payment_succeeded", {
    type: session.metadata?.type,
    userId: session.metadata?.user_id,
  });
  await fulfillOrder(session);
}

/**
 * Fires when an async payment (boleto) fails or expires.
 */
async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;

  log("async_payment_failed", { paymentType, userId });

  // Could notify user, mark assessment as payment_failed, etc.
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
}

/**
 * Fulfill the order based on the payment type stored in session metadata.
 */
async function fulfillOrder(session: Stripe.Checkout.Session) {
  const paymentType = session.metadata?.type;
  const userId = session.metadata?.user_id;

  log("Fulfilling order", { paymentType, userId });

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
      }
      break;
    }

    case "pro_annual": {
      if (userId) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        await supabase
          .from("professionals")
          .update({
            subscription_status: "active",
            approved: true,
            pro_access_expires_at: expiresAt.toISOString(),
          })
          .eq("user_id", userId);
        log("Pro annual fulfilled", { userId, expiresAt: expiresAt.toISOString() });
      }
      break;
    }

    case "premium_single":
    case undefined: {
      // Premium single or monthly subscription checkout
      if (userId) {
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

    default:
      log("Unknown payment type, skipping fulfillment", { paymentType });
  }
}
