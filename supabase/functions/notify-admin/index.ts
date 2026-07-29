import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_ALERT_SECRET") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const log = (step: string, details?: unknown) =>
  console.log(`[notify-admin] ${step}`, details ? JSON.stringify(details) : "");

type AlertInput = {
  event_type: string;
  title: string;
  body?: string;
  url?: string;
  /** Free-form key/value lines rendered in the message */
  fields?: Record<string, string | number | null | undefined>;
  /** Used for dedupe/audit (e.g. ticket id / stripe event id) */
  ref?: string | null;
};

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

function renderLines(alert: AlertInput): string[] {
  const lines: string[] = [];
  if (alert.body) lines.push(alert.body);
  for (const [k, v] of Object.entries(alert.fields || {})) {
    if (v === null || v === undefined || v === "") continue;
    lines.push(`${k}: ${v}`);
  }
  if (alert.url) lines.push(alert.url);
  return lines;
}

async function sendTelegram(alert: AlertInput) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    return { status: "skipped", detail: "telegram not configured" };
  }
  const text =
    `<b>${escapeHtml(alert.title)}</b>\n` +
    renderLines(alert).map((l) => escapeHtml(l)).join("\n");

  const resp = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: text.slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  const raw = await resp.text();
  if (!resp.ok) return { status: "failed", detail: `[${resp.status}] ${raw.slice(0, 300)}` };
  return { status: "sent", detail: null };
}

async function adminEmails(): Promise<string[]> {
  const { data } = await supabase.from("vip_users").select("email");
  return (data || []).map((v: any) => v.email).filter(Boolean);
}

async function sendEmail(alert: AlertInput, emails: string[]) {
  if (!RESEND_API_KEY) return { status: "skipped", detail: "no RESEND_API_KEY" };
  if (emails.length === 0) return { status: "skipped", detail: "no admin emails" };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#0f766e;margin:0 0 12px">${escapeHtml(alert.title)}</h2>
      ${renderLines(alert)
        .map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`)
        .join("")}
    </div>`;

  const post = (to: string[]) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("ALERT_EMAIL_FROM") || "Aliv.iA <onboarding@resend.dev>",
        to,
        subject: `[Aliv.iA] ${alert.title}`,
        html,
      }),
    });

  let resp = await post(emails);
  let raw = await resp.text();

  // Resend sandbox mode: only the account owner address is deliverable.
  if (!resp.ok && resp.status === 403) {
    const owner = raw.match(/own email address \(([^)]+)\)/)?.[1];
    if (owner) {
      resp = await post([owner]);
      raw = await resp.text();
      if (resp.ok) return { status: "sent", detail: `fallback: ${owner}` };
    }
  }

  if (!resp.ok) return { status: "failed", detail: `[${resp.status}] ${raw.slice(0, 300)}` };
  return { status: "sent", detail: null };
}


async function sendPush(alert: AlertInput, emails: string[]) {
  try {
    // listUsers() is paginated (50 by default) — walk all pages so admin
    // accounts created later are still found.
    const ids: string[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data: authData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      const users = authData?.users || [];
      for (const u of users as any[]) {
        if (emails.some((e) => e.toLowerCase() === (u.email || "").toLowerCase())) ids.push(u.id);
      }
      if (users.length < 1000) break;
    }
    if (ids.length === 0) return { status: "skipped", detail: "no admin users" };

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", ids);
    if (!subs || subs.length === 0) return { status: "skipped", detail: "no devices registered" };

    let sent = 0;
    for (const uid of [...new Set(subs.map((s: any) => s.user_id))]) {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          user_id: uid,
          title: alert.title,
          body: (alert.body || renderLines(alert)[0] || "").slice(0, 180),
          url: alert.url || "/admin",
        }),
      });
      await r.text();
      if (r.ok) sent++;
    }
    return sent > 0
      ? { status: "sent", detail: `${sent} device group(s)` }
      : { status: "failed", detail: "push function errors" };
  } catch (e) {
    return { status: "failed", detail: String(e).slice(0, 300) };
  }
}

async function dispatch(alert: AlertInput) {
  const emails = await adminEmails();
  const results: Record<string, { status: string; detail: string | null }> = {};

  const logChannel = async (channel: string) => {
    await supabase.from("admin_alert_log").insert({
      event_type: alert.event_type,
      channel,
      status: results[channel].status,
      title: alert.title,
      ref: alert.ref ?? null,
      detail: results[channel].detail,
      payload: { fields: alert.fields || {}, url: alert.url || null },
    });
  };

  // All channels fire in parallel (email, telegram and push are equal peers).
  for (const [channel, fn] of [
    ["telegram", () => sendTelegram(alert)],
    ["email", () => sendEmail(alert, emails)],
    ["push", () => sendPush(alert, emails)],
  ] as const) {
    try {
      results[channel] = (await fn()) as any;
    } catch (e) {
      results[channel] = { status: "failed", detail: String(e).slice(0, 300) };
    }
    await logChannel(channel);
  }


  const delivered = Object.values(results).some((r) => r.status === "sent");
  log("dispatched", { event: alert.event_type, delivered, results });
  return { delivered, results };
}

function ticketAlert(t: any, profile: any, email: string | null): AlertInput {
  return {
    event_type: "support_ticket",
    title: "📩 Novo ticket de suporte",
    body: String(t.message || "").slice(0, 600),
    ref: t.id,
    fields: {
      "De": profile?.full_name || email || t.user_id,
      "E-mail": email || "—",
      "Assunto": t.subject,
    },
    url: "https://aliviawebapp.com.br/admin?tab=support",
  };
}

async function notifyTicket(ticketId: string) {
  const { data: t } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) return { ok: false, reason: "ticket not found" };

  let email: string | null = null;
  let profile: any = null;
  try {
    const { data: u } = await supabase.auth.admin.getUserById(t.user_id);
    email = u?.user?.email ?? null;
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", t.user_id)
      .maybeSingle();
    profile = p;
  } catch { /* noop */ }

  const { delivered, results } = await dispatch(ticketAlert(t, profile, email));
  if (delivered) {
    await supabase
      .from("support_tickets")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", t.id);
  }
  return { ok: delivered, results };
}

/** Retry every ticket that was never delivered (safety net, runs on cron). */
async function sweep() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from("support_tickets")
    .select("id")
    .is("notified_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20);

  const processed: string[] = [];
  for (const t of pending || []) {
    const r = await notifyTicket(t.id);
    if (r.ok) processed.push(t.id);
  }
  return { checked: pending?.length || 0, delivered: processed.length, ids: processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    const internal = (req.headers.get("x-internal-secret") || "").trim();
    const isService =
      token === SERVICE_ROLE_KEY ||
      (!!INTERNAL_SECRET && internal === INTERNAL_SECRET);
    let allowed = isService;
    let callerUser: { id: string; email: string | null } | null = null;

    // A signed-in user (e.g. admin triggering a manual test) is also allowed
    // for the non-arbitrary actions below.
    if (!allowed && token) {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        allowed = true;
        callerUser = { id: data.user.id, email: data.user.email ?? null };
      }
    }
    if (!allowed) return json({ error: "Unauthorized" }, 401);



    const payload = await req.json().catch(() => ({}));
    const action = payload?.action || "alert";

    if (action === "sweep") return json(await sweep());
    if (action === "ticket") {
      if (!payload?.ticket_id) return json({ error: "ticket_id required" }, 400);
      return json(await notifyTicket(String(payload.ticket_id)));
    }
    if (action === "push_status" || action === "test_push") {
      if (!callerUser) return json({ error: "Forbidden" }, 403);
      const emails = await adminEmails();
      const isAdmin = emails.some(
        (e) => e.toLowerCase() === (callerUser!.email || "").toLowerCase(),
      );
      if (!isAdmin) return json({ error: "Forbidden" }, 403);

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", callerUser.id);
      const devices = subs?.length || 0;

      if (action === "push_status") return json({ devices, admin_emails: emails.length });

      if (devices === 0) return json({ sent: 0, devices, error: "no devices registered" }, 400);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          user_id: callerUser.id,
          title: "🔔 Teste da Central de Alertas",
          body: "Se você recebeu isto, o push de fallback está funcionando.",
          url: "/admin",
        }),
      });
      const out = await r.json().catch(() => ({}));
      return json({ ok: r.ok, devices, result: out });
    }

    if (action === "alert") {
      // Arbitrary alerts are server-to-server only (stripe webhook, cron, etc.)
      if (!isService) return json({ error: "Forbidden" }, 403);
      if (!payload?.title) return json({ error: "title required" }, 400);
      return json(
        await dispatch({
          event_type: String(payload.event_type || "generic"),
          title: String(payload.title).slice(0, 200),
          body: payload.body ? String(payload.body).slice(0, 1500) : undefined,
          url: payload.url ? String(payload.url).slice(0, 400) : undefined,
          fields: payload.fields || {},
          ref: payload.ref ? String(payload.ref).slice(0, 120) : null,
        }),
      );
    }
    return json({ error: "unknown action" }, 400);
  } catch (err) {
    log("ERROR", String(err));
    return json({ error: String(err) }, 500);
  }
});
