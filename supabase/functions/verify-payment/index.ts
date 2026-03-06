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

    // Mode 1: Verify a specific checkout session and create the PAID assessment record
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ paid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this is a pro_treatment payment — verify and mark for frontend treatment generation
      const paymentType = session.metadata?.type;
      if (paymentType === "pro_treatment") {
        const assessmentId = session.metadata?.assessment_id;
        if (assessmentId) {
          // Mark assessment as treatment_paid so frontend can generate
          await supabaseClient
            .from("assessments")
            .update({ payment_status: "treatment_paid" })
            .eq("id", assessmentId);
        }
        return new Response(JSON.stringify({ paid: true, type: "pro_treatment", assessment_id: assessmentId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this session was already processed (idempotency)
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

      // Only create the paid anchor assessment if one doesn't exist from this payment
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

    // Mode 2: Check if user has valid premium access
    if (check_access) {
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

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find the latest PAID premium assessment within 7 days (the payment anchor)
      const { data: paidAssessment } = await supabaseClient
        .from("assessments")
        .select("id, paid_at")
        .eq("user_id", user.id)
        .eq("type", "premium")
        .eq("payment_status", "paid")
        .gte("paid_at", sevenDaysAgo.toISOString())
        .order("paid_at", { ascending: false })
        .limit(1)
        .single();

      if (!paidAssessment) {
        return new Response(JSON.stringify({
          has_access: false,
          can_redo: false,
          assessments_used: 0,
          available_discount: availableDiscount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count ALL premium assessments by this user created since the payment anchor
      const { count } = await supabaseClient
        .from("assessments")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("type", "premium")
        .gte("created_at", paidAssessment.paid_at);

      const { count: startedCount } = await supabaseClient
        .from("assessments")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("type", "premium")
        .gte("created_at", paidAssessment.paid_at)
        .not("anamnesis_data", "eq", "{}");

      const assessmentsUsed = startedCount ?? 0;
      const hasAccess = assessmentsUsed < 2;

      return new Response(JSON.stringify({
        has_access: hasAccess,
        can_redo: hasAccess && assessmentsUsed === 1,
        assessments_used: assessmentsUsed,
        max_assessments: 2,
        payment_id: paidAssessment.id,
        paid_at: paidAssessment.paid_at,
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
