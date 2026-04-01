import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("User not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    let referralCode: string | null = null;
    let paymentType: "monthly" | "single" = "monthly";
    let exitIntentDiscount = false;
    try {
      const body = await req.json();
      referralCode = body?.referral_code || null;
      if (body?.payment_type === "single") paymentType = "single";
      if (body?.exit_intent_discount === true) exitIntentDiscount = true;
    } catch {
      // No body or invalid JSON
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Handle referral code logic
    let referralCodeRecord: any = null;

    if (referralCode) {
      const { data: codeData } = await supabaseAdmin
        .from("referral_codes")
        .select("id, user_id, code")
        .eq("code", referralCode)
        .single();

      if (codeData && codeData.user_id !== user.id) {
        referralCodeRecord = codeData;

        const { data: existingReward } = await supabaseAdmin
          .from("referral_rewards")
          .select("id")
          .eq("referred_user_id", user.id)
          .limit(1)
          .single();

        if (!existingReward) {
          await supabaseAdmin.from("referral_rewards").insert({
            referrer_user_id: codeData.user_id,
            referred_user_id: user.id,
            referral_code_id: codeData.id,
            status: "pending",
            discount_percent: 20,
          });

          const coupon = await stripe.coupons.create({
            percent_off: 20,
            duration: "once",
            name: `Referral discount for ${codeData.code}`,
          });

          await supabaseAdmin
            .from("referral_rewards")
            .update({
              status: "rewarded",
              stripe_coupon_id: coupon.id,
              rewarded_at: new Date().toISOString(),
            })
            .eq("referrer_user_id", codeData.user_id)
            .eq("referred_user_id", user.id)
            .eq("status", "pending");

          // --- NEW: Apply coupon to referrer's active subscription if they are a subscriber ---
          try {
            await applyReferralToSubscriber(stripe, supabaseAdmin, codeData.user_id, coupon.id);
          } catch (e) {
            console.error("[create-payment] Error applying coupon to subscriber:", e);
          }

          // --- NEW: Send push notification to referrer ---
          try {
            await sendReferralPushNotification(supabaseAdmin, codeData.user_id, origin);
          } catch (e) {
            console.error("[create-payment] Error sending push notification:", e);
          }
        }
      }
    }

    // Check if user has an available discount
    let discountCoupon: string | undefined;
    const { data: availableReward } = await supabaseAdmin
      .from("referral_rewards")
      .select("id, stripe_coupon_id")
      .eq("referrer_user_id", user.id)
      .eq("status", "rewarded")
      .not("stripe_coupon_id", "is", null)
      .limit(1)
      .single();

    if (availableReward?.stripe_coupon_id) {
      discountCoupon = availableReward.stripe_coupon_id;
      await supabaseAdmin
        .from("referral_rewards")
        .update({ status: "used" })
        .eq("id", availableReward.id);
    }

    // Choose price and mode based on payment type
    const priceId = paymentType === "single"
      ? "price_1TBkbt2HgVhVBE8Uu2a9zsjb"  // Pay-per-use R$109
      : "price_1TBkbt2HgVhVBE8UWGL7zPGZ";  // Monthly R$79,90/mês

    const sessionMode = paymentType === "single" ? "payment" : "subscription";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      currency: "brl",
      payment_method_types: sessionMode === "subscription" ? ["card"] : ["card", "boleto"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: sessionMode,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/assessment/premium`,
      metadata: {
        user_id: user.id,
        payment_type: paymentType,
      },
    };

    // Exit intent 10% discount for single payment (takes priority over referral if both present)
    if (exitIntentDiscount && paymentType === "single") {
      const exitCoupon = await stripe.coupons.create({
        percent_off: 10,
        duration: "once",
        max_redemptions: 1,
        name: `Exit Intent 10% - ${Date.now()}`,
      });
      sessionParams.discounts = [{ coupon: exitCoupon.id }];
      console.log(`[create-payment] Created exit intent coupon: ${exitCoupon.id}`);
    } else if (discountCoupon) {
      sessionParams.discounts = [{ coupon: discountCoupon }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * If the referrer has an active Stripe subscription, apply the coupon directly
 * so they get the discount on their next billing cycle automatically.
 */
async function applyReferralToSubscriber(
  stripe: any,
  supabaseAdmin: any,
  referrerUserId: string,
  couponId: string
) {
  // Get referrer email from auth
  const { data: referrerAuth } = await supabaseAdmin.auth.admin.getUserById(referrerUserId);
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
    console.log(`[create-payment] Applying coupon ${couponId} to subscription ${subscription.id}`);
    await stripe.subscriptions.update(subscription.id, {
      coupon: couponId,
    });

    // Mark reward as used since it was applied directly
    await supabaseAdmin
      .from("referral_rewards")
      .update({ status: "used" })
      .eq("referrer_user_id", referrerUserId)
      .eq("stripe_coupon_id", couponId);
  }
}

/**
 * Send a push notification to the referrer informing them about the discount.
 */
async function sendReferralPushNotification(
  supabaseAdmin: any,
  referrerUserId: string,
  origin: string
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      user_id: referrerUserId,
      title: "🎉 Você ganhou desconto!",
      body: "Um amigo usou seu link! Você ganhou 20% de desconto na próxima cobrança.",
      url: "/dashboard",
    }),
  });

  const result = await response.text();
  console.log(`[create-payment] Push notification result:`, result);
}
