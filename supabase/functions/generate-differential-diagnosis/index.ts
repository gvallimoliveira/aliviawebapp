import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/caller-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_7D } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Bump when the prompt changes so cached differentials are regenerated. */
const PROMPT_VERSION = "dd-v1";

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
};

const asymmetryPct = (a: number | null, b: number | null): number | null => {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  return Math.round((Math.abs(a - b) / Math.max(a, b)) * 100);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const __gate = await requireUser(req, corsHeaders);
    if (__gate instanceof Response) return __gate;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      anamnesisData,
      painRegions,
      painScore,
      questionnaireResults,
      diagnosis,
      painMechanism,
      painExtent,
      redFlags,
      healthHistory,
      sessionNotes,
      assessmentTimeline,
      language,
      forceRefresh,
    } = body ?? {};

    const hypothesis = String(diagnosis?.hypothesis || "").trim();
    if (!hypothesis) {
      return new Response(JSON.stringify({ error: "Missing diagnosis.hypothesis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-differential-diagnosis");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

    const cachePayload = {
      v: PROMPT_VERSION,
      anamnesisData,
      painRegions,
      painScore,
      questionnaireResults,
      diagnosis: { hypothesis, summary: diagnosis?.summary, confidence: diagnosis?.confidence, reasoning: diagnosis?.reasoning },
      painMechanism,
      painExtent,
      redFlags,
      healthHistory,
      sessionNotes,
      assessmentTimeline,
      language,
    };

    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<{ differentials: unknown[] }>(
        admin,
        "generate-differential-diagnosis",
        cachePayload,
      );
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isPt = language === "pt" || !language;
    const isEs = language === "es";
    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";

    const activeRedFlags = Array.isArray(redFlags) ? redFlags.filter(Boolean) : [];

    const systemPrompt = `You are a senior musculoskeletal physiotherapist specialised in advanced clinical reasoning and differential diagnosis. A colleague has a working hypothesis whose confidence is LOW or MODERATE. Your job is to name the diagnoses that genuinely COMPETE with it for this specific patient and to tell the colleague exactly how to decide between them.

NON-NEGOTIABLE RULES
- Return between 2 and 4 alternatives. Never more.
- Every alternative must be anchored in the patient data actually provided. If an alternative cannot be justified by a concrete finding in the data, do NOT include it. Textbook lists are useless here.
- Never restate the main hypothesis with different words or synonyms. Each alternative must be a genuinely different clinical entity, structure, mechanism, source or stage.
- Every alternative MUST end in a decision: 1 to 3 concrete discriminators the colleague can apply — a named orthopaedic/functional test with the expected positive/negative response, an anamnesis question not yet asked, an objective measurement (dynamometry, ROM), or a therapeutic test with the expected response. Never write vague advice like "consider" or "investigate further".
- "hypothesis" is a SHORT diagnostic label (condition + structure/side, max 20 words, one sentence, no lists, no semicolons). No aggravating factors, no measurements, no reasoning inside it.

DIFFERENTIAL AXES — cover different axes instead of listing neighbours of the same structure:
(a) same region, different structure;
(b) referred pain / proximal source (cervical spine → shoulder, lumbar → hip, hip → knee, thoracic → chest wall);
(c) different dominant pain mechanism (nociceptive vs neuropathic vs nociplastic) — use the mechanism screening provided;
(d) systemic or non-musculoskeletal cause (visceral, vascular, inflammatory/rheumatic, infectious, neoplastic, central neurological) — set "referralFlag": true for these;
(e) different stage/phase of the same condition (high irritability vs degenerative vs instability vs post-surgical stiffness).

MANDATORY REASONING TRIGGERS — when present in the data, they must influence the alternatives you raise:
- night pain, non-mechanical pain, pain not modified by position or load;
- widespread pain, disproportionate pain, multisensory hypersensitivity (nociplastic axis);
- neurological descriptors, dermatomal distribution, objective neuro signs (neuropathic axis);
- failure to respond to previous adequate treatment;
- dissonance between functional score and reported pain;
- strength asymmetry above 10% or ROM restriction that the main hypothesis does not explain;
- comorbidities and continuous medication (diabetes, hypertension, cardiopathy, corticosteroids, anticoagulants) — they change the plausibility of systemic causes.

SAFETY
${activeRedFlags.length > 0 ? `- ACTIVE RED FLAGS were reported: ${activeRedFlags.join(", ")}. One of the alternatives MUST be a medical-screening alternative with referralFlag true, and its whyItMatters must state that medical clearance precedes any load progression.` : `- If any provided data suggests a non-musculoskeletal or urgent cause, include a medical-screening alternative with referralFlag true and say clearly that referral precedes load progression.`}

Write all text in ${langLabel}, in clinical prose, direct and practical (no bullet symbols inside strings). Use the provided tool to return structured output.`;

    const lines: string[] = [];
    const push = (label: string, value: unknown) => {
      if (value === null || value === undefined) return;
      if (typeof value === "string" && !value.trim()) return;
      if (Array.isArray(value) && value.length === 0) return;
      lines.push(`- ${label}: ${Array.isArray(value) ? value.join(", ") : value}`);
    };

    lines.push("MAIN WORKING HYPOTHESIS (the one to challenge):");
    push("Hypothesis", hypothesis);
    push("Confidence", diagnosis?.confidence);
    push("Summary", diagnosis?.summary);
    push("AI reasoning", diagnosis?.reasoning);

    lines.push("\nPATIENT DATA:");
    push("Chief complaint", anamnesisData?.chiefComplaint || anamnesisData?.chiefComplaints);
    push("Custom complaint", anamnesisData?.customComplaint);
    push("Onset", anamnesisData?.onset);
    push("Duration", anamnesisData?.painDuration);
    push("Evolution", anamnesisData?.evolution);
    push("Pain regions", painRegions);
    if (anamnesisData?.painRegionRefinements && Object.keys(anamnesisData.painRegionRefinements).length > 0) {
      lines.push(`- Anatomical refinement per region: ${Object.entries(anamnesisData.painRegionRefinements).map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join("/") : v}`).join(" | ")}`);
    }
    push("Pain types/descriptors", anamnesisData?.painTypes);
    if (painScore != null) push("Pain score (VAS)", `${painScore}/10`);
    if (anamnesisData?.painScoresPerRegion && Object.keys(anamnesisData.painScoresPerRegion).length > 0) {
      lines.push(`- Pain per region: ${Object.entries(anamnesisData.painScoresPerRegion).map(([k, v]) => `${k}: ${v}/10`).join(" | ")}`);
    }
    push("Pain pattern", anamnesisData?.painPattern);
    push("Night waking due to pain", anamnesisData?.painNightWaking);
    push("Aggravating factors", anamnesisData?.aggravatingFactors);
    push("Relieving factors", anamnesisData?.relievingFactors);
    push("Previous treatments (and response)", anamnesisData?.previousTreatments);
    push("Activity level", anamnesisData?.activityLevel);
    push("Occupation", anamnesisData?.occupation);
    push("Edema", anamnesisData?.hasEdema);
    push("Twist/sprain mechanism", anamnesisData?.hadTwist);
    push("Red flags reported", activeRedFlags);

    if (painMechanism) {
      lines.push(`- Pain mechanism screening (Kosek/Finnerup based): ${JSON.stringify(painMechanism)}`);
    }
    if (painExtent != null) push("Pain extent (% body surface)", painExtent);

    if (healthHistory && Object.keys(healthHistory).length > 0) {
      lines.push(`- General health screening (comorbidities, control status, continuous medication): ${JSON.stringify(healthHistory)}`);
    }

    const rom = Array.isArray(anamnesisData?.romTable)
      ? anamnesisData.romTable.filter((r: any) => r?.joint || r?.leftValue || r?.rightValue)
      : [];
    if (rom.length > 0) {
      lines.push(`- Range of motion:\n${rom.map((r: any) => {
        const asym = asymmetryPct(num(r.leftValue), num(r.rightValue));
        return `    • ${r.joint || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}${asym != null ? ` | diff ${asym}%${asym > 10 ? " (RELEVANT)" : ""}` : ""}${r.notes ? ` | ${r.notes}` : ""}`;
      }).join("\n")}`);
    }

    const strength = Array.isArray(anamnesisData?.strengthTable)
      ? anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue)
      : [];
    if (strength.length > 0) {
      lines.push(`- Dynamometry (kgf):\n${strength.map((r: any) => {
        const asym = asymmetryPct(num(r.leftValue), num(r.rightValue));
        return `    • ${r.movement || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}${asym != null ? ` | asymmetry ${asym}%${asym > 10 ? " (RELEVANT DEFICIT)" : ""}` : ""}`;
      }).join("\n")}`);
    }

    if (Array.isArray(questionnaireResults) && questionnaireResults.length > 0) {
      lines.push(`- Validated questionnaire results: ${JSON.stringify(questionnaireResults).slice(0, 4000)}`);
    }

    const notes = Array.isArray(sessionNotes)
      ? sessionNotes.filter((n: any) => (n?.content || "").trim().length > 0).slice(0, 10)
      : [];
    if (notes.length > 0) {
      lines.push(`- Session evolution notes (response to load, intercurrences):\n${notes.map((n: any) => `    • ${n.session_date || n.date || "?"}: ${String(n.content).replace(/\s+/g, " ").slice(0, 500)}`).join("\n")}`);
    }

    if (Array.isArray(assessmentTimeline) && assessmentTimeline.length > 1) {
      lines.push(`- Assessment timeline (oldest first):\n${assessmentTimeline.map((a: any, i: number) => `    [${i + 1}] ${a.date} | pain ${a.pain_score ?? "N/A"}/10 | regions ${(a.pain_regions || []).join("/") || "N/A"} | hypothesis ${a.hypothesis || "N/A"}`).join("\n")}`);
    }

    lines.push("\nGenerate the competing differential diagnoses now.");

    const tools = [
      {
        type: "function",
        function: {
          name: "return_differential_diagnosis",
          description: "Return the competing differential diagnoses for this patient",
          parameters: {
            type: "object",
            properties: {
              differentials: {
                type: "array",
                minItems: 2,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    hypothesis: { type: "string", description: "Short diagnostic label: condition + structure/side. Max 20 words." },
                    plausibility: { type: "string", enum: ["high", "medium", "low"] },
                    competesBecause: { type: "string", description: "Which findings of THIS patient it would explain as well as or better than the main hypothesis (2-4 sentences)" },
                    arguesAgainst: { type: "string", description: "The finding that currently supports the main hypothesis over this alternative (1-2 sentences)" },
                    discriminators: {
                      type: "array",
                      minItems: 1,
                      maxItems: 3,
                      items: { type: "string", description: "Concrete discriminator: named test with expected response, unasked question, objective measurement, or therapeutic test" },
                    },
                    whyItMatters: { type: "string", description: "Practical consequence of getting it wrong: changes conduct, changes prognosis, requires referral/imaging, contraindicates load" },
                    referralFlag: { type: "boolean", description: "True when the alternative is non-musculoskeletal or requires medical screening" },
                  },
                  required: ["hypothesis", "plausibility", "competesBecause", "discriminators", "whyItMatters"],
                  additionalProperties: false,
                },
              },
            },
            required: ["differentials"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lines.join("\n") },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_differential_diagnosis" } },
    }, undefined, { functionName: "generate-differential-diagnosis", maxTokens: 3000 });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições de IA agora. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "Uso de IA bloqueado para este workspace." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    // Extração em camadas (formatos inconsistentes de tool call / conteúdo).
    let differentials: any[] = [];
    const readArgs = (raw: unknown) => {
      if (!raw) return null;
      if (typeof raw === "object") return raw as any;
      try { return JSON.parse(String(raw)); } catch { return null; }
    };

    // 1) tool call arguments
    const args = readArgs(toolCall?.function?.arguments);
    if (Array.isArray(args?.differentials)) differentials = args.differentials;

    // 2) conteúdo JSON puro
    if (differentials.length === 0) {
      const content = String(message?.content || "");
      const direct = readArgs(content);
      if (Array.isArray(direct?.differentials)) differentials = direct.differentials;
      else if (Array.isArray(direct)) differentials = direct;

      // 3) JSON dentro de bloco markdown
      if (differentials.length === 0) {
        const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const fenced = fence ? readArgs(fence[1]) : null;
        if (Array.isArray(fenced?.differentials)) differentials = fenced.differentials;
        else if (Array.isArray(fenced)) differentials = fenced;
      }

      // 4) primeiro objeto/array balanceado no texto
      if (differentials.length === 0) {
        const start = content.search(/[[{]/);
        if (start >= 0) {
          const loose = readArgs(content.slice(start));
          if (Array.isArray(loose?.differentials)) differentials = loose.differentials;
          else if (Array.isArray(loose)) differentials = loose;
        }
      }
    }

    if (!Array.isArray(differentials) || differentials.length === 0) {
      console.error("Empty differential response", JSON.stringify(result).slice(0, 1200));
      return new Response(JSON.stringify({ error: "A IA não retornou diferenciais utilizáveis. Tente regenerar." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = { differentials: differentials.slice(0, 4) };

    if (admin) {
      await setCachedAiResponse(admin, "generate-differential-diagnosis", cachePayload, payload, AI_CACHE_TTL_7D);
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-differential-diagnosis error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
