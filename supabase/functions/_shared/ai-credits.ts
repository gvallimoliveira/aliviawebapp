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

import { creditAvailability, BLOCKABLE_TIERS, mayBlock } from "./ai-credit-policy.ts";

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
  /**
   * Marca a linha como consumo NÃO faturável (VIP, tier ilimitado).
   * Crítico: `get_user_credit_status` soma o pool da clínica por membro e
   * ignora linhas com was_bypassed=true. Sem isso, um VIP dentro de
   * uma clínica queimaria a cota do time inteiro.
   */
  was_bypassed?: boolean;
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
  let resolvedUserId = ANON_SENTINEL;
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
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        const { data, error: identityError } = await client.auth.getUser(token);
        if (!identityError && data.user?.id && (!opts.user_id || opts.user_id === data.user.id)) resolvedUserId = data.user.id;
      }
      metadata.anonymous = resolvedUserId === ANON_SENTINEL;
      const { error } = await client.from("ai_credit_usage").insert({
        user_id: resolvedUserId,
        function_name: opts.function_name,
        credits_used: credits,
        transcriptions_used: transcriptions,
        metadata,
        was_blocked: false,
        was_bypassed: opts.was_bypassed ?? false,
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
//   3. tier == 'unlimited' (fallback do RPC)
//
// Clínica tem política de carência (canônico 2026-07): quando o RPC devolve
// clinic_id não-nulo, o pool da equipe ganha 20% de carência sobre o incluso
// antes de qualquer bloqueio. A ordem é:
//   incluso → carência 20% → saldo de pacotes avulsos → soft-block
// Enquanto estiver dentro da carência, `ok:true` e `reason:'clinic_grace'`.

// Carência da clínica: 20% acima da cota inclusa antes de consumir pacotes.
export const CLINIC_GRACE_RATIO = 1.2;

const VIP_FALLBACK_EMAILS = [
  "gvallimoliveira@gmail.com",
  "gvallim.fisio@gmail.com",
];

export type CreditPath =
  | "anonymous"
  | "vip"
  | "partner"
  | "unlimited_tier"
  | "clinic_grace"
  | "clinic_quota_check"
  | "quota_check"
  | "fail_open"
  | "shadow_error"
  | "error";

export type CreditDecision = {
  ok: boolean;
  unlimited: boolean;
  reason:
    | "vip"
    | "partner"
    | "unlimited_tier"
    | "clinic_grace"
    | "sufficient"
    | "insufficient"
    | "anonymous"
    | "no_user"
    | "fail_open"
    | "shadow_error"
    | "error";
  remaining: number | null;
  cost: number;
  enforced: boolean;
  blocked: boolean; // true apenas quando o tier está na allowlist && !ok
  tier?: string;
  trial?: boolean;
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

// Tiers cujo saldo é confiável o suficiente para virar bloqueio real.
// Qualquer tier fora desta lista NUNCA bloqueia (fail-open), mesmo com a
// flag global ligada — inclui 'unknown' (email não resolvido) e tiers novos.
export { BLOCKABLE_TIERS };

type EnforcementConfig = {
  /** flag global (app_config.ai_credits_enforced) */
  global: boolean;
  /** allowlist de tiers efetivamente bloqueáveis (app_config.ai_credits_enforced_tiers) */
  tiers: string[];
};

/**
 * Lê a configuração de enforcement. Duas travas independentes:
 *   1. `ai_credits_enforced` (global on/off — kill switch)
 *   2. `ai_credits_enforced_tiers` (allowlist de tiers; ausente/vazia = NINGUÉM bloqueia)
 * A allowlist existe porque a flag global já está `true` em produção só para
 * telemetria: sem allowlist preenchida, a 5.4 não pode escapar por acidente.
 */
async function readEnforcement(admin: SupabaseClient): Promise<EnforcementConfig> {
  try {
    const { data } = await admin
      .from("app_config")
      .select("key, value")
      .in("key", ["ai_credits_enforced", "ai_credits_enforced_tiers"]);
    const rows = (data ?? []) as Array<{ key: string; value: unknown }>;
    const g = rows.find((r) => r.key === "ai_credits_enforced")?.value;
    const t = rows.find((r) => r.key === "ai_credits_enforced_tiers")?.value;
    let tiers: string[] = [];
    if (Array.isArray(t)) tiers = t.filter((x): x is string => typeof x === "string");
    else if (typeof t === "string") {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) tiers = parsed.filter((x): x is string => typeof x === "string");
      } catch { /* noop */ }
    }
    return { global: g === true || g === "true", tiers };
  } catch {
    return { global: false, tiers: [] };
  }
}

/** Só bloqueia se a flag global E o tier estiver na allowlist E for bloqueável. */
function canBlock(cfg: EnforcementConfig, tier: string | null | undefined): boolean {
  if (!cfg.global || !tier) return false;
  if (!(BLOCKABLE_TIERS as readonly string[]).includes(tier)) return false;
  return mayBlock(cfg.global, cfg.tiers, tier);
}

async function isVipEmail(admin: SupabaseClient, email: string | null): Promise<boolean> {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  if (VIP_FALLBACK_EMAILS.includes(norm)) return true;
  try {
    // escapa curingas do LIKE para não casar e-mail errado (ex.: "a_b@x.com")
    const safe = norm.replace(/[\\%_]/g, "\\$&");
    const { data } = await admin
      .from("vip_users")
      .select("email")
      .ilike("email", safe)
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

// Cache de bypass por isolate (5 min). VIP/ilimitado não mudam de
// minuto a minuto, e é justamente esse caminho que somava ~0,5–2s de latência
// no canário (getUserById + vip_users + professionals + RPC). Só cacheia
// decisões ilimitadas — nunca decisões que possam bloquear.
type BypassEntry = { unlimited: true; reason: "vip" | "partner" | "unlimited_tier"; path: CreditPath; tier?: string; at: number };
const BYPASS_TTL_MS = 5 * 60 * 1000;
const bypassCache = new Map<string, BypassEntry>();

/**
 * Consulta status de créditos e devolve decisão. Nunca throws.
 * O caller decide: `if (!decision.ok && decision.enforced) return 402;`
 */
export async function assertCreditsAvailable(
  req: Request,
  opts: { function_name: string; credits?: number; user_id?: string | null },
): Promise<CreditDecision> {

  const t0 = Date.now();
  const cost = opts.credits ?? AI_CREDIT_COST[opts.function_name] ?? 0.05;
  const base = {
    cost,
    enforced: false,
    blocked: false,
    remaining: null as number | null,
    unlimited: false,
  };

  // Helper: finalize decision with latency + fire-and-forget telemetry insert.
  const finalize = (
    admin: SupabaseClient | null,
    userId: string | null,
    partial: Omit<CreditDecision, "latency_ms">,
  ): CreditDecision => {
    const decision: CreditDecision = { ...partial, latency_ms: Date.now() - t0 };
    if (admin) {
      logDecisionTelemetry(admin, userId, opts.function_name, decision);
    }
    return decision;
  };

  let admin: SupabaseClient | null = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return finalize(null, null, {
        ...base, ok: true, reason: "shadow_error", path_taken: "shadow_error",
      });
    }
    admin = createClient(supabaseUrl, serviceKey);
    const cfg = await readEnforcement(admin);
    const enforced = cfg.global;


    // Validate identity before entitlement decisions; decoded claims are logging-only.
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return finalize(admin, null, { ...base, enforced, ok: true, reason: "anonymous", path_taken: "anonymous" });
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    const userId = identity.user?.id;
    if (identityError || !userId || (opts.user_id && opts.user_id !== userId)) {
      return finalize(admin, null, { ...base, enforced, ok: true, reason: "fail_open", path_taken: "fail_open", metadata: { fail_open_cause: "invalid_identity" } });
    }
    const email = identity.user?.email ?? null;
    const emailResolved = !!email;
    if (await isVipEmail(admin, email)) {
      bypassCache.set(userId, { unlimited: true, reason: "vip", path: "vip", at: Date.now() });
      return finalize(admin, userId, {
        ...base, enforced, ok: true, unlimited: true, reason: "vip", path_taken: "vip",
      });
    }

    // Se não conseguimos nem descobrir o e-mail, não temos como afirmar que a
    // pessoa NÃO é VIP → fail-open explícito (nunca bloqueia).
    if (!emailResolved) {
      return finalize(admin, userId, {
        ...base, enforced, ok: true, reason: "fail_open", path_taken: "fail_open",
        metadata: { fail_open_cause: "email_unresolved" },
      });
    }

    const isStudent = false;

    // Consulta consolidada
    const { data: statusData, error: statusError } = await admin.rpc(
      "get_user_credit_status",
      { _user_id: userId },
    );
    if (statusError || !statusData) {
      return finalize(admin, userId, {
        ...base, enforced, ok: true, reason: "shadow_error", path_taken: "shadow_error",
        metadata: { error: statusError?.message },
      });
    }
    const s = statusData as {
      tier: string;
      unlimited: boolean;
      included: number;
      used: number;
      purchased: number;
      clinic_id: string | null;
      trial?: boolean;
    };

    if (s.unlimited) {
      bypassCache.set(userId, {
        unlimited: true, reason: "unlimited_tier", path: "unlimited_tier", tier: s.tier, at: Date.now(),
      });
      return finalize(admin, userId, {
        ...base, enforced, ok: true, unlimited: true, reason: "unlimited_tier",
        path_taken: "unlimited_tier", tier: s.tier,
      });
    }

    // ---- Fail-open guards: casos em que o tier não é confiável -------------
    // (a) tier desconhecido / não bloqueável (novo plano, e-mail sem match);
    // (b) incluso 0 sem pacote — quase sempre classificação errada, não
    //     usuário legítimo sem plano;
    // (c) estudante cujo cadastro acadêmico está incompleto (academic_period
    //     nulo cai em premium_b2c=15 em vez de academic=60).
    const failOpenCause =
      !(BLOCKABLE_TIERS as readonly string[]).includes(s.tier)
        ? "tier_not_blockable"
        : (s.included ?? 0) <= 0 && (s.purchased ?? 0) <= 0
          ? "zero_included"
          : isStudent && s.tier === "premium_b2c"
            ? "student_tier_mismatch"
            : null;
    if (failOpenCause) {
      return finalize(admin, userId, {
        ...base, enforced, ok: true, reason: "fail_open", path_taken: "fail_open", tier: s.tier,
        metadata: {
          fail_open_cause: failOpenCause,
          included: s.included, used: s.used, purchased: s.purchased,
        },
      });
    }

    // O teste PRO de 7 dias bloqueia sempre ao fim dos 5 créditos, mesmo com o
    // rollout geral em modo sombra.
    const blockable = s.trial === true || canBlock(cfg, s.tier);

    const available = creditAvailability({ ...s, pooled: !!s.clinic_id && s.tier.startsWith("clinic_") }, cost);
    return finalize(admin, userId, {
      ...base, enforced, ok: available.sufficient || !blockable,
      blocked: blockable && !available.sufficient,
      remaining: available.remaining,
      reason: available.sufficient ? "sufficient" : "insufficient",
      path_taken: s.clinic_id ? "clinic_quota_check" : "quota_check", tier: s.tier,
      trial: s.trial === true,
      metadata: { included: s.included, used: s.used, purchased: s.purchased,
        clinic_id: s.clinic_id, grace_ratio: available.ratio, grace_limit: available.limit,
        blockable, enforced_tiers: cfg.tiers, trial: s.trial === true },
    });

  } catch (e) {
    console.error("[ai-credits] assertCreditsAvailable error:", (e as Error).message);
    return finalize(admin, null, {
      ...base, ok: true, reason: "error", path_taken: "error",
      metadata: { error: (e as Error).message },
    });
  }
}



// ---------------------------------------------------------------------------
// Fase 5.3 — canário: um único ponto de entrada por edge function
// ---------------------------------------------------------------------------
// Roda a decisão de crédito em modo shadow (nunca bloqueia), imprime o caminho
// no log e registra o uso já com o motivo/saldo no metadata. A Fase 5.4 só
// precisa checar `decision.blocked` para devolver 402.
export async function canaryCredits(
  req: Request,
  function_name: string,
  opts: { user_id?: string | null; credits?: number; metadata?: Record<string, unknown> } = {},
): Promise<CreditDecision> {
  const decision = await assertCreditsAvailable(req, {
    function_name,
    user_id: opts.user_id,
    credits: opts.credits,
  });
  console.log(`[ai-credits] ${function_name} decision:`, JSON.stringify({
    reason: decision.reason,
    path: decision.path_taken,
    remaining: decision.remaining,
    enforced: decision.enforced,
    blocked: decision.blocked,
    tier: decision.tier,
    latency_ms: decision.latency_ms,
  }));
  if (!decision.blocked) shadowLogAiUsage(req, {
    function_name,
    user_id: opts.user_id,
    credits: opts.credits,
    // VIP/ilimitado não consome cota nem queima o pool da clínica.
    was_bypassed: decision.unlimited,

    metadata: {
      ...(opts.metadata ?? {}),
      credit_reason: decision.reason,
      credit_path: decision.path_taken,
      credit_remaining: decision.remaining,
      credit_enforced: decision.enforced,
      credit_blocked: decision.blocked,
      credit_tier: decision.tier ?? null,
      credit_latency_ms: decision.latency_ms,
    },
  });
  return decision;
}

/** Only an application quota block carries this code; provider funding errors are distinct. */
export function creditBlockResponse(decision: CreditDecision, cors: Record<string, string>): Response | null {
  if (!decision.blocked) return null;
  return new Response(JSON.stringify({ error: "alivia_credit_limit", tier: decision.tier, trial: decision.trial === true }), {
    status: 402, headers: { ...cors, "Content-Type": "application/json" },
  });
}
