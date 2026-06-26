import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { shadowLogAiUsage } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessments, language
    shadowLogAiUsage(req, { function_name: "generate-evolution-summary" }); = "pt" } = await req.json();

    if (!assessments || !Array.isArray(assessments) || assessments.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 assessments required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const first = assessments[0];
    const last = assessments[assessments.length - 1];

    const isPt = language === "pt";
    const isEs = language === "es";

    const systemPrompt = isPt
      ? `Você é um fisioterapeuta especialista em ortopedia. Gere um resumo narrativo de evolução clínica comparando a primeira e última avaliação do paciente. Seja objetivo, clínico e profissional. Máximo 6 linhas. Inclua variações percentuais dos scores quando disponíveis.`
      : isEs
      ? `Eres un fisioterapeuta especialista en ortopedia. Genera un resumen narrativo de evolución clínica comparando la primera y última evaluación del paciente. Sé objetivo, clínico y profesional. Máximo 6 líneas.`
      : `You are an orthopedic physiotherapist specialist. Generate a narrative clinical evolution summary comparing the patient's first and last assessments. Be objective, clinical and professional. Maximum 6 lines. Include percentage variations of scores when available.`;

    const userPrompt = `
First assessment (${first.date}):
- Pain score: ${first.pain_score ?? "N/A"}/10
- Hypothesis: ${first.hypothesis || "N/A"}
- Pain regions: ${(first.pain_regions || []).join(", ") || "N/A"}
- Questionnaires: ${JSON.stringify(first.questionnaires || [])}

Last assessment (${last.date}):
- Pain score: ${last.pain_score ?? "N/A"}/10
- Hypothesis: ${last.hypothesis || "N/A"}
- Pain regions: ${(last.pain_regions || []).join(", ") || "N/A"}
- Questionnaires: ${JSON.stringify(last.questionnaires || [])}

Total assessments in period: ${assessments.length}
`;

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
                narrative: { type: "string", description: "Clinical narrative summarizing the evolution between assessments" },
                painChange: { type: "string", description: "Brief description of pain score change" },
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
                conclusion: { type: "string", description: "Brief conclusion about the clinical progression" },
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
    });

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
