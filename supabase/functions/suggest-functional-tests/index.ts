// Suggest 2-6 functional/orthopedic/mobility tests based on assessment context.
// Uses Lovable AI Gateway. CORS-enabled, public (verify_jwt=false).
// Cached by input hash for 7 days to avoid repeated identical calls.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/caller-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await requireUser(req, corsHeaders);
    if (__gate instanceof Response) return __gate;
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const {
      anamnesis,           // free-form anamnesis block
      painScore,
      painType,
      painRegions,
      redFlags,
      questionnaireResults,
      currentTestsText,    // what the professional has already written
      sacroiliacSuspected, // Laslett cluster already suggested deterministically in the UI
      language,
      forceRefresh,
    } = await req.json();

    // Cache lookup — same clinical context returns same suggestions for 7 days.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { anamnesis, painScore, painType, painRegions, redFlags, questionnaireResults, currentTestsText, sacroiliacSuspected, language };
    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<{ suggestions: unknown[] }>(admin, "suggest-functional-tests", cachePayload);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Economia: respostas reaproveitadas (cache) não consomem créditos.
    const creditDecision = await canaryCredits(req, "suggest-functional-tests");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    const isPt = language === "pt";
    const isEs = language === "es";
    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";


    const systemPrompt = `You are a senior musculoskeletal physiotherapy clinician.
Your task: based on the assessment data already gathered, suggest between 2 and 6 ADDITIONAL clinical tests the therapist should consider performing, to confirm or rule out hypotheses.

Rules:
- Suggestions must be SPECIFIC, named tests — orthopedic special tests, functional movement tests, flexibility/mobility assessments, motor control tests, or neurodynamic tests.
- Each suggestion must be directly relevant to the pain regions and clinical picture provided.
- Do NOT repeat tests the professional has already mentioned in "currentTestsText".
- Be concise: each suggestion = test name + 1 short sentence explaining what it screens for and why it is relevant here.
- Mix categories when useful (orthopedic special test, mobility, motor control, neurodynamic).
- Order by clinical priority (most informative first).
${sacroiliacSuspected ? `- SACROILIAC CONTEXT: the pain is in the sacroiliac/gluteal/low-lumbar region and the Laslett provocation cluster (distraction, thigh thrust, pelvic compression, sacral thrust, Gaenslen) is ALREADY being suggested to the therapist. Do NOT repeat those five tests. Suggest complementary tests that help differentiate SIJ pain from lumbar, hip or neural sources (e.g. active straight leg raise, FABER/FADIR, lumbar extension-rotation, neurodynamic testing, hip abductor control).` : ""}
- Respond in ${langLabel}.
- Use the tool to return the structured output. Minimum 2, maximum 6 suggestions.`;

    const userPrompt = `Assessment context:
- Pain regions: ${(painRegions || []).join(", ") || "N/A"}
- Pain score (VAS): ${painScore ?? "N/A"}/10
- Pain type/characteristics: ${painType || "N/A"}
- Red flags checked: ${(redFlags || []).join("; ") || "none"}
- Anamnesis: ${anamnesis || "N/A"}
- Questionnaire results: ${JSON.stringify(questionnaireResults || [])}
- Tests already documented by the professional:
"""
${currentTestsText || "(none yet)"}
"""

Generate the suggestions now.`;

    const tools = [{
      type: "function",
      function: {
        name: "return_test_suggestions",
        description: "Return a list of suggested clinical tests with rationale",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Test name (eg. Neer test, Thomas test, Ober test)" },
                  category: {
                    type: "string",
                    enum: ["orthopedic", "mobility", "flexibility", "functional", "motor_control", "neurodynamic"],
                  },
                  rationale: { type: "string", description: "Short sentence explaining why this test fits this case" },
                },
                required: ["name", "category", "rationale"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    }];

    const { callAiWithFallback } = await import("../_shared/ai-fallback.ts");
    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_test_suggestions" } },
    }, undefined, { functionName: "suggest-functional-tests", maxTokens: 900 });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    let suggestions: Array<{ name: string; category: string; rationale: string }> = [];
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      suggestions = Array.isArray(args.suggestions) ? args.suggestions.slice(0, 6) : [];
    } else {
      const content = result.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content);
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 6) : [];
      } catch {
        suggestions = [];
      }
    }

    if (admin && suggestions.length > 0) {
      await setCachedAiResponse(admin, "suggest-functional-tests", cachePayload, { suggestions }, AI_CACHE_TTL_30D);
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-functional-tests error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
