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
    const { anamnesisData, testResults, diagnosis, mode, language } = await req.json();

    const lang = language === "en" ? "English" : "Portuguese (Brazil)";
    const painScore = anamnesisData?.painScore ?? 5;
    const isHighPain = painScore >= 6;
    const hasGym = anamnesisData?.hasGymAccess?.includes("yes") ?? false;

    const equipmentContext = hasGym
      ? "The patient HAS ACCESS to a gym with free weights, resistance machines, and standard gym equipment. You can prescribe exercises using barbells, dumbbells, cable machines, leg press, etc."
      : "The patient does NOT have access to a gym. All exercises MUST be bodyweight-based OR use minimal/affordable equipment like resistance bands (elastic bands), tennis balls, foam rollers, or towels. Suggest resistance bands as an affordable alternative when appropriate, mentioning they are low-cost and versatile.";

    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's data, diagnostic hypothesis, and functional test results, create a personalized treatment plan in 3 phases.

KNOWLEDGE BASE (use as clinical reference):
- Sociedade Brasileira de Ortopedia e Traumatologia (SBOT) publications and guidelines
- SONAFE (Sociedade Nacional de Fisioterapia Esportiva) publications
- "Kinesiology of the Musculoskeletal System" by Donald Neumann
- "Clinical Neurodynamics" by Michael Shacklock

IMPORTANT RULES:
- Always respond in ${lang}.
- This is for educational purposes only — always include a disclaimer.
- Never recommend medication.
- Be empathetic and use accessible language.
- EQUIPMENT CONTEXT: ${equipmentContext}
- Adapt the plan based on pain score (${painScore}/10):
  ${isHighPain 
    ? "- Pain score is HIGH (≥6): Short-term phase should focus ONLY on conservative/analgesic approaches (rest, ice/heat, gentle stretching, breathing). NO muscle activation or strengthening in short-term."
    : "- Pain score is MODERATE/LOW (<6): Short-term can include gentle muscle activation and mobility exercises alongside pain management."
  }

CRITICAL RULE FOR YOUTUBE VIDEOS:
- Do NOT invent or fabricate YouTube URLs. AI-generated URLs will lead to broken pages.
- Instead of providing videoUrls, provide a "searchQuery" field for each exercise. This search query should be a specific YouTube search string that the user can use to find the correct demonstration video.
- The search query should be in the same language as the response (${lang}).
- Example: "searchQuery": "shoulder external rotation exercise physiotherapy demonstration"

Response format (JSON):
{
  "phases": [
    {
      "id": "short_term",
      "duration": "1-2 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "exercises": [
        {
          "name": "Exercise name",
          "description": "Clear instruction for performing the exercise",
          "sets": "3",
          "reps": "10-12",
          "frequency": "Daily",
          "searchQuery": "specific youtube search query for this exercise",
          "category": "stretching" | "strengthening" | "mobility" | "breathing" | "stability" | "pain_management"
        }
      ]
    },
    {
      "id": "medium_term",
      "duration": "3-6 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "exercises": [...]
    },
    {
      "id": "long_term",
      "duration": "7-12 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "exercises": [...]
    }
  ],
  "generalGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "progressionCriteria": "When to progress to the next phase",
  "disclaimer": "Medical disclaimer",
  "references": ["Reference 1", "Reference 2"]
}

EXERCISE GUIDELINES:
- Short-term: 3-5 exercises focused on pain relief and gentle mobility
- Medium-term: 4-6 exercises adding strengthening and functional movements
- Long-term: 4-6 exercises for return to full activity and prevention
- Each exercise MUST have a "searchQuery" field (NOT videoUrls)
- Adapt exercises based on equipment availability: ${hasGym ? "gym equipment available" : "bodyweight and resistance bands only"}
- Adapt intensity based on activity level: ${anamnesisData?.activityLevel || "not specified"}
- Include references from the knowledge base sources listed above`;

    const painfulTests = testResults?.filter((t: any) => t.painful).map((t: any) => t.testId) || [];
    const normalTests = testResults?.filter((t: any) => !t.painful).map((t: any) => t.testId) || [];

    const userPrompt = `Patient data:
- Chief complaint: ${anamnesisData?.chiefComplaint || anamnesisData?.customComplaint}
- Pain regions: ${anamnesisData?.painRegions?.join(", ") || "Not specified"}
- Pain types: ${anamnesisData?.painTypes?.join(", ") || "Not specified"}
- Pain score: ${painScore}/10
- Evolution: ${anamnesisData?.evolution}
- Aggravating factors: ${anamnesisData?.aggravatingFactors || "Not specified"}
- Relieving factors: ${anamnesisData?.relievingFactors || "Not specified"}
- Activity level: ${anamnesisData?.activityLevel}
- Onset: ${anamnesisData?.onset}
- Gym access: ${hasGym ? "Yes — has access to gym with free weights and resistance machines" : "No — no gym access, exercises should be bodyweight or use resistance bands"}

Diagnostic hypothesis: ${diagnosis?.hypothesis || "Not available"}

${testResults && testResults.length > 0 ? `Functional test results:
- Painful/Uncomfortable tests: ${painfulTests.join(", ") || "None"}
- Normal tests: ${normalTests.join(", ") || "None"}` : "No functional tests performed."}

Generate a personalized 3-phase treatment plan in valid JSON format. Focus exercises on the affected regions and address the deficits found in the functional tests. Remember: use "searchQuery" instead of "videoUrls" for each exercise.`;

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

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const treatmentPlan = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ treatmentPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating treatment plan:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
