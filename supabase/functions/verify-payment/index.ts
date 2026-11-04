import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { session_id, check_access } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Mode 1: Verify a specific checkout session
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status !== "paid") {
        // Check if this is a pending async payment (boleto)
        const isPending = session.payment_status === "unpaid" && session.status === "complete";
        return new Response(JSON.stringify({ 
          paid: false, 
          pending: isPending,
          payment_method: isPending ? "boleto" : null,
          type: session.metadata?.type || null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentType = session.metadata?.type;

      // Handle paid monthly PRO subscription verification
      if (paymentType === "pro_subscription") {
        const userId = session.metadata?.user_id;
        if (userId) {
          await supabaseClient
            .from("professionals")
            .update({
              subscription_status: "active",
              subscription_stripe_id: session.subscription as string || null,
              approved: true,
            })
            .eq("user_id", userId);
        }
        return new Response(JSON.stringify({ paid: true, type: "pro_subscription" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle pro_treatment payment
      if (paymentType === "pro_treatment") {
        const assessmentId = session.metadata?.assessment_id;
        if (assessmentId) {
          await supabaseClient
            .from("assessments")
            .update({ payment_status: "treatment_paid" })
            .eq("id", assessmentId);
        }
        return new Response(JSON.stringify({ paid: true, type: "pro_treatment", assessment_id: assessmentId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle pro_lifetime_treatment payment
      if (paymentType === "pro_lifetime_treatment") {
        const professionalId = session.metadata?.professional_id;
        const metaUserId = session.metadata?.user_id;
        if (professionalId) {
          await supabaseClient
            .from("professionals")
            .update({ lifetime_treatment: true })
            .eq("id", professionalId);
        } else if (metaUserId) {
          // Fallback: find professional by user_id
          await supabaseClient
            .from("professionals")
            .update({ lifetime_treatment: true })
            .eq("user_id", metaUserId);
        }
        return new Response(JSON.stringify({ paid: true, type: "pro_lifetime_treatment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle pro_annual payment (one-time annual plan)
      if (paymentType === "pro_annual") {
        const userId = session.metadata?.user_id;
        if (userId) {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          await supabaseClient
            .from("professionals")
            .update({
              subscription_status: "active",
              subscription_stripe_id: session.subscription as string || null,
              approved: true,
              pro_access_expires_at: expiresAt.toISOString(),
            })
            .eq("user_id", userId);
        }
        return new Response(JSON.stringify({ paid: true, type: "pro_annual" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle premium subscription verification.
      // Only premium checkout sessions created for this caller may unlock premium.
      const premiumType = session.metadata?.payment_type;
      const isPremiumSession =
        !paymentType &&
        (premiumType === "monthly" || premiumType === "single") &&
        session.metadata?.user_id === user.id;
      if (!isPremiumSession) {
        return new Response(JSON.stringify({ paid: false, error: "session_not_premium" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // First check if there's already an awaiting_payment assessment to promote
      const pendingAssessmentId = session.metadata?.pending_assessment_id;
      
      if (pendingAssessmentId) {
        const { data: pendingAssessment } = await supabaseClient
          .from("assessments")
          .select("id")
          .eq("id", pendingAssessmentId)
          .eq("user_id", user.id)
          .eq("payment_status", "awaiting_payment")
          .maybeSingle();

        if (pendingAssessment) {
          await supabaseClient
            .from("assessments")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              pending_upgrade_data: null,
            })
            .eq("id", pendingAssessment.id);
          
          return new Response(JSON.stringify({ paid: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Fallback: check for any awaiting_payment assessment for this user
      const { data: awaitingAssessment } = await supabaseClient
        .from("assessments")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "premium")
        .eq("payment_status", "awaiting_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (awaitingAssessment) {
        await supabaseClient
          .from("assessments")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            pending_upgrade_data: null,
          })
          .eq("id", awaitingAssessment.id);

        return new Response(JSON.stringify({ paid: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // No pending — check for existing paid in_progress
      const { data: existingAssessment } = await supabaseClient
        .from("assessments")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "premium")
        .eq("payment_status", "paid")
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!existingAssessment) {
        await supabaseClient
          .from("assessments")
          .insert({
            user_id: user.id,
            type: "premium",
            status: "in_progress",
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          });
      }

      return new Response(JSON.stringify({ paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Check if user has valid premium access (subscription-based)
    if (check_access) {
      const normalizedEmail = (user.email || "").toLowerCase().trim();

      // Check VIP status
      const { data: vipUser } = await supabaseClient
        .from("vip_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (vipUser) {
        return new Response(JSON.stringify({
          has_access: true,
          can_redo: true,
          assessments_used: 0,
          max_assessments: 999,
          is_vip: true,
          subscription_type: "monthly",
          available_discount: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check Premium granted by admin (B2C, by email — for non-professionals)
      if (normalizedEmail) {
        const { data: grantedByEmail } = await supabaseClient
          .from("granted_premium_users")
          .select("id")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        if (grantedByEmail) {
          return new Response(JSON.stringify({
            has_access: true,
            can_redo: true,
            assessments_used: 0,
            max_assessments: 999,
            is_granted: true,
            subscription_type: "monthly",
            available_discount: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Check Premium granted on the professional profile (partner who also got Premium)
      const { data: proGranted } = await supabaseClient
        .from("professionals")
        .select("id, premium_granted")
        .eq("user_id", user.id)
        .maybeSingle();

      if (proGranted?.premium_granted) {
        return new Response(JSON.stringify({
          has_access: true,
          can_redo: true,
          assessments_used: 0,
          max_assessments: 999,
          is_granted: true,
          subscription_type: "monthly",
          available_discount: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for available referral discount
      const { data: availableReward } = await supabaseClient
        .from("referral_rewards")
        .select("id, discount_percent, stripe_coupon_id")
        .eq("referrer_user_id", user.id)
        .eq("status", "rewarded")
        .not("stripe_coupon_id", "is", null)
        .limit(1)
        .maybeSingle();

      const availableDiscount = availableReward
        ? { discount_percent: availableReward.discount_percent }
        : null;

      // Check active premium subscription via Stripe
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        // No Stripe customer — check for single purchase assessments
        const { data: singleAssessment } = await supabaseClient
          .from("assessments")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "premium")
          .eq("payment_status", "paid")
          .limit(1)
          .maybeSingle();

        if (singleAssessment) {
          return new Response(JSON.stringify({
            has_access: true,
            can_redo: false,
            assessments_used: 0,
            subscription_type: "single",
            available_discount: availableDiscount,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          has_access: false,
          can_redo: false,
          assessments_used: 0,
          subscription_type: null,
          available_discount: availableDiscount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      // Find premium subscription (prod_U6HcKYW069jBRN)
      const premiumSub = subscriptions.data.find((sub: any) =>
        sub.items.data.some((item: any) => item.price.product === "prod_U9PZeaM93PlMwb")
      );

      if (!premiumSub) {
        // No active subscription — check for single purchase assessments
        const { data: singleAssessment } = await supabaseClient
          .from("assessments")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "premium")
          .eq("payment_status", "paid")
          .limit(1)
          .maybeSingle();

        if (singleAssessment) {
          return new Response(JSON.stringify({
            has_access: true,
            can_redo: false,
            assessments_used: 0,
            subscription_type: "single",
            available_discount: availableDiscount,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          has_access: false,
          can_redo: false,
          assessments_used: 0,
          subscription_type: null,
          available_discount: availableDiscount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Premium subscriber — count assessments in the current billing period
      const periodStart = new Date(premiumSub.current_period_start * 1000).toISOString();

      const { count: startedCount } = await supabaseClient
        .from("assessments")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("type", "premium")
        .gte("created_at", periodStart)
        .not("anamnesis_data", "eq", "{}");

      const assessmentsUsed = startedCount ?? 0;
      const hasAccess = assessmentsUsed < 2;

      return new Response(JSON.stringify({
        has_access: hasAccess,
        can_redo: hasAccess && assessmentsUsed === 1,
        assessments_used: assessmentsUsed,
        max_assessments: 2,
        subscription_type: "monthly",
        subscription_end: new Date(premiumSub.current_period_end * 1000).toISOString(),
        available_discount: availableDiscount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid request: provide session_id or check_access");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
