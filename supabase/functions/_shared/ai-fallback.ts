// Shared helper: calls Lovable AI Gateway with model chain fallback.
// Only falls back on 402 (credits exhausted) and 429 (rate limit).
// Any other error is returned as-is so caller logic preserves behavior.
//
// Usage:
//   const resp = await callAiWithFallback(LOVABLE_API_KEY, requestBody, models, {
//     functionName: "generate-treatment",
//     maxTokens: 2500,
//   });
//   if (!resp.ok) { /* handle status */ }
//   const data = await resp.json();
//
// The `model` field in `body` is overridden by each attempt.
//
// Cost controls (2026-07):
//   1. Token telemetry — every successful JSON response has its `usage` block
//      logged (fire-and-forget) into public.ai_token_usage so we can measure
//      the REAL cost per credit charged.
//   2. Output caps — `max_tokens` is applied when the caller provides one via
//      opts.maxTokens (or already sets it in the body). Prevents runaway
//      verbose generations from inflating cost with no clinical gain.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Default chain: Flash → Flash-Lite. Pro is intentionally NEVER in the default
// chain nor in routine chains — it costs multiples of Flash for tasks where
// Flash already delivers. Only add it explicitly for hard reasoning fallbacks.
export const DEFAULT_MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

export type AiCallOptions = {
  /** Used only for cost telemetry attribution. */
  functionName?: string;
  /** Output cap. Applied when the body does not already define max_tokens. */
  maxTokens?: number;
  /** Extra metadata stored with the token telemetry row. */
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget token telemetry. Never throws, never blocks the caller. */
export function logAiTokenUsage(params: {
  functionName: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  fallbackIndex?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const work = (async () => {
    try {
      const url = Deno.env.get("SUPABASE_URL") ?? "";
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!url || !key) return;
      const admin = createClient(url, key);
      const u = params.usage ?? {};
      const { error } = await admin.from("ai_token_usage").insert({
        function_name: params.functionName,
        model: params.model,
        prompt_tokens: u.prompt_tokens ?? null,
        completion_tokens: u.completion_tokens ?? null,
        total_tokens: u.total_tokens ??
          (((u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0)) || null),
        fallback_index: params.fallbackIndex ?? 0,
        latency_ms: params.latencyMs ?? null,
        metadata: params.metadata ?? {},
      });
      if (error) console.error("[ai-tokens] insert failed:", error.message);
    } catch (e) {
      console.error("[ai-tokens] exception:", (e as Error).message);
    }
  })();

  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    try { runtime.waitUntil(work); } catch { /* noop */ }
  }
}

/** Reads `usage` from a successful gateway response without consuming it. */
function captureUsage(
  resp: Response,
  functionName: string,
  model: string,
  fallbackIndex: number,
  latencyMs: number,
  metadata?: Record<string, unknown>,
): void {
  const ct = resp.headers.get("content-type") ?? "";
  // Streaming responses (SSE) can't be cloned/parsed safely here.
  if (!ct.includes("json")) return;
  let clone: Response;
  try { clone = resp.clone(); } catch { return; }
  const work = (async () => {
    try {
      const json = await clone.json();
      logAiTokenUsage({
        functionName,
        model,
        usage: json?.usage ?? null,
        fallbackIndex,
        latencyMs,
        metadata,
      });
    } catch { /* noop */ }
  })();
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    try { runtime.waitUntil(work); } catch { /* noop */ }
  }
}

export async function callAiWithFallback(
  apiKey: string,
  body: Record<string, unknown>,
  models: string[] = DEFAULT_MODEL_CHAIN,
  opts: AiCallOptions = {},
): Promise<Response> {
  let lastStatus = 500;
  let lastText = "AI error";

  const finalBody: Record<string, unknown> = { ...body };
  if (finalBody.max_tokens == null && opts.maxTokens != null) {
    finalBody.max_tokens = opts.maxTokens;
  }

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const startedAt = Date.now();
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...finalBody, model }),
    });

    if (resp.ok) {
      if (i > 0) console.log(`[ai-fallback] succeeded with ${model} (fallback #${i})`);
      if (opts.functionName) {
        captureUsage(resp, opts.functionName, model, i, Date.now() - startedAt, opts.metadata);
      }
      return resp;
    }

    const text = await resp.text();
    lastStatus = resp.status;
    lastText = text;
    console.error(`[ai-fallback] ${model} -> ${resp.status}: ${text.slice(0, 200)}`);

    // Only retry on credit exhaustion or rate limit
    if (resp.status !== 402 && resp.status !== 429) {
      return new Response(text, { status: resp.status });
    }
    // else: continue to next model
  }

  return new Response(lastText, { status: lastStatus });
}
