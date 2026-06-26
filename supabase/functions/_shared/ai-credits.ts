// Shadow tracking helper for AI workspace credit usage.
//
// Phase 2 (Shadow Tracking): never blocks, never errors out the caller.
// Inserts one row in public.ai_credit_usage per AI call so we can build
// dashboards and verify the cost model before turning on enforcement.
//
// Enforcement (Phase 4+) will gate on app_config key `ai_credits_enforced`.
// Until then, this helper only writes — it does not read quotas.
//
// Usage:
//   import { shadowLogAiUsage } from "../_shared/ai-credits.ts";
//   await shadowLogAiUsage(req, admin, { function_name: "generate-diagnosis" });
//
// Caller is responsible for creating the admin (service-role) client.
// We read the user JWT from the request to attribute usage; if we can't
// resolve a user (anon/admin/cron), the call is silently skipped so this
// helper can be sprinkled freely without risk.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Estimated credit cost per AI function call (Lovable workspace credits).
// Source: internal AI cost plan (see .agents/memory/business/ai-credits-plan-ideas.md).
// These are estimates used during shadow tracking; real values will be
// reconciled against the AI gateway billing once we have a few weeks of data.
const CREDIT_COST: Record<string, number> = {
  // Heavy reasoning (Gemini 2.5 Pro)
  "generate-diagnosis": 0.30,
  "generate-treatment": 0.30,
  "generate-progression-suggestion": 0.25,
  "generate-evolution-summary": 0.25,
  "agent-generate-hep": 0.20,
  "interpret-external-assessment": 0.20,
  "import-detect-schema": 0.15,
  "generate-blog-article": 0.30,
  // Mid-tier (Gemini Flash)
  "generate-clinical-impression": 0.10,
  "detect-functional-limitation": 0.08,
  "suggest-specialty-questionnaires": 0.05,
  "suggest-functional-tests": 0.05,
  "extract-dynamometry": 0.05,
  "parse-schedule-image": 0.10,
  // Lightweight / cached (Flash-Lite)
  "clinical-agent-chat": 0.05,
  "agent-knowledge": 0.05,
  // Audio
  "transcribe-anamnesis-chunk": 0.05,
  "transcribe-anamnesis-summary": 0.05,
};

type LogOptions = {
  function_name: string;
  /** Override the default credit cost from CREDIT_COST table. */
  credits?: number;
  /** Number of transcription units consumed (audio chunks); used by the
   *  transcription package gate later on. */
  transcriptions?: number;
  /** Extra context for analytics (model used, token counts, niche…). */
  metadata?: Record<string, unknown>;
  /** Pre-resolved user id when the caller already knows it (e.g. looked it
   *  up from a row owned by the user). Skips the JWT decode. */
  user_id?: string | null;
};

async function resolveUserId(
  req: Request,
  supabaseUrl: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return null;
  try {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await client.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget shadow log. Never throws, never blocks.
 * Returns the resolved user id so callers can reuse it if needed.
 *
 * `admin` is optional — if omitted, the helper creates its own service-role
 * client. Callers that already have one can pass it to avoid duplication.
 */
export async function shadowLogAiUsage(
  req: Request,
  opts: LogOptions,
  admin?: SupabaseClient,
): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) return null;

    const userId = opts.user_id ?? (await resolveUserId(req, supabaseUrl));
    if (!userId) return null;

    const client = admin ?? createClient(supabaseUrl, serviceKey);
    const credits = opts.credits ?? CREDIT_COST[opts.function_name] ?? 0.05;
    const transcriptions = opts.transcriptions ?? 0;

    // IMPORTANT: Supabase Edge Functions kill the worker as soon as the
    // response is sent, which cancels in-flight fetches (the insert ends up
    // dropped). We must register the background work with `EdgeRuntime.waitUntil`
    // so the runtime keeps the worker alive until the insert resolves.
    const insertPromise = client
      .from("ai_credit_usage")
      .insert({
        user_id: userId,
        function_name: opts.function_name,
        credits_used: credits,
        transcriptions_used: transcriptions,
        metadata: opts.metadata ?? {},
        was_blocked: false,
        was_bypassed: false,
      })
      .then(({ error }) => {
        if (error) console.warn("[ai-credits] shadow log failed:", error.message);
      })
      .catch((e) => {
        console.warn("[ai-credits] shadow log threw:", (e as Error).message);
      });

    // `EdgeRuntime` is only defined inside Supabase Edge Functions; guard for
    // local/test environments and fall back to awaiting inline.
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime && typeof runtime.waitUntil === "function") {
      runtime.waitUntil(insertPromise);
    } else {
      await insertPromise;
    }

    return userId;
  } catch (e) {
    console.warn("[ai-credits] shadow log exception:", (e as Error).message);
    return null;
  }
}

export const AI_CREDIT_COST = CREDIT_COST;
