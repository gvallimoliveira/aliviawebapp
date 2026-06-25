// Detecta o tipo de entidade Aliv.iA e propõe o mapeamento coluna->campo nativo
// a partir de uma amostra anonimizada de linhas.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const NATIVE_FIELDS: Record<string, string[]> = {
  patients: [
    "full_name", "email", "phone", "cpf", "birth_date", "sex",
    "occupation", "address", "notes",
  ],
  assessments: [
    "patient_name", "patient_email", "patient_phone", "patient_birth_date",
    "chief_complaint", "history", "duration", "onset",
    "aggravating_factors", "relieving_factors", "medications",
    "previous_surgeries", "comorbidities", "occupation", "complementary_exams",
    "pain_score", "pain_type", "diagnosis_text", "clinical_impression",
    "functional_tests", "created_at",
  ],
  session_notes: [
    "patient_name", "patient_email", "note_date", "subjective",
    "objective", "assessment", "plan", "content",
  ],
  pain_diary: [
    "patient_name", "patient_email", "logged_at", "pain_score", "note",
  ],
  appointments: [
    "patient_name", "patient_email", "patient_phone",
    "appointment_date", "appointment_time", "duration_minutes",
    "status", "notes",
  ],
};

const PROMPT = `Você é um assistente que mapeia dados clínicos de softwares de fisioterapia para o schema do Aliv.iA.

Receberá:
- Nome do arquivo
- Cabeçalhos (colunas) detectados
- Amostra anonimizada (até 10 linhas)
- Tipos de entidade disponíveis: ${Object.keys(NATIVE_FIELDS).join(", ")}

Sua tarefa:
1) Classifique o tipo de entidade mais provável (patients, assessments, session_notes, pain_diary, appointments).
2) Para CADA coluna de origem, indique o campo nativo equivalente OU "external" se for dado clínico relevante sem campo equivalente OU "ignore" se for irrelevante (ex: ID interno do outro sistema).
3) Atribua confiança 0-1 para cada mapeamento.

Campos nativos disponíveis por entidade:
${JSON.stringify(NATIVE_FIELDS, null, 2)}

Responda SOMENTE JSON válido:
{
  "entity": "patients|assessments|session_notes|pain_diary|appointments",
  "entity_confidence": 0.95,
  "mappings": [
    { "source": "Nome do Paciente", "target": "full_name", "confidence": 0.98 },
    { "source": "Observações livres", "target": "external", "confidence": 0.7 }
  ],
  "rationale": "Curto: por que esse tipo de entidade"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { filename, headers, sample } = await req.json();
    if (!Array.isArray(headers) || headers.length === 0) {
      return new Response(JSON.stringify({ error: "headers required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `Arquivo: ${filename ?? "desconhecido"}
Cabeçalhos: ${JSON.stringify(headers)}
Amostra (anonimizada): ${JSON.stringify((sample ?? []).slice(0, 10))}`;

    const resp = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let content = data?.choices?.[0]?.message?.content ?? "{}";
    // 4-layer JSON extraction
    let parsed: any = null;
    try { parsed = JSON.parse(content); } catch (_) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }
    if (!parsed || typeof parsed !== "object") parsed = { entity: "patients", entity_confidence: 0, mappings: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
