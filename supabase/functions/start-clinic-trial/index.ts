import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { normalizeAndValidateCnpj } from "../_shared/cnpj.ts";

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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { tier, email, phone, cnpj } = body;

    if (!tier || !["small", "medium", "large"].includes(tier)) {
      throw new Error("Invalid tier. Must be small, medium, or large");
    }
    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }

    // A5: CNPJ obrigatório no trial (anti-abuso). MEI/EI também passam.
    const normalizedCnpj = normalizeAndValidateCnpj(cnpj);
    if (!normalizedCnpj) {
      return new Response(
        JSON.stringify({ error: "invalid_cnpj", message: "CNPJ inválido ou ausente. O trial de clínica exige um CNPJ válido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone?.trim() || null;

    logStep("Trial request", { tier });

    // Check if user already exists in auth
    let userId: string;
    let isNewUser = false;

    // Try to find existing user by email
    let existingUser = null;
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data?.users?.find((u: any) => u.email?.toLowerCase().trim() === normalizedEmail);
      if (found) { existingUser = found; break; }
      if (!data?.users?.length || data.users.length < 200) break;
    }

    if (existingUser) {
      // An existing account can only receive a clinic when its owner is signed in.
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      let callerId: string | null = null;
      if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
        const { data: callerData } = await supabaseAdmin.auth.getUser(token);
        callerId = callerData?.user?.id ?? null;
      }
      if (callerId !== existingUser.id) {
        logStep("Existing account requires sign-in");
        return new Response(
          JSON.stringify({ success: true, already_exists: true, requires_login: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else {
      // Create new user with a random password (user will set via reset password)
      const tempPassword = crypto.randomUUID();
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: normalizedEmail.split("@")[0].replace(/[._-]/g, " ") },
      });

      if (createError) throw new Error(`Failed to create user: ${createError.message}`);
      userId = newUserData.user.id;
      isNewUser = true;
      logStep("New user created", { userId });
    }

    // Update profile phone if provided
    if (normalizedPhone) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        // Profile exists — we don't have a phone column on profiles yet,
        // so store in user metadata
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { phone: normalizedPhone },
        });
      }
    }

    // Check if user already has a clinic
    const { data: existingClinic } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingClinic) {
      logStep("User already has a clinic", { clinicId: existingClinic.id });
      return new Response(JSON.stringify({ success: true, clinic_id: existingClinic.id, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const maxMembers = MAX_MEMBERS[tier] || 3;

    // A5: bloqueio de CNPJ duplicado (1 trial por CNPJ).
    const { data: existingByCnpj } = await supabaseAdmin
      .from("clinics")
      .select("id, owner_user_id")
      .eq("cnpj", normalizedCnpj)
      .limit(1)
      .maybeSingle();

    if (existingByCnpj && existingByCnpj.owner_user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "cnpj_already_used", message: "Já existe um trial de clínica registrado para este CNPJ." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create clinic with trial status
    const { data: newClinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({
        name: "Minha Clínica",
        owner_user_id: userId,
        subscription_status: "trialing",
        max_members: maxMembers,
        phone: normalizedPhone,
        cnpj: normalizedCnpj,
        trial_credits_cap: 75, // A5: cota de IA durante o trial
      })
      .select("id")
      .single();

    if (clinicError) throw new Error(`Failed to create clinic: ${clinicError.message}`);

    // Add owner as member
    const { error: memberError } = await supabaseAdmin
      .from("clinic_members")
      .insert({
        clinic_id: newClinic.id,
        user_id: userId,
        role: "owner",
        invited_by: userId,
        accepted_at: new Date().toISOString(),
        status: "active",
      });

    if (memberError) throw new Error(`Failed to add owner: ${memberError.message}`);

    // Send password reset email so user can set their password and log in
    if (isNewUser) {
      const origin = req.headers.get("origin") || "https://alivia.app";
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: { redirectTo: `${origin}/reset-password` },
      });
      logStep("Password reset link generated for new user");
    }

    logStep("Clinic created with trial", { clinicId: newClinic.id, tier, maxMembers, isNewUser });

    return new Response(JSON.stringify({ success: true, clinic_id: newClinic.id, is_new_user: isNewUser }), {
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
