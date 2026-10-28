import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { safeOrigin } from "../_shared/caller-auth.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    let basicUpgradeData: any = null;
    try {
      const body = await req.json();
      referralCode = body?.referral_code || null;
      if (body?.payment_type === "single") paymentType = "single";
      if (body?.exit_intent_discount === true) exitIntentDiscount = true;
      if (body?.basic_upgrade_data) basicUpgradeData = body.basic_upgrade_data;
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

    const origin = safeOrigin(req.headers.get("origin"));

    // Check if user has an available referral discount (as referrer from previous referrals)
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

    // Save basic upgrade data to DB if provided (for boleto persistence)
    let pendingAssessmentId: string | null = null;
    if (basicUpgradeData) {
      const { data: pendingAssessment, error: pendingError } = await supabaseAdmin
        .from("assessments")
        .insert({
          user_id: user.id,
          type: "premium",
          status: "in_progress",
          payment_status: "awaiting_payment",
          pending_upgrade_data: basicUpgradeData,
          anamnesis_data: basicUpgradeData.anamnesisData || {},
          pain_regions: basicUpgradeData.painRegions || [],
          pain_score: basicUpgradeData.painScore ?? null,
          patient_name: basicUpgradeData.capturedName || null,
          patient_email: basicUpgradeData.capturedEmail || null,
        })
        .select("id")
        .single();
      if (!pendingError && pendingAssessment) {
        pendingAssessmentId = pendingAssessment.id;
        console.log(`[create-payment] Created pending assessment: ${pendingAssessmentId}`);
      }
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
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
        ...(pendingAssessmentId ? { pending_assessment_id: pendingAssessmentId } : {}),
        // Pass referral_code in metadata for webhook processing AFTER payment confirmation
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
    };

    // Discount priority: exit_intent (10%) > referral for referred user (10%) > referral for referrer (20%)
    // Only one discount per checkout — non-cumulative
    if (exitIntentDiscount && paymentType === "single") {
      const exitCoupon = await stripe.coupons.create({
        percent_off: 10,
        duration: "once",
        max_redemptions: 1,
        name: `Exit Intent 10% - ${Date.now()}`,
      });
      sessionParams.discounts = [{ coupon: exitCoupon.id }];
      console.log(`[create-payment] Created exit intent coupon: ${exitCoupon.id}`);
    } else if (referralCode && paymentType === "single") {
      // Referred user gets 10% on their first single premium assessment
      const referredCoupon = await stripe.coupons.create({
        percent_off: 10,
        duration: "once",
        max_redemptions: 1,
        name: `Referred User 10% - ${Date.now()}`,
      });
      sessionParams.discounts = [{ coupon: referredCoupon.id }];
      console.log(`[create-payment] Created referred user coupon: ${referredCoupon.id}`);
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
