import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_PT = `Você é um assistente clínico de fisioterapia. Receberá um áudio de uma consulta de anamnese (conversa entre fisioterapeuta e paciente).
Sua tarefa: (1) transcrever literalmente o áudio em português, (2) gerar um resumo clínico estruturado focado em informações relevantes para o raciocínio clínico fisioterapêutico (D.I.F.I — Dor, Inibição, Fraqueza, Incapacidade).

Responda EXCLUSIVAMENTE em JSON válido, sem markdown, sem comentários, no seguinte formato:
{
  "transcript": "transcrição literal completa",
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

const SYSTEM_PROMPT_EN = `You are a physiotherapy clinical assistant. You will receive an audio of an anamnesis consultation (dialogue between physiotherapist and patient).
Your task: (1) literally transcribe the audio in English, (2) generate a structured clinical summary focused on physiotherapy clinical reasoning.

Reply EXCLUSIVELY in valid JSON, no markdown, no comments:
{
  "transcript": "full literal transcription",
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
  // 1. direct parse
  try { return JSON.parse(text); } catch {}
  // 2. strip markdown fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // 3. find first { ... last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try { return JSON.parse(slice); } catch {}
    // 4. cleanup trailing commas
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")); } catch {}
  }
  throw new Error("Could not extract valid JSON from AI response");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    const { voice_note_id, audio_base64, mime_type, storage_path, language } = body;

    if (!voice_note_id) {
      return new Response(JSON.stringify({ error: "voice_note_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    voiceNoteId = voice_note_id;

    let audioB64: string | null = audio_base64 || null;
    let audioMime = mime_type || "audio/webm";

    // If audio is in storage, download it
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

    if (!audioB64) {
      throw new Error("No audio provided");
    }

    const isPt = (language || "pt") === "pt";
    const systemPrompt = isPt ? SYSTEM_PROMPT_PT : SYSTEM_PROMPT_EN;

    // Call Lovable AI Gateway with audio inline
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: audioB64,
                  format: audioMime.includes("webm") ? "webm" : audioMime.includes("mp4") || audioMime.includes("m4a") ? "mp4" : audioMime.includes("ogg") ? "ogg" : "webm",
                },
              },
              { type: "text", text: isPt ? "Transcreva e resuma esta consulta." : "Transcribe and summarize this consultation." },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) throw new Error("Limite de uso da IA excedido. Tente novamente em alguns minutos.");
      if (aiResp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);

    const transcript = parsed.transcript || "";
    const summary = parsed.summary || {};

    await admin.from("assessment_voice_notes").update({
      status: "ready",
      transcript,
      summary,
      error: null,
    }).eq("id", voice_note_id);

    // Cleanup tmp file
    if (storage_path) {
      await admin.storage.from("voice-notes-tmp").remove([storage_path]).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, transcript, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("transcribe-anamnesis error:", err);
    if (voiceNoteId) {
      await admin.from("assessment_voice_notes").update({
        status: "failed",
        error: err?.message || "Unknown error",
      }).eq("id", voiceNoteId).catch(() => {});
    }
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
