import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/caller-auth.ts";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Curated list of valid pain region IDs (simplified set used by the manual
// assessment flow). The AI must map findings to one of these.
const VALID_REGION_IDS = [
  // Head & cervical
  "head", "cervical_front", "cervical",
  // Trunk
  "chest", "abdomen", "thoracic", "lower_back",
  // Upper limb
  "right_shoulder", "left_shoulder",
  "right_arm", "left_arm",
  "right_elbow", "left_elbow",
  "right_forearm", "left_forearm",
  "right_hand", "left_hand",
  // Pelvis & hip
  "right_hip", "left_hip",
  "right_gluteal", "left_gluteal",
  // Lower limb
  "right_thigh_ant", "left_thigh_ant",
  "right_hamstring", "left_hamstring",
  "right_knee", "left_knee",
  "right_shin", "left_shin",
  "right_calf", "left_calf",
  "right_ankle", "left_ankle",
  "right_foot", "left_foot",
];

const REFINEMENT_VALUES = ["medial", "lateral", "anterior", "posterior", "proximal", "distal", "central", "right_side", "left_side"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await requireUser(req, corsHeaders);
    if (__gate instanceof Response) return __gate;
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "interpret-external-assessment");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { language } = body;
    // Accept either an array `files` (preferred, up to 5) or a single file (legacy).
    const rawFiles: Array<{ fileBase64: string; mimeType: string; fileName?: string }> =
      Array.isArray(body.files) && body.files.length > 0
        ? body.files
        : body.fileBase64 && body.mimeType
          ? [{ fileBase64: body.fileBase64, mimeType: body.mimeType, fileName: body.fileName }]
          : [];

    if (rawFiles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing file payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const files = rawFiles.slice(0, 5);

    const isPt = language === "pt";
    const isEs = language === "es";
    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";

    const fileList = files
      .map((f, i) => `${i + 1}. ${f.fileName || (f.mimeType === "application/pdf" ? "external.pdf" : "image")}`)
      .join("\n");

    const userContent: any[] = [
      {
        type: "text",
        text: `Você está recebendo ${files.length === 1 ? "uma avaliação fisioterapêutica externa" : `${files.length} arquivos que compõem em conjunto uma avaliação fisioterapêutica externa`}. Considere TODOS os arquivos abaixo como partes complementares de um mesmo caso (podem ser páginas, exames, laudos ou fotos adicionais) e consolide as informações em UMA ÚNICA estrutura de saída.\n\nArquivos:\n${fileList}\n\nExtraia e estruture os dados clínicos seguindo rigorosamente o schema da ferramenta. Responda em ${langLabel}.`,
      },
    ];

    for (const f of files) {
      const dataUrl = `data:${f.mimeType};base64,${f.fileBase64}`;
      if (f.mimeType === "application/pdf") {
        userContent.push({
          type: "file",
          file: { filename: f.fileName || "external.pdf", file_data: dataUrl },
        });
      } else {
        userContent.push({ type: "image_url", image_url: { url: dataUrl } });
      }
    }

    const systemPrompt = `You are a clinical physiotherapy expert reading an EXTERNAL assessment (PDF or photo) that another professional or facility produced. Your job is to map the content to Aliv.iA's native assessment schema so it can be saved as a regular assessment in the chart.

RULES:
- Respond in ${langLabel}.
- Use ONLY the structured tool to return data. Never write free text outside the tool.
- For each field, copy/translate the information found in the file. If a field has no corresponding data, leave it null/empty — DO NOT invent values.
- Pain regions MUST come from this exact whitelist (use the IDs verbatim): ${VALID_REGION_IDS.join(", ")}. If the file mentions a region not in the list, omit it from painRegions and describe it in additionalExternalInfo.
- For each painRegion you include, you MAY add anatomical refinements using only these values: ${REFINEMENT_VALUES.join(", ")}.
- Pain score per region: integer 0–10 only when the file states a numeric VAS/NPRS for that region.
- Questionnaires: include only when the file shows an explicit validated questionnaire result (name + score). Use the original questionnaire name.
- Diagnosis: produce a clinical hypothesis grounded ONLY in what the file shows. Mark confidence as "low" if data is sparse, "moderate" otherwise, "high" only when extensive objective findings support it.
- CRITICAL — "hypothesis" MUST be a SHORT diagnostic label only: the clinical condition + affected structure/side, optionally the mechanism category (e.g. "Dor femoropatelar no joelho direito, possivelmente relacionada a fatores mecânicos e de carga"). Hard limits: ONE sentence, maximum 20 words, no semicolons, no lists. NEVER include in "hypothesis": aggravating/relieving factors, ROM or strength values, VAS scores, functional impact, mobility findings, prognosis or reasoning. All of that belongs in "summary"/"reasoning" only. External files often bring messy, mixed text — extract only the diagnostic label from it and never copy long descriptive sentences into "hypothesis".
- Clinical impression: 3–5 line integrative overview + EXACTLY 2 therapeutic objectives chosen from this list ONLY: controle do quadro álgico, reequilibrar tensões miofasciais, exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar, modulação da dor.
- painMechanismScreening: map the file's findings to the pain mechanism screening criteria (Kosek 2021 / Finnerup 2016). Select ONLY criterion keys that the file EXPLICITLY supports (never infer to fill the list), add durationMonths and csiScore only when stated, and quote the supporting text in "evidence". Omit the whole object if there is no usable evidence — an empty/invented screening is worse than none.
- additionalExternalInfo: free-form bucket for anything relevant that doesn't fit other fields (imaging reports, lab values, custom scales, prior treatments described, professional comments, etc.). Be thorough — nothing relevant should be lost.
- aiInterpretedFields: list every top-level field you populated (e.g. ["chiefComplaint","painRegions","romTable","diagnosis"]) so the UI can flag them for the user to review.
- If the file is illegible or clearly not a clinical assessment, return interpretable=false with a short reason.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "return_external_assessment",
          description: "Return the structured interpretation of the external assessment file.",
          parameters: {
            type: "object",
            properties: {
              interpretable: { type: "boolean" },
              unreadableReason: { type: "string" },
              patientName: { type: "string" },
              chiefComplaint: { type: "string" },
              additionalComplaint: { type: "string" },
              history: { type: "string" },
              onset: { type: "string" },
              duration: { type: "string" },
              aggravatingFactors: { type: "string" },
              relievingFactors: { type: "string" },
              medications: { type: "string" },
              previousSurgeries: { type: "string" },
              comorbidities: { type: "string" },
              occupation: { type: "string" },
              complementaryExams: { type: "string" },
              painScore: { type: "number" },
              painType: { type: "string" },
              painRegions: { type: "array", items: { type: "string" } },
              painScoresPerRegion: {
                type: "array",
                items: {
                  type: "object",
                  properties: { region: { type: "string" }, score: { type: "number" } },
                  required: ["region", "score"],
                  additionalProperties: false,
                },
              },
              painRegionRefinements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    region: { type: "string" },
                    refinements: { type: "array", items: { type: "string" } },
                  },
                  required: ["region", "refinements"],
                  additionalProperties: false,
                },
              },
              redFlags: { type: "array", items: { type: "string" } },
              additionalClinicalNotes: { type: "string" },
              romTable: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    joint: { type: "string" },
                    leftValue: { type: "string" },
                    rightValue: { type: "string" },
                  },
                  required: ["joint"],
                  additionalProperties: false,
                },
              },
              strengthTable: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    movement: { type: "string" },
                    leftValue: { type: "string" },
                    rightValue: { type: "string" },
                  },
                  required: ["movement"],
                  additionalProperties: false,
                },
              },
              functionalTests: { type: "string" },
              questionnaireResults: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    score: { type: "string" },
                    interpretation: { type: "string" },
                  },
                  required: ["name", "score"],
                  additionalProperties: false,
                },
              },
              painMechanismScreening: {
                type: "object",
                description: "Pain mechanism screening evidence found EXPLICITLY in the file. Omit entirely if the file gives no usable evidence.",
                properties: {
                  criteria: {
                    type: "array",
                    description: "Criterion keys explicitly supported by the file text. Allowed keys ONLY: noc_movement_relation, noc_rest_relief, noc_localized, noc_palpation, noc_inflammatory, neu_burning_shock, neu_dermatomal, neu_paresthesia, neu_neurodynamic, neu_sensory_loss, neu_motor_deficit, nop_disproportionate, nop_multisite, nop_hypersensitivity, nop_sleep_fatigue, nop_chronic, nop_migrating.",
                    items: { type: "string" },
                  },
                  suggestedSubtype: {
                    type: "string",
                    description: "Only if clearly supported. One of: mechanical, inflammatory, peripheral_neuropathic, central_neuropathic, nociplastic_primary, nociplastic_secondary.",
                    enum: ["mechanical", "inflammatory", "peripheral_neuropathic", "central_neuropathic", "nociplastic_primary", "nociplastic_secondary"],
                  },
                  durationMonths: { type: "number", description: "Symptom duration in months, if stated." },
                  csiScore: { type: "number", description: "Central Sensitization Inventory total score, only if the file states it." },
                  evidence: { type: "string", description: "Short quote/paraphrase from the file justifying the selected criteria." },
                },
                additionalProperties: false,
              },
              diagnosis: {
                type: "object",
                properties: {
                  hypothesis: { type: "string", description: "SHORT diagnostic label only: condition + structure/side (+ optional mechanism category). One sentence, max 20 words. No aggravating factors, no measurements, no functional impact, no reasoning." },
                  summary: { type: "string" },
                  reasoning: { type: "string" },
                  confidence: { type: "string", enum: ["low", "moderate", "high"] },
                },
                additionalProperties: false,
              },
              clinicalImpression: {
                type: "object",
                properties: {
                  overview: { type: "string" },
                  therapeuticObjectives: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
              },
              additionalExternalInfo: { type: "string" },
              aiInterpretedFields: { type: "array", items: { type: "string" } },
            },
            required: ["interpretable", "aiInterpretedFields"],
            additionalProperties: false,
          },
        },
      },
    ];

    // Use Gemini 2.5 Flash (native PDF + image support) with fallback chain.
    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_external_assessment" } },
    }, ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"], {
      functionName: "interpret-external-assessment",
      maxTokens: 3000,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output.");
    }
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    // Normalize arrays-of-objects into the maps the rest of the system uses.
    const painScoresPerRegion: Record<string, number> = {};
    for (const it of args.painScoresPerRegion || []) {
      if (it?.region && typeof it.score === "number") painScoresPerRegion[it.region] = it.score;
    }
    const painRegionRefinements: Record<string, string[]> = {};
    for (const it of args.painRegionRefinements || []) {
      if (it?.region && Array.isArray(it.refinements)) painRegionRefinements[it.region] = it.refinements;
    }

    // Filter painRegions to whitelist
    const validRegions = new Set(VALID_REGION_IDS);
    const painRegions: string[] = (args.painRegions || []).filter((r: string) => validRegions.has(r));

    const interpretation = {
      interpretable: args.interpretable !== false,
      unreadableReason: args.unreadableReason || null,
      patientName: args.patientName || "",
      chiefComplaint: args.chiefComplaint || "",
      additionalComplaint: args.additionalComplaint || "",
      history: args.history || "",
      onset: args.onset || "",
      duration: args.duration || "",
      aggravatingFactors: args.aggravatingFactors || "",
      relievingFactors: args.relievingFactors || "",
      medications: args.medications || "",
      previousSurgeries: args.previousSurgeries || "",
      comorbidities: args.comorbidities || "",
      occupation: args.occupation || "",
      complementaryExams: args.complementaryExams || "",
      painScore: typeof args.painScore === "number" ? Math.round(args.painScore) : null,
      painType: args.painType || "",
      painRegions,
      painScoresPerRegion,
      painRegionRefinements,
      redFlags: Array.isArray(args.redFlags) ? args.redFlags : [],
      additionalClinicalNotes: args.additionalClinicalNotes || "",
      romTable: Array.isArray(args.romTable) ? args.romTable : [],
      strengthTable: Array.isArray(args.strengthTable) ? args.strengthTable : [],
      functionalTests: args.functionalTests || "",
      questionnaireResults: Array.isArray(args.questionnaireResults) ? args.questionnaireResults : [],
      diagnosis: args.diagnosis || null,
      clinicalImpression: args.clinicalImpression || null,
      additionalExternalInfo: args.additionalExternalInfo || "",
      aiInterpretedFields: Array.isArray(args.aiInterpretedFields) ? args.aiInterpretedFields : [],
    };

    return new Response(JSON.stringify({ interpretation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("interpret-external-assessment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
