import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INTERNAL_SECRET = (Deno.env.get("INTERNAL_ALERT_SECRET") || "").trim();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function appendAudit(requestId: string | undefined, event: Record<string, unknown>) {
  if (!requestId) return;
  await admin.rpc("dsr_append_audit", { _request_id: requestId, _event: event });
}

/** Best-effort confirmation e-mail to the data subject. Failures are logged in the audit. */
async function emailSubject(
  to: string | null,
  protocol: string | null,
  subject: string,
  html: string,
): Promise<{ ok: boolean; detail: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, detail: "RESEND_API_KEY ausente" };
  if (!to) return { ok: false, detail: "titular sem e-mail conhecido" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("ALERT_EMAIL_FROM") || "Aliv.iA <onboarding@resend.dev>",
        to: [to],
        subject: protocol ? `${subject} — protocolo ${protocol}` : subject,
        html,
      }),
    });
    const text = await resp.text();
    return { ok: resp.ok, detail: resp.ok ? `enviado para ${to}` : `[${resp.status}] ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

const RETAINED_HTML = `
  <p>Foram mantidos apenas os registros exigidos por obrigação legal: o próprio pedido de privacidade
  (prova de atendimento), os registros de consentimento e auditoria e o prontuário eventualmente criado por
  profissional de saúde, sujeito ao prazo mínimo de guarda.</p>
  <p>Encarregado (DPO): Guilherme Vallim de Oliveira — aliviawebapp@gmail.com</p>`;

async function purgeAccount(opts: {
  userId: string;
  email: string | null;
  requestId?: string;
  reason: string;
  actor: string;
  origin: "admin" | "self" | "scheduled";
}) {
  const { data: report, error: purgeErr } = await admin.rpc("admin_purge_user_data", {
    _user_id: opts.userId,
    _email: opts.email,
  });
  if (purgeErr) return { ok: false as const, error: purgeErr.message };

  const { error: delErr } = await admin.auth.admin.deleteUser(opts.userId);

  const deleted = (report as any)?.deleted ?? {};
  const mail = await emailSubject(
    opts.email,
    null,
    "Sua conta e seus dados foram excluídos — Aliv.iA",
    `<p>Confirmamos a exclusão da sua conta e dos dados pessoais vinculados a ela, conforme seu pedido
     (LGPD, art. 18, VI).</p>${RETAINED_HTML}`,
  );

  if (opts.requestId) {
    const stamp = new Date().toISOString();
    await admin
      .from("data_subject_requests")
      .update({
        status: "completed",
        handled_at: stamp,
        scheduled_purge_at: null,
      })
      .eq("id", opts.requestId);
    await appendAudit(opts.requestId, {
      event: "purged",
      at: stamp,
      actor: opts.actor,
      origin: opts.origin,
      reason: opts.reason,
      auth_user_deleted: !delErr,
      auth_error: delErr?.message ?? null,
      deleted,
      subject_notified: mail.ok,
      notify_detail: mail.detail,
    });
  }

  return {
    ok: true as const,
    report,
    auth_user_deleted: !delErr,
    auth_error: delErr?.message ?? null,
    subject_notified: mail.ok,
    notify_detail: mail.detail,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "inspect";

    // ---------- internal: execute scheduled self-service purges ----------
    if (action === "run_scheduled") {
      const internal = (req.headers.get("x-internal-secret") || "").trim();
      const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      const authorized = (!!INTERNAL_SECRET && internal === INTERNAL_SECRET) || bearer === SERVICE_ROLE_KEY;
      if (!authorized) return json({ error: "Unauthorized" }, 401);

      const { data: due } = await admin
        .from("data_subject_requests")
        .select("id, user_id, requester_email, protocol")
        .eq("status", "scheduled")
        .lte("scheduled_purge_at", new Date().toISOString())
        .limit(20);

      const results: unknown[] = [];
      for (const r of due ?? []) {
        const res = await purgeAccount({
          userId: (r as any).user_id,
          email: (r as any).requester_email,
          requestId: (r as any).id,
          reason: "Exclusão solicitada pelo titular (janela de arrependimento encerrada).",
          actor: "sistema (agendado)",
          origin: "scheduled",
        });
        results.push({ protocol: (r as any).protocol, ...res });
      }
      return json({ ok: true, processed: results.length, results });
    }

    // ---------- admin-only actions ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const caller = userData.user;

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) return json({ error: "Acesso restrito a administradores." }, 403);

    const userId: string | undefined = body?.user_id;
    const requestId: string | undefined = body?.request_id;
    const reason: string | undefined = body?.reason;
    if (!userId) return json({ error: "user_id é obrigatório" }, 400);

    // ---- Auth account origin
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const au: any = authUser?.user ?? null;
    let email: string | null = au?.email ?? null;

    // Fall back to the frozen snapshot when the login no longer exists
    let frozen: any = null;
    if (requestId) {
      const { data } = await admin
        .from("data_subject_requests")
        .select("protocol, requester_email, requester_name, requester_account_type, requester_signup_provider, account_created_at")
        .eq("id", requestId)
        .maybeSingle();
      frozen = data ?? null;
      if (!email) email = frozen?.requester_email ?? null;
    }

    const account = au
      ? {
          email,
          created_at: au.created_at,
          last_sign_in_at: au.last_sign_in_at,
          email_confirmed_at: au.email_confirmed_at ?? au.confirmed_at ?? null,
          phone: au.phone || null,
          providers: au.app_metadata?.providers ?? (au.app_metadata?.provider ? [au.app_metadata.provider] : []),
          full_name: au.user_metadata?.full_name ?? au.user_metadata?.name ?? null,
          banned: !!au.banned_until,
        }
      : frozen
        ? {
            email: frozen.requester_email,
            created_at: frozen.account_created_at,
            last_sign_in_at: null,
            email_confirmed_at: null,
            phone: null,
            providers: frozen.requester_signup_provider ? [frozen.requester_signup_provider] : [],
            full_name: frozen.requester_name,
            banned: false,
          }
        : null;

    // ---- App-side classification
    const [profileRes, proRes, memberRes, grantedRes, patientRes, assessmentRes] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("professionals").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("clinic_members").select("id, clinic_id, role, status").eq("user_id", userId),
      email ? admin.from("granted_premium_users").select("*").ilike("email", email) : Promise.resolve({ data: [] }),
      email ? admin.from("patients").select("id, professional_id, clinic_id").ilike("email", email) : Promise.resolve({ data: [] }),
      admin.from("assessments").select("id, status, created_at, professional_id, clinic_id").eq("user_id", userId),
    ]);

    const profile: any = profileRes?.data ?? null;
    const pro: any = proRes?.data ?? null;
    const members: any[] = (memberRes as any)?.data ?? [];
    const assessments: any[] = (assessmentRes as any)?.data ?? [];

    const isStudent = !!pro && (pro.is_student || pro.student_access || pro.account_type === "student");
    const accountType = pro
      ? isStudent
        ? "student"
        : "professional"
      : members.length > 0
        ? "clinic_staff"
        : (frozen?.requester_account_type ?? "patient");

    const classification = {
      account_type: accountType,
      protocol: frozen?.protocol ?? null,
      signup_origin: profile?.signup_origin ?? null,
      occupation: profile?.occupation ?? null,
      preferred_language: profile?.preferred_language ?? null,
      has_professional_record: !!pro,
      professional_approved: pro?.approved ?? null,
      professional_crefito: pro?.crefito ?? null,
      subscription_status: pro?.subscription_status ?? null,
      subscription_stripe_id: pro?.subscription_stripe_id ?? null,
      clinic_memberships: members,
      granted_premium: ((grantedRes as any)?.data ?? []).length > 0,
      assessments_total: assessments.length,
      assessments_completed: assessments.filter((a) => a.status === "completed").length,
      assessments_via_professional: assessments.filter((a) => a.professional_id || a.clinic_id).length,
      patient_records_as_email: ((patientRes as any)?.data ?? []).length,
      first_activity: assessments.length
        ? assessments.map((a) => a.created_at).sort()[0]
        : (profile?.created_at ?? null),
    };

    if (action === "inspect") {
      const { data: inventory, error: invErr } = await admin.rpc("admin_user_data_inventory", {
        _user_id: userId,
        _email: email,
      });
      if (invErr) return json({ error: invErr.message }, 400);
      return json({ account, classification, inventory: inventory ?? [], account_exists: !!au });
    }

    if (action === "purge") {
      if (!reason || reason.trim().length < 5) {
        return json({ error: "Informe o motivo/justificativa da exclusão." }, 400);
      }
      const res = await purgeAccount({
        userId,
        email,
        requestId,
        reason: reason.trim(),
        actor: caller.email ?? caller.id,
        origin: "admin",
      });
      if (!res.ok) return json({ error: res.error }, 400);
      return json(res);
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
