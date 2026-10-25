// Extract dynamometry (muscle strength) data from an uploaded image or PDF.
// Returns a normalized array of rows with ALL trials per side:
//   { movement, leftValue, rightValue, leftTrials[], rightTrials[], unit:"kgf" }
// The original file is NOT stored — only the extracted data is returned.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";

// Vision-heavy table reading: Pro first (accuracy matters far more than cost on
// a one-shot import), Flash as fallback.
const MODEL_CHAIN = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

// Bump whenever the prompt / schema changes so cached extractions are invalidated.
const PROMPT_VERSION = "v3-trials-strict";

const COMMON_RULES_PT = `REGRAS DE LEITURA DA TABELA (siga à risca):
1. Percorra o documento LINHA POR LINHA, de cima para baixo. Cada linha da tabela é uma MEDIDA.
2. NUNCA agrupe, resuma ou deduplique medidas: se o mesmo movimento aparece em 2, 3 ou mais linhas (tentativas/repetições), TODAS entram como itens separados em "leftTrials" ou "rightTrials" do MESMO movimento, na ordem em que aparecem.
3. Um movimento com 3 medidas à esquerda e 3 à direita gera UMA linha de saída com 3 itens em "leftTrials" e 3 em "rightTrials".
4. Identifique o lado por rótulos como "Esquerda/Direita", "Esq/Dir", "E/D", "L/R", "Left/Right".
5. "leftValue"/"rightValue" = MAIOR (melhor) valor daquele lado.
6. Se o relatório trouxer coluna de MÉDIA por movimento/lado, informe em "reportedLeftMean"/"reportedRightMean" (não substitui as medidas).
7. Tempo até o pico (time to peak) é OPCIONAL: preencha "timeToPeak" (segundos) da medida SOMENTE se o valor estiver no documento. Se não houver, OMITA — nunca invente.
8. Unidade alvo: kgf. Se o relatório usar Newton (N), divida por 9.80665 e arredonde para 1 decimal. Se usar libras (lb), divida por 2.20462.
9. Use o nome do movimento exatamente como aparece no relatório (pode traduzir levemente).
10. Ignore cabeçalhos, totais, linhas vazias e observações. Valores numéricos com ponto decimal.
11. Não deixe nenhuma medida visível fora da saída. Conte as medidas do documento e confira antes de responder.`;

const COMMON_RULES_EN = `TABLE READING RULES (follow strictly):
1. Walk the document LINE BY LINE, top to bottom. Each table row is one MEASUREMENT.
2. NEVER group, summarize or deduplicate measurements: if the same movement appears in 2, 3 or more rows (trials), ALL of them become separate items in "leftTrials"/"rightTrials" of the SAME movement, in the order shown.
3. A movement with 3 left and 3 right measurements yields ONE output row with 3 items in "leftTrials" and 3 in "rightTrials".
4. Identify the side by labels such as "Left/Right", "L/R", "Esq/Dir", "E/D".
5. "leftValue"/"rightValue" = the HIGHEST (best) value on that side.
6. If the report shows a MEAN column per movement/side, report it in "reportedLeftMean"/"reportedRightMean" (it does not replace the trials).
7. Time to peak is OPTIONAL: fill "timeToPeak" (seconds) for a measurement ONLY if present in the document. Otherwise OMIT it — never invent values.
8. Target unit: kgf. Convert Newtons by dividing by 9.80665 (1 decimal); pounds by dividing by 2.20462.
9. Use the movement name as written in the report.
10. Skip headers, totals, empty rows and comments. Numeric values with a dot decimal separator.
11. Do not leave any visible measurement out. Count the measurements in the document and double-check before answering.`;

const COMMON_RULES_ES = `REGLAS DE LECTURA DE LA TABLA (síguelas al pie de la letra):
1. Recorre el documento LÍNEA POR LÍNEA, de arriba a abajo. Cada fila es una MEDIDA.
2. NUNCA agrupes, resumas ni elimines medidas duplicadas: si el mismo movimiento aparece en 2, 3 o más filas (intentos), TODAS entran como ítems separados en "leftTrials"/"rightTrials" del MISMO movimiento, en el orden mostrado.
3. Un movimiento con 3 medidas izquierdas y 3 derechas genera UNA fila con 3 ítems en "leftTrials" y 3 en "rightTrials".
4. Identifica el lado por rótulos como "Izquierda/Derecha", "I/D", "Esq/Dir", "L/R".
5. "leftValue"/"rightValue" = el MAYOR (mejor) valor de ese lado.
6. Si el informe trae columna de MEDIA por movimiento/lado, indícala en "reportedLeftMean"/"reportedRightMean" (no reemplaza las medidas).
7. El tiempo al pico es OPCIONAL: rellena "timeToPeak" (segundos) SOLO si el valor está en el documento. Si no, OMÍTELO — nunca lo inventes.
8. Unidad objetivo: kgf. Newtons: divide por 9.80665 (1 decimal); libras: divide por 2.20462.
9. Usa el nombre del movimiento tal como aparece.
10. Omite encabezados, totales, filas vacías y comentarios. Valores numéricos con punto decimal.
11. No dejes ninguna medida fuera. Cuenta las medidas del documento y verifica antes de responder.`;

const PROMPTS: Record<string, string> = {
  pt: `Você é um assistente clínico especializado em fisioterapia e leitura de laudos de DINAMOMETRIA (força muscular).
Sua tarefa é extrair TODAS as medidas de força presentes na imagem/PDF e devolvê-las pela ferramenta estruturada.

${COMMON_RULES_PT}

Use SEMPRE a ferramenta "return_dynamometry". Nunca escreva texto livre.`,
  en: `You are a clinical assistant specialized in physiotherapy and in reading DYNAMOMETRY (muscle strength) reports.
Your task is to extract EVERY strength measurement present in the image/PDF and return it through the structured tool.

${COMMON_RULES_EN}

ALWAYS use the "return_dynamometry" tool. Never write free text.`,
  es: `Eres un asistente clínico especializado en fisioterapia y en la lectura de informes de DINAMOMETRÍA (fuerza muscular).
Tu tarea es extraer TODAS las medidas de fuerza presentes en la imagen/PDF y devolverlas mediante la herramienta estructurada.

${COMMON_RULES_ES}

Usa SIEMPRE la herramienta "return_dynamometry". Nunca escribas texto libre.`,
};

const TRIAL_SCHEMA = {
  type: "object",
  properties: {
    value: { type: "string", description: "Force value in kgf (dot decimal)." },
    timeToPeak: {
      type: "string",
      description: "Time to peak in seconds. OMIT when not shown in the document.",
    },
  },
  required: ["value"],
  additionalProperties: false,
} as const;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "return_dynamometry",
      description: "Return every dynamometry measurement found in the document.",
      parameters: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                movement: { type: "string" },
                leftValue: { type: "string", description: "Best (highest) left value." },
                rightValue: { type: "string", description: "Best (highest) right value." },
                leftTrials: { type: "array", items: TRIAL_SCHEMA },
                rightTrials: { type: "array", items: TRIAL_SCHEMA },
                reportedLeftMean: { type: "string" },
                reportedRightMean: { type: "string" },
              },
              required: ["movement"],
              additionalProperties: false,
            },
          },
          totalMeasurementsSeen: {
            type: "number",
            description: "How many individual measurements you counted in the document.",
          },
        },
        required: ["rows"],
        additionalProperties: false,
      },
    },
  },
];

function safeJsonExtract(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const stripped = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* fallthrough */ }
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(stripped.slice(first, last + 1)); } catch { /* fallthrough */ }
  }
  const m = stripped.match(/"rows"\s*:\s*(\[[\s\S]*?\])/);
  if (m) {
    try { return { rows: JSON.parse(m[1]) }; } catch { /* fallthrough */ }
  }
  return { rows: [] };
}

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isFinite(n) ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const creditDecision = await canaryCredits(req, "extract-dynamometry", { function_name: "extract-dynamometry" });
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
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

    // Cache: same file bytes + same prompt version → same extraction (30d).
    // PROMPT_VERSION is part of the key so prompt/schema upgrades invalidate
    // older (less complete) extractions of the very same file.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { fileBase64, mimeType: mimeType || "", lang, promptVersion: PROMPT_VERSION };
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

    const askText = lang === "en"
      ? "Extract EVERY dynamometry measurement from this file, including all repeated trials per movement and side."
      : lang === "es"
        ? "Extrae TODAS las medidas de dinamometría de este archivo, incluidas todas las repeticiones por movimiento y lado."
        : "Extraia TODAS as medidas de dinamometria deste arquivo, incluindo todas as repetições (tentativas) de cada movimento e lado.";

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: askText }];
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

    const aiResp = await callAiWithFallback(
      apiKey,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "return_dynamometry" } },
        temperature: 0.1,
      },
      MODEL_CHAIN,
      { functionName: "extract-dynamometry", maxTokens: 8000 },
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
    const msg = data?.choices?.[0]?.message;
    const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    if (toolArgs) {
      parsed = typeof toolArgs === "string" ? safeJsonExtract(toolArgs) : toolArgs;
    }
    if (!parsed || !Array.isArray(parsed?.rows)) {
      const text = msg?.content ?? "";
      parsed = safeJsonExtract(typeof text === "string" ? text : JSON.stringify(text));
    }
    const rowsRaw: any[] = Array.isArray(parsed?.rows) ? parsed.rows : [];

    const normTrials = (raw: any): Array<{ value: string; timeToPeak?: string }> => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((t: any) => {
          const value = String(t?.value ?? t?.force ?? t?.peak ?? t ?? "").trim();
          const ttp = t?.timeToPeak ?? t?.time_to_peak ?? t?.peakTime;
          return {
            value,
            ...(ttp == null || String(ttp).trim() === "" ? {} : { timeToPeak: String(ttp).trim() }),
          };
        })
        .filter((t) => t.value !== "" && num(t.value) != null)
        .slice(0, 12);
    };

    const meanOf = (list: Array<{ value: string }>): number | null => {
      const nums = list.map((t) => num(t.value)).filter((n): n is number => n != null);
      if (!nums.length) return null;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    };

    const rows = rowsRaw
      .map((r) => {
        const leftTrials = normTrials(r?.leftTrials ?? r?.left_trials);
        const rightTrials = normTrials(r?.rightTrials ?? r?.right_trials);
        const bestOf = (list: Array<{ value: string }>): string => {
          const nums = list.map((t) => num(t.value)).filter((n): n is number => n != null);
          return nums.length ? String(Math.max(...nums)) : "";
        };
        const left = r?.leftValue == null ? "" : String(r.leftValue).trim();
        const right = r?.rightValue == null ? "" : String(r.rightValue).trim();

        // Seed trials from single values so downstream stats always have data.
        const lTrials = leftTrials.length ? leftTrials : left ? [{ value: left }] : [];
        const rTrials = rightTrials.length ? rightTrials : right ? [{ value: right }] : [];

        // Consistency check against a mean printed on the report (never discards data).
        const flags: string[] = [];
        const check = (reported: unknown, list: Array<{ value: string }>, side: string) => {
          const rep = num(reported);
          const calc = meanOf(list);
          if (rep == null || calc == null || calc === 0) return;
          if (Math.abs(rep - calc) / calc > 0.15) flags.push(`${side}:mean_mismatch`);
        };
        check(r?.reportedLeftMean ?? r?.reported_left_mean, lTrials, "left");
        check(r?.reportedRightMean ?? r?.reported_right_mean, rTrials, "right");

        const calcL = meanOf(lTrials);
        const calcR = meanOf(rTrials);

        return {
          movement: String(r?.movement ?? r?.test ?? r?.name ?? "").trim(),
          leftValue: left || bestOf(lTrials),
          rightValue: right || bestOf(rTrials),
          ...(lTrials.length ? { leftTrials: lTrials } : {}),
          ...(rTrials.length ? { rightTrials: rTrials } : {}),
          ...(calcL != null ? { leftMean: String(Math.round(calcL * 10) / 10) } : {}),
          ...(calcR != null ? { rightMean: String(Math.round(calcR * 10) / 10) } : {}),
          ...(flags.length ? { reviewFlags: flags } : {}),
          unit: "kgf",
        };
      })
      .filter((r) => r.movement || r.leftValue || r.rightValue)
      .slice(0, 60); // safety cap

    const trialCount = rows.reduce(
      (acc, r: any) => acc + (r.leftTrials?.length || 0) + (r.rightTrials?.length || 0),
      0,
    );
    console.log(
      `[extract-dynamometry] rows=${rows.length} trials=${trialCount} claimed=${parsed?.totalMeasurementsSeen ?? "?"}`,
    );

    const payload = { rows, trialCount, promptVersion: PROMPT_VERSION };

    if (admin && rows.length > 0) {
      await setCachedAiResponse(admin, "extract-dynamometry", cachePayload, payload, 30 * 24 * 3600);
    }

    return new Response(JSON.stringify(payload), {
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
