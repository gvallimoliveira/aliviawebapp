// Ditado da evolução do paciente: transcreve um trecho curto de áudio (WAV)
// e devolve APENAS o texto literal. Nada é salvo em banco, o áudio é descartado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 8 * 1024 * 1024; // ~8MB por trecho é folgado para 10s de WAV 16kHz

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function extFromMime(mime: string): string {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  return "wav";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Autenticação necessária." }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const audioB64: string | undefined = body?.audio_base64;
    const mime: string = typeof body?.mime_type === "string" ? body.mime_type : "audio/wav";
    const language: string | undefined = typeof body?.language === "string" ? body.language : undefined;

    if (!audioB64 || typeof audioB64 !== "string") return json({ error: "audio_base64 required" }, 400);

    const bytes = base64ToBytes(audioB64);
    if (bytes.byteLength < 2048) return json({ text: "" }); // trecho vazio/silencioso
    if (bytes.byteLength > MAX_BYTES) return json({ error: "Trecho de áudio muito grande." }, 400);

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("file", new Blob([bytes], { type: mime }), `segment.${extFromMime(mime)}`);
    // `language` só quando for um código simples (pt, en, es); vazio = detecção automática.
    if (language && /^[a-z]{2}$/.test(language)) form.append("language", language);

    const creditDecision = await canaryCredits(req, "transcribe-session-note", { credits: 0.01, metadata: { bytes: bytes.byteLength } });
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error("transcriptions error:", resp.status, errText);
      if (resp.status === 429) return json({ error: "Muitas transcrições seguidas. Aguarde alguns segundos." }, 429);
      if (resp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      return json({ error: `Falha na transcrição (${resp.status})`, details: errText }, resp.status);
    }

    const data = await resp.json().catch(() => ({}));
    const text: string = (data?.text || "").trim();


    return json({ text });
  } catch (err: any) {
    console.error("transcribe-session-note error:", err);
    return json({ error: err?.message || "Erro inesperado" }, 500);
  }
});
