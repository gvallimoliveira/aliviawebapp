// Shadow tracking helper for AI workspace credit usage.
//
// Phase 2 (Shadow Tracking): never blocks, never errors out the caller.
// Inserts one row in public.ai_credit_usage per AI call.
//
// Rewrite (2026-06-29): the previous version relied on an HTTP roundtrip
// to /auth/v1/user inside an EdgeRuntime.waitUntil() background task. In
// short-lived functions the isolate was being terminated before the insert
// landed, which is why only 2 of 103 AI gateway calls had been captured.
// We now decode the JWT `sub` inline (synchronous, no network) and allow
// `user_id` to be NULL so anonymous traffic (patient self-assessments,
// public demos) is also logged with a sentinel.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CREDIT_COST: Record<string, number> = {
  "generate-diagnosis": 0.30,
  "generate-treatment": 0.30,
  "generate-progression-suggestion": 0.25,
  "generate-evolution-summary": 0.25,
  "agent-generate-hep": 0.20,
  "interpret-external-assessment": 0.20,
  "import-detect-schema": 0.15,
  "generate-blog-article": 0.30,
  "generate-clinical-impression": 0.10,
  "detect-functional-limitation": 0.08,
  "suggest-specialty-questionnaires": 0.05,
  "suggest-functional-tests": 0.05,
  "extract-dynamometry": 0.05,
  "parse-schedule-image": 0.10,
  "clinical-agent-chat": 0.05,
  "agent-knowledge": 0.05,
  "transcribe-anamnesis-chunk": 0.05,
  "transcribe-anamnesis-summary": 0.05,
};

type LogOptions = {
  function_name: string;
  credits?: number;
  transcriptions?: number;
  metadata?: Record<string, unknown>;
  user_id?: string | null;
};

/**
 * Decode the `sub` claim from a Bearer JWT without verifying the signature.
 * We trust the upstream gateway to have validated it (or, for verify_jwt=false
 * functions, the value is only used as an attribution tag — never as an
 * authorization decision). Pure sync, no network, can't be killed mid-flight.
 */
function decodeJwtSub(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = token.split(".")[1];
    // base64url → base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      payload.length + (4 - (payload.length % 4)) % 4,
      "=",
    );
    const json = JSON.parse(atob(b64));
    const sub = typeof json?.sub === "string" ? json.sub : null;
    // anon/service tokens have role='anon'|'service_role' and no user sub
    if (!sub || sub === json?.role) return null;
    // sub must look like a uuid for our user_id column
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)) {
      return null;
    }
    return sub;
  } catch {
    return null;
  }
}

const ANON_SENTINEL = "00000000-0000-0000-0000-000000000000";

/**
 * Fire-and-forget shadow log. Never throws, never blocks caller.
 * Logs every call (including anonymous ones, attributed to the all-zero UUID).
 */
export function shadowLogAiUsage(
  req: Request,
  opts: LogOptions,
  admin?: SupabaseClient,
): void {
  // Resolve user id SYNCHRONOUSLY before scheduling the background work.
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const resolvedUserId = opts.user_id ?? decodeJwtSub(authHeader) ?? ANON_SENTINEL;
  const credits = opts.credits ?? CREDIT_COST[opts.function_name] ?? 0.05;
  const transcriptions = opts.transcriptions ?? 0;
  const metadata = {
    ...(opts.metadata ?? {}),
    anonymous: resolvedUserId === ANON_SENTINEL,
  };

  const work = (async () => {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !serviceKey) {
        console.warn("[ai-credits] missing SUPABASE_URL or SERVICE_ROLE_KEY");
        return;
      }
      const client = admin ?? createClient(supabaseUrl, serviceKey);
      const { error } = await client.from("ai_credit_usage").insert({
        user_id: resolvedUserId,
        function_name: opts.function_name,
        credits_used: credits,
        transcriptions_used: transcriptions,
        metadata,
        was_blocked: false,
        was_bypassed: false,
      });
      if (error) {
        console.error("[ai-credits] insert failed:", error.message, "fn=", opts.function_name);
      }
    } catch (e) {
      console.error("[ai-credits] exception:", (e as Error).message, "fn=", opts.function_name);
    }
  })();

  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    try { runtime.waitUntil(work); } catch { /* noop */ }
  }
  // If EdgeRuntime.waitUntil is unavailable, the promise still runs; for
  // long-handler functions (most of ours do real AI work after this call)
  // it will complete before the isolate terminates.
}

export const AI_CREDIT_COST = CREDIT_COST;
export const AI_USAGE_ANON_SENTINEL = ANON_SENTINEL;

// ---------------------------------------------------------------------------
// Phase 5.3 — assertCreditsAvailable() [shadow / canary]
// ---------------------------------------------------------------------------
// Consulta o "quota + saldo" do usuário e decide se a chamada tem crédito
// suficiente. **Nunca lança e nunca bloqueia por conta própria** — quem
// bloqueia é o edge function chamador, olhando o campo `.ok` retornado.
//
// Enquanto `app_config.ai_credits_enforced` estiver `false` (padrão), o
// helper roda em modo *shadow*: registra motivo e `remaining`, mas `ok`
// sempre volta `true`. Isso permite validar em produção o caminho de
// "consulta quota → decide" antes de qualquer 402 real (Fase 5.4).
//
// Bypass sempre respeitado ANTES de consultar quota:
//   1. VIP (vip_users por email + fallback hardcoded)
//   2. professionals.is_partner
//   3. tier == 'unlimited' (fallback do RPC)
//
// Clínica nunca bloqueia (decisão canônica): quando o RPC devolve
// clinic_id não-nulo, força `ok:true` mesmo em enforce mode e marca
// `reason:'clinic_no_block'`.

const VIP_FALLBACK_EMAILS = [
  "gvallimoliveira@gmail.com",
  "gvallim.fisio@gmail.com",
];

export type CreditPath =
  | "anonymous"
  | "vip"
  | "partner"
  | "unlimited_tier"
  | "clinic_no_block"
  | "quota_check"
  | "shadow_error"
  | "error";

export type CreditDecision = {
  ok: boolean;
  unlimited: boolean;
  reason:
    | "vip"
    | "partner"
    | "unlimited_tier"
    | "clinic_no_block"
    | "sufficient"
    | "insufficient"
    | "anonymous"
    | "no_user"
    | "shadow_error"
    | "error";
  remaining: number | null;
  cost: number;
  enforced: boolean;
  blocked: boolean; // true apenas quando enforced && !ok
  tier?: string;
  path_taken: CreditPath;
  latency_ms: number;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget telemetry insert for a credit decision. Never throws.
 * Feeds Phase 5.3 canary — used to validate path distribution, latency,
 * and blocked-count before enabling real 402s in Phase 5.4.
 */
function logDecisionTelemetry(
  admin: SupabaseClient,
  userId: string | null,
  function_name: string,
  decision: CreditDecision,
): void {
  const work = (async () => {
    try {
      const { error } = await admin.from("ai_credit_decisions").insert({
        user_id: userId && userId !== ANON_SENTINEL ? userId : null,
        function_name,
        tier: decision.tier ?? null,
        path_taken: decision.path_taken,
        decision: decision.reason,
        ok: decision.ok,
        blocked: decision.blocked,
        enforced: decision.enforced,
        unlimited: decision.unlimited,
        remaining: decision.remaining,
        cost: decision.cost,
        latency_ms: decision.latency_ms,
        metadata: decision.metadata ?? {},
      });
      if (error) {
        console.error("[ai-credits] telemetry insert failed:", error.message, "fn=", function_name);
      }
    } catch (e) {
      console.error("[ai-credits] telemetry exception:", (e as Error).message);
    }
  })();
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    try { runtime.waitUntil(work); } catch { /* noop */ }
  }
}

async function isEnforcementOn(admin: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "ai_credits_enforced")
      .maybeSingle();
    const v = (data as { value: unknown } | null)?.value;
    return v === true || v === "true";
  } catch {
    return false;
  }
}

async function isVipEmail(admin: SupabaseClient, email: string | null): Promise<boolean> {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  if (VIP_FALLBACK_EMAILS.includes(norm)) return true;
  try {
    const { data } = await admin
      .from("vip_users")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

function decodeJwtEmail(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = token.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      payload.length + (4 - (payload.length % 4)) % 4,
      "=",
    );
    const json = JSON.parse(atob(b64));
    return typeof json?.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

/**
 * Consulta status de créditos e devolve decisão. Nunca throws.
 * O caller decide: `if (!decision.ok && decision.enforced) return 402;`
 */
export async function assertCreditsAvailable(
  req: Request,
  opts: { function_name: string; credits?: number; user_id?: string | null },
): Promise<CreditDecision> {
  const cost = opts.credits ?? AI_CREDIT_COST[opts.function_name] ?? 0.05;
  const base = {
    cost,
    enforced: false,
    blocked: false,
    remaining: null as number | null,
    unlimited: false,
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return { ...base, ok: true, reason: "shadow_error" };
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const enforced = await isEnforcementOn(admin);

    // Resolve user_id + email
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    const userId = opts.user_id ?? decodeJwtSub(authHeader);
    if (!userId || userId === ANON_SENTINEL) {
      return { ...base, enforced, ok: true, reason: "anonymous" };
    }

    // Email para VIP: tenta do JWT, senão profiles/auth
    let email = decodeJwtEmail(authHeader);
    if (!email) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        email = u?.user?.email ?? null;
      } catch { /* noop */ }
    }

    if (await isVipEmail(admin, email)) {
      return { ...base, enforced, ok: true, unlimited: true, reason: "vip" };
    }

    // Partner
    try {
      const { data: prof } = await admin
        .from("professionals")
        .select("is_partner")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof?.is_partner) {
        return { ...base, enforced, ok: true, unlimited: true, reason: "partner" };
      }
    } catch { /* noop */ }

    // Consulta consolidada
    const { data: statusData, error: statusError } = await admin.rpc(
      "get_user_credit_status",
      { _user_id: userId },
    );
    if (statusError || !statusData) {
      return { ...base, enforced, ok: true, reason: "shadow_error" };
    }
    const s = statusData as {
      tier: string;
      unlimited: boolean;
      included: number;
      used: number;
      purchased: number;
      clinic_id: string | null;
    };

    if (s.unlimited) {
      return { ...base, enforced, ok: true, unlimited: true, reason: "unlimited_tier", tier: s.tier };
    }

    if (s.clinic_id) {
      // Clínica nunca bloqueia — só reporta
      const remaining = Math.max(0, (s.included ?? 0) - (s.used ?? 0)) + (s.purchased ?? 0);
      return {
        ...base,
        enforced,
        ok: true,
        remaining,
        reason: "clinic_no_block",
        tier: s.tier,
        metadata: { included: s.included, used: s.used, purchased: s.purchased },
      };
    }

    const remainingIncluded = Math.max(0, (s.included ?? 0) - (s.used ?? 0));
    const remaining = remainingIncluded + (s.purchased ?? 0);
    const sufficient = remaining >= cost;

    return {
      ...base,
      enforced,
      ok: sufficient || !enforced, // shadow mode nunca bloqueia
      blocked: enforced && !sufficient,
      remaining,
      reason: sufficient ? "sufficient" : "insufficient",
      tier: s.tier,
      metadata: { included: s.included, used: s.used, purchased: s.purchased },
    };
  } catch (e) {
    console.error("[ai-credits] assertCreditsAvailable error:", (e as Error).message);
    return { ...base, ok: true, reason: "error" };
  }
}

