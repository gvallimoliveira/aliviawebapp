import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const GRACE_DAYS = 7;

async function appendAudit(requestId: string, event: Record<string, unknown>) {
  await admin.rpc("dsr_append_audit", { _request_id: requestId, _event: event });
}

async function sendEmail(to: string | null, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to) return { ok: false, detail: !key ? "RESEND_API_KEY ausente" : "sem e-mail" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("ALERT_EMAIL_FROM") || "Aliv.iA <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    const text = await resp.text();
    return { ok: resp.ok, detail: resp.ok ? `enviado para ${to}` : `[${resp.status}] ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Push receipt. The e-mail channel is unreliable (domain/DNS not verified yet),
 * so the push is the primary "your request was processed" signal. On an
 * immediate purge it MUST be fired (and awaited) a few milliseconds before the
 * login and the push subscriptions are wiped, otherwise there is no device left.
 */
async function pushSubject(userId: string, title: string, body: string) {
  const secret = (Deno.env.get("INTERNAL_ALERT_SECRET") || "").trim();
  try {
    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        url: "/minha-conta",
        category: "account",
        kind: "lgpd",
      }),
    });
    const out = await resp.json().catch(() => ({}));
    return { ok: resp.ok && (out as any)?.status === "sent", detail: JSON.stringify(out).slice(0, 200) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

const RETAINED_HTML = `
  <p>Mantemos apenas o que a lei exige: o registro deste pedido (prova de atendimento), os registros de
  consentimento e auditoria e o prontuário eventualmente criado por profissional de saúde, sujeito ao prazo
  mínimo de guarda.</p>
  <p>Encarregado (DPO): Guilherme Vallim de Oliveira — aliviawebapp@gmail.com</p>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ""),
    );
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const me = userData.user;

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "request";
    const mode: "grace" | "immediate" = body?.mode === "immediate" ? "immediate" : "grace";
    const confirm: string = String(body?.confirm ?? "");
    const details: string | null = body?.details ? String(body.details).slice(0, 2000) : null;

    // ---------- cancel a scheduled deletion ----------
    if (action === "cancel") {
      const { data: rows } = await admin
        .from("data_subject_requests")
        .select("id, protocol")
        .eq("user_id", me.id)
        .eq("status", "scheduled")
        .order("created_at", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (!row) return json({ error: "Nenhuma exclusão agendada para cancelar." }, 400);
      await admin
        .from("data_subject_requests")
        .update({ status: "cancelled", scheduled_purge_at: null, handled_at: new Date().toISOString() })
        .eq("id", row.id);
      await appendAudit(row.id, {
        event: "cancelled_by_subject",
        actor: me.email ?? me.id,
        note: "Titular cancelou a exclusão dentro da janela de arrependimento.",
      });
      await sendEmail(
        me.email ?? null,
        `Exclusão cancelada — protocolo ${row.protocol}`,
        `<p>Recebemos o cancelamento do seu pedido de exclusão. Sua conta segue ativa.</p>`,
      );
      return json({ ok: true, cancelled: true, protocol: row.protocol });
    }

    if (action !== "request") return json({ error: "Ação inválida" }, 400);
    if (confirm.trim().toUpperCase() !== "EXCLUIR") {
      return json({ error: 'Digite "EXCLUIR" para confirmar.' }, 400);
    }

    // Block a duplicate open self-deletion
    const { data: existing } = await admin
      .from("data_subject_requests")
      .select("id, protocol, status, scheduled_purge_at")
      .eq("user_id", me.id)
      .eq("request_type", "deletion")
      .in("status", ["scheduled"])
      .limit(1);
    if (existing?.[0]) {
      return json({
        ok: true,
        already: true,
        protocol: existing[0].protocol,
        scheduled_purge_at: existing[0].scheduled_purge_at,
      });
    }

    const scheduledAt =
      mode === "grace" ? new Date(Date.now() + GRACE_DAYS * 86400000).toISOString() : null;

    const { data: inserted, error: insErr } = await admin
      .from("data_subject_requests")
      .insert({
        user_id: me.id,
        request_type: "deletion",
        status: mode === "grace" ? "scheduled" : "pending",
        scheduled_purge_at: scheduledAt,
        details:
          `Exclusão iniciada pelo próprio titular (autoatendimento, ${mode === "grace" ? `com janela de arrependimento de ${GRACE_DAYS} dias` : "execução imediata"}).` +
          (details ? `\nObservação do titular: ${details}` : ""),
      })
      .select("id, protocol")
      .maybeSingle();
    if (insErr || !inserted) return json({ error: insErr?.message ?? "Falha ao registrar pedido" }, 400);

    const protocol = (inserted as any).protocol as string;
    const requestId = (inserted as any).id as string;

    if (mode === "grace") {
      await appendAudit(requestId, {
        event: "scheduled",
        actor: me.email ?? me.id,
        note: `Exclusão agendada para ${scheduledAt} (janela de ${GRACE_DAYS} dias).`,
      });
      const mail = await sendEmail(
        me.email ?? null,
        `Exclusão agendada — protocolo ${protocol}`,
        `<p>Recebemos seu pedido de exclusão (protocolo <strong>${protocol}</strong>). Ele será executado em
         ${GRACE_DAYS} dias. Se mudar de ideia, entre na sua conta e cancele em Minha conta → Privacidade.</p>
         ${RETAINED_HTML}`,
      );
      const push = await pushSubject(
        me.id,
        `Pedido registrado · ${protocol}`,
        `Sua exclusão foi agendada para ${GRACE_DAYS} dias. Guarde o protocolo ${protocol}.`,
      );
      await appendAudit(requestId, {
        event: "subject_notified",
        email_ok: mail.ok,
        email_detail: mail.detail,
        push_ok: push.ok,
        push_detail: push.detail,
      });
      return json({ ok: true, mode, protocol, scheduled_purge_at: scheduledAt, push_sent: push.ok });
    }

    // ---------- immediate purge ----------
    // Push receipt FIRST: the purge removes the device subscriptions, so this is
    // the last moment the titular can be reached on the device.
    const push = await pushSubject(
      me.id,
      `Exclusão concluída · ${protocol}`,
      `Sua conta e seus dados foram excluídos. Protocolo ${protocol}.`,
    );

    const { data: report, error: purgeErr } = await admin.rpc("admin_purge_user_data", {
      _user_id: me.id,
      _email: me.email ?? null,
    });
    if (purgeErr) return json({ error: purgeErr.message }, 400);

    const mail = await sendEmail(
      me.email ?? null,
      `Conta e dados excluídos — protocolo ${protocol}`,
      `<p>Confirmamos a exclusão da sua conta e dos dados pessoais vinculados a ela (LGPD, art. 18, VI).
       Protocolo <strong>${protocol}</strong>.</p>${RETAINED_HTML}`,
    );

    const { error: delErr } = await admin.auth.admin.deleteUser(me.id);

    await admin
      .from("data_subject_requests")
      .update({ status: "completed", handled_at: new Date().toISOString() })
      .eq("id", requestId);
    await appendAudit(requestId, {
      event: "purged",
      origin: "self",
      actor: me.email ?? me.id,
      reason: "Exclusão imediata solicitada pelo próprio titular.",
      auth_user_deleted: !delErr,
      auth_error: delErr?.message ?? null,
      deleted: (report as any)?.deleted ?? {},
      subject_notified: mail.ok,
      notify_detail: mail.detail,
    });

    return json({ ok: true, mode, protocol, report, auth_user_deleted: !delErr });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
