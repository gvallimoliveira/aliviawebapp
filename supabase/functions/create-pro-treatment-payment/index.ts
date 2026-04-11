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
    if (!user?.email) throw new Error("User not authenticated");

    const { assessment_id } = await req.json();
    if (!assessment_id) throw new Error("assessment_id is required");

    // Verify the professional owns this assessment
    const { data: professional } = await supabaseClient
      .from("professionals")
      .select("id, lifetime_treatment")
      .eq("user_id", user.id)
      .single();

    if (!professional) throw new Error("Not a registered professional");

    // Check if assessment belongs to an active clinic — treatment is included in clinic subscription
    const { data: assessmentCheck } = await supabaseClient
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", assessment_id)
      .single();

    if (assessmentCheck?.clinic_id) {
      const { data: clinic } = await supabaseClient
        .from("clinics")
        .select("subscription_status")
        .eq("id", assessmentCheck.clinic_id)
        .single();

      if (clinic && (clinic.subscription_status === "active" || clinic.subscription_status === "trialing")) {
        await supabaseClient
          .from("assessments")
          .update({ payment_status: "treatment_paid" })
          .eq("id", assessment_id);

        return new Response(JSON.stringify({ free: true, assessment_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // If professional has lifetime treatment, skip payment — return free access
    if (professional.lifetime_treatment) {
      // Mark assessment for treatment generation
      await supabaseClient
        .from("assessments")
        .update({ payment_status: "treatment_paid" })
        .eq("id", assessment_id)
        .eq("professional_id", professional.id);

      return new Response(JSON.stringify({ free: true, assessment_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: assessment } = await supabaseClient
      .from("assessments")
      .select("id, professional_id, type, treatment_plan, payment_status")
      .eq("id", assessment_id)
      .eq("professional_id", professional.id)
      .eq("type", "professional")
      .single();

    if (!assessment) throw new Error("Assessment not found or not yours");
    if (assessment.treatment_plan) throw new Error("Treatment plan already unlocked");

    // If already paid (e.g. Stripe completed but treatment generation failed), return free access
    if (assessment.payment_status === "treatment_paid") {
      return new Response(JSON.stringify({ free: true, assessment_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card", "boleto"],
      line_items: [
        {
          price: "price_1TBkbx2HgVhVBE8UKUTkPf6e",  // R$29,90
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=pro_treatment&assessment_id=${assessment_id}`,
      cancel_url: `${origin}/assessment/view/${assessment_id}`,
      metadata: {
        user_id: user.id,
        assessment_id: assessment_id,
        type: "pro_treatment",
      },
    });

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
