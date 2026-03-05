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
    const { anamnesisData, testResults, questionnaireResults, mode, language, additionalInfo } = await req.json();

    const lang = language === "en" ? "English" : "Portuguese (Brazil)";
    const isBasic = mode === "basic";
    const isProfessional = mode === "professional";

    // Detect shoulder-related complaint
    const shoulderComplaints = ["anamnesis.complaint.shoulder_pain"];
    const shoulderRegions = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
    const armRegions = ["right_arm", "left_arm", "arm_side"];
    const isShoulderCase = shoulderComplaints.includes(anamnesisData.chiefComplaint) ||
      (anamnesisData.painRegions || []).some((r: string) => shoulderRegions.includes(r));
    const hasArmComponent = (anamnesisData.painRegions || []).some((r: string) => armRegions.includes(r));

    // Detect knee/thigh-related complaint
    const kneeComplaints = ["anamnesis.complaint.knee_pain"];
    const kneeRegions = ["right_knee", "left_knee", "right_knee_back", "left_knee_back", "knee_side"];
    const thighRegions = ["right_thigh", "left_thigh", "right_hamstring", "left_hamstring", "thigh_side"];
    const hipComplaints = ["anamnesis.complaint.hip_pain"];
    const isKneeCase = kneeComplaints.includes(anamnesisData.chiefComplaint) ||
      (anamnesisData.painRegions || []).some((r: string) => kneeRegions.includes(r));
    const isThighCase = (anamnesisData.painRegions || []).some((r: string) => thighRegions.includes(r));
    const isHipCase = hipComplaints.includes(anamnesisData.chiefComplaint);
    const isKneeThighCase = isKneeCase || isThighCase;

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

    const kneeThighBlock = isKneeThighCase ? `
KNEE/THIGH-SPECIFIC CLINICAL REASONING (MANDATORY for knee and thigh complaints):
You MUST systematically consider BOTH intra-articular and extra-articular origins:

INTRA-ARTICULAR hypotheses to consider:
- Meniscal lesions (medial and lateral): locking, catching, joint line tenderness, McMurray-like symptoms. Medial meniscus is more commonly injured. Consider degenerative tears in patients >40 and traumatic tears in younger/athletic patients.
- Ligament injuries: ACL (pivot/cutting sports, feeling of "pop", instability), PCL (dashboard injury, posterior tibial sag), MCL (valgus stress, medial pain), LCL (varus stress, lateral pain)
- Chondromalacia patellae / Patellofemoral pain syndrome: anterior knee pain worsened by stairs, prolonged sitting (cinema sign), squatting. Common in young active individuals, especially women. Consider VMO weakness, patellar tracking, Q-angle.
- Osteochondral lesions: persistent swelling, mechanical symptoms, post-traumatic
- Plica syndrome: medial parapatellar snapping, pseudo-locking

EXTRA-ARTICULAR hypotheses to consider:
- Patellar tendinopathy (jumper's knee): inferior pole pain, load-dependent (jumping, squatting, stairs). Common in volleyball, basketball, running athletes. Gradual onset, worsens with tendon loading.
- Pes anserine tendinopathy/bursitis (pata de ganso): medial proximal tibial pain, common in overweight individuals, women, and runners. Pain worsens with stairs and resisted knee flexion/internal rotation.
- Iliotibial band syndrome: lateral knee pain, especially in runners and cyclists. Pain at ~30° flexion, worsened by downhill running.
- Quadriceps tendinopathy: superior patellar pole pain, worsened by loading activities

${isThighCase ? `THIGH-SPECIFIC hypotheses (MANDATORY when thigh pain is reported):
- Hamstring strain/injury (posterior thigh): common in sprinting, kicking sports. Consider biceps femoris (most common), semimembranosus, semitendinosus. Acute onset during eccentric loading. Grade severity by function and pain level.
- Rectus femoris strain (anterior thigh): common in kicking sports (football). Pain with hip flexion and knee extension. Often at musculotendinous junction or proximal origin (AIIS avulsion in adolescents).
- Quadriceps contusion: direct trauma, anterior/lateral thigh, consider myositis ossificans risk if severe
- Adductor strain: medial thigh pain, common in football/hockey, pain with resisted adduction
- Myofascial tension/trigger points: vastus lateralis, rectus femoris, hamstring referred pain patterns
- Meralgia paresthetica (lateral femoral cutaneous nerve): anterolateral thigh numbness/burning, consider in overweight patients or tight belts/clothing` : ""}

${isHipCase || isThighCase ? `HIP-KNEE CHAIN CONSIDERATIONS:
- Hip pathology (FAI, labral tears, hip OA) can refer pain to the anterior thigh and knee
- Teng & Powers (2016): hip-extensor weakness leads to overreliance on knee extensors — consider proximal causes for distal symptoms
- L3-L4 radiculopathy can mimic anterior knee/thigh pain` : ""}

BIOMECHANICAL CONSIDERATIONS:
- Assess kinetic chain: foot pronation, hip weakness (especially gluteus medius), and core stability can all contribute to knee pathology
- Consider activity type: running (ITB, patellofemoral, pes anserine), jumping (patellar tendinopathy), cutting/pivoting (ACL, meniscal), contact sports (MCL, contusion)
- Pain duration matters: acute (<2 weeks) suggests strain/sprain; chronic (>3 months) suggests tendinopathy, degenerative changes, or biomechanical dysfunction
` : "";

    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's anamnesis data and validated questionnaire results, generate a diagnostic hypothesis.

KNOWLEDGE BASE (use as clinical reference):
- Sociedade Brasileira de Ortopedia e Traumatologia (SBOT) publications
- SONAFE (Sociedade Nacional de Fisioterapia Esportiva) publications
- "Kinesiology of the Musculoskeletal System" by Donald Neumann
- "Clinical Neurodynamics" by Michael Shacklock
- Ellenbecker & Cools (BJSM 2010): Rehabilitation of shoulder impingement syndrome and rotator cuff injuries
- Fahlstrom et al. (Knee Surg Sports Traumatol Arthrosc 2003): Eccentric calf-muscle training for chronic Achilles tendinosis
- Werner et al. (J Shoulder Elbow Surg 2010): Subacromial pressures vary with sleep positions
- Teng & Powers (J Athletic Training 2016): Hip-extensor weakness and patellofemoral injuries
- VISA-A Questionnaire (Robinson et al.): Validated outcome measure for Achilles tendon disorders
- Neviaser & Hannafin (J Am Acad Orthop Surg 2010): Adhesive capsulitis staging
- Crossley et al. (BJSM 2016): Patellofemoral pain consensus — exercise therapy cornerstone
- Cook & Purdam (BJSM 2009): Continuum model of tendon pathology
- Malliaras et al. (Sports Med 2015): Patellar tendinopathy load management
- Thorborg et al. (BJSM 2017): Hip and groin injury classification

${shoulderBlock}
${kneeThighBlock}

IMPORTANT RULES:
- Always respond in ${lang}.
- This is NOT a definitive diagnosis — always clarify it's a hypothesis for educational purposes.
- Be empathetic and use accessible language a layperson can understand.
- Never recommend medication.
- Always suggest consulting a healthcare professional for confirmation.
- When validated questionnaire results are provided, use the scores and subscale analysis to support your hypothesis and identify the most affected functional areas.
- When the patient provides additional information after an initial low-confidence assessment, you MUST carefully integrate this new data into your clinical reasoning. Re-evaluate your hypothesis considering ALL available data (original anamnesis + new information). The additional details often contain critical clues (mechanism of injury, specific triggers, prior treatments, temporal patterns) that can significantly narrow the differential diagnosis and increase confidence level.

Response format (JSON):
{
  "hypothesis": "Main diagnostic hypothesis name",
  "confidence": "low" | "moderate" | "high",
  "summary": "Brief 1-2 sentence summary of the hypothesis",
  ${isBasic || isProfessional ? "" : `"explanation": "Detailed explanation of what's happening in the body (2-3 paragraphs). Reference questionnaire findings when available.",
  "reasoning": "Why this hypothesis based on the provided data, including questionnaire score interpretation",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "functionalProfile": "Summary of the patient's functional limitations based on questionnaire subscale scores (e.g., most affected areas: daily activities, sport, quality of life)",`}
  "disclaimer": "${isProfessional ? (lang === "English" ? "Preliminary hypothesis for triage purposes. The definitive diagnosis will be the responsibility of the attending physiotherapist." : "Hipótese preliminar para fins de triagem. O diagnóstico definitivo será de responsabilidade do fisioterapeuta responsável.") : "Medical disclaimer text"}"
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

${additionalInfo ? `Additional information provided by the patient (USE THIS to refine your hypothesis and potentially increase confidence):
${additionalInfo}` : ""}

${testResults && testResults.length > 0 ? `Functional test results:
${testResults.map((t: any) => `- ${t.testId}: ${t.painful ? "PAINFUL/UNCOMFORTABLE" : "No discomfort"}`).join("\n")}` : "No functional tests performed."}

${questionnaireResults && questionnaireResults.length > 0 ? `Validated questionnaire results:
${questionnaireResults.map((q: any) => `- ${q.questionnaireName} (${q.questionnaireId.toUpperCase()}): Total score ${q.percentageScore}% | Interpretation: ${q.interpretation_pt || q.interpretation_en} | Severity: ${q.severity}
  Subscale scores: ${Object.entries(q.subscaleScores || {}).map(([k, v]) => `${k}: ${v}%`).join(", ")}`).join("\n")}` : "No validated questionnaires applied."}

Assessment mode: ${isBasic ? "Basic (provide only hypothesis, confidence, summary and disclaimer)" : isProfessional ? "Professional triage (provide only hypothesis, confidence, summary and disclaimer. The disclaimer MUST state this is a preliminary hypothesis for triage and the definitive diagnosis is the responsibility of the attending physiotherapist)" : "Premium (provide full detailed analysis including functional test findings and questionnaire-based functional profile)"}

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
