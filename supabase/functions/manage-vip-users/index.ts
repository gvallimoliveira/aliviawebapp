import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-VIP] ${step}${d}`);
};

const findAuthUserByEmail = async (supabaseClient: any, email: string) => {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const user = data?.users?.find((candidate: any) =>
      candidate.email?.toLowerCase().trim() === email,
    );

    if (user) return user;
    if (!data?.users?.length || data.users.length < 200) break;
  }

  return null;
};

const getAvailableTemporaryCrefito = async (supabaseClient: any, seed: string) => {
  const encoder = new TextEncoder();

  for (let attempt = 0; attempt < 20; attempt++) {
    const input = encoder.encode(`${seed}:${attempt}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", input);
    const hashBytes = new Uint8Array(hashBuffer);
    const number = (((hashBytes[0] << 16) | (hashBytes[1] << 8) | hashBytes[2]) % 900000) + 100000;
    const crefito = `${number}-X`;

    const { data: existing, error } = await supabaseClient
      .from("professionals")
      .select("id")
      .eq("crefito", crefito)
      .maybeSingle();

    if (error) throw error;
    if (!existing) return crefito;
  }

  throw new Error("Unable to generate unique temporary CREFITO");
};

const APP_URL = "https://aliviawebapp.com.br";
const DEFAULT_PARTNER_PASSWORD = "parceiroalivia";

const sendPartnerWelcomeEmail = async (email: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    log("Welcome email skipped — no RESEND_API_KEY");
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; color: #1a1a1a;">
  <div style="text-align: center; padding: 24px 0;">
    <h1 style="color: #0f766e; font-size: 26px; margin: 0;">Bem-vindo(a) à Aliv.iA! 🎉</h1>
    <p style="color: #6b7280; margin-top: 8px;">Seu acesso PRO de parceiro foi liberado</p>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 16px 0;">
    <p style="margin: 0 0 12px;">Olá!</p>
    <p style="margin: 0 0 12px;">Você foi cadastrado(a) como <strong>parceiro(a) profissional</strong> da Aliv.iA — o sistema de raciocínio clínico com alma de fisioterapeuta.</p>
    <p style="margin: 0 0 12px;">Use os dados abaixo para fazer seu primeiro acesso:</p>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>E-mail:</strong> ${email}</p>
      <p style="margin: 4px 0;"><strong>Senha temporária:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${DEFAULT_PARTNER_PASSWORD}</code></p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${APP_URL}/auth" style="background: #0f766e; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Acessar agora</a>
    </div>
  </div>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>⚠️ Importante:</strong> Por segurança, troque sua senha logo no primeiro acesso. Você poderá fazer isso direto na tela de cadastro inicial ou em "Minha Conta".</p>
  </div>

  <h3 style="color: #0f766e; margin-top: 28px;">Próximos passos:</h3>
  <ol style="color: #374151; line-height: 1.8;">
    <li>Faça login com a senha temporária</li>
    <li>Complete seu cadastro profissional (CREFITO, cidade, estado)</li>
    <li>Defina uma senha pessoal segura</li>
    <li>Configure seu perfil PRO (foto, bio, agenda, especialidades)</li>
    <li>Compartilhe seu link público de avaliação com os pacientes</li>
  </ol>

  <p style="color: #6b7280; font-size: 13px; margin-top: 32px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    Dúvidas? Responda este e-mail ou acesse <a href="${APP_URL}/suporte" style="color: #0f766e;">nosso suporte</a>.<br>
    <strong>Aliv.iA</strong> — sistema de raciocínio clínico com alma de fisioterapeuta
  </p>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aliv.iA <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Bem-vindo(a) à Aliv.iA — Seu acesso PRO está liberado",
        html,
      }),
    });
    log("Welcome email sent", { status: response.status, ok: response.ok });
    if (!response.ok) {
      const errBody = await response.text();
      log("Welcome email error body", { errBody });
    }
  } catch (err: any) {
    log("Welcome email failed", { error: err.message });
  }
};

// Notification email for users who ALREADY have an account in the system.
// Does NOT mention any default password — they already have their own credentials.
const sendPartnerGrantedEmail = async (email: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    log("Granted email skipped — no RESEND_API_KEY");
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; color: #1a1a1a;">
  <div style="text-align: center; padding: 24px 0;">
    <h1 style="color: #0f766e; font-size: 26px; margin: 0;">Seu acesso PRO foi liberado! 🎉</h1>
    <p style="color: #6b7280; margin-top: 8px;">Você agora é parceiro(a) profissional da Aliv.iA</p>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 16px 0;">
    <p style="margin: 0 0 12px;">Olá!</p>
    <p style="margin: 0 0 12px;">Identificamos que você já tem uma conta na Aliv.iA. Acabamos de habilitar o seu <strong>acesso PRO de parceiro</strong> nesta mesma conta.</p>
    <p style="margin: 0 0 12px;"><strong>Use o seu e-mail e a sua senha habituais para entrar</strong> — nada muda no seu login.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${APP_URL}/auth" style="background: #0f766e; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Acessar minha conta</a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #6b7280;">Esqueceu sua senha? Use o link "Esqueci minha senha" na tela de login.</p>
  </div>

  <p style="color: #6b7280; font-size: 13px; margin-top: 32px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    Dúvidas? Responda este e-mail ou acesse <a href="${APP_URL}/suporte" style="color: #0f766e;">nosso suporte</a>.<br>
    <strong>Aliv.iA</strong> — sistema de raciocínio clínico com alma de fisioterapeuta
  </p>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aliv.iA <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Seu acesso PRO de parceiro foi liberado",
        html,
      }),
    });
    log("Granted email sent", { status: response.status, ok: response.ok });
  } catch (err: any) {
    log("Granted email failed", { error: err.message });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Request received", { method: req.method });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is VIP (admin)
    const { data: callerVip } = await supabaseClient
      .from("vip_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!callerVip) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // List partners
    if (action === "list_partners") {
      const { data, error } = await supabaseClient
        .from("professionals")
        .select("id, full_name, email, city, state")
        .eq("is_partner_account", true)
        .order("full_name");

      if (error) throw error;
      return new Response(JSON.stringify({ partners: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get partner details — uses is_partner_account (permanente)
    // is_partner_account = pessoa marcada como parceira
    // is_partner = PRO ativo no momento (pode ser desligado sem perder o parceiro)
    if (action === "get_partner_details") {
      const { data: partners, error } = await supabaseClient
        .from("professionals")
        .select("id, full_name, email, city, state, is_partner, is_partner_account, premium_granted, user_id, is_student, active_profile_mode, student_institution, student_period, crefito")
        .eq("is_partner_account", true)
        .order("full_name");

      if (error) throw error;

      const enriched = await Promise.all((partners || []).map(async (p: any) => {
        const { data: clinic } = await supabaseClient
          .from("clinics")
          .select("id, name, subscription_status")
          .eq("owner_user_id", p.user_id)
          .maybeSingle();

        const effectiveActiveMode =
          p.is_student && !p.is_partner
            ? "student"
            : (p.active_profile_mode || (p.is_student ? "student" : "professional"));

        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          city: p.city,
          state: p.state,
          is_partner: p.is_partner,
          is_partner_account: p.is_partner_account,
          premium_granted: p.premium_granted,
          is_student: !!p.is_student,
          active_profile_mode: effectiveActiveMode,
          student_institution: p.student_institution || null,
          student_period: p.student_period || null,
          has_clinic: !!clinic,
          clinic_active: clinic?.subscription_status === "active" || clinic?.subscription_status === "trialing",
          clinic_id: clinic?.id || null,
          clinic_name: clinic?.name || null,
        };
      }));

      return new Response(JSON.stringify({ partners: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List Premium concedido por e-mail (B2C, para não-profissionais)
    if (action === "list_granted_premium") {
      const { data, error } = await supabaseClient
        .from("granted_premium_users")
        .select("id, email, granted_at, notes")
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ granted: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_granted_premium") {
      const { email, notes } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const normalizedEmail = String(email).toLowerCase().trim();
      const { data, error } = await supabaseClient
        .from("granted_premium_users")
        .insert({ email: normalizedEmail, granted_by: user.id, notes: notes || null })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          return new Response(JSON.stringify({ error: "already_granted" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw error;
      }
      return new Response(JSON.stringify({ granted: data }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_granted_premium") {
      const { id, email } = body;
      let q = supabaseClient.from("granted_premium_users").delete();
      if (id) q = q.eq("id", id);
      else if (email) q = q.ilike("email", String(email).toLowerCase().trim());
      else {
        return new Response(JSON.stringify({ error: "id or email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove parceiro inteiramente (desliga conta de parceiro e zera tudo)
    if (action === "remove_partner_account") {
      const { professional_id } = body;
      if (!professional_id) {
        return new Response(JSON.stringify({ error: "professional_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Zera TODOS os flags de acesso/perfil. Sem isso o ex-parceiro acadêmico
      // mantinha is_student/active_profile_mode='student' e continuava com
      // selo acadêmico em PDFs + acesso PRO grátis em check-pro-subscription.
      const { error } = await supabaseClient
        .from("professionals")
        .update({
          is_partner_account: false,
          is_partner: false,
          premium_granted: false,
          subscription_status: "inactive",
          is_student: false,
          active_profile_mode: "professional",
          student_institution: null,
          student_period: null,
          approved: false,
        })
        .eq("id", professional_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Toggle partner access (pro / clinic / premium)
    if (action === "toggle_partner_access") {
      const { professional_id, access_type, enabled, clinic_config } = body;
      if (!professional_id || !access_type) {
        return new Response(JSON.stringify({ error: "professional_id and access_type required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("toggle_partner_access", { professional_id, access_type, enabled });

      const { data: pro, error: proErr } = await supabaseClient
        .from("professionals")
        .select("id, user_id, full_name, is_partner, is_partner_account, is_student, crefito")
        .eq("id", professional_id)
        .single();

      if (proErr || !pro) {
        return new Response(JSON.stringify({ error: "Professional not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (access_type === "pro") {
        // Liga/desliga apenas PRO; "is_partner_account" permanece para manter pessoa na lista
        const isAcademicOnlyPartner = !enabled && !!pro.is_partner_account && !!pro.is_student;
        const updates: Record<string, any> = {
          is_partner: enabled,
          subscription_status: enabled || isAcademicOnlyPartner ? "active" : "inactive",
        };
        if (enabled) {
          updates.approved = true;
          updates.is_partner_account = true; // garante que está marcado como parceiro
          // EXCLUSIVIDADE: PRO e Acadêmico nunca ficam ligados juntos.
          updates.is_student = false;
          updates.active_profile_mode = "professional";
          updates.student_institution = null;
          updates.student_period = null;
          // Profissional formado precisa de CREFITO para o trigger de validação.
          // Contas de parceiro que estavam como acadêmicas ficam sem CREFITO,
          // então recriamos o placeholder temporário (`NNNNNN-X`).
          if (!pro.crefito || !String(pro.crefito).trim()) {
            const temp = await getAvailableTemporaryCrefito(supabaseClient, `${professional_id}:pro`);
            if (temp) updates.crefito = temp;
          }
        } else if (isAcademicOnlyPartner) {
          // Se só o Acadêmico ficar ligado, o parceiro continua com acesso
          // liberado e deve operar/ser exibido como Acadêmico.
          updates.approved = false;
          updates.active_profile_mode = "student";
          // Remove o CREFITO temporário criado na abertura da conta de parceiro.
          if (pro.crefito && /^\d{1,6}-X$/i.test(String(pro.crefito).trim())) updates.crefito = null;
        }


        const { error } = await supabaseClient
          .from("professionals")
          .update(updates)
          .eq("id", professional_id);
        if (error) throw error;
      } else if (access_type === "clinic") {
        if (enabled) {
          // Garante que pessoa está marcada como parceira
          await supabaseClient
            .from("professionals")
            .update({ is_partner_account: true })
            .eq("id", professional_id);
          // Check if partner already has a clinic
          const { data: existingClinic } = await supabaseClient
            .from("clinics")
            .select("id, subscription_status")
            .eq("owner_user_id", pro.user_id)
            .maybeSingle();

          if (existingClinic) {
            // Activate existing clinic
            const { error } = await supabaseClient
              .from("clinics")
              .update({ subscription_status: "active" })
              .eq("id", existingClinic.id);
            if (error) throw error;
          } else {
            // Create new clinic for partner with optional config
            const clinicInsert: any = {
              name: clinic_config?.name || `Clínica de ${pro.full_name}`,
              owner_user_id: pro.user_id,
              subscription_status: "active",
            };
            if (clinic_config?.phone) clinicInsert.phone = clinic_config.phone;
            if (clinic_config?.address) clinicInsert.address = clinic_config.address;
            if (clinic_config?.operating_hours_start) clinicInsert.operating_hours_start = clinic_config.operating_hours_start;
            if (clinic_config?.operating_hours_end) clinicInsert.operating_hours_end = clinic_config.operating_hours_end;
            if (clinic_config?.working_days) clinicInsert.working_days = clinic_config.working_days;
            if (clinic_config?.brand_color) clinicInsert.brand_color = clinic_config.brand_color;
            if (clinic_config?.max_members) clinicInsert.max_members = clinic_config.max_members;

            const { data: newClinic, error: clinicErr } = await supabaseClient
              .from("clinics")
              .insert(clinicInsert)
              .select("id")
              .single();

            if (clinicErr) throw clinicErr;

            // Add partner as owner member
            const { error: memberErr } = await supabaseClient
              .from("clinic_members")
              .insert({
                clinic_id: newClinic.id,
                user_id: pro.user_id,
                role: "owner",
                status: "active",
                accepted_at: new Date().toISOString(),
              });
            if (memberErr) throw memberErr;
          }
        } else {
          // Deactivate clinic
          const { data: clinic } = await supabaseClient
            .from("clinics")
            .select("id")
            .eq("owner_user_id", pro.user_id)
            .maybeSingle();

          if (clinic) {
            const { error } = await supabaseClient
              .from("clinics")
              .update({ subscription_status: "inactive" })
              .eq("id", clinic.id);
            if (error) throw error;
          }
        }
      } else if (access_type === "premium") {
        const updates: Record<string, any> = { premium_granted: enabled };
        if (enabled) updates.is_partner_account = true; // mantém na lista
        const { error } = await supabaseClient
          .from("professionals")
          .update(updates)
          .eq("id", professional_id);
        if (error) throw error;
      } else if (access_type === "academic") {
        // Marca/desmarca parceiro como Acadêmico (Alivia Acadêmico).
        // REGRA: parceiro acadêmico = is_partner_account + is_student.
        // O toggle Acadêmico sozinho concede acesso às ferramentas como
        // parceiro acadêmico e força a operação visual como estudante.
        // O toggle PRO permanece independente para parceiros profissionais.
        // CREFITO temporário (`NNNNNN-X`) é gerado quando o admin cria a conta
        // do parceiro. Ele NÃO é um registro real: se ficar na linha, o sistema
        // inteiro (card Acadêmico, PDF, marketplace, trigger de CREFITO) passa a
        // tratar a conta como fisioterapeuta formado. Ao virar Acadêmico,
        // limpamos o placeholder para que a categoria mude de verdade.
        const isPlaceholderCrefito = !!pro.crefito && /^\d{1,6}-X$/i.test(String(pro.crefito).trim());
        const updates: Record<string, any> = {
          is_student: enabled,
        };

        if (enabled) {
          updates.is_partner_account = true;
          updates.subscription_status = "active";        // espelha o acesso acadêmico liberado
          updates.approved = false;                      // tira do marketplace público
          updates.active_profile_mode = "student";       // força modo acadêmico SEMPRE
          updates.is_partner = false;                    // EXCLUSIVIDADE: desliga PRO
          if (isPlaceholderCrefito) updates.crefito = null; // conta acadêmica de verdade
          if (body.student_institution) updates.student_institution = body.student_institution;
          if (body.student_period) updates.student_period = body.student_period;
        } else {


          // Desligar Acadêmico volta o seletor para profissional. NÃO mexe em
          // is_partner — se o admin quiser revogar PRO, usa o toggle PRO ou
          // o botão "Remover da lista".
          updates.active_profile_mode = "professional";
          // Se a pessoa NÃO é parceira PRO ativa, encerra também o acesso
          // que o toggle Acadêmico tinha concedido (subscription_status=active
          // espelhado). Sem isto, o ex-acadêmico continuava com PRO grátis
          // até o próximo check-pro-subscription rodar.
          if (!pro.is_partner) {
            updates.subscription_status = "inactive";
            updates.approved = false;
          }
        }
        const { error } = await supabaseClient
          .from("professionals")
          .update(updates)
          .eq("id", professional_id);
        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "Invalid access_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set partner status
    if (action === "set_partner") {
      const { email, professional_id, is_partner } = body;
      log("set_partner", { email, professional_id, is_partner });

      let targetId = professional_id;

      if (!targetId && email) {
        const normalizedEmail = email.toLowerCase().trim();

        const { data: pro, error: proErr } = await supabaseClient
          .from("professionals")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();

        log("Professional lookup", { found: !!pro, error: proErr?.message });

        if (pro) {
          targetId = pro.id;
        } else if (is_partner) {
          // Professional not found — auto-create account + professional profile
          // 1. Create auth user with known default password + force_password_reset flag
          const defaultPassword = "parceiroalivia";
          const { data: newUserData, error: createError } = await supabaseClient.auth.admin.createUser({
            email: normalizedEmail,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: { force_password_reset: true },
          });

          if (createError) {
            // Auth user already exists — DO NOT touch their password / credentials.
            // They already have a working login; we only need to attach a partner
            // professional profile and notify them that PRO has been granted.
            if (createError.message?.includes("already been registered")) {
              const existingUser = await findAuthUserByEmail(supabaseClient, normalizedEmail);
              log("Existing auth lookup", { found: !!existingUser, email: normalizedEmail });
              if (!existingUser) {
                return new Response(JSON.stringify({ error: createError.message }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              // Create professional profile linked to the existing auth user.
              // Credentials are left untouched.
              const namePart = existingUser.user_metadata?.full_name || normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
              const temporaryCrefito = await getAvailableTemporaryCrefito(supabaseClient, normalizedEmail);
              const { error: insertErr } = await supabaseClient
                .from("professionals")
                .insert({
                  user_id: existingUser.id,
                  email: normalizedEmail,
                  full_name: namePart,
                  crefito: temporaryCrefito,
                  city: "A definir",
                  state: "XX",
                  is_partner: true,
                  is_partner_account: true,
                  approved: true,
                  subscription_status: "active",
                });

              if (insertErr) throw insertErr;

              // Send the "you've been granted PRO — use your usual password" email.
              await sendPartnerGrantedEmail(normalizedEmail);

              return new Response(JSON.stringify({ success: true, created: true, existing_account: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            throw createError;
          }

          const newUserId = newUserData.user.id;
          const namePart = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
          const temporaryCrefito = await getAvailableTemporaryCrefito(supabaseClient, normalizedEmail);

          // 2. Create professional profile (profile is auto-created by handle_new_user trigger)
          const { error: insertErr } = await supabaseClient
            .from("professionals")
            .insert({
              user_id: newUserId,
              email: normalizedEmail,
              full_name: namePart,
              crefito: temporaryCrefito,
              city: "A definir",
              state: "XX",
              is_partner: true,
              is_partner_account: true,
              approved: true,
              subscription_status: "active",
            });

          if (insertErr) throw insertErr;

          // Send recovery email so the new partner can set their password
          const resetRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/recover`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            },
            body: JSON.stringify({ email: normalizedEmail }),
          });
          log("Recovery email sent for new user", { status: resetRes.status });

          // Send welcome email with credentials
          await sendPartnerWelcomeEmail(normalizedEmail);

          return new Response(JSON.stringify({ success: true, created: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ error: "not_found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (!targetId) {
        return new Response(JSON.stringify({ error: "email or professional_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If granting partner, only notify the user that PRO has been enabled.
      // Do NOT touch their password and do NOT trigger a password recovery email
      // — they already have a working account in this branch.
      if (is_partner) {
        const { data: proData } = await supabaseClient
          .from("professionals")
          .select("user_id, email, is_partner")
          .eq("id", targetId)
          .single();
        if (proData?.user_id && proData?.email && !proData.is_partner) {
          // Only send notification on the false → true transition.
          await sendPartnerGrantedEmail(proData.email);
        }
      }

      const partnerUpdate: Record<string, any> = {
        is_partner: is_partner,
        subscription_status: is_partner ? "active" : "inactive",
      };
      if (is_partner) partnerUpdate.is_partner_account = true;
      const { error } = await supabaseClient
        .from("professionals")
        .update(partnerUpdate)
        .eq("id", targetId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get clinic config by clinic_id
    if (action === "get_clinic_config") {
      const { clinic_id } = body;
      if (!clinic_id) {
        return new Response(JSON.stringify({ error: "clinic_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: clinic, error } = await supabaseClient
        .from("clinics")
        .select("id, name, phone, address, operating_hours_start, operating_hours_end, working_days, brand_color, max_members, logo_url")
        .eq("id", clinic_id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ clinic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update clinic config
    if (action === "update_clinic_config") {
      const { clinic_id, clinic_config } = body;
      if (!clinic_id || !clinic_config) {
        return new Response(JSON.stringify({ error: "clinic_id and clinic_config required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = {};
      if (clinic_config.name) updateData.name = clinic_config.name;
      if (clinic_config.phone !== undefined) updateData.phone = clinic_config.phone;
      if (clinic_config.address !== undefined) updateData.address = clinic_config.address;
      if (clinic_config.operating_hours_start) updateData.operating_hours_start = clinic_config.operating_hours_start;
      if (clinic_config.operating_hours_end) updateData.operating_hours_end = clinic_config.operating_hours_end;
      if (clinic_config.working_days) updateData.working_days = clinic_config.working_days;
      if (clinic_config.brand_color !== undefined) updateData.brand_color = clinic_config.brand_color;
      if (clinic_config.max_members) updateData.max_members = clinic_config.max_members;

      const { error } = await supabaseClient
        .from("clinics")
        .update(updateData)
        .eq("id", clinic_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resend password recovery email to a partner / user
    if (action === "send_password_reset") {
      const { email } = body;
      if (!email || typeof email !== "string") {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const targetUser = await findAuthUserByEmail(supabaseClient, normalizedEmail);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "user_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resetRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/recover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      log("Manual recovery resend", { email: normalizedEmail, status: resetRes.status });
      if (!resetRes.ok) {
        const errBody = await resetRes.text();
        throw new Error(`Recovery email failed: ${errBody}`);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List leads (basic assessments with patient_email)
    if (action === "list_leads") {
      // Fetch basic leads
      const { data, error } = await supabaseClient
        .from("assessments")
        .select("id, patient_email, created_at, status, pain_score, pain_regions")
        .eq("type", "basic")
        .not("patient_email", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Conversion metrics: count premium assessments from same emails
      const leadEmails = [...new Set((data || []).map((l: any) => l.patient_email?.toLowerCase()).filter(Boolean))];
      let convertedCount = 0;
      if (leadEmails.length > 0) {
        const { count } = await supabaseClient
          .from("assessments")
          .select("patient_email", { count: "exact", head: true })
          .eq("type", "premium")
          .in("patient_email", leadEmails);
        convertedCount = count || 0;
      }

      const totalLeads = leadEmails.length;
      const completedLeads = (data || []).filter((l: any) => l.status === "completed").length;

      return new Response(JSON.stringify({
        leads: data,
        metrics: {
          total_leads: totalLeads,
          completed: completedLeads,
          converted_premium: convertedCount,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Archive a support ticket (soft delete + backup copy)
    if (action === "archive_ticket") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Ticket ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the ticket
      const { data: ticket, error: fetchErr } = await supabaseClient
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !ticket) {
        return new Response(JSON.stringify({ error: "Ticket not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert backup copy
      const { error: archiveErr } = await supabaseClient
        .from("support_tickets_archive")
        .insert({
          original_ticket_id: ticket.id,
          user_id: ticket.user_id,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status,
          admin_reply: ticket.admin_reply,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          archived_by: user.id,
        });

      if (archiveErr) throw archiveErr;

      // Soft delete: set archived_at
      const { error: updateErr } = await supabaseClient
        .from("support_tickets")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete a lead (assessment)
    if (action === "delete_lead") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("assessments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List VIP users
    if (action === "list_vip" || !action) {
      const { data, error } = await supabaseClient
        .from("vip_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ vip_users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add VIP user
    if (action === "add_vip") {
      const { email, notes } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseClient
        .from("vip_users")
        .insert({ email: email.toLowerCase().trim(), notes: notes || null })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(JSON.stringify({ error: "Email already in VIP list" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw error;
      }

      return new Response(JSON.stringify({ vip_user: data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete VIP user
    if (action === "delete_vip") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("vip_users")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    log("ERROR", { message: err.message, stack: err.stack });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
