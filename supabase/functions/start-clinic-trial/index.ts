import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthUserId } from "../_shared/caller-auth.ts";
import { normalizeAndValidateCnpj } from "../_shared/cnpj.ts";

const TrialSchema = z.object({
  tier: z.enum(["small", "medium", "large"]),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(1).max(40),
  cnpj: z.string().max(30),
});

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

    const parsed = TrialSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return new Response(JSON.stringify({ error: "invalid_input", message: "Confira o e-mail, WhatsApp, plano e CNPJ informados." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { tier, email, phone, cnpj } = parsed.data;
    const normalizedCnpj = normalizeAndValidateCnpj(cnpj);
    if (!normalizedCnpj) return new Response(JSON.stringify({ error: "invalid_cnpj", message: "CNPJ inválido. Digite um CNPJ válido (MEI também é aceito)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();
    const callerId = await getAuthUserId(req);
    let userId: string;
    if (callerId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(callerId);
      if (error || data.user?.email?.toLowerCase().trim() !== normalizedEmail) return new Response(JSON.stringify({ error: "account_mismatch", message: "Entre com a conta do e-mail informado para ativar o teste." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      userId = callerId;
    } else {
      // Discover the next step only: never create an account or clinic before authentication.
      let exists = false;
      for (let page = 1; ; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        if (data.users.some(u => u.email?.toLowerCase().trim() === normalizedEmail)) { exists = true; break; }
        if (data.users.length < 1000) break;
      }
      return new Response(JSON.stringify({ success: true, requires_login: exists, requires_signup: !exists }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already has a clinic
    const { data: existingClinic, error: existingClinicError } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingClinicError) throw existingClinicError;
    if (existingClinic) {
      // Retry an incomplete creation without rewriting an existing membership.
      const { error: repairError } = await supabaseAdmin.from("clinic_members").upsert({ clinic_id: existingClinic.id, user_id: userId, role: "owner", invited_by: userId, accepted_at: new Date().toISOString(), status: "active" }, { onConflict: "clinic_id,user_id", ignoreDuplicates: true });
      if (repairError) throw repairError;
      logStep("User already has a clinic", { clinicId: existingClinic.id });
      return new Response(JSON.stringify({ success: true, clinic_id: existingClinic.id, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const maxMembers = MAX_MEMBERS[tier] || 3;

    // A5: bloqueio de CNPJ duplicado (1 trial por CNPJ).
    const { data: existingByCnpj, error: cnpjError } = await supabaseAdmin
      .from("clinics")
      .select("id, owner_user_id")
      .eq("cnpj", normalizedCnpj)
      .limit(1)
      .maybeSingle();

    if (cnpjError) throw cnpjError;
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
        trial_started_at: new Date().toISOString(),
        max_members: maxMembers,
        phone: normalizedPhone,
        cnpj: normalizedCnpj,
        trial_credits_cap: 20, // A5: cota de IA durante o trial
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

    logStep("Clinic created with trial", { clinicId: newClinic.id, tier, maxMembers });

    return new Response(JSON.stringify({ success: true, clinic_id: newClinic.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "trial_activation_failed", message: "Não foi possível ativar o teste. Tente novamente em instantes." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
