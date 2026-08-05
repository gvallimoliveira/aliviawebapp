// Extract dynamometry (muscle strength) data from an uploaded image or PDF.
// Returns a normalized array of { movement, leftValue, rightValue, unit:"kgf" }.
// The original file is NOT stored — only the extracted text is returned.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { shadowLogAiUsage } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";

const MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

const PROMPTS: Record<string, string> = {
  pt: `Você é um assistente clínico especializado em fisioterapia.
Receberá uma imagem ou PDF de um relatório de DINAMOMETRIA (avaliação de força muscular).
Extraia EXCLUSIVAMENTE os pares de medidas no formato:
  movimento testado / valor lado esquerdo / valor lado direito

Regras importantes:
- Unidade alvo: kgf (quilograma-força). Se o relatório usar Newton (N), converta dividindo por 9.80665 e arredonde para 1 casa decimal.
- Se um dos lados estiver ausente, deixe vazio ("").
- MUITO IMPORTANTE: relatórios costumam trazer 2 ou 3 medidas (tentativas) do MESMO movimento para cada lado. Capture TODAS elas em "leftTrials"/"rightTrials", uma entrada por medida, na ordem em que aparecem. NUNCA descarte medidas repetidas.
- Em "leftValue"/"rightValue" coloque o MELHOR (maior) valor daquele lado.
- O "tempo até o pico" (time to peak) é OPCIONAL: muitos equipamentos não fornecem esse dado. Se existir, inclua em "timeToPeak" (segundos) da respectiva medida; caso contrário, OMITA o campo (não invente valores).
- Identifique o lado por rótulos como "Esquerda/Direita", "E/D", "L/R".
- Não invente nomes — use exatamente o nome do movimento como aparece no relatório (traduza levemente para português se estiver em outro idioma).
- Não inclua linhas vazias, totais ou cabeçalhos.
- Valores devem ser numéricos (use ponto como separador decimal).

Responda APENAS com um JSON válido no formato:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1",
             "leftTrials": [ { "value": "31.0", "timeToPeak": "3.64" }, { "value": "32.5", "timeToPeak": "2.91" } ],
             "rightTrials": [ { "value": "30.1", "timeToPeak": "4.72" }, { "value": "29.4", "timeToPeak": "3.18" } ] } ] }`,
  en: `You are a clinical assistant specialized in physiotherapy.
You will receive an image or PDF of a DYNAMOMETRY (muscle strength) report.
Extract ONLY the measurement triplets in the format:
  tested movement / left value / right value

Rules:
- Target unit: kgf (kilogram-force). If the report uses Newtons (N), convert by dividing by 9.80665 and round to 1 decimal place.
- If one side is missing, leave it empty ("").
- VERY IMPORTANT: reports often contain 2 or 3 trials of the SAME movement per side. Capture ALL of them in "leftTrials"/"rightTrials", one entry per trial, in the order shown. NEVER drop repeated measurements.
- "leftValue"/"rightValue" must hold the BEST (highest) value of that side.
- "time to peak" is OPTIONAL: many devices do not provide it. Include it in "timeToPeak" (seconds) only when present; otherwise OMIT the field (never invent values).
- Use the movement name as written in the report.
- Skip empty rows, totals, headers.
- Values must be numeric (use a dot as decimal separator).

Reply ONLY with a valid JSON object:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1",
             "leftTrials": [ { "value": "31.0", "timeToPeak": "3.64" }, { "value": "32.5", "timeToPeak": "2.91" } ],
             "rightTrials": [ { "value": "30.1", "timeToPeak": "4.72" }, { "value": "29.4", "timeToPeak": "3.18" } ] } ] }`,
  es: `Eres un asistente clínico especializado en fisioterapia.
Recibirás una imagen o PDF de un informe de DINAMOMETRÍA (fuerza muscular).
Extrae SOLO las tríadas de medidas en el formato:
  movimiento evaluado / valor lado izquierdo / valor lado derecho

Reglas:
- Unidad objetivo: kgf. Si el informe usa Newtons (N), convierte dividiendo por 9.80665 (1 decimal).
- Si falta un lado, déjelo vacío ("").
- MUY IMPORTANTE: los informes suelen traer 2 o 3 medidas del MISMO movimiento por lado. Capture TODAS en "leftTrials"/"rightTrials", una entrada por medida, en el orden mostrado. NUNCA descarte medidas repetidas.
- "leftValue"/"rightValue" deben tener el MEJOR (mayor) valor de ese lado.
- El "tiempo al pico" es OPCIONAL: muchos equipos no lo ofrecen. Inclúyalo en "timeToPeak" (segundos) solo si existe; si no, OMITA el campo (no invente valores).
- Use el nombre del movimiento tal como aparece.
- Omita filas vacías, totales y encabezados.
- Valores numéricos con punto decimal.

Responde SOLO con JSON válido:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1",
             "leftTrials": [ { "value": "31.0", "timeToPeak": "3.64" }, { "value": "32.5", "timeToPeak": "2.91" } ],
             "rightTrials": [ { "value": "30.1", "timeToPeak": "4.72" }, { "value": "29.4", "timeToPeak": "3.18" } ] } ] }`,
};

function safeJsonExtract(text: string): unknown {
  // Layer 1: direct
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  // Layer 2: strip markdown fences
  const stripped = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* fallthrough */ }
  // Layer 3: first { ... last }
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(stripped.slice(first, last + 1)); } catch { /* fallthrough */ }
  }
  // Layer 4: regex pick `"rows": [...]`
  const m = stripped.match(/"rows"\s*:\s*(\[[\s\S]*?\])/);
  if (m) {
    try { return { rows: JSON.parse(m[1]) }; } catch { /* fallthrough */ }
  }
  return { rows: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    shadowLogAiUsage(req, { function_name: "extract-dynamometry" });
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { fileBase64, mimeType, fileName, language } = body as {
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      language?: string;
    };

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "fileBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size guard: base64 ~ 4/3 of raw. 10MB raw → ~13.6MB base64.
    if (fileBase64.length > 15_000_000) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = (["pt", "en", "es"] as const).includes((language || "pt") as any)
      ? (language as string)
      : "pt";
    const systemPrompt = PROMPTS[lang] || PROMPTS.pt;

    // Cache: same file bytes → same extraction (30d). Hash is computed inside
    // buildCacheKey via stable stringify of the payload object.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { fileBase64, mimeType: mimeType || "", lang };
    if (admin) {
      const cached = await getCachedAiResponse<{ rows: unknown[] }>(admin, "extract-dynamometry", cachePayload);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    const mt = (mimeType || "").toLowerCase();
    const isPdf = mt.includes("pdf");
    const isImage = mt.startsWith("image/") || !isPdf; // default to image when unknown

    // Build OpenAI-compatible multimodal user content
    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: "Extraia os dados de dinamometria deste arquivo." },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: fileName || "report.pdf",
          file_data: `data:application/pdf;base64,${fileBase64}`,
        },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mt || "image/jpeg"};base64,${fileBase64}` },
      });
    }
    void isImage;

    const aiResp = await callAiWithFallback(
      apiKey,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      MODEL_CHAIN,
      { functionName: "extract-dynamometry", maxTokens: 3000 },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[extract-dynamometry] AI error", aiResp.status, errText.slice(0, 300));
      const userMsg =
        aiResp.status === 429
          ? "Limite de uso da IA atingido. Tente novamente em alguns segundos."
          : aiResp.status === 402
            ? "Créditos de IA esgotados. Adicione créditos para continuar."
            : "Falha ao processar o arquivo.";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonExtract(typeof text === "string" ? text : JSON.stringify(text));
    const rowsRaw: any[] = Array.isArray((parsed as any)?.rows) ? (parsed as any).rows : [];

    const normTrials = (raw: any): Array<{ value: string; timeToPeak?: string }> => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((t: any) => {
          const value = String(t?.value ?? t?.force ?? t ?? "").trim();
          const ttp = t?.timeToPeak ?? t?.time_to_peak ?? t?.peakTime;
          return {
            value,
            ...(ttp == null || String(ttp).trim() === "" ? {} : { timeToPeak: String(ttp).trim() }),
          };
        })
        .filter((t) => t.value !== "" && isFinite(parseFloat(t.value.replace(",", "."))))
        .slice(0, 10);
    };

    const rows = rowsRaw
      .map((r) => {
        const leftTrials = normTrials(r?.leftTrials ?? r?.left_trials);
        const rightTrials = normTrials(r?.rightTrials ?? r?.right_trials);
        const bestOf = (list: Array<{ value: string }>): string => {
          const nums = list
            .map((t) => parseFloat(t.value.replace(",", ".")))
            .filter((n) => isFinite(n));
          return nums.length ? String(Math.max(...nums)) : "";
        };
        const left = r?.leftValue == null ? "" : String(r.leftValue).trim();
        const right = r?.rightValue == null ? "" : String(r.rightValue).trim();
        return {
          movement: String(r?.movement ?? r?.test ?? r?.name ?? "").trim(),
          leftValue: left || bestOf(leftTrials),
          rightValue: right || bestOf(rightTrials),
          ...(leftTrials.length ? { leftTrials } : {}),
          ...(rightTrials.length ? { rightTrials } : {}),
          unit: "kgf",
        };
      })
      .filter((r) => r.movement || r.leftValue || r.rightValue)
      .slice(0, 60); // safety cap

    if (admin && rows.length > 0) {
      await setCachedAiResponse(admin, "extract-dynamometry", cachePayload, { rows }, 30 * 24 * 3600);
    }

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[extract-dynamometry] unexpected", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
