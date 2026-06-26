// Extract dynamometry (muscle strength) data from an uploaded image or PDF.
// Returns a normalized array of { movement, leftValue, rightValue, unit:"kgf" }.
// The original file is NOT stored — only the extracted text is returned.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { shadowLogAiUsage } from "../_shared/ai-credits.ts";

const MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
];

const PROMPTS: Record<string, string> = {
  pt: `Você é um assistente clínico especializado em fisioterapia.
Receberá uma imagem ou PDF de um relatório de DINAMOMETRIA (avaliação de força muscular).
Extraia EXCLUSIVAMENTE os pares de medidas no formato:
  movimento testado / valor lado esquerdo / valor lado direito

Regras importantes:
- Unidade alvo: kgf (quilograma-força). Se o relatório usar Newton (N), converta dividindo por 9.80665 e arredonde para 1 casa decimal.
- Se um dos lados estiver ausente, deixe vazio ("").
- Se houver várias tentativas/repetições, use o MELHOR valor de cada lado.
- Não invente nomes — use exatamente o nome do movimento como aparece no relatório (traduza levemente para português se estiver em outro idioma).
- Não inclua linhas vazias, totais ou cabeçalhos.
- Valores devem ser numéricos (use ponto como separador decimal).

Responda APENAS com um JSON válido no formato:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1" } ] }`,
  en: `You are a clinical assistant specialized in physiotherapy.
You will receive an image or PDF of a DYNAMOMETRY (muscle strength) report.
Extract ONLY the measurement triplets in the format:
  tested movement / left value / right value

Rules:
- Target unit: kgf (kilogram-force). If the report uses Newtons (N), convert by dividing by 9.80665 and round to 1 decimal place.
- If one side is missing, leave it empty ("").
- If multiple trials are shown, use the BEST value per side.
- Use the movement name as written in the report.
- Skip empty rows, totals, headers.
- Values must be numeric (use a dot as decimal separator).

Reply ONLY with a valid JSON object:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1" } ] }`,
  es: `Eres un asistente clínico especializado en fisioterapia.
Recibirás una imagen o PDF de un informe de DINAMOMETRÍA (fuerza muscular).
Extrae SOLO las tríadas de medidas en el formato:
  movimiento evaluado / valor lado izquierdo / valor lado derecho

Reglas:
- Unidad objetivo: kgf. Si el informe usa Newtons (N), convierte dividiendo por 9.80665 (1 decimal).
- Si falta un lado, déjelo vacío ("").
- Si hay varios intentos, use el MEJOR valor por lado.
- Use el nombre del movimiento tal como aparece.
- Omita filas vacías, totales y encabezados.
- Valores numéricos con punto decimal.

Responde SOLO con JSON válido:
{ "rows": [ { "movement": "...", "leftValue": "32.5", "rightValue": "30.1" } ] }`,
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

    const rows = rowsRaw
      .map((r) => ({
        movement: String(r?.movement ?? r?.test ?? r?.name ?? "").trim(),
        leftValue: r?.leftValue == null ? "" : String(r.leftValue).trim(),
        rightValue: r?.rightValue == null ? "" : String(r.rightValue).trim(),
        unit: "kgf",
      }))
      .filter((r) => r.movement || r.leftValue || r.rightValue)
      .slice(0, 40); // safety cap

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
