// Shared AI response cache backed by public.ai_response_cache.
// Goal: avoid regenerating identical AI outputs and burn fewer credits.
//
// Usage:
//   const cached = await getCachedAiResponse(admin, "suggest-functional-tests", payload);
//   if (cached) return cached;
//   const fresh = await callAi(...);
//   await setCachedAiResponse(admin, "suggest-functional-tests", payload, fresh, 7 * 24 * 3600);

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Stable JSON stringify (sorted keys) so equivalent payloads map to same hash.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

export async function buildCacheKey(functionName: string, payload: unknown): Promise<string> {
  const body = stableStringify(payload);
  const hash = await sha256(body);
  return `${functionName}:${hash}`;
}

export async function getCachedAiResponse<T = unknown>(
  admin: SupabaseClient,
  functionName: string,
  payload: unknown,
): Promise<T | null> {
  try {
    const key = await buildCacheKey(functionName, payload);
    const { data, error } = await admin
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    // fire-and-forget hit counter
    admin.rpc; // no-op to satisfy lint
    admin
      .from("ai_response_cache")
      .update({ hit_count: (data as any).hit_count ? (data as any).hit_count + 1 : 1 })
      .eq("cache_key", key)
      .then(() => {}, () => {});
    return data.response as T;
  } catch (err) {
    console.warn("[ai-cache] get failed:", err);
    return null;
  }
}

export async function setCachedAiResponse(
  admin: SupabaseClient,
  functionName: string,
  payload: unknown,
  response: unknown,
  ttlSeconds = 7 * 24 * 3600,
): Promise<void> {
  try {
    const key = await buildCacheKey(functionName, payload);
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await admin.from("ai_response_cache").upsert(
      { cache_key: key, function_name: functionName, response, expires_at, hit_count: 0 },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.warn("[ai-cache] set failed:", err);
  }
}
