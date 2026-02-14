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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

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
        return new Response(JSON.stringify({ has_access: false, can_redo: false, assessments_used: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count ALL premium assessments by this user created since the payment anchor
      const { data: assessmentsSincePaid, count } = await supabaseClient
        .from("assessments")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("type", "premium")
        .gte("created_at", paidAssessment.paid_at);

      const totalUsed = count ?? 0;
      // Max 2 assessments per payment (the paid anchor counts as 1 slot used when it has anamnesis data)
      // Actually, the paid anchor is just a payment record. Real assessments are created separately.
      // Let's count assessments that have anamnesis_data (i.e., actually started)
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
