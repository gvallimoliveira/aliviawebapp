// Auto-confirma e-mails de provedores Microsoft (Hotmail/Outlook/Live/MSN)
// que costumam atrasar/filtrar e-mails de confirmação. Workaround temporário
// até a configuração de domínio próprio de e-mail estar concluída.
//
// Segurança:
// - Só confirma usuários cujo e-mail pertence à lista permitida.
// - Só confirma se o usuário foi criado há menos de 10 minutos (assinatura recente).
// - Só confirma se o e-mail ainda não foi confirmado.
// - Não retorna tokens — o cliente faz signIn com a senha logo em seguida.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_DOMAINS = new Set([
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "live.com.br",
  "msn.com",
  "passport.com",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return json({ confirmed: false, reason: "invalid_email" }, 400);
    }

    const normalized = email.trim().toLowerCase();
    const domain = normalized.split("@")[1];
    if (!domain || !ALLOWED_DOMAINS.has(domain)) {
      return json({ confirmed: false, reason: "domain_not_allowed" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Localiza o usuário (paginação simples — assume volume baixo de signups recentes)
    let target: any = null;
    for (let page = 1; page <= 10 && !target; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error("listUsers error", error);
        return json({ confirmed: false, reason: "lookup_failed" }, 500);
      }
      target = data.users.find((u) => (u.email || "").toLowerCase() === normalized);
      if (data.users.length < 200) break;
    }

    if (!target) return json({ confirmed: false, reason: "user_not_found" });
    if (target.email_confirmed_at) return json({ confirmed: true, reason: "already_confirmed" });

    // Janela de segurança: só confirma se conta criada nos últimos 10 minutos
    const createdAt = new Date(target.created_at).getTime();
    if (Date.now() - createdAt > 10 * 60 * 1000) {
      return json({ confirmed: false, reason: "stale_account" });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
      email_confirm: true,
    });
    if (updErr) {
      console.error("updateUserById error", updErr);
      return json({ confirmed: false, reason: "confirm_failed" }, 500);
    }

    return json({ confirmed: true });
  } catch (err) {
    console.error("auto-confirm-microsoft-email error", err);
    return json({ confirmed: false, reason: "exception" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
