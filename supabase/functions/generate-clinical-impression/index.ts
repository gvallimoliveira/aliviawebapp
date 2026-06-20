import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { anamnesisData, painRegions, painScore, questionnaireResults, diagnosis, language, assessmentTimeline } = await req.json();
    const isPt = language === "pt";
    const isEs = language === "es";

    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";

    const hasTimeline = Array.isArray(assessmentTimeline) && assessmentTimeline.length > 0;
    const multiAssessment = hasTimeline && assessmentTimeline.length > 1;

    const timelineBlock = hasTimeline
      ? `\n\n--- PATIENT ASSESSMENT TIMELINE (${assessmentTimeline.length} assessments, oldest first) ---\n` +
        assessmentTimeline.map((a: any, i: number) => {
          const qResults = Array.isArray(a.questionnaires) ? a.questionnaires.map((q: any) => `${q.name}: ${q.score}`).join(", ") : "N/A";
          return `[${i + 1}] Date: ${a.date} | Pain: ${a.pain_score ?? "N/A"}/10 | Regions: ${(a.pain_regions || []).join(", ") || "N/A"} | Hypothesis: ${a.hypothesis || "N/A"} | Questionnaires: ${qResults}`;
        }).join("\n")
      : "";

    const timelineInstruction = multiAssessment
      ? isPt
        ? `\nIMPORTANTE: O paciente possui ${assessmentTimeline.length} avaliações ao longo do tempo. Analise a LINHA DO TEMPO completa para identificar padrões de evolução, melhora ou piora progressiva, e dê um panorama clínico que reflita toda a trajetória do paciente — não apenas a avaliação mais recente.`
        : isEs
        ? `\nIMPORTANTE: El paciente tiene ${assessmentTimeline.length} evaluaciones a lo largo del tiempo. Analiza la LÍNEA DE TIEMPO completa para identificar patrones de evolución y da un panorama clínico que refleje toda la trayectoria del paciente.`
        : `\nIMPORTANT: The patient has ${assessmentTimeline.length} assessments over time. Analyze the FULL TIMELINE to identify evolution patterns, progressive improvement or worsening, and provide a clinical overview reflecting the patient's entire trajectory — not just the latest assessment.`
      : "";

    const systemPrompt = `You are a clinical physiotherapy expert. Your task is to produce a brief integrative clinical impression based on assessment data. 

Rules:
- Write a concise overview (3-5 lines) integrating the clinical context: chief complaint, onset, pain characteristics, duration, functional questionnaire scores, and diagnostic hypothesis.${multiAssessment ? "\n- When multiple assessments exist, describe the clinical trajectory over time: whether the patient improved, worsened, or remained stable, referencing specific score changes." : ""}
- Do NOT mention specific exercises, treatment techniques, or therapeutic approaches.
- Select exactly 2 main therapeutic objectives from this list ONLY: controle do quadro álgico, reequilibrar tensões miofasciais, exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar, modulação da dor.
- Respond in ${langLabel}.
- Use the tool provided to return the structured output.${timelineInstruction}`;

    const userPrompt = `Current assessment data:
- Chief complaint: ${anamnesisData?.chiefComplaint || "N/A"}
- Custom complaint: ${anamnesisData?.customComplaint || "N/A"}
- Onset: ${anamnesisData?.onset || "N/A"}
- Pain regions: ${(painRegions || []).join(", ") || "N/A"}${anamnesisData?.painRegionRefinements && Object.keys(anamnesisData.painRegionRefinements).length > 0 ? `
- Anatomical refinement per region (medial/lateral, anterior/posterior, proximal/distal for limbs; right/left side or central for axial regions — use to characterize the pain generator more precisely in the impression):
${Object.entries(anamnesisData.painRegionRefinements).map(([k, v]: [string, any]) => `    • ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")}` : ""}
- Pain types: ${(anamnesisData?.painTypes || []).join(", ") || "N/A"}
- Pain score (VAS, overall/average): ${painScore ?? "N/A"}/10
- Pain score mode: ${anamnesisData?.painScoreMode || "general"}
${anamnesisData?.painScoreMode === "per_region" && anamnesisData?.painScoresPerRegion && Object.keys(anamnesisData.painScoresPerRegion).length > 0 ? `- **PAIN INTENSITY PER REGION (use as primary pain input; overall score is just an average):**
${Object.entries(anamnesisData.painScoresPerRegion).map(([k, v]) => `    • ${k}: ${v}/10`).join("\n")}
- When summarizing, explicitly mention which body region(s) carry the highest pain scores and let that asymmetry guide the clinical picture — do not collapse everything into the overall average.` : ""}
- Evolution: ${anamnesisData?.evolution || "N/A"}
- Aggravating factors: ${anamnesisData?.aggravatingFactors || "N/A"}
- Relieving factors: ${anamnesisData?.relievingFactors || "N/A"}
- Activity level: ${anamnesisData?.activityLevel || "N/A"}
- Previous treatments: ${anamnesisData?.previousTreatments || "N/A"}
- Has edema: ${anamnesisData?.hasEdema ?? "N/A"}
- Had twist/sprain: ${anamnesisData?.hadTwist ?? "N/A"}
- Pain pattern: ${anamnesisData?.painPattern || "N/A"}
- Weekly frequency: ${anamnesisData?.painWeeklyFrequency || "N/A"}
- Night waking: ${anamnesisData?.painNightWaking || "N/A"}
- Photophobia: ${anamnesisData?.hasPhotophobia || "N/A"}
- Visual aura: ${anamnesisData?.hasVisualAura || "N/A"}
- Nausea: ${anamnesisData?.hasNausea || "N/A"}
- Headache crisis frequency: ${anamnesisData?.headacheCrisisFrequency || "N/A"}
- Diagnostic hypothesis: ${diagnosis?.hypothesis || "N/A"}
- Diagnostic summary: ${diagnosis?.summary || "N/A"}
- Questionnaire results: ${JSON.stringify(questionnaireResults || [])}${timelineBlock}
${Array.isArray(anamnesisData?.romTable) && anamnesisData.romTable.length > 0 ? `- Joint mobility (ROM):
${anamnesisData.romTable.filter((r: any) => r?.joint || r?.leftValue || r?.rightValue).map((r: any) => `    • ${r.joint || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}`).join("\n")}` : ""}
${Array.isArray(anamnesisData?.strengthTable) && anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).length > 0 ? `- Dynamometry (muscle strength, kgf) — weigh asymmetries > 20% as a sign of inhibition/weakness (D.I.F.I):
${anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).map((r: any) => `    • ${r.movement || "?"}: L ${r.leftValue || "—"} kgf | R ${r.rightValue || "—"} kgf`).join("\n")}` : `- Dynamometry: NOT RECORDED — do not infer or invent strength values; reason from the data above without speculating about objective strength.`}

Generate the clinical impression now.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "return_clinical_impression",
          description: "Return the structured clinical impression",
          parameters: {
            type: "object",
            properties: {
              overview: {
                type: "string",
                description: "Integrative clinical overview in 3-5 lines, incorporating timeline perspective when multiple assessments exist",
              },
              therapeuticObjectives: {
                type: "array",
                items: { type: "string" },
                description: "Exactly 2 therapeutic objectives from the predefined list",
                minItems: 2,
                maxItems: 2,
              },
            },
            required: ["overview", "therapeuticObjectives"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_clinical_impression" } },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    let clinicalImpression: { overview: string; therapeuticObjectives: string[] };

    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      clinicalImpression = {
        overview: args.overview || "",
        therapeuticObjectives: (args.therapeuticObjectives || []).slice(0, 2),
      };
    } else {
      const content = result.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content);
        clinicalImpression = {
          overview: parsed.overview || parsed.clinicalImpression?.overview || content,
          therapeuticObjectives: parsed.therapeuticObjectives || parsed.clinicalImpression?.therapeuticObjectives || [],
        };
      } catch {
        clinicalImpression = {
          overview: content,
          therapeuticObjectives: [],
        };
      }
    }

    return new Response(JSON.stringify({ clinicalImpression }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-clinical-impression error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
