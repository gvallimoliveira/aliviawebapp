import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUserId } from "../_shared/caller-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Chunk-only transcription prompt (no summary). Used for every audio chunk.
const TRANSCRIBE_PROMPT_PT = `Você é um transcritor clínico. Transcreva LITERALMENTE em português o áudio fornecido. Inclua marcações [inaudível] quando necessário. Não resuma, não interprete.

Responda EXCLUSIVAMENTE em JSON válido:
{ "transcript": "transcrição literal completa do trecho" }`;

const TRANSCRIBE_PROMPT_EN = `You are a clinical transcriber. Transcribe the audio LITERALLY in English. Use [inaudible] where needed. Do not summarize or interpret.

Reply EXCLUSIVELY in valid JSON:
{ "transcript": "full literal transcription of this segment" }`;

// Summary prompt — runs once at the end over the full concatenated transcript.
const SUMMARY_PROMPT_PT = `Você é um assistente clínico de fisioterapia. Receberá a transcrição completa de uma consulta de anamnese (conversa entre fisioterapeuta e paciente).
Gere um resumo clínico estruturado focado em informações relevantes para o raciocínio clínico fisioterapêutico (D.I.F.I — Dor, Inibição, Fraqueza, Incapacidade).

Responda EXCLUSIVAMENTE em JSON válido, sem markdown, sem comentários:
{
  "summary": {
    "chiefComplaint": "queixa principal em 1 frase",
    "painHistory": "histórico da dor: início, evolução, padrão",
    "aggravatingFactors": ["fator 1", "fator 2"],
    "relievingFactors": ["fator 1", "fator 2"],
    "previousTreatments": "tratamentos anteriores e medicações relevantes",
    "redFlagsHints": ["sinais de alerta mencionados, se houver"],
    "functionalImpact": "impacto funcional relatado pelo paciente",
    "observations": "outras observações clínicas relevantes do diálogo"
  }
}
Se algum campo não tiver informação, use string vazia ou array vazio. Não invente dados.`;

const SUMMARY_PROMPT_EN = `You are a physiotherapy clinical assistant. You will receive the full transcription of an anamnesis consultation.
Generate a structured clinical summary for physiotherapy clinical reasoning.

Reply EXCLUSIVELY in valid JSON:
{
  "summary": {
    "chiefComplaint": "...",
    "painHistory": "...",
    "aggravatingFactors": ["..."],
    "relievingFactors": ["..."],
    "previousTreatments": "...",
    "redFlagsHints": ["..."],
    "functionalImpact": "...",
    "observations": "..."
  }
}
If a field has no info, use empty string or empty array. Do not invent data.`;

// 4-layer JSON extraction
function extractJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try { return JSON.parse(slice); } catch {}
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")); } catch {}
  }
  throw new Error("Could not extract valid JSON from AI response");
}

function audioFormatFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

import { callAiWithFallback } from "../_shared/ai-fallback.ts";

async function callAI(apiKey: string, body: any, fnName = "transcribe-anamnesis"): Promise<any> {
  const resp = await callAiWithFallback(apiKey, body, undefined, { functionName: fnName, maxTokens: 2000 });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI gateway error:", resp.status, errText);
    if (resp.status === 429) throw new Error("Limite de uso da IA excedido. Tente novamente em alguns minutos.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`AI gateway ${resp.status}`);
  }
  return await resp.json();
}

import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let voiceNoteId: string | null = null;

  try {
    const body = await req.json();
    const {
      voice_note_id,
      audio_base64,
      mime_type,
      storage_path,
      language,
      chunk_index = 0,
      is_final = true,
    } = body;

    if (!voice_note_id) {
      return new Response(JSON.stringify({ error: "voice_note_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only the signed-in author of the voice note may transcribe/update it,
    // and temporary audio must live under that author's own folder.
    const __callerId = await getAuthUserId(req);
    if (!__callerId) {
      return new Response(JSON.stringify({ error: "Autenticação necessária." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: __note } = await admin
      .from("assessment_voice_notes").select("id, created_by").eq("id", voice_note_id).maybeSingle();
    if (!__note || __note.created_by !== __callerId) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (storage_path && !String(storage_path).startsWith(`${__callerId}/${voice_note_id}/`)) {
      return new Response(JSON.stringify({ error: "Caminho inválido." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    voiceNoteId = voice_note_id;
    const creditDecision = await canaryCredits(req, body.summary_only ? "transcribe-anamnesis-summary" : "transcribe-anamnesis-chunk", { credits: body.summary_only ? 0.05 : is_final ? 0.10 : 0.05, metadata: { voice_note_id, chunk_index } });
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    // Resgate: gerar apenas o resumo a partir da transcrição já salva
    // (usado quando o último trecho de áudio não pôde ser enviado).
    if (body.summary_only) {
      const { data: row, error: rowErr } = await admin
        .from("assessment_voice_notes")
        .select("transcript")
        .eq("id", voice_note_id)
        .single();
      if (rowErr) throw rowErr;
      const transcript = (row?.transcript || "").trim();
      if (!transcript) throw new Error("No transcript to summarize");

      const isPtOnly = (language || "pt") === "pt";
      const resp = await callAI(LOVABLE_API_KEY, {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: isPtOnly ? SUMMARY_PROMPT_PT : SUMMARY_PROMPT_EN },
          { role: "user", content: transcript },
        ],
      });
      let summary: any = {};
      try {
        const parsed = extractJson(resp?.choices?.[0]?.message?.content || "");
        summary = parsed.summary || parsed || {};
      } catch (e) {
        console.error("summary_only parse failed:", e);
      }
      await admin
        .from("assessment_voice_notes")
        .update({ status: "ready", summary, error: null })
        .eq("id", voice_note_id);
      return new Response(JSON.stringify({ ok: true, summary_only: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let audioB64: string | null = audio_base64 || null;
    const audioMime = mime_type || "audio/webm";

    if (!audioB64 && storage_path) {
      const { data: file, error: dlErr } = await admin.storage
        .from("voice-notes-tmp")
        .download(storage_path);
      if (dlErr) throw new Error(`Storage download failed: ${dlErr.message}`);
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      audioB64 = btoa(binary);
    }
    if (!audioB64) throw new Error("No audio provided");

    const isPt = (language || "pt") === "pt";
    const transcribePrompt = isPt ? TRANSCRIBE_PROMPT_PT : TRANSCRIBE_PROMPT_EN;

    // 1) Transcribe just this chunk
    const transcribeResp = await callAI(LOVABLE_API_KEY, {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: transcribePrompt },
        {
          role: "user",
          content: [
            { type: "input_audio", input_audio: { data: audioB64, format: audioFormatFromMime(audioMime) } },
            { type: "text", text: isPt ? "Transcreva este trecho." : "Transcribe this segment." },
          ],
        },
      ],
    });
    const chunkContent = transcribeResp?.choices?.[0]?.message?.content || "";
    const chunkParsed = extractJson(chunkContent);
    const chunkTranscript: string = (chunkParsed.transcript || "").trim();

    // 2) Append to existing transcript on the row
    const { data: existing, error: selErr } = await admin
      .from("assessment_voice_notes")
      .select("transcript")
      .eq("id", voice_note_id)
      .single();
    if (selErr) throw selErr;

    const prev = (existing?.transcript || "").trim();
    const separator = prev ? "\n\n" : "";
    const fullTranscript = prev + separator + chunkTranscript;

    // Update transcript immediately
    await admin
      .from("assessment_voice_notes")
      .update({
        transcript: fullTranscript,
        status: is_final ? "processing" : "processing", // keep processing until summary done
      })
      .eq("id", voice_note_id);

    // Shadow log this transcription chunk (no enforcement).


    // 3) If final chunk → generate summary over the full transcript
    if (is_final) {

      const summaryPrompt = isPt ? SUMMARY_PROMPT_PT : SUMMARY_PROMPT_EN;
      const summaryResp = await callAI(LOVABLE_API_KEY, {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: summaryPrompt },
          { role: "user", content: fullTranscript || (isPt ? "(transcrição vazia)" : "(empty transcript)") },
        ],
      });
      const summaryContent = summaryResp?.choices?.[0]?.message?.content || "";
      let summary: any = {};
      try {
        const parsed = extractJson(summaryContent);
        summary = parsed.summary || parsed || {};
      } catch (e) {
        console.error("Summary parse failed:", e);
      }

      await admin
        .from("assessment_voice_notes")
        .update({ status: "ready", summary, error: null })
        .eq("id", voice_note_id);
    }

    // 4) Cleanup tmp file for this chunk
    if (storage_path) {
      await admin.storage.from("voice-notes-tmp").remove([storage_path]).catch(() => {});
    }

    return new Response(JSON.stringify({
      ok: true,
      chunk_index,
      is_final,
      chunk_transcript_chars: chunkTranscript.length,
      transcript_chars: fullTranscript.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("transcribe-anamnesis error:", err);
    if (voiceNoteId) {
      // Nunca descartar transcrição parcial já salva: nesse caso a nota fica
      // pronta com o texto que existe, em vez de virar "falhou".
      const { data: row } = await admin
        .from("assessment_voice_notes")
        .select("transcript")
        .eq("id", voiceNoteId)
        .maybeSingle();
      const partial = (row?.transcript || "").trim();
      await admin.from("assessment_voice_notes").update(
        partial
          ? { status: "ready", error: null }
          : { status: "failed", error: err?.message || "Unknown error" },
      ).eq("id", voiceNoteId).catch(() => {});
    }
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
