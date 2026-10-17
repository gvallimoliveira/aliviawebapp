// Extract joint mobility (ROM) and muscle flexibility measurements from an
// uploaded image or PDF. Returns { rows: [{ joint, leftValue, rightValue }] }
// where values carry their unit ("°" or "cm"). The file is NOT stored.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { shadowLogAiUsage } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";

const MODEL_CHAIN = ["google/gemini-3.1-pro-preview", "google/gemini-3.8-flash", "google/gemini-3.1-flash-lite"];
const PROMPT_VERSION = "rom-v1";

const PROMPT = `Você é um assistente clínico de fisioterapia que lê fichas, laudos, prints de apps e fotos de GONIOMETRIA, INCLINOMETRIA e testes de FLEXIBILIDADE MUSCULAR.
Extraia TODAS as medidas visíveis e devolva pela ferramenta "return_rom". Nunca escreva texto livre.
REGRAS:
1. Cada medida = um movimento/teste com valor do lado esquerdo e/ou direito. Identifique lados por Esq/Dir, E/D, L/R, Left/Right.
2. Inclua ADM articular (flexão, extensão, abdução, rotações etc. de qualquer articulação) e flexibilidade (elevação da perna estendida/SLR, ângulo poplíteo, Thomas, Ely, sentar e alcançar, lunge/dorsiflexão em carga, etc.).
3. Nome do movimento em português, com a articulação (ex.: "Flexão de joelho", "Elevação da perna estendida (isquiotibiais)").
4. Valores com unidade: graus como "120°", centímetros como "12 cm". Ponto decimal.
5. Teste sem lado (ex.: sentar e alcançar): coloque o valor em leftValue e deixe rightValue vazio, e notes="bilateral".
6. Se houver várias tentativas do mesmo lado, use a MAIOR.
7. Nunca invente valores; omita o que não está legível.`;

const TOOLS = [{
  type: "function",
  function: {
    name: "return_rom",
    description: "Return every mobility/flexibility measurement found.",
    parameters: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              joint: { type: "string" },
              leftValue: { type: "string" },
              rightValue: { type: "string" },
              notes: { type: "string" },
            },
            required: ["joint"],
            additionalProperties: false,
          },
        },
      },
      required: ["rows"],
      additionalProperties: false,
    },
  },
}];

function safeJsonExtract(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const stripped = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* */ }
  const a = stripped.indexOf("{"), b = stripped.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(stripped.slice(a, b + 1)); } catch { /* */ } }
  const m = stripped.match(/"rows"\s*:\s*(\[[\s\S]*?\])/);
  if (m) { try { return { rows: JSON.parse(m[1]) }; } catch { /* */ } }
  return { rows: [] };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Ensures a value carries a unit: bare numbers default to degrees. */
const withUnit = (v: unknown): string => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/cm|°|º|graus?/i.test(s)) return s.replace(/º/g, "°").replace(/\s*graus?/i, "°");
  return /^-?\d+([.,]\d+)?$/.test(s) ? `${s}°` : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    shadowLogAiUsage(req, { function_name: "extract-rom" });
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const { fileBase64, mimeType, fileName } = (await req.json().catch(() => ({}))) as Record<string, string>;
    if (!fileBase64 || typeof fileBase64 !== "string") return json({ error: "fileBase64 required" }, 400);
    if (fileBase64.length > 15_000_000) return json({ error: "Arquivo muito grande" }, 413);

    const URL_ = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = URL_ && KEY ? createClient(URL_, KEY) : null;
    const cachePayload = { fileBase64, mimeType: mimeType || "", promptVersion: PROMPT_VERSION };
    if (admin) {
      const cached = await getCachedAiResponse<{ rows: unknown[] }>(admin, "extract-rom", cachePayload);
      if (cached) return json({ ...cached, cached: true });
    }

    const mt = (mimeType || "").toLowerCase();
    const content: Array<Record<string, unknown>> = [{ type: "text", text: "Extraia todas as medidas de mobilidade articular e flexibilidade deste arquivo." }];
    if (mt.includes("pdf")) {
      content.push({ type: "file", file: { filename: fileName || "ficha.pdf", file_data: `data:application/pdf;base64,${fileBase64}` } });
    } else {
      content.push({ type: "image_url", image_url: { url: `data:${mt || "image/jpeg"};base64,${fileBase64}` } });
    }

    const aiResp = await callAiWithFallback(
      apiKey,
      {
        messages: [{ role: "system", content: PROMPT }, { role: "user", content }],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "return_rom" } },
        temperature: 0.1,
      },
      MODEL_CHAIN,
      { functionName: "extract-rom", maxTokens: 6000 },
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[extract-rom] AI error", aiResp.status, t.slice(0, 300));
      const msg = aiResp.status === 429
        ? "Limite de uso da IA atingido. Tente novamente em alguns segundos."
        : aiResp.status === 402 ? "Créditos de IA esgotados. Adicione créditos para continuar."
        : "Falha ao processar o arquivo.";
      return json({ error: msg }, aiResp.status);
    }

    const data = await aiResp.json();
    const msg = data?.choices?.[0]?.message;
    const args = msg?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = args ? (typeof args === "string" ? safeJsonExtract(args) : args) : null;
    if (!parsed || !Array.isArray(parsed.rows)) {
      const text = msg?.content ?? "";
      parsed = safeJsonExtract(typeof text === "string" ? text : JSON.stringify(text));
    }
    const rows = (Array.isArray(parsed?.rows) ? parsed.rows : [])
      .map((r: any) => ({
        joint: String(r?.joint ?? r?.movement ?? "").trim(),
        leftValue: withUnit(r?.leftValue),
        rightValue: withUnit(r?.rightValue),
      }))
      .filter((r: any) => r.joint && (r.leftValue || r.rightValue))
      .slice(0, 60);

    const payload = { rows, promptVersion: PROMPT_VERSION };
    if (admin && rows.length) await setCachedAiResponse(admin, "extract-rom", cachePayload, payload, 30 * 24 * 3600);
    return json(payload);
  } catch (e) {
    console.error("[extract-rom]", e);
    return json({ error: "Falha ao processar o arquivo." }, 500);
  }
});
