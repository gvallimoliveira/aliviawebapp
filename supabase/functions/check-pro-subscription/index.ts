import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PRO-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // VIP/Admin fallback: hardcoded owner emails always have full PRO access.
    // Mantém o app funcionando mesmo se vip_users falhar por RLS/timing.
    const VIP_EMAILS = ["gvallimoliveira@gmail.com", "gvallim.fisio@gmail.com"];
    if (VIP_EMAILS.includes((user.email || "").trim().toLowerCase())) {
      logStep("VIP admin email — granting full access");
      await supabaseClient
        .from("professionals")
        .update({ subscription_status: "active", approved: true })
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ subscribed: true, is_vip: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: proData } = await supabaseClient
      .from("professionals")
      .select("id, is_partner, is_partner_account, is_student, active_profile_mode, subscription_status, pro_access_expires_at, premium_granted, subscription_grace_until")
      .eq("user_id", user.id)
      .maybeSingle();

    // Partner Access Model:
    // - PRO partner: is_partner=true (parceiro profissional)
    // - Academic partner: is_partner_account=true + is_student=true
    //   (apenas o toggle Acadêmico ativo também libera ferramentas)
    // Estudantes SEM cadastro de parceiro no painel admin continuam precisando assinar.
    const isPartner = proData?.is_partner === true;
    const isAcademicPartner = proData?.is_partner_account === true && proData?.is_student === true;

    if (isPartner || isAcademicPartner) {
      logStep("User is an admin-granted Partner — granting access without Stripe", { is_partner: isPartner, is_academic_partner: isAcademicPartner });
      const partnerUpdates: Record<string, any> = {};
      if (proData?.subscription_status !== "active") partnerUpdates.subscription_status = "active";
      if (isAcademicPartner && proData?.active_profile_mode !== "student") partnerUpdates.active_profile_mode = "student";
      if (Object.keys(partnerUpdates).length > 0) {
        await supabaseClient
          .from("professionals")
          .update(partnerUpdates)
          .eq("user_id", user.id);
      }
      return new Response(JSON.stringify({
        subscribed: true,
        // Parceiro APENAS acadêmico não é PRO: o acesso é o mesmo, mas a
        // identificação precisa ser acadêmica em toda a UI.
        is_partner: isPartner && !(isAcademicPartner && !isPartner),
        is_academic_partner: isAcademicPartner && !isPartner,
        is_student: !!proData?.is_student,

        premium_granted: proData?.premium_granted,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Alivia Acadêmico (estudantes sem flag de parceiro): NÃO concede acesso
    // PRO gratuito. Precisam assinar como qualquer profissional.
    // (proData.is_student permanece apenas como marcador de perfil acadêmico.)


    // Check annual one-time payment access (legacy paid access marker)
    if (proData?.pro_access_expires_at) {
      const expiresAt = new Date(proData.pro_access_expires_at);
      const now = new Date();
      if (expiresAt > now) {
        logStep("Annual access still valid", { expires: expiresAt.toISOString() });
        if (proData.subscription_status !== "active") {
          await supabaseClient
            .from("professionals")
            .update({ subscription_status: "active", approved: true })
            .eq("user_id", user.id);
        }
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_end: expiresAt.toISOString(),
          is_annual: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        logStep("Annual access expired", { expired: expiresAt.toISOString() });
        await supabaseClient
          .from("professionals")
          .update({ subscription_status: "inactive", pro_access_expires_at: null })
          .eq("user_id", user.id);
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Helper: when a previously-active subscription drops, give the pro a
    // 7-day tolerance window so they stay visible in the public directory
    // (with a warning) instead of vanishing instantly from patients' views.
    const applyGraceIfNeeded = async (current: { subscription_status?: string | null; subscription_grace_until?: string | null } | null) => {
      const wasActive = current?.subscription_status === "active";
      const existingGrace = current?.subscription_grace_until ? new Date(current.subscription_grace_until) : null;
      const stillInGrace = existingGrace && existingGrace > new Date();
      if (wasActive && !stillInGrace) {
        const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseClient
          .from("professionals")
          .update({ subscription_status: "inactive", subscription_stripe_id: null, subscription_grace_until: graceUntil })
          .eq("user_id", user.id);
        return { graceUntil };
      }
      return { graceUntil: existingGrace && stillInGrace ? existingGrace.toISOString() : null };
    };

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      const { graceUntil } = await applyGraceIfNeeded(proData);
      if (!graceUntil && proData?.subscription_status === "active") {
        await supabaseClient
          .from("professionals")
          .update({ subscription_status: "inactive", subscription_stripe_id: null })
          .eq("user_id", user.id);
      }
      return new Response(JSON.stringify({ subscribed: false, grace_until: graceUntil }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    // Filter only Pro subscriptions (monthly or annual product)
    const proProductIds = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];
    const proSub = subscriptions.data.find((sub: any) =>
      ["active", "trialing"].includes(sub.status) &&
      sub.items.data.some((item: any) => proProductIds.includes(item.price.product as string))
    );
    const hasActiveSub = !!proSub;
    let subscriptionEnd = null;
    let subscriptionId = null;

    if (hasActiveSub && proSub) {
      subscriptionEnd = new Date(proSub.current_period_end * 1000).toISOString();
      subscriptionId = proSub.id;
      logStep("Active Pro subscription found", { subscriptionId });
    } else {
      logStep("No active Pro subscription");
    }

    const updatePayload: Record<string, any> = {
      subscription_status: hasActiveSub ? "active" : "inactive",
      subscription_stripe_id: subscriptionId,
      // Teste de 7 dias: guarda o fim para limitar créditos de IA a 5.
      pro_trial_ends_at: proSub?.status === "trialing" && (proSub as any).trial_end
        ? new Date((proSub as any).trial_end * 1000).toISOString() : null,
    };

    let graceUntilOut: string | null = null;
    if (hasActiveSub) {
      updatePayload.approved = true;
      updatePayload.subscription_grace_until = null; // clear any prior grace
    } else {
      const wasActive = proData?.subscription_status === "active";
      const existingGrace = (proData as any)?.subscription_grace_until ? new Date((proData as any).subscription_grace_until) : null;
      const stillInGrace = existingGrace && existingGrace > new Date();
      if (wasActive && !stillInGrace) {
        graceUntilOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        updatePayload.subscription_grace_until = graceUntilOut;
      } else if (stillInGrace) {
        graceUntilOut = existingGrace!.toISOString();
      }
    }

    await supabaseClient
      .from("professionals")
      .update(updatePayload)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      grace_until: graceUntilOut,
      is_trial: proSub?.status === "trialing",
      trial_end: proSub?.status === "trialing" && (proSub as any).trial_end ? new Date((proSub as any).trial_end * 1000).toISOString() : null,
      premium_granted: proData?.premium_granted || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
