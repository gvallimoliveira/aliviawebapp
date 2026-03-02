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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Parse body for optional referral_code
    let referralCode: string | null = null;
    try {
      const body = await req.json();
      referralCode = body?.referral_code || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Handle referral code logic
    let referralCodeRecord: any = null;
    let stripeCouponId: string | undefined;

    if (referralCode) {
      // Validate referral code
      const { data: codeData } = await supabaseAdmin
        .from("referral_codes")
        .select("id, user_id, code")
        .eq("code", referralCode)
        .single();

      if (codeData) {
        // Prevent self-referral
        if (codeData.user_id !== user.id) {
          referralCodeRecord = codeData;

          // Check if this user was already referred
          const { data: existingReward } = await supabaseAdmin
            .from("referral_rewards")
            .select("id")
            .eq("referred_user_id", user.id)
            .limit(1)
            .single();

          if (!existingReward) {
            // Create referral reward record as pending
            await supabaseAdmin.from("referral_rewards").insert({
              referrer_user_id: codeData.user_id,
              referred_user_id: user.id,
              referral_code_id: codeData.id,
              status: "pending",
              discount_percent: 20,
            });

            // Create a Stripe coupon for the referrer (20% off, once)
            const coupon = await stripe.coupons.create({
              percent_off: 20,
              duration: "once",
              name: `Referral discount for ${codeData.code}`,
            });

            // Update the reward with the coupon ID and mark as rewarded
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
          }
        }
      }
    }

    // Check if user has an available discount (they are the referrer with a rewarded coupon)
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
      // Mark as used
      await supabaseAdmin
        .from("referral_rewards")
        .update({ status: "used" })
        .eq("id", availableReward.id);
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: "price_1T3PFdCBxbFcCp8IRSDxZce5",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/assessment/premium`,
      metadata: {
        user_id: user.id,
      },
    };

    // Apply discount if available
    if (discountCoupon) {
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
