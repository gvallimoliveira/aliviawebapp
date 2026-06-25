// Shared helper: calls Lovable AI Gateway with model chain fallback.
// Only falls back on 402 (credits exhausted) and 429 (rate limit).
// Any other error is returned as-is so caller logic preserves behavior.
//
// Usage:
//   const resp = await callAiWithFallback(LOVABLE_API_KEY, requestBody);
//   if (!resp.ok) { /* handle status */ }
//   const data = await resp.json();
//
// The `model` field in `body` is overridden by each attempt.

// Default chain: Flash → Flash-Lite. Pro is only used when callers explicitly
// pass it in their model chain (e.g. for hard reasoning fallbacks). Keeping Pro
// out of the default chain prevents unnecessary credit spend on routine calls.
export const DEFAULT_MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

export async function callAiWithFallback(
  apiKey: string,
  body: Record<string, unknown>,
  models: string[] = DEFAULT_MODEL_CHAIN,
): Promise<Response> {
  let lastStatus = 500;
  let lastText = "AI error";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...body, model }),
    });

    if (resp.ok) {
      if (i > 0) console.log(`[ai-fallback] succeeded with ${model} (fallback #${i})`);
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
