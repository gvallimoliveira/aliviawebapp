import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { anamnesisData, testResults, questionnaireResults, mode, language } = await req.json();

    const lang = language === "en" ? "English" : "Portuguese (Brazil)";
    const isBasic = mode === "basic";

    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's anamnesis data and validated questionnaire results, generate a diagnostic hypothesis.

KNOWLEDGE BASE (use as clinical reference):
- Sociedade Brasileira de Ortopedia e Traumatologia (SBOT) publications
- SONAFE (Sociedade Nacional de Fisioterapia Esportiva) publications
- "Kinesiology of the Musculoskeletal System" by Donald Neumann
- "Clinical Neurodynamics" by Michael Shacklock

IMPORTANT RULES:
- Always respond in ${lang}.
- This is NOT a definitive diagnosis — always clarify it's a hypothesis for educational purposes.
- Be empathetic and use accessible language a layperson can understand.
- Never recommend medication.
- Always suggest consulting a healthcare professional for confirmation.
- When validated questionnaire results are provided, use the scores and subscale analysis to support your hypothesis and identify the most affected functional areas.

Response format (JSON):
{
  "hypothesis": "Main diagnostic hypothesis name",
  "confidence": "low" | "moderate" | "high",
  "summary": "Brief 1-2 sentence summary of the hypothesis",
  ${isBasic ? "" : `"explanation": "Detailed explanation of what's happening in the body (2-3 paragraphs). Reference questionnaire findings when available.",
  "reasoning": "Why this hypothesis based on the provided data, including questionnaire score interpretation",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "functionalProfile": "Summary of the patient's functional limitations based on questionnaire subscale scores (e.g., most affected areas: daily activities, sport, quality of life)",`}
  "disclaimer": "Medical disclaimer text"
}`;

    const userPrompt = `Patient anamnesis data:
- Chief complaint: ${anamnesisData.chiefComplaint || anamnesisData.customComplaint}
- Custom complaint details: ${anamnesisData.customComplaint || "N/A"}
- Onset: ${anamnesisData.onset}
- Pain regions: ${anamnesisData.painRegions?.join(", ") || "Not specified"}
- Pain types: ${anamnesisData.painTypes?.join(", ") || "Not specified"}
- Evolution: ${anamnesisData.evolution}
- Aggravating factors: ${anamnesisData.aggravatingFactors || "Not specified"}
- Relieving factors: ${anamnesisData.relievingFactors || "Not specified"}
- Activity level: ${anamnesisData.activityLevel}
- Pain score (0-10): ${anamnesisData.painScore}

${testResults && testResults.length > 0 ? `Functional test results:
${testResults.map((t: any) => `- ${t.testId}: ${t.painful ? "PAINFUL/UNCOMFORTABLE" : "No discomfort"}`).join("\n")}` : "No functional tests performed."}

${questionnaireResults && questionnaireResults.length > 0 ? `Validated questionnaire results:
${questionnaireResults.map((q: any) => `- ${q.questionnaireName} (${q.questionnaireId.toUpperCase()}): Total score ${q.percentageScore}% | Interpretation: ${q.interpretation_pt || q.interpretation_en} | Severity: ${q.severity}
  Subscale scores: ${Object.entries(q.subscaleScores || {}).map(([k, v]) => `${k}: ${v}%`).join(", ")}`).join("\n")}` : "No validated questionnaires applied."}

Assessment mode: ${isBasic ? "Basic (provide only hypothesis, confidence, summary and disclaimer)" : "Premium (provide full detailed analysis including functional test findings and questionnaire-based functional profile)"}

Generate the diagnostic hypothesis in valid JSON format.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI Gateway error:", error);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices[0].message.content;

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const diagnosis = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating diagnosis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
