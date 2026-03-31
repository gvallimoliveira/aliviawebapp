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

    const painSubArea = anamnesisData.painSubArea || "";
    const hadTwist = anamnesisData.hadTwist || "";
    const hadSprain = anamnesisData.hadSprain || "";
    const hadDislocation = anamnesisData.hadDislocation || "";
    const ottawaPositive = anamnesisData.ottawaPositive || "";
    const hasPriorSurgery = anamnesisData.hasPriorSurgery || "";
    const surgeryDetails = anamnesisData.surgeryDetails || "";

    const lang = language === "en" ? "English" : "Portuguese (Brazil)";
    const isBasic = mode === "basic";
    const isProfessional = mode === "professional";

    // Support both chiefComplaints (array) and chiefComplaint (string) for backward compat
    const chiefComplaints: string[] = anamnesisData.chiefComplaints || (anamnesisData.chiefComplaint ? [anamnesisData.chiefComplaint] : []);

    // Detect shoulder-related complaint
    const shoulderComplaints = ["anamnesis.complaint.shoulder_pain"];
    const shoulderRegions = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
    const armRegions = ["right_arm", "left_arm", "arm_side"];
    const isShoulderCase = chiefComplaints.some(c => shoulderComplaints.includes(c)) ||
      (anamnesisData.painRegions || []).some((r: string) => shoulderRegions.includes(r));
    const hasArmComponent = (anamnesisData.painRegions || []).some((r: string) => armRegions.includes(r));

    // Detect knee/thigh-related complaint
    const kneeComplaints = ["anamnesis.complaint.knee_pain"];
    const kneeRegions = ["right_knee", "left_knee", "right_knee_back", "left_knee_back", "knee_side"];
    const thighRegions = ["right_thigh", "left_thigh", "right_hamstring", "left_hamstring", "thigh_side"];
    const hipComplaints = ["anamnesis.complaint.hip_pain"];
    const isKneeCase = chiefComplaints.some(c => kneeComplaints.includes(c)) ||
      (anamnesisData.painRegions || []).some((r: string) => kneeRegions.includes(r));
    const isThighCase = (anamnesisData.painRegions || []).some((r: string) => thighRegions.includes(r));
    const isHipCase = chiefComplaints.some(c => hipComplaints.includes(c));
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

    // Sub-area specific reasoning block
    const subAreaBlock = painSubArea ? (() => {
      const regionType = (() => {
        const kneeR = ["right_knee", "left_knee", "right_knee_back", "left_knee_back", "knee_side"];
        const ankleR = ["right_ankle", "left_ankle", "right_ankle_back", "left_ankle_back", "ankle_side"];
        const hipR = ["right_hip", "left_hip", "right_hip_back", "left_hip_back", "hip_side"];
        const shoulderR = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
        const cervicalR = ["neck_front", "neck_back", "neck_side"];
        const regions = anamnesisData.painRegions || [];
        if (regions.some((r: string) => kneeR.includes(r)) || chiefComplaints.some(c => kneeComplaints.includes(c))) return "knee";
        if (regions.some((r: string) => ankleR.includes(r)) || chiefComplaints.includes("anamnesis.complaint.ankle_pain")) return "ankle";
        if (regions.some((r: string) => hipR.includes(r)) || chiefComplaints.some(c => hipComplaints.includes(c))) return "hip";
        if (regions.some((r: string) => shoulderR.includes(r)) || chiefComplaints.includes("anamnesis.complaint.shoulder_pain")) return "shoulder";
        if (regions.some((r: string) => cervicalR.includes(r)) || chiefComplaints.includes("anamnesis.complaint.neck_pain")) return "cervical";
        return null;
      })();

      const mappings: Record<string, Record<string, string>> = {
        knee: {
          front: "PRIORITIZE: Condromalacia patelar / Síndrome femoropatelar, Hoffite (fat pad impingement), Tendinopatia patelar (jumper's knee). These are the most likely diagnoses for ANTERIOR knee pain.",
          lateral: "PRIORITIZE: Síndrome da banda iliotibial (ITB), Lesão do menisco lateral, Lesão do LCL. These are the most likely diagnoses for LATERAL knee pain.",
          medial: "PRIORITIZE: Tendinopatia/bursite da pata de ganso (pes anserine), Lesão do menisco medial, Lesão do LCM. These are the most likely diagnoses for MEDIAL knee pain.",
          posterior: "PRIORITIZE: Cisto de Baker, Lesão do LCP, Tendinopatia dos isquiotibiais distais. These are the most likely diagnoses for POSTERIOR knee pain.",
        },
        ankle: {
          lateral: "PRIORITIZE: Lesão do ligamento talofibular anterior (LTFA), Instabilidade lateral crônica do tornozelo. Most common in lateral ankle pain, especially post-sprain.",
          medial: "PRIORITIZE: Lesão do ligamento deltoide, Tendinopatia do tibial posterior. Most common in medial ankle pain.",
          posterior: "PRIORITIZE: Impacto posterior do talus (os trigonum), Deformidade de Haglund, Tendinopatia de Aquiles insercional. Most common in posterior ankle pain.",
          anterolateral: "PRIORITIZE: Lesão da sindesmose tibiofibular (high ankle sprain), Impacto anterolateral. Most common in antero-lateral ankle pain.",
        },
        hip: {
          lateral: "PRIORITIZE: Bursite trocantérica / Síndrome da dor trocantérica maior, Tendinopatia glútea (glúteo médio/mínimo). Most common in lateral hip pain.",
          anterior: "PRIORITIZE: Impacto femoroacetabular (FAI), Tendinopatia do reto femoral, Lesão labral do quadril. Most common in anterior hip/groin pain.",
        },
        shoulder: {
          anterior: "PRIORITIZE: Tendinopatia do cabo longo do bíceps, Lesão labral anterior (Bankart). Most common in anterior shoulder pain.",
          lateral: "PRIORITIZE: Bursite subacromial, Tendinopatia do supraespinhal, Síndrome do impacto subacromial. Most common in lateral shoulder pain.",
          superior: "PRIORITIZE: Conflito subacromial, Lesão SLAP, Artropatia acromioclavicular. Most common in superior/medial shoulder pain.",
        },
        cervical: {
          posterior: "PRIORITIZE: Artropatias facetárias cervicais, Tensão miofascial (trapézio superior, esplênio, semiespinhal), Disfunção segmentar cervical. Most common in posterior neck pain.",
          anterolateral: "PRIORITIZE: Disfunção do músculo esternocleidomastóideo (ECM), Pontos-gatilho do ECM (com referência de dor para face/cabeça), Tensão do escaleno anterior. Most common in antero-lateral neck pain.",
        },
      };

      const mapping = regionType && mappings[regionType]?.[painSubArea];
      return mapping ? `\nSUB-AREA SPECIFIC GUIDANCE (MANDATORY — patient specified exact pain location):\n${mapping}\n` : "";
    })() : "";

    // Ottawa rules block
    const ottawaBlock = (() => {
      if (hadTwist === "anamnesis.trauma.yes" && ottawaPositive === "anamnesis.trauma.no") {
        return "\n⚠️ OTTAWA KNEE RULES: Patient reports knee twist AND inability to bear weight (4 steps). STRONGLY recommend X-ray to rule out fracture before proceeding with musculoskeletal hypothesis. Mention this in recommendations.\n";
      }
      if (hadSprain === "anamnesis.trauma.yes" && ottawaPositive === "anamnesis.trauma.no") {
        return "\n⚠️ OTTAWA ANKLE RULES: Patient reports ankle sprain AND inability to bear weight (4 steps). STRONGLY recommend X-ray to rule out fracture before proceeding with musculoskeletal hypothesis. Mention this in recommendations.\n";
      }
      if (hadDislocation === "anamnesis.trauma.yes") {
        return "\n⚠️ SHOULDER DISLOCATION HISTORY: Patient reports previous shoulder dislocation. STRONGLY consider glenohumeral instability, Bankart lesion, Hill-Sachs lesion, and SLAP lesion as primary hypotheses. Recurrent instability is a key consideration.\n";
      }
      return "";
    })();

    // Surgery history block
    const surgeryBlock = hasPriorSurgery === "anamnesis.surgery.yes" && surgeryDetails
      ? `\nPRIOR SURGERY HISTORY (IMPORTANT — integrate into clinical reasoning):\nThe patient reports previous surgery: "${surgeryDetails}"\nConsider: post-surgical adhesions, altered biomechanics, hardware-related symptoms, adjacent segment pathology, re-injury of repaired structures, and whether current symptoms may be related to the prior surgical intervention.\n`
      : "";

    // Multi-complaint kinetic chain reasoning block
    const multiComplaintBlock = chiefComplaints.length > 1 ? `
MULTI-SEGMENT COMPLAINT ANALYSIS (MANDATORY — patient reports pain in ${chiefComplaints.length} regions):
The patient reports simultaneous complaints in: ${chiefComplaints.map(c => c.replace("anamnesis.complaint.", "")).join(", ")}

You MUST systematically consider TWO primary clinical reasoning pathways:

1. KINETIC CHAIN COMPENSATION HYPOTHESIS:
   - One of the reported regions is likely the PRIMARY source of dysfunction
   - The other region(s) developed SECONDARY pain due to compensatory movement patterns
   - The body naturally adopts antalgic (pain-avoiding) postures and movement strategies that overload adjacent segments
   - Example: A primary hip dysfunction can cause altered gait mechanics → knee overload → secondary knee pain
   - Example: Cervical dysfunction → compensatory shoulder elevation → secondary shoulder impingement
   - Example: Ankle instability → altered foot strike → compensatory knee valgus → knee pain
   - In your hypothesis, clearly identify which region you believe is the PRIMARY source and which is COMPENSATORY
   - Explain the biomechanical chain linking them (which muscles, joints, or movement patterns connect the two)
   - Reference: Neumann — "Kinesiology of the Musculoskeletal System" on kinetic chain interdependence

2. NEURAL/RADICULAR ORIGIN HYPOTHESIS:
   - Consider whether a SINGLE neural structure could explain pain in multiple segments simultaneously
   - Cervical radiculopathy (C5-C7) can cause neck + shoulder + arm + elbow + wrist pain along the dermatome
   - Lumbar radiculopathy (L3-S1) can cause low back + hip + thigh + knee + ankle pain
   - Thoracic outlet syndrome can cause cervical + shoulder + arm symptoms
   - Peripheral nerve entrapments can cause multi-segment referred pain patterns
   - Key indicators for neural origin: radiating pain, burning, tingling, numbness, pain that follows a dermatomal pattern
   - Reference: Shacklock — "Clinical Neurodynamics" on neural tension and multi-segment pain
   - If the patient reports radiating/burning/tingling pain types, STRONGLY favor this pathway

CLINICAL DECISION:
- Evaluate the patient's pain types: if radiating/burning/tingling → lean toward neural origin
- Evaluate onset: if gradual with progressive spread → lean toward compensation
- Evaluate onset: if sudden with simultaneous multi-region pain → lean toward neural/radicular
- You may conclude it's a COMBINATION of both pathways
- In your summary and explanation, clearly state your reasoning for the chosen pathway
` : "";


    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's anamnesis data and validated questionnaire results, generate a diagnostic hypothesis.

PROPRIETARY MODEL — D.I.F.I. (Pain Feedback Cycle):
D.I.F.I. stands for: Dor (Pain) → Inibição (Inhibition) → Fraqueza (Weakness) → Incapacidade (Disability) → back to more Pain.
This is a vicious feedback cycle where:
1. Pain causes reflexive muscle inhibition (arthrogenic muscle inhibition — the CNS "shuts down" muscles to protect the joint)
2. Inhibition leads to progressive weakness (disuse atrophy, loss of motor control)
3. Weakness creates functional disability (inability to perform daily tasks, sport, work)
4. Disability generates compensatory patterns that overload adjacent structures, creating MORE pain

WHEN TO REFERENCE D.I.F.I. in the "explanation" field:
- When the patient reports CHRONIC pain (evolution = stable or worsening, or duration > 3 months)
- When questionnaire results show significant functional impairment (any subscale < 50%)
- When there are signs of muscle inhibition (weakness on functional tests, low strength subscales)
- When the patient describes a pattern of progressive worsening despite rest

When referencing D.I.F.I., explain WHERE in the cycle the patient currently is based on the assessment data. For example: "Based on your questionnaire results showing significant weakness and the chronic nature of your pain, you may be caught in a D.I.F.I. cycle — where pain has led to muscle inhibition, which is now causing weakness and functional limitations. Our assessment helps identify exactly where in this cycle you are, so treatment can target the root cause."

The Aliv.iA assessment identifies which point in the D.I.F.I. cycle the patient is at through:
- Pain Map + EVA → quantifies the "D" (Dor/Pain)
- Functional Tests → reveals the "I" (Inibição/Inhibition) and "F" (Fraqueza/Weakness)
- Validated Questionnaires → measures the "I" (Incapacidade/Disability)

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
${subAreaBlock}
${ottawaBlock}
${surgeryBlock}

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
- Chief complaints: ${chiefComplaints.join(", ") || anamnesisData.customComplaint}
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
- Prior surgery: ${hasPriorSurgery === "anamnesis.surgery.yes" ? `Yes — ${surgeryDetails}` : "No"}
- Pain sub-area: ${painSubArea || "Not specified"}
- Knee twist: ${hadTwist || "N/A"}
- Ankle sprain: ${hadSprain || "N/A"}
- Shoulder dislocation history: ${hadDislocation || "N/A"}
- Ottawa rules (weight-bearing): ${ottawaPositive || "N/A"}

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
