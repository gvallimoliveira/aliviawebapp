import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";
import { describeStrength, describeRom } from "../_shared/objective-tests.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Bump when the prompt/data blocks change so cached summaries are regenerated. */
const PROMPT_VERSION = "evo-v2-deep";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessments, language = "pt", forceRefresh, sessionNotes } = await req.json();


    if (!assessments || !Array.isArray(assessments) || assessments.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 assessments required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Content-addressed cache (TTL 30d) ---
    // Key = hash of the assessments timeline. A new assessment or any edit to an
    // existing one changes the key, so the comparative summary is regenerated.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { v: PROMPT_VERSION, assessments, language, sessionNotes };
    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<Record<string, unknown>>(admin, "generate-evolution-summary", cachePayload);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-evolution-summary");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isPt = language === "pt";
    const isEs = language === "es";
    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";

    const systemPrompt = `You are a senior orthopedic physiotherapist writing the EVOLUTION REPORT of a patient followed over time. Produce a DEEP, detailed and clinically substantive report — never a generic 3-line summary.

Mandatory rules:
- Write in ${langLabel}, in clinical prose, professional and objective. No bullet lists inside the text fields; use short paragraphs.
- "narrative": 12-20 lines. Cover the FULL timeline (all assessments provided, oldest → newest): initial clinical picture, what changed at each relevant moment, pain intensity trajectory (per region when available), evolution of the diagnostic hypothesis, and current status.
- "anamnesisSynthesis": synthesise the key anamnesis findings across assessments — chief complaint, onset, pain behaviour/pattern, aggravating and relieving factors, activity level, previous treatments, intercurrences — and how they changed over the period.
- "questionnaireAnalysis": interpret the functional questionnaires longitudinally: name each scale, cite first and last score with the direction of change, state whether the change is clinically meaningful, and highlight the worst-performing subscales when provided. Never omit a scale that was applied twice.
- "objectiveFindings": interpret dynamometry and ROM data when provided, citing the ACTUAL numbers (mean/best kgf, number of trials, CV%, L/R asymmetry, agonist/antagonist balance) and comparing timepoints when data exists at more than one. Asymmetry >10% is a clinically relevant deficit (D.I.F.I); CV >15% means questionable reproducibility. If no objective test data was provided, return an empty string — never invent values.
- "sessionNotesSynthesis": when therapist session/evolution notes are provided, extract the clinically useful signal (response to load, pain behaviour between sessions, adherence, intercurrences) and summarise the treatment course. If none provided, return an empty string.
- "conclusion": 4-8 lines correlating everything — symptoms, function, objective tests and clinical course — and justifying the recommendation. Point out remaining deficits and next clinical steps.
- Only comment on data actually provided. Never invent scores, values, dates or interventions.`;

    const fmtQ = (qs: any) =>
      Array.isArray(qs) && qs.length > 0
        ? qs
            .map((q: any) => {
              const subs = q.subscales && typeof q.subscales === "object" && Object.keys(q.subscales).length > 0
                ? ` (subscales: ${Object.entries(q.subscales).map(([k, v]) => `${k} ${v}%`).join(", ")})`
                : "";
              return `${q.name || q.id}: ${q.score}%${q.interpretation ? ` — ${q.interpretation}` : ""}${subs}`;
            })
            .join("; ")
        : "N/A";

    const blocks = assessments.map((a: any, i: number) => {
      const lines: string[] = [];
      lines.push(`--- ASSESSMENT ${i + 1} of ${assessments.length} (${a.date}) ---`);
      lines.push(`Pain score (VAS): ${a.pain_score ?? "N/A"}/10`);
      if (a.pain_scores_per_region && Object.keys(a.pain_scores_per_region).length > 0) {
        lines.push(`Pain per region: ${Object.entries(a.pain_scores_per_region).map(([k, v]) => `${k} ${v}/10`).join(", ")}`);
      }
      lines.push(`Pain regions: ${(a.pain_regions || []).join(", ") || "N/A"}`);
      lines.push(`Diagnostic hypothesis: ${a.hypothesis || "N/A"}`);
      if (a.diagnosis_summary) lines.push(`Diagnostic summary: ${String(a.diagnosis_summary).slice(0, 1200)}`);
      if (a.anamnesis && typeof a.anamnesis === "object") {
        const entries = Object.entries(a.anamnesis).filter(([, v]) =>
          v != null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && v.length === 0));
        if (entries.length > 0) {
          lines.push(`Anamnesis:\n${entries.map(([k, v]) => `    • ${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}`).join("\n")}`);
        }
      }
      lines.push(`Questionnaires: ${fmtQ(a.questionnaires)}`);
      if (Array.isArray(a.functional_tests) && a.functional_tests.length > 0) {
        lines.push(`Functional tests: ${a.functional_tests.map((t: any) => `${t.name}${t.result ? `: ${t.result}` : ""}`).join("; ")}`);
      }
      const st = describeStrength(a.strengthTable);
      if (st) lines.push(st);
      const rom = describeRom(a.romTable);
      if (rom) lines.push(rom);
      return lines.join("\n");
    });

    const notes = Array.isArray(sessionNotes)
      ? sessionNotes.filter((n: any) => ((n?.content || "") + (n?.observation || "")).trim().length > 0).slice(0, 20)
      : [];
    const notesBlock = notes.length > 0
      ? `\n--- THERAPIST SESSION / EVOLUTION NOTES (chronological) ---\n${notes
          .map((n: any) => `• ${n.session_date || n.date || "?"}: ${String(n.content || "").replace(/\s+/g, " ").slice(0, 700)}${n.observation ? ` | observation: ${String(n.observation).replace(/\s+/g, " ").slice(0, 400)}` : ""}`)
          .join("\n")}`
      : "";

    const userPrompt = `${blocks.join("\n\n")}${notesBlock}

Total assessments in period: ${assessments.length}

Generate the deep evolution report now, sweeping ALL data above.`;

    const { callAiWithFallback } = await import("../_shared/ai-fallback.ts");
    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "evolution_summary",
            description: "Return structured evolution summary",
            parameters: {
              type: "object",
              properties: {
                narrative: { type: "string", description: "Deep clinical narrative (12-20 lines) covering the whole timeline" },
                painChange: { type: "string", description: "Description of the pain trajectory, per region when available" },
                anamnesisSynthesis: { type: "string", description: "Synthesis of anamnesis findings and how they changed" },
                questionnaireAnalysis: { type: "string", description: "Longitudinal interpretation of functional questionnaires and subscales" },
                objectiveFindings: { type: "string", description: "Interpretation of dynamometry/ROM with actual numbers; empty string if none provided" },
                sessionNotesSynthesis: { type: "string", description: "Synthesis of therapist session notes; empty string if none provided" },
                questionnaireChanges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      firstScore: { type: "number" },
                      lastScore: { type: "number" },
                      changePercent: { type: "number" },
                    },
                    required: ["name", "firstScore", "lastScore", "changePercent"],
                  },
                },
                conclusion: { type: "string", description: "Substantive conclusion (4-8 lines) correlating all findings and justifying the recommendation" },
                recommendation: {
                  type: "string",
                  enum: ["discharge", "continue", "reassess"],
                  description: "Clinical recommendation based on evolution",
                },
              },
              required: ["narrative", "painChange", "conclusion", "recommendation"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "evolution_summary" } },
    }, undefined, { functionName: "generate-evolution-summary", maxTokens: 4000 });


    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let summary;
    try {
      summary = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call args:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (admin && summary && typeof summary === "object") {
      await setCachedAiResponse(admin, "generate-evolution-summary", cachePayload, summary, AI_CACHE_TTL_30D);
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-evolution-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
