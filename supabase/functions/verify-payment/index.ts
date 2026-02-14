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

    // Mode 1: Verify a specific checkout session and mark assessment as paid
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ paid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update latest in_progress premium assessment for this user as paid
      const { data: assessment } = await supabaseClient
        .from("assessments")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "premium")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (assessment) {
        await supabaseClient
          .from("assessments")
          .update({ payment_status: "paid", paid_at: new Date().toISOString() })
          .eq("id", assessment.id);
      }

      return new Response(JSON.stringify({ paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Check if user has a valid premium access (paid within last 7 days)
    if (check_access) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: validAssessments } = await supabaseClient
        .from("assessments")
        .select("id, paid_at, redo_used, created_at")
        .eq("user_id", user.id)
        .eq("type", "premium")
        .eq("payment_status", "paid")
        .gte("paid_at", sevenDaysAgo.toISOString())
        .order("paid_at", { ascending: false })
        .limit(1);

      if (validAssessments && validAssessments.length > 0) {
        const assessment = validAssessments[0];
        return new Response(JSON.stringify({
          has_access: true,
          can_redo: !assessment.redo_used,
          assessment_id: assessment.id,
          paid_at: assessment.paid_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ has_access: false, can_redo: false }), {
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
