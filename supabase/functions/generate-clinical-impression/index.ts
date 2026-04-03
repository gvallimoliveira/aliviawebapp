import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { anamnesisData, painRegions, painScore, questionnaireResults, diagnosis, language } = await req.json();
    const isPt = language === "pt";
    const isEs = language === "es";

    const langLabel = isEs ? "español" : isPt ? "português brasileiro" : "English";

    const systemPrompt = `You are a clinical physiotherapy expert. Your task is to produce a brief integrative clinical impression based on assessment data. 

Rules:
- Write a concise overview (3-5 lines) integrating the clinical context: chief complaint, onset, pain characteristics, duration, functional questionnaire scores, and diagnostic hypothesis.
- Do NOT mention specific exercises, treatment techniques, or therapeutic approaches.
- Select exactly 2 main therapeutic objectives from this list ONLY: controle do quadro álgico, reequilibrar tensões miofasciais, exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar, modulação da dor.
- Respond in ${langLabel}.
- Use the tool provided to return the structured output.`;

    const userPrompt = `Assessment data:
- Chief complaint: ${anamnesisData?.chiefComplaint || "N/A"}
- Custom complaint: ${anamnesisData?.customComplaint || "N/A"}
- Onset: ${anamnesisData?.onset || "N/A"}
- Pain regions: ${(painRegions || []).join(", ") || "N/A"}
- Pain types: ${(anamnesisData?.painTypes || []).join(", ") || "N/A"}
- Pain score (VAS): ${painScore ?? "N/A"}/10
- Evolution: ${anamnesisData?.evolution || "N/A"}
- Aggravating factors: ${anamnesisData?.aggravatingFactors || "N/A"}
- Relieving factors: ${anamnesisData?.relievingFactors || "N/A"}
- Activity level: ${anamnesisData?.activityLevel || "N/A"}
- Previous treatments: ${anamnesisData?.previousTreatments || "N/A"}
- Has edema: ${anamnesisData?.hasEdema ?? "N/A"}
- Had twist/sprain: ${anamnesisData?.hadTwist ?? "N/A"}
- Diagnostic hypothesis: ${diagnosis?.hypothesis || "N/A"}
- Diagnostic summary: ${diagnosis?.summary || "N/A"}
- Questionnaire results: ${JSON.stringify(questionnaireResults || [])}

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
                description: "Integrative clinical overview in 3-5 lines",
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_clinical_impression" } },
      }),
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
      // Fallback: try to parse from content
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
