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
