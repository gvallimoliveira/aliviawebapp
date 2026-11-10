import { isPreventiveAssessment, normalizeAssessmentPurpose, preventiveReasoningContext } from "../_shared/assessment-purpose.ts";
import { requireUser } from "../_shared/caller-auth.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { buildProfessionalContext } from "../_shared/professional-context.ts";
import { buildRlcaReference, RLCA_REFERENCE_VERSION } from "../_shared/rlca-reference.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { buildPhysioTechBlock } from "./physiotechContext.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Bump when the prompt/data blocks change so cached impressions are regenerated. */
const PROMPT_VERSION = "ci-v6-purpose";

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Asymmetry (%) between two values, relative to the greater one. */
const asymmetryPct = (a: number | null, b: number | null): number | null => {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  return Math.round((Math.abs(a - b) / Math.max(a, b)) * 100);
};

const sideStats = (value: unknown, trials: unknown) => {
  const list = Array.isArray(trials) ? trials : [];
  const nums = list.map((t: any) => num(t?.value ?? t)).filter((n): n is number => n != null && n > 0);
  const times = list.map((t: any) => num(t?.timeToPeak)).filter((n): n is number => n != null && n > 0);
  if (nums.length === 0) {
    const single = num(value);
    return {
      count: single != null && single > 0 ? 1 : 0,
      best: single != null && single > 0 ? round1(single) : null,
      mean: single != null && single > 0 ? round1(single) : null,
      cv: null as number | null,
      meanTimeToPeak: null as number | null,
      trials: [] as string[],
    };
  }
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  let cv: number | null = null;
  if (nums.length > 1 && mean > 0) {
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    cv = Math.round((Math.sqrt(variance) / mean) * 1000) / 10;
  }
  return {
    count: nums.length,
    best: round1(Math.max(...nums)),
    mean: round1(mean),
    cv,
    meanTimeToPeak: times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100 : null,
    trials: list
      .map((t: any) => {
        const v = num(t?.value ?? t);
        if (v == null) return null;
        const tp = num(t?.timeToPeak);
        return `${round1(v)} kgf${tp != null ? ` @ ${tp}s` : ""}`;
      })
      .filter((s): s is string => !!s),
  };
};

const normTxt = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const PAIRS = [
  {
    title: "Shoulder — internal vs external rotation",
    region: /(ombro|shoulder|hombro)/,
    aLabel: "internal rotation",
    aRe: /(rotac|rotat).*(intern|medial)|(intern|medial).*(rotac|rotat)/,
    bLabel: "external rotation",
    bRe: /(rotac|rotat).*(extern|lateral)|(extern|lateral).*(rotac|rotat)/,
  },
  { title: "Knee — extension vs flexion", region: /(joelho|knee|rodilla)/, aLabel: "extension", aRe: /(exten)/, bLabel: "flexion", bRe: /(flex)/ },
  { title: "Hip — extension vs flexion", region: /(quadril|hip|cadera)/, aLabel: "extension", aRe: /(exten)/, bLabel: "flexion", bRe: /(flex)/ },
  { title: "Hip — adduction vs abduction", region: /(quadril|hip|cadera)/, aLabel: "adduction", aRe: /(aducao|aducc|adduc|aduc)/, bLabel: "abduction", bRe: /(abduc)/ },
];

/** Intra-side agonist/antagonist balance for the known movement pairs. */
const agonistAntagonist = (rows: any[]) => {
  const out: Array<{
    title: string; aLabel: string; bLabel: string;
    left: { a: number | null; b: number | null; asym: number | null };
    right: { a: number | null; b: number | null; asym: number | null };
  }> = [];
  for (const pair of PAIRS) {
    const find = (re: RegExp, isAdduction: boolean) =>
      rows.find((r: any) => {
        const m = normTxt(r?.movement);
        if (isAdduction && /abduc/.test(m)) return false;
        return pair.region.test(m) && re.test(m);
      });
    const rowA = find(pair.aRe, pair.aLabel === "adduction");
    const rowB = find(pair.bRe, false);
    if (!rowA || !rowB) continue;
    const side = (which: "left" | "right") => {
      const sa = sideStats(which === "left" ? rowA.leftValue : rowA.rightValue, which === "left" ? rowA.leftTrials : rowA.rightTrials);
      const sb = sideStats(which === "left" ? rowB.leftValue : rowB.rightValue, which === "left" ? rowB.leftTrials : rowB.rightTrials);
      return { a: sa.mean, b: sb.mean, asym: asymmetryPct(sa.mean, sb.mean) };
    };
    out.push({ title: pair.title, aLabel: pair.aLabel, bLabel: pair.bLabel, left: side("left"), right: side("right") });
  }
  return out;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await requireUser(req, corsHeaders);
    if (__gate instanceof Response) return __gate;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { anamnesisData: rawAnamnesisData, painRegions, painScore, questionnaireResults, diagnosis, language, assessmentTimeline, sessionNotes, voiceNotes, forceRefresh, physiotechReports } = await req.json();
    const anamnesisData = normalizeAssessmentPurpose(rawAnamnesisData || {});
    const preventive = isPreventiveAssessment(anamnesisData);

    // Cache: identical clinical context → identical impression (7d).
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { v: PROMPT_VERSION, reference: RLCA_REFERENCE_VERSION, anamnesisData, painRegions, painScore, questionnaireResults, diagnosis, language, assessmentTimeline, sessionNotes, voiceNotes, physiotechReports: buildPhysioTechBlock(physiotechReports) || undefined };
    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<{ clinicalImpression: { overview: string; therapeuticObjectives: string[] } }>(
        admin,
        "generate-clinical-impression",
        cachePayload,
      );
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-clinical-impression");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
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

    const systemPrompt = `You are a clinical physiotherapy expert. Your task is to produce a DEEP, detailed integrative clinical impression based on assessment data.

Rules:
${preventiveReasoningContext(anamnesisData)}
- Write a substantive overview (8-14 lines, in flowing clinical prose separated into short paragraphs) integrating: chief complaint, onset, pain characteristics and intensity per region, duration, functional questionnaire scores, and diagnostic hypothesis.${multiAssessment ? "\n- When multiple assessments exist, describe the clinical trajectory over time: whether the patient improved, worsened, or remained stable, referencing specific score changes." : ""}
- OBJECTIVE TESTS ARE MANDATORY CONTENT when present. If dynamometry (strength) data is provided, you MUST dedicate an explicit part of the overview to it: cite the actual values (mean and best in kgf), the number of trials and reliability (CV% — above 15% means questionable reproducibility), left/right asymmetries and agonist/antagonist ratios within the same side, naming the movements. Interpret asymmetries above 10% as clinically relevant (deficit/inhibition per D.I.F.I) and state which side and which movement is deficient. Never treat these numbers as a footnote and never omit them.
- If range of motion (ROM) data is provided, likewise discuss it explicitly: which joints/movements are restricted, side comparison, and how the restriction relates to the hypothesis and to the strength findings.
- Explicitly CORRELATE the objective findings (strength, ROM) with the symptoms, the functional scores and the diagnostic hypothesis — do not list data without interpreting it.
- The physiotherapist's own observations and exam/test findings are PRIMARY expert sources: integrate them explicitly (including negative findings) and let them guide the reasoning. Also integrate complementary questionnaires (e.g. SRS-22r) with their scores. Do not use session evolution notes.
- If anamnesis interview voice transcripts/summaries are provided, treat them as a PRIMARY source: they capture the patient's own words during the consultation. Integrate anything clinically relevant that is NOT already in the structured fields — nuances of onset and mechanism, direct quotes about pain behavior, psychosocial context, beliefs, goals and expectations. Do not quote them verbatim at length; synthesize.
- Only comment on data actually provided. Never invent values. If dynamometry or ROM was not recorded, do not speculate about them.
- Do NOT mention specific exercises, treatment techniques, or therapeutic approaches.
- Select exactly 2 main therapeutic objectives from this list ONLY: ${preventive ? "exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar" : "controle do quadro álgico, reequilibrar tensões miofasciais, exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar, modulação da dor"}.
- Respond in ${langLabel}.
- Use the tool provided to return the structured output.${timelineInstruction}`;


    // Build user prompt with only populated fields to reduce token spend.
    const lines: string[] = [preventiveReasoningContext(anamnesisData), "Current assessment data:"];
    const push = (label: string, value: unknown) => {
      if (value === null || value === undefined) return;
      if (typeof value === "string" && !value.trim()) return;
      if (Array.isArray(value) && value.length === 0) return;
      lines.push(`- ${label}: ${Array.isArray(value) ? value.join(", ") : value}`);
    };

    push("Chief complaint", anamnesisData?.chiefComplaint);
    push("Custom complaint", anamnesisData?.customComplaint);
    push("Onset", anamnesisData?.onset);
    push("Pain regions", preventive ? [] : painRegions);
    if (anamnesisData?.painRegionRefinements && Object.keys(anamnesisData.painRegionRefinements).length > 0) {
      lines.push(
        `- Anatomical refinement per region (medial/lateral, anterior/posterior, proximal/distal for limbs; right/left side or central for axial regions — use to characterize the pain generator more precisely):\n${Object.entries(anamnesisData.painRegionRefinements).map(([k, v]: [string, any]) => `    • ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")}`
      );
    }
    push("Pain types", anamnesisData?.painTypes);
    if (!preventive && painScore !== null && painScore !== undefined) push("Pain score (VAS, overall/average)", `${painScore}/10`);
    if (anamnesisData?.painScoreMode && anamnesisData.painScoreMode !== "general") push("Pain score mode", anamnesisData.painScoreMode);
    if (anamnesisData?.painScoreMode === "per_region" && anamnesisData?.painScoresPerRegion && Object.keys(anamnesisData.painScoresPerRegion).length > 0) {
      lines.push(
        `- **PAIN INTENSITY PER REGION (use as primary pain input; overall score is just an average):**\n${Object.entries(anamnesisData.painScoresPerRegion).map(([k, v]) => `    • ${k}: ${v}/10`).join("\n")}\n- When summarizing, explicitly mention which body region(s) carry the highest pain scores and let that asymmetry guide the clinical picture — do not collapse everything into the overall average.`
      );
    }
    push("Evolution", anamnesisData?.evolution);
    push("Aggravating factors", anamnesisData?.aggravatingFactors);
    push("Relieving factors", anamnesisData?.relievingFactors);
    push("Activity level", anamnesisData?.activityLevel);
    push("Previous treatments", anamnesisData?.previousTreatments);
    push("Previous surgeries / surgical restrictions", anamnesisData?.previousSurgeries ?? anamnesisData?.previous_surgeries);
    if (anamnesisData?.hasEdema !== undefined && anamnesisData?.hasEdema !== null) push("Has edema", anamnesisData.hasEdema);
    if (anamnesisData?.hadTwist !== undefined && anamnesisData?.hadTwist !== null) push("Had twist/sprain", anamnesisData.hadTwist);
    push("Pain pattern", anamnesisData?.painPattern);
    push("Weekly frequency", anamnesisData?.painWeeklyFrequency);
    push("Night waking", anamnesisData?.painNightWaking);
    push("Photophobia", anamnesisData?.hasPhotophobia);
    push("Visual aura", anamnesisData?.hasVisualAura);
    push("Nausea", anamnesisData?.hasNausea);
    push("Headache crisis frequency", anamnesisData?.headacheCrisisFrequency);
    push("Diagnostic hypothesis", diagnosis?.hypothesis);
    push("Diagnostic summary", diagnosis?.summary);
    if (Array.isArray(questionnaireResults) && questionnaireResults.length > 0) {
      lines.push(`- Questionnaire results: ${JSON.stringify(questionnaireResults)}`);
    }
    if (timelineBlock) lines.push(timelineBlock);
    if (Array.isArray(anamnesisData?.romTable) && anamnesisData.romTable.length > 0) {
      const rom = anamnesisData.romTable.filter((r: any) => r?.joint || r?.leftValue || r?.rightValue);
      if (rom.length > 0) {
        lines.push(
          `- **RANGE OF MOTION (ROM) — MUST BE DISCUSSED EXPLICITLY:**\n${rom
            .map((r: any) => {
              const asym = asymmetryPct(num(r.leftValue), num(r.rightValue));
              return `    • ${r.joint || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}${asym != null ? ` | L/R difference ${asym}%${asym > 10 ? " (RELEVANT, >10%)" : ""}` : ""}${r.notes ? ` | notes: ${r.notes}` : ""}`;
            })
            .join("\n")}`,
        );
      }
    }
    const strength = Array.isArray(anamnesisData?.strengthTable)
      ? anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue)
      : [];
    if (strength.length > 0) {
      const rowLines = strength.map((r: any) => {
        const L = sideStats(r.leftValue, r.leftTrials);
        const R = sideStats(r.rightValue, r.rightTrials);
        const asym = asymmetryPct(L.mean, R.mean);
        const fmt = (s: ReturnType<typeof sideStats>) =>
          s.mean == null
            ? "—"
            : `mean ${s.mean} kgf, best ${s.best} kgf, ${s.count} trial(s)${s.cv != null ? `, CV ${s.cv}%` : ""}${s.meanTimeToPeak != null ? `, mean time to peak ${s.meanTimeToPeak}s` : ""}${s.trials.length ? ` [trials: ${s.trials.join(", ")}]` : ""}`;
        return `    • ${r.movement || "?"}\n        - Left: ${fmt(L)}\n        - Right: ${fmt(R)}\n        - L/R asymmetry (by mean): ${asym != null ? `${asym}%${asym > 10 ? " → ABOVE 10%, clinically relevant deficit on the weaker side" : " → within 10%, symmetric"}` : "not computable"}`;
      });
      lines.push(
        `- **DYNAMOMETRY (objective muscle strength, kgf) — CENTRAL OBJECTIVE DATA, MUST BE DISCUSSED IN DETAIL WITH THE ACTUAL NUMBERS. Threshold: asymmetry ≤10% = acceptable, >10% = relevant deficit/inhibition (D.I.F.I). CV >15% = poor reproducibility of the trials:**\n${rowLines.join("\n")}`,
      );
      const pairs = agonistAntagonist(strength);
      if (pairs.length > 0) {
        lines.push(
          `- **AGONIST/ANTAGONIST BALANCE within the SAME side (same >10% threshold) — discuss explicitly:**\n${pairs
            .map(
              (p) =>
                `    • ${p.title}: LEFT ${p.aLabel} ${p.left.a ?? "—"} kgf vs ${p.bLabel} ${p.left.b ?? "—"} kgf${p.left.asym != null ? ` → ${p.left.asym}%${p.left.asym > 10 ? " (IMBALANCE)" : ""}` : ""} | RIGHT ${p.aLabel} ${p.right.a ?? "—"} kgf vs ${p.bLabel} ${p.right.b ?? "—"} kgf${p.right.asym != null ? ` → ${p.right.asym}%${p.right.asym > 10 ? " (IMBALANCE)" : ""}` : ""}`,
            )
            .join("\n")}`,
        );
      }
    } else {
      lines.push(`- Dynamometry: NOT RECORDED — do not infer or invent strength values; reason from the data above without speculating about objective strength.`);
    }

    // Session evolution notes are intentionally excluded from the impression.
    void sessionNotes;
    lines.push(...buildProfessionalContext(anamnesisData));
    const physiotechBlock = buildPhysioTechBlock(physiotechReports);
    if (physiotechBlock) lines.push(physiotechBlock);

    const vNotes = (Array.isArray(voiceNotes) ? voiceNotes : [])
      .filter((v: any) => (v?.transcript || "").trim().length > 0 || (v?.summary && typeof v.summary === "object"))
      .slice(0, 5);
    if (vNotes.length > 0) {
      const blocks = vNotes
        .map((v: any, i: number) => {
          const date = v.created_at ? String(v.created_at).slice(0, 10) : "?";
          const parts: string[] = [`    • [Interview recording ${i + 1} — ${date}]`];
          if (v.summary && typeof v.summary === "object") {
            parts.push(`      Structured AI summary of the interview: ${JSON.stringify(v.summary)}`);
          }
          const t = String(v.transcript || "").replace(/\s+/g, " ").trim();
          if (t) parts.push(`      Transcript (excerpt): ${t.slice(0, 2500)}`);
          return parts.join("\n");
        })
        .join("\n");
      lines.push(
        `- **ANAMNESIS INTERVIEW VOICE RECORDINGS (transcribed from the actual consultation — a rich first-person source; integrate clinically relevant information, especially anything NOT captured in the structured fields above):**\n${blocks}`,
      );
    }


    lines.push("\nGenerate the clinical impression now.");
    const userPrompt = lines.join("\n");

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
                description: "Deep integrative clinical overview (8-14 lines, short paragraphs) that explicitly analyses dynamometry values/asymmetries, ROM findings and professional examination observations when provided, plus timeline perspective when multiple assessments exist",
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
        { role: "system", content: systemPrompt + buildRlcaReference(userPrompt) },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_clinical_impression" } },
    }, undefined, { functionName: "generate-clinical-impression", maxTokens: 3000 });

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

    if (admin && clinicalImpression.overview && clinicalImpression.therapeuticObjectives.length === 2) {
      await setCachedAiResponse(admin, "generate-clinical-impression", cachePayload, { clinicalImpression }, AI_CACHE_TTL_30D);
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
