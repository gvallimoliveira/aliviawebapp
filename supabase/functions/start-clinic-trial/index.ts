import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MEMBERS: Record<string, number> = {
  small: 3,
  medium: 8,
  large: 999,
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[START-CLINIC-TRIAL] ${step}${d}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const body = await req.json();
    const { tier } = body;

    if (!tier || !["small", "medium", "large"].includes(tier)) {
      throw new Error("Invalid tier. Must be small, medium, or large");
    }

    // Check if user already has a clinic
    const { data: existingClinic } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_user_id", user.id)
      .limit(1)
      .single();

    if (existingClinic) {
      logStep("User already has a clinic", { clinicId: existingClinic.id });
      return new Response(JSON.stringify({ success: true, clinic_id: existingClinic.id, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const maxMembers = MAX_MEMBERS[tier] || 3;

    // Create clinic with trial status
    const { data: newClinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({
        name: "Minha Clínica",
        owner_user_id: user.id,
        subscription_status: "trialing",
        max_members: maxMembers,
      })
      .select("id")
      .single();

    if (clinicError) throw new Error(`Failed to create clinic: ${clinicError.message}`);

    // Add owner as member
    const { error: memberError } = await supabaseAdmin
      .from("clinic_members")
      .insert({
        clinic_id: newClinic.id,
        user_id: user.id,
        role: "owner",
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
        status: "active",
      });

    if (memberError) throw new Error(`Failed to add owner: ${memberError.message}`);

    logStep("Clinic created with trial", { clinicId: newClinic.id, tier, maxMembers });

    return new Response(JSON.stringify({ success: true, clinic_id: newClinic.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
