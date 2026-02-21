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

    // Detect shoulder-related complaint
    const shoulderComplaints = ["anamnesis.complaint.shoulder_pain"];
    const shoulderRegions = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
    const armRegions = ["right_arm", "left_arm", "arm_side"];
    const isShoulderCase = shoulderComplaints.includes(anamnesisData.chiefComplaint) ||
      (anamnesisData.painRegions || []).some((r: string) => shoulderRegions.includes(r));
    const hasArmComponent = (anamnesisData.painRegions || []).some((r: string) => armRegions.includes(r));

    const shoulderBlock = isShoulderCase ? `
SHOULDER-SPECIFIC CLINICAL REASONING (MANDATORY for shoulder complaints):
When the chief complaint involves the shoulder (with or without ipsilateral arm pain), you MUST systematically consider BOTH intra-articular and extra-articular origins:

INTRA-ARTICULAR hypotheses to consider:
- Adhesive capsulitis (frozen shoulder): CRITICAL — women aged 35-55 are the primary demographic. Consider patient sex and age range carefully. Gradual onset with progressive global ROM restriction (especially external rotation and abduction) is highly suggestive.
- Labral lesions (SLAP, Bankart): common in overhead athletes and post-traumatic cases
- Glenohumeral instability: anterior, posterior or multidirectional — consider age, trauma history, hypermobility
- Subacromial impingement syndrome: painful arc, overhead activities, night pain when sleeping on affected side
- Internal impingement: posterior shoulder pain in overhead athletes during late cocking phase

EXTRA-ARTICULAR hypotheses to consider:
- Rotator cuff tendinopathy (supraspinatus, infraspinatus, subscapularis, teres minor): most common cause of shoulder pain, consider which tendon based on pain pattern and aggravating movements
- Calcific tendinitis: acute severe pain, limited ROM, common in 30-50 age group
- Biceps tendinopathy (long head): anterior shoulder pain, aggravated by lifting and supination
- Myofascial tension/trigger points: upper trapezius, levator scapulae, infraspinatus referred pain patterns
- Muscle strains: deltoid, pectoralis major, especially post-exertion
- Acromioclavicular joint pathology: localized superior shoulder pain, cross-body adduction aggravates
- Scapular dyskinesis: altered scapulohumeral rhythm contributing to impingement

${hasArmComponent ? "IMPORTANT: The patient reports ipsilateral arm pain. Consider cervical radiculopathy (C5-C6), thoracic outlet syndrome, and neural tension as differential diagnoses alongside primary shoulder pathology." : ""}

DEMOGRAPHIC CONTEXT:
- Patient sex: ${anamnesisData.sex || "Not provided"}
- Age range: ${anamnesisData.ageRange || "Not provided"}
${anamnesisData.sex === "anamnesis.sex.female" && ["anamnesis.age.35_44", "anamnesis.age.45_55"].includes(anamnesisData.ageRange) ? "⚠️ HIGH ALERT: Female patient in 35-55 age range — adhesive capsulitis must be strongly considered, especially with gradual onset and progressive ROM restriction." : ""}
` : "";

    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's anamnesis data and validated questionnaire results, generate a diagnostic hypothesis.

KNOWLEDGE BASE (use as clinical reference):
- Sociedade Brasileira de Ortopedia e Traumatologia (SBOT) publications
- SONAFE (Sociedade Nacional de Fisioterapia Esportiva) publications
- "Kinesiology of the Musculoskeletal System" by Donald Neumann
- "Clinical Neurodynamics" by Michael Shacklock
- Ellenbecker & Cools (BJSM 2010): Rehabilitation of shoulder impingement syndrome and rotator cuff injuries - primary vs secondary impingement, scapular dysfunction role, rotator cuff weakness patterns
- Fahlstrom et al. (Knee Surg Sports Traumatol Arthrosc 2003): Eccentric calf-muscle training for chronic Achilles tendinosis - 89% success rate for mid-portion tendinosis, poor results (32%) for insertional pain
- Werner et al. (J Shoulder Elbow Surg 2010): Subacromial pressures vary with sleep positions - supine position shows significantly lower pressures than side/prone positions
- Teng & Powers (J Athletic Training 2016): Hip-extensor weakness leads to upright trunk posture during running, causing overreliance on knee extensors and contributing to patellofemoral injuries
- Maranhão-Filho et al. (Arq Neuropsiquiatr 2011): Static balance assessment using CTSIB-modified and Functional Reach Test - unstable surfaces do not effectively train proprioception
- VISA-A Questionnaire (Robinson et al.): Validated outcome measure for Achilles tendon disorders, 8-item scale scored 0-100
- Neviaser & Hannafin (J Am Acad Orthop Surg 2010): Adhesive capsulitis - 4 stages (pre-adhesive, freezing, frozen, thawing), predominantly affects women 40-60 years
- Luime et al. (Ann Rheum Dis 2004): Prevalence and incidence of shoulder pain — lifetime prevalence up to 67%
- Lewis (BJSM 2016): Rotator cuff tendinopathy — load management and progressive rehabilitation framework

${shoulderBlock}

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
- Pain duration: ${anamnesisData.painDuration || "Not specified"}
- Sex: ${anamnesisData.sex || "Not specified"}
- Age range: ${anamnesisData.ageRange || "Not specified"}

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
