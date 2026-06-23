import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACCEPT-CLINIC-INVITE] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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
    const { invite_token } = body;
    if (!invite_token || typeof invite_token !== "string") {
      throw new Error("invite_token is required");
    }

    // Find the invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("clinic_invitations")
      .select("*")
      .eq("token", invite_token)
      .single();

    if (invError || !invitation) {
      throw new Error("Invitation not found or expired");
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Check email match
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from("clinic_members")
      .select("id, status")
      .eq("clinic_id", invitation.clinic_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      if (existingMember.status === "active") {
        throw new Error("You are already a member of this clinic");
      }
      // Reactivate if previously removed
      await supabaseAdmin
        .from("clinic_members")
        .update({ status: "active", role: invitation.role, accepted_at: new Date().toISOString() })
        .eq("id", existingMember.id);
    } else {
      // Create membership
      await supabaseAdmin
        .from("clinic_members")
        .insert({
          clinic_id: invitation.clinic_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString(),
          status: "active",
        });
    }

    // Delete the invitation
    await supabaseAdmin
      .from("clinic_invitations")
      .delete()
      .eq("id", invitation.id);

    // Garantir que terapeutas tenham linha própria em `professionals` —
    // sem isso, PDFs/relatórios assinados pelo terapeuta caem no fallback
    // do dono da clínica (CREFITO errado, e selo acadêmico vazado se o
    // dono estiver em modo estudante). Criamos um stub não-aprovado e
    // sem assinatura — o terapeuta completa o cadastro depois.
    if (invitation.role === "therapist") {
      const { data: existingPro } = await supabaseAdmin
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingPro) {
        const fullName =
          (user.user_metadata as any)?.full_name?.trim() ||
          (user.user_metadata as any)?.name?.trim() ||
          (user.email?.split("@")[0] ?? "Profissional");
        await supabaseAdmin.from("professionals").insert({
          user_id: user.id,
          full_name: fullName,
          email: user.email,
          city: "—",
          state: "—",
          active: false,
          approved: false,
          is_student: false,
          active_profile_mode: "professional",
          subscription_status: "inactive",
        });
        logStep("Stub professional row created for invited therapist", { userId: user.id });
      }
    }

    // Get clinic info
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("name, owner_user_id")
      .eq("id", invitation.clinic_id)
      .single();

    // Notify clinic owner + secretary that a new member joined
    try {
      const memberName = user.user_metadata?.full_name || user.email;
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          clinic_id: invitation.clinic_id,
          title: "👥 Novo membro na equipe",
          body: `${memberName} aceitou o convite como ${invitation.role}.`,
          url: "/dashboard?tab=clinic",
        }),
      });
    } catch (e) {
      logStep("Push notify failed", { error: String(e) });
    }

    logStep("Invitation accepted", { clinicId: invitation.clinic_id, role: invitation.role });

    return new Response(JSON.stringify({
      success: true,
      clinic_name: clinic?.name,
      role: invitation.role,
    }), {
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
