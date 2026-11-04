import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-progression-suggestion");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { language = "pt" } = await req.json();

    // Get user's premium assessments WITHOUT professional_id (self-service only)
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, pain_score, pain_regions, diagnosis, treatment_plan, created_at, status, type, professional_id")
      .eq("user_id", user.id)
      .eq("type", "premium")
      .eq("status", "completed")
      .is("professional_id", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!assessments || assessments.length === 0) {
      return new Response(JSON.stringify({ suggestion: null, reason: "no_assessments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latestAssessment = assessments[0];

    // Get last 30 days of pain diary
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: diaryEntries } = await supabase
      .from("pain_diary_entries")
      .select("pain_score, notes, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", thirtyDaysAgo)
      .order("logged_at", { ascending: true });

    // Get exercise completion data (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: completions } = await supabase
      .from("exercise_completions")
      .select("completed_at, exercise_item_id")
      .eq("user_id", user.id)
      .gte("completed_at", fourteenDaysAgo);

    // Get active exercise programs for context — only programs tied to this
    // user's own assessments (service-role client bypasses RLS).
    const { data: ownAssessments } = await supabase
      .from("assessments")
      .select("id")
      .eq("user_id", user.id)
      .limit(200);
    const ownAssessmentIds = (ownAssessments || []).map((a: any) => a.id);
    const { data: programs } = ownAssessmentIds.length === 0 ? { data: [] as any[] } : await supabase
      .from("exercise_programs")
      .select(`
        id, notes, 
        items:exercise_program_items(id, sets, reps, frequency, custom_name,
          exercise:exercise_library(name_pt, name_en, category, difficulty, body_region)
        )
      `)
      .in("assessment_id", ownAssessmentIds)
      .gt("expires_at", new Date().toISOString())
      .limit(3);

    // Calculate metrics
    const diaryScores = (diaryEntries || []).map((e: any) => e.pain_score);
    const avgPain = diaryScores.length > 0
      ? Math.round((diaryScores.reduce((a: number, b: number) => a + b, 0) / diaryScores.length) * 10) / 10
      : null;
    const latestPain = diaryScores.length > 0 ? diaryScores[diaryScores.length - 1] : null;
    const painTrend = diaryScores.length >= 7
      ? (diaryScores.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7) -
        (diaryScores.slice(0, Math.min(7, diaryScores.length)).reduce((a: number, b: number) => a + b, 0) / Math.min(7, diaryScores.length))
      : null;

    // Exercise adherence
    const totalProgramItems = (programs || []).reduce((sum: number, p: any) => sum + (p.items?.length || 0), 0);
    const uniqueCompletionDays = new Set((completions || []).map((c: any) => c.completed_at)).size;
    const adherenceRate = totalProgramItems > 0 && uniqueCompletionDays > 0
      ? Math.round((completions?.length || 0) / (totalProgramItems * uniqueCompletionDays) * 100)
      : null;

    // Build diagnosis info
    const diagnosisInfo = latestAssessment.diagnosis
      ? (typeof latestAssessment.diagnosis === "string"
        ? latestAssessment.diagnosis
        : JSON.stringify(latestAssessment.diagnosis))
      : "N/A";

    const treatmentInfo = latestAssessment.treatment_plan
      ? (typeof latestAssessment.treatment_plan === "string"
        ? latestAssessment.treatment_plan
        : JSON.stringify(latestAssessment.treatment_plan))
      : "N/A";

    const exerciseDetails = (programs || []).flatMap((p: any) =>
      (p.items || []).map((item: any) => ({
        name: item.custom_name || item.exercise?.name_pt || "Unknown",
        category: item.exercise?.category || "general",
        difficulty: item.exercise?.difficulty || "beginner",
        body_region: item.exercise?.body_region || "general",
        sets: item.sets,
        reps: item.reps,
        frequency: item.frequency,
      }))
    );

    const langMap: Record<string, string> = {
      pt: "português brasileiro",
      en: "English",
      es: "español",
    };

    const systemPrompt = `You are a physiotherapy AI assistant. Based on a patient's pain diary data, exercise adherence, and diagnosis, provide a brief, actionable suggestion about their exercise progression.

RULES:
- Respond in ${langMap[language] || "português brasileiro"}
- Be encouraging but evidence-based
- Keep suggestions practical and specific
- NEVER suggest stopping exercises without professional guidance
- If pain is decreasing and adherence is good, suggest gentle progression
- If pain is increasing, suggest maintaining current level or reducing intensity
- If adherence is low, encourage consistency before progression
- Always recommend consulting a professional for significant changes`;

    const userPrompt = `Patient data:
- Latest assessment pain: ${latestAssessment.pain_score}/10
- Pain regions: ${(latestAssessment.pain_regions || []).join(", ") || "N/A"}
- Diagnosis: ${diagnosisInfo}
- Treatment plan summary: ${treatmentInfo}

Pain diary (last 30 days):
- Average pain: ${avgPain ?? "No data"}/10
- Latest pain: ${latestPain ?? "No data"}/10
- Pain trend (negative = improving): ${painTrend !== null ? painTrend.toFixed(1) : "Insufficient data"}
- Total diary entries: ${diaryScores.length}

Exercise data (last 14 days):
- Active exercises: ${exerciseDetails.length}
- Exercise details: ${JSON.stringify(exerciseDetails.slice(0, 10))}
- Days with completions: ${uniqueCompletionDays}/14
- Adherence rate: ${adherenceRate !== null ? adherenceRate + "%" : "No data"}

Generate a progression suggestion.`;

    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "progression_suggestion",
            description: "Return structured progression suggestion",
            parameters: {
              type: "object",
              properties: {
                phase: {
                  type: "string",
                  enum: ["maintain", "progress", "reduce"],
                  description: "Recommended phase: maintain current level, progress to harder, or reduce intensity",
                },
                title: { type: "string", description: "Short title for the suggestion (max 60 chars)" },
                message: { type: "string", description: "Detailed suggestion message (2-4 sentences)" },
                tips: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 specific actionable tips",
                },
                confidence: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Confidence level based on data availability",
                },
              },
              required: ["phase", "title", "message", "tips", "confidence"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "progression_suggestion" } },
    }, undefined, { functionName: "generate-progression-suggestion", maxTokens: 1200 });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const suggestion = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(
      JSON.stringify({
        suggestion,
        metrics: {
          avgPain,
          latestPain,
          painTrend: painTrend !== null ? Math.round(painTrend * 10) / 10 : null,
          diaryEntries: diaryScores.length,
          adherenceRate,
          exerciseCount: exerciseDetails.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Progression suggestion error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
