import { isPreventiveAssessment, normalizeAssessmentPurpose, preventiveReasoningContext } from "../_shared/assessment-purpose.ts";
import { requireUserOrAssessment, userCanAccessAssessment } from "../_shared/caller-auth.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { logAiTokenUsage } from "../_shared/ai-fallback.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";
import { formatHealthHistoryForPrompt } from "../_shared/health-history.ts";
import { buildProfessionalContext } from "../_shared/professional-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { anamnesisData: rawAnamnesisData, testResults, questionnaireResults, mode, language, additionalInfo, redFlags: bodyRedFlags, redFlagsDismissed, forceRefresh, assessmentId, previousBasicDiagnosis, painMechanism: bodyPainMechanism, painExtent: bodyPainExtent } = await req.json();
    // Signed-in user, or an anonymous patient on a recent assessment link.
    const __gate = await requireUserOrAssessment(req, corsHeaders, assessmentId);
    if (__gate instanceof Response) return __gate;
    const __canPersist = !!assessmentId && (__gate.anonAssessment || await userCanAccessAssessment(req, String(assessmentId)));
    const anamnesisData = normalizeAssessmentPurpose(rawAnamnesisData || {});
    const preventive = isPreventiveAssessment(anamnesisData);
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-diagnosis");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    // --- Content-addressed cache (TTL 30d) ---
    // The cache key is a hash of the FULL clinical payload. Any change in the
    // patient's record (anamnesis, tests, questionnaires, red flags, language)
    // produces a different key, so an updated chart always gets a fresh,
    // personalized AI interpretation. `forceRefresh: true` bypasses it entirely.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

    // Persist the finished assessment server-side so completion never depends
    // on the patient's browser staying open (mobile tabs get suspended).
    const persistAssessment = async (diag: unknown) => {
      if (!admin || !assessmentId || !diag || !__canPersist) return;
      try {
        const { error } = await admin
          .from("assessments")
          .update({ diagnosis: diag as any, status: "completed" })
          .eq("id", assessmentId)
          .neq("status", "completed");
        if (error) console.error("[generate-diagnosis] persist failed:", error.message);
        else console.log("[generate-diagnosis] assessment persisted:", assessmentId);
      } catch (e) {
        console.error("[generate-diagnosis] persist exception:", String(e));
      }
    };

    const cachePayload = { v: "dx-purpose-v2", anamnesisData, testResults, questionnaireResults, mode, language, additionalInfo, redFlags: bodyRedFlags, redFlagsDismissed, previousBasicDiagnosis: previousBasicDiagnosis?.hypothesis || null, painMechanism: bodyPainMechanism ?? null, painExtent: bodyPainExtent ?? null };
    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<{ diagnosis: unknown }>(admin, "generate-diagnosis", cachePayload);
      if (cached) {
        await persistAssessment((cached as any)?.diagnosis);
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const redFlagsList: string[] = Array.isArray(bodyRedFlags)
      ? bodyRedFlags
      : Array.isArray(anamnesisData?.redFlags) ? anamnesisData.redFlags : [];

    const painSubArea = anamnesisData.painSubArea || "";
    const hadTwist = anamnesisData.hadTwist || "";
    const hadSprain = anamnesisData.hadSprain || "";
    const hadDislocation = anamnesisData.hadDislocation || "";
    const ottawaPositive = anamnesisData.ottawaPositive || "";
    const hasPriorSurgery = anamnesisData.hasPriorSurgery || "";
    const surgeryDetails = anamnesisData.surgeryDetails || "";
    const hasLocalSwelling = anamnesisData.hasLocalSwelling || "";
    // New fields: migraine screening + pain frequency
    const hasPhotophobia = anamnesisData.hasPhotophobia || "";
    const hasVisualAura = anamnesisData.hasVisualAura || "";
    const hasNausea = anamnesisData.hasNausea || "";
    const headacheCrisisFrequency = anamnesisData.headacheCrisisFrequency || "";
    const painPattern = anamnesisData.painPattern || "";
    const painWeeklyFrequency = anamnesisData.painWeeklyFrequency || "";
    const painNightWaking = anamnesisData.painNightWaking || "";
    const painScoreMode = anamnesisData.painScoreMode || "general";
    const painScoresPerRegion = anamnesisData.painScoresPerRegion || {};

    // ---------------------------------------------------------------------
    // Passo D1 — mecanismo de dor: contexto para a IA + fallback determinístico
    // O cliente envia o resultado já classificado pelas regras (Kosek 2021 /
    // Finnerup 2016). A IA pode refinar, mas nunca é obrigatória: se o campo
    // vier ausente/inválido, usamos o determinístico. Sem triagem = sem bloco.
    // ---------------------------------------------------------------------
    const MECHANISM_KEYS = ["nociceptive", "neuropathic", "nociplastic", "mixed", "unknown"];
    const AXIS_KEYS = ["peripheral", "central", "mixed", "unknown"];
    const CONFIDENCE_KEYS = ["low", "moderate", "high"];

    const rulesMechanism = (() => {
      if (preventive) return null;
      const raw = bodyPainMechanism ?? anamnesisData?.painMechanismResolved ?? null;
      if (!raw || typeof raw !== "object") return null;
      const m = String((raw as any).mechanism ?? "");
      if (!MECHANISM_KEYS.includes(m) || m === "unknown") return null;
      return raw as Record<string, any>;
    })();

    const painExtentValueNum = typeof bodyPainExtent === "number" ? bodyPainExtent : null;

    const mechanismBlock = rulesMechanism ? `
PAIN MECHANISM SCREENING (deterministic result already computed by Aliv.iA — MANDATORY context):
The patient (or the attending physiotherapist) completed the pain mechanism screening. Rule-based result:
- Predominant mechanism: ${rulesMechanism.mechanism}
- Secondary mechanism: ${rulesMechanism.secondary || "none"}
- Clinical subtype: ${rulesMechanism.subtype || "not specified"}
- Axis: ${rulesMechanism.axis || "unknown"} (peripheral vs central)
- Central sensitization likely: ${rulesMechanism.central_sensitization_likely ? "YES" : "no"}
- Screening confidence: ${rulesMechanism.confidence || "low"}
- Positive signals: ${Array.isArray(rulesMechanism.signals) && rulesMechanism.signals.length ? rulesMechanism.signals.join(", ") : "none recorded"}
- Marked criteria: ${Array.isArray(rulesMechanism.criteria) && rulesMechanism.criteria.length ? rulesMechanism.criteria.join(", ") : "none recorded"}
${typeof rulesMechanism.csi_score === "number" ? `- CSI score: ${rulesMechanism.csi_score} (>= 40 suggests central sensitization)` : ""}
${painExtentValueNum !== null ? `- Pain extent: ~${painExtentValueNum}% of body surface (higher extent + long duration favors a nociplastic component)` : ""}

HOW TO USE IT:
- Frameworks: Kosek et al. 2021 (nociplastic criteria) and Finnerup et al. 2016 (neuropathic grading).
- Treat the deterministic result as the baseline. Keep it unless the rest of the record clearly contradicts it — then explain the divergence in the "reasoning" field of pain_mechanism.
- Nociceptive → predictable mechanical/load relationship, proportionate to tissue findings.
- Neuropathic → neuroanatomically plausible distribution + neuropathic descriptors and/or objective sensorimotor signs.
- Nociplastic → regional/multisite pain >= 3 months, disproportionate to tissue findings, hypersensitivity, poor sleep/fatigue.
- The mechanism must NOT enter the "hypothesis" field: it stays inside the "pain_mechanism" object. The hypothesis remains a SHORT diagnostic label (max 20 words).
` : "";

    // Psychosocial (yellow flags) — FABQ applied inline or through the patient link.
    const specialtyResults = Array.isArray(anamnesisData?.specialtyResults) ? anamnesisData.specialtyResults : [];
    const fabq = specialtyResults.find((r: any) => typeof r?.questionnaireId === "string" && r.questionnaireId.startsWith("fabq"));
    const psychosocialBlock = fabq ? `
PSYCHOSOCIAL SCREENING — FEAR-AVOIDANCE (FABQ, already scored — MANDATORY context):
- Instrument: ${fabq.questionnaireName || fabq.questionnaireId}
- Total: ${fabq.score?.total}/${fabq.score?.max} (severity: ${fabq.score?.severity})
${Array.isArray(fabq.score?.subscores) ? fabq.score.subscores.map((s: any) => `- ${s.label_en}: ${s.total}/${s.max}${s.cutoff != null ? ` (cut-off ${s.cutoff}${s.high ? " — ABOVE cut-off" : ""})` : ""}`).join("\n") : ""}
- Interpretation: ${fabq.score?.interpretation_en || ""}

HOW TO USE IT (Waddell et al. 1993; FABQ-Brasil, Abreu et al. 2008):
- Above cut-off = relevant yellow flags. Prioritise pain neuroscience education, reassurance and GRADED EXPOSURE to feared movements over aggressive loading or passive therapies.
- When the work subscale is high, mention occupational context and graded return to duties.
- Do NOT put the FABQ score inside the "hypothesis" field: it belongs to the clinical reasoning and treatment considerations.
- Never label the patient as catastrophising in patient-facing text; describe it as fear/insecurity about moving that treatment will address.
` : "";

    const lang = language === "en" ? "English" : "Portuguese (Brazil)";

    const mechanismJsonSpec = rulesMechanism ? `
  "pain_mechanism": {
    "mechanism": "nociceptive" | "neuropathic" | "nociplastic" | "mixed",
    "secondary": null | "nociceptive" | "neuropathic" | "nociplastic",
    "axis": "peripheral" | "central" | "mixed" | "unknown",
    "confidence": "low" | "moderate" | "high",
    "patient_explanation": "2-3 sentences in ${lang}, PLAIN LANGUAGE for a layperson (no jargon such as 'nociplastic', 'sensitization', 'dermatomal'): explain in everyday words why the pain behaves this way and what it means for the treatment. Warm, reassuring, never alarming.",
    "reasoning": "1-2 sentences of clinical reasoning naming the findings that support this mechanism (technical language is fine here)"
  },` : "";

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
          front: `PRIORITIZE for ANTERIOR knee pain — systematically differentiate these THREE conditions:

1. DOR FEMOROPATELAR (Patellofemoral Pain Syndrome): Most common cause of anterior knee pain. Pain is DIFFUSE, typically near the patellar border (medial or lateral facet) or retropatellar. Aggravated by stairs, prolonged sitting (cinema sign), squatting, and multiple angles of knee flexion-extension. NO specific point tenderness on the patellar tendon. Consider VMO weakness, patellar maltracking, Q-angle.

2. HOFFITE (Hoffa's Fat Pad Impingement): Pain is localized INFRAPATELLAR, on BOTH SIDES of the patellar tendon. KEY DIFFERENTIATOR: pain occurs specifically during TERMINAL KNEE EXTENSION (last 10-15°) due to mechanical compression of Hoffa's fat pad between the femoral condyles and tibial plateau. Often associated with LOCAL EDEMA/SWELLING. Hyperextension of the knee reproduces symptoms. Can follow trauma or repetitive overuse. Positive Hoffa's test (pain on palpation of fat pad with knee in 30° flexion).

3. TENDINOPATIA PATELAR (Patellar Tendinopathy / Jumper's Knee): Pain is VERY FOCAL and POINT-SPECIFIC on the patellar tendon (usually inferior pole of patella). Aggravated by LOADING activities (jumping, squatting, landing). Pain increases with tendon stretch under tension. Common in jumping sports (volleyball, basketball). Gradual onset, load-dependent.

CLINICAL DECISION GUIDE:
- If pain is diffuse, near patellar borders, multiple angles → Patellofemoral Pain
- If pain is infrapatellar, terminal extension, with swelling → Hoffite
- If pain is point-specific on tendon, load-dependent → Patellar Tendinopathy
- EDEMA presence strongly favors Hoffite over the other two conditions`,
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

      // Handle painSubArea as array (multiple sub-areas selected) or single string
      const subAreas: string[] = Array.isArray(painSubArea) ? painSubArea : [painSubArea];
      const regionMappings = regionType ? mappings[regionType] : null;
      if (!regionMappings) return "";

      const matchedGuidance = subAreas
        .map((area: string) => regionMappings[area])
        .filter(Boolean);

      if (matchedGuidance.length === 0) return "";

      if (matchedGuidance.length > 1) {
        return `\nMULTI-AREA PAIN REPORTED (patient selected ${subAreas.length} sub-areas: ${subAreas.join(", ")}):
The patient reports pain in MULTIPLE sub-regions simultaneously. This is clinically significant — consider:
- Diffuse pathology affecting the entire joint (e.g., generalized OA, synovitis, post-surgical inflammation)
- Post-surgical complications if surgery history is present (adhesions, altered biomechanics, diffuse sensitization)
- Central sensitization if chronic pain with widespread distribution
- Each sub-area guidance below should be considered but weighted against the overall clinical picture:

${matchedGuidance.map((g: string, i: number) => `--- Sub-area ${i + 1}: ${subAreas[i]} ---\n${g}`).join("\n\n")}\n`;
      }

      return `\nSUB-AREA SPECIFIC GUIDANCE (MANDATORY — patient specified exact pain location: ${subAreas[0]}):\n${matchedGuidance[0]}\n`;
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

    // Edema / swelling clinical reasoning block
    const edemaBlock = hasLocalSwelling === "anamnesis.trauma.yes" ? `
EDEMA/SWELLING REPORTED (MANDATORY — integrate into clinical reasoning):
The patient reports LOCAL SWELLING (edema) in the affected joint. This is a critical clinical sign that MUST influence your diagnostic hypothesis:

POSSIBLE IMPLICATIONS:
1. SYNOVITIS (joint effusion): Inflammatory process within the synovial membrane. Can be caused by overuse, autoimmune conditions, crystal arthropathy, or early OA. Consider: warmth, diffuse joint swelling, morning stiffness.
2. ACUTE SOFT TISSUE INJURY (Grade 1-2): Ligament sprain, tendon strain, or muscle tear with associated inflammatory response. Grade 1 = microscopic tears, mild swelling. Grade 2 = partial tear, moderate swelling, functional limitation.
3. ARTICULAR LESION: Meniscal tear (knee), labral tear, chondral defect — can cause reactive effusion.
4. TENDON SHEATH INFLAMMATION (tenosynovitis): Especially relevant for wrist/ankle. Swelling along the tendon path.
5. BURSITIS: Localized swelling over a bursa (prepatellar, infrapatellar, retrocalcaneal).

${isKneeCase && (Array.isArray(painSubArea) ? painSubArea.includes("front") : painSubArea === "front") ? "⚠️ ANTERIOR KNEE + EDEMA: Strongly consider HOFFITE (Hoffa's fat pad impingement). Edema is a hallmark sign of fat pad inflammation. Also consider prepatellar bursitis and infrapatellar bursitis." : ""}

CLINICAL IMPACT: Presence of edema suggests an INFLAMMATORY or ACUTE component. This should:
- Influence treatment recommendations (consider PRICE protocol for acute, anti-inflammatory strategies)
- Increase suspicion for structural lesions over purely functional/biomechanical causes
- Guide toward imaging recommendations if symptoms persist
` : "";
    // Detect lumbar with radiating pain (sciatica / radiculopathy) — McKenzie reasoning
    const lumbarRegions = ["lower_back", "lower_back_left", "lower_back_right", "lumbar"];
    const legRegions = ["right_thigh", "left_thigh", "right_hamstring", "left_hamstring", "right_knee", "left_knee", "right_calf", "left_calf", "right_ankle", "left_ankle"];
    const hasLumbar = chiefComplaints.includes("anamnesis.complaint.back_pain");
    const hasLegPain = (anamnesisData.painRegions || []).some((r: string) => legRegions.includes(r));
    const hasRadiatingPain = (anamnesisData.painTypes || []).some((t: string) => t.includes("radiating") || t.includes("irradiada") || t.includes("shooting") || t.includes("burning") || t.includes("tingling"));
    const isRadiculopathyCase = hasLumbar && (hasLegPain || hasRadiatingPain);

    const radiculopathyBlock = isRadiculopathyCase ? `
LUMBAR RADICULOPATHY / SCIATICA CLINICAL REASONING (MANDATORY — patient reports lumbar pain with leg radiation):
The combination of lumbar pain with radiating symptoms to the lower limb(s) strongly suggests a NEURAL component. You MUST consider:

DIFFERENTIAL DIAGNOSIS:
1. DISC HERNIATION / PROTRUSION: Most common cause of sciatica in patients <50. Dermatomal pain distribution (L4: anterior thigh/medial leg; L5: lateral leg/dorsum of foot; S1: posterior calf/lateral foot). Worsened by flexion, sitting, Valsalva maneuver.
2. SPINAL STENOSIS: More common in patients >50. Neurogenic claudication (bilateral symptoms worsened by standing/walking, relieved by sitting/flexion). Shopping cart sign positive.
3. PIRIFORMIS SYNDROME: Deep buttock pain with sciatic distribution. No true dermatomal pattern. Sitting on hard surfaces aggravates. Consider when lumbar imaging is negative.
4. SPONDYLOLISTHESIS: Segmental instability, worse with extension, may cause bilateral symptoms.

McKENZIE DIRECTIONAL PREFERENCE ASSESSMENT:
- If symptoms CENTRALIZE with extension movements (pain retreats from leg toward lumbar) → suggests disc herniation responsive to extension protocol — GOOD PROGNOSIS
- If symptoms PERIPHERALIZE with extension → stop extension, test flexion (may indicate stenosis or posterior element pathology)
- Centralization is the single best prognostic indicator for mechanical lumbar pain (McKenzie & May 2003)
- Include this reasoning in your diagnostic hypothesis and recommendations

CLINICAL INDICATORS:
- Pain types reported: ${(anamnesisData.painTypes || []).join(", ")}
- Leg regions affected: ${(anamnesisData.painRegions || []).filter((r: string) => legRegions.includes(r)).join(", ")}
- If burning/tingling/numbness present → strongly favors neural origin over pure muscular
- Reference: McKenzie & May (2003); Lam et al. (Phys Ther 2018); Shacklock — Clinical Neurodynamics
` : "";

    // Detect lumbar + shoulder combination (fascial chain)
    const hasShoulder = chiefComplaints.includes("anamnesis.complaint.shoulder_pain");
    const lumbarShoulderBlock = (hasLumbar && hasShoulder) ? `
LUMBAR + SHOULDER FASCIAL CHAIN ANALYSIS (MANDATORY — patient reports both lumbar and shoulder pain):
These regions are connected by continuous fascial and muscular chains (thoracolumbar fascia → latissimus dorsi → posterior shoulder). This combination is LESS COMMON but clinically significant in specific populations:

CLINICAL CONTEXT:
- Most commonly seen in athletes/individuals performing activities with significant trunk ROTATION combined with shoulder loading: surfing, tennis, golf, volleyball serving, swimming, overhead throwing sports, CrossFit
- The thoracolumbar fascia is a critical force-transfer hub connecting the lower limb/pelvis to the upper limb through the latissimus dorsi and contralateral gluteus maximus (posterior oblique sling)
- Dysfunction in lumbar stabilization during rotational movements can overload the posterior shoulder structures

REASONING PATHWAYS:
1. PRIMARY LUMBAR → SECONDARY SHOULDER: Lumbar instability or pain leads to compensatory overuse of latissimus dorsi and paraspinal muscles, which increases posterior shoulder tension and alters scapulothoracic mechanics → shoulder impingement or rotator cuff overload
2. PRIMARY SHOULDER → SECONDARY LUMBAR: Shoulder pain/limitation causes compensatory trunk rotation patterns, overloading the lumbar spine during functional movements
3. SHARED BIOMECHANICAL DEMAND: Both regions are simultaneously stressed during the same activity (e.g., surfing popup, tennis serve), and both developed symptoms from the same mechanical overload

IMPORTANT: Ask about or consider the patient's sport/activity level. If the patient practices rotation-heavy sports or activities, this strongly supports a fascial chain connection rather than coincidental dual pathology.
Reference: Myers — "Anatomy Trains" on fascial continuity; Vleeming et al. — posterior oblique sling mechanics
` : "";

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


    const { PEDRO_KNOWLEDGE_BASE, shouldIncludePedroKnowledge } = await import("../_shared/pedro-knowledge.ts");
    const includePedro = shouldIncludePedroKnowledge(anamnesisData, additionalInfo);
    const systemPrompt = `You are an experienced musculoskeletal physiotherapist AI assistant. Based on the patient's anamnesis data and validated questionnaire results, generate a diagnostic hypothesis.
${preventiveReasoningContext(anamnesisData)}
${preventive ? "For this preventive assessment D.I.F.I must NOT imply existing pain, inhibition or disability; the pain-cycle instructions below apply ONLY to symptomatic cases. Use current functional findings and safety screening, not a presumed pain generator." : ""}
${includePedro ? PEDRO_KNOWLEDGE_BASE : ""}

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
- Rio et al. (BJSM 2015): Isometric contractions (HIMA) reduce patellar tendon pain — analgesic effect for reactive tendinopathy
- Kongsgaard et al. (Scand J Med Sci Sports 2009): Heavy Slow Resistance (HSR) protocol for patellar tendinopathy remodeling
- Beyer et al. (Knee Surg Sports Traumatol Arthrosc 2015): HSR adaptation for Achilles tendinopathy
- McKenzie & May (2003): Mechanical Diagnosis and Therapy — directional preference for lumbar disc pathology and sciatica (centralization principle)
- Lam et al. (Phys Ther 2018): Efficacy of McKenzie method for low back pain

${shoulderBlock}
${kneeThighBlock}
${subAreaBlock}
${ottawaBlock}
${surgeryBlock}
${edemaBlock}
${lumbarShoulderBlock}
${radiculopathyBlock}
${multiComplaintBlock}
${mechanismBlock}
${psychosocialBlock}

${hasPhotophobia || hasVisualAura || hasNausea || headacheCrisisFrequency ? `
MIGRAINE/CERVICOGENIC HEADACHE SCREENING DATA (MANDATORY — integrate into clinical reasoning):
Based on ICHD-3 criteria for migraine without aura:
- Photophobia: ${hasPhotophobia === "anamnesis.trauma.yes" ? "YES" : "No"}
- Visual aura: ${hasVisualAura === "anamnesis.trauma.yes" ? "YES — suggests migraine WITH aura" : "No"}
- Nausea during episodes: ${hasNausea === "anamnesis.trauma.yes" ? "YES" : "No"}
- Headache crisis frequency: ${headacheCrisisFrequency || "Not specified"}

CLINICAL REASONING:
- If photophobia + nausea + unilateral pulsating headache → strongly suspect MIGRAINE
- If NO migraine features + posterior cervical pain + headache → suspect CERVICOGENIC HEADACHE (cervical origin)
- If visual aura present → classify as MIGRAINE WITH AURA — recommend neurological evaluation
- Cervicogenic headache originates from C1-C3 facet joints, suboccipital muscles — treat cervical dysfunction
- Reference: ICHD-3 (International Classification of Headache Disorders, 3rd edition)
` : ""}

${painPattern ? `
PAIN PATTERN & FREQUENCY (SINSS concept — Mulligan):
- Pain pattern: ${painPattern.includes("continuous") ? "CONTINUOUS (24h)" : "INTERMITTENT"}
${painWeeklyFrequency ? `- Weekly frequency: ${painWeeklyFrequency}` : ""}
- Night pain waking: ${painNightWaking === "anamnesis.night_waking.frequent" ? "YES, FREQUENTLY — HIGH IRRITABILITY indicator" : painNightWaking === "anamnesis.night_waking.sometimes" ? "Sometimes" : "No"}

SINSS STAGING (Symptom Irritability Neurodynamic Severity Staging):
- Continuous pain + frequent night waking → HIGH IRRITABILITY stage — prioritize pain modulation, avoid heavy loading
- Intermittent pain + no night waking → LOW IRRITABILITY — can tolerate progressive loading
- Night waking is a KEY prognostic indicator: frequent night pain suggests inflammatory or neurogenic component
- Reference: Mulligan B. — Manual Therapy: NAGS, SNAGS, MWMS; Maitland et al. — severity/irritability concept
` : ""}

IMPORTANT RULES:
- Always respond in ${lang}.
- This is NOT a definitive diagnosis — always clarify it's a hypothesis for educational purposes.
- Be empathetic and use accessible language a layperson can understand.
- Never recommend medication.
- Always suggest consulting a healthcare professional for confirmation.
- When validated questionnaire results are provided, use the scores and subscale analysis to support your hypothesis and identify the most affected functional areas.
- When the patient provides additional information after an initial low-confidence assessment, you MUST carefully integrate this new data into your clinical reasoning. Re-evaluate your hypothesis considering ALL available data (original anamnesis + new information). The additional details often contain critical clues (mechanism of injury, specific triggers, prior treatments, temporal patterns) that can significantly narrow the differential diagnosis and increase confidence level.

${redFlagsList.length > 0 ? `
RED FLAGS DOCUMENTED BY THE PROFESSIONAL DURING ASSESSMENT (MANDATORY — integrate into the report):
The attending professional flagged the following warning signs: ${redFlagsList.join("; ")}.
You MUST:
- Acknowledge these red flag(s) explicitly within the "summary" field (1 short sentence).
- Copy them verbatim into the "redFlags" array of your JSON output.
${redFlagsDismissed ? `- The red flag(s) have ALREADY been dismissed by the attending professional after medical clearance. Proceed with the normal physiotherapy hypothesis and mention in the summary that medical clearance is on file.
- Set "hypothesisSuppressed" to false.` : `- The red flag has NOT yet been cleared by a physician. The physiotherapy hypothesis MUST be considered preliminary and "under reservation" until a doctor evaluates the patient.
- Set "hypothesisSuppressed" to true.
- Inside the "summary" field, OPEN with an explicit warning sentence in bold-ish wording such as: "ATENÇÃO: sinal de alerta médico detectado — a hipótese fisioterapêutica abaixo não deve ser usada para conduta até avaliação médica." (or English equivalent if language is English).
- Still provide a "hypothesis" field so the professional has a working differential, but the "disclaimer" and "summary" must make crystal clear that medical clearance is required before any treatment plan.`}
` : ""}

${previousBasicDiagnosis?.hypothesis ? `
DIAGNOSTIC CONTINUITY (MANDATORY — the patient already received a first hypothesis):
This same patient completed the free/basic assessment moments ago and was shown this preliminary hypothesis:
- Previous hypothesis: "${previousBasicDiagnosis.hypothesis}"
- Previous confidence: "${previousBasicDiagnosis.confidence || "n/a"}"
- Previous summary: "${previousBasicDiagnosis.summary || "n/a"}"

Rules:
1. If the new data (questionnaires, functional tests, extra anamnesis) does NOT contradict that hypothesis, KEEP THE SAME DIAGNOSTIC LINE and the same hypothesis naming/terminology. Refine, deepen and detail it (mechanism, severity, involved structures) instead of renaming it. Do not swap synonyms or reframe the pain mechanism just for style — a patient reading both reports must recognise it as one continuous reasoning.
2. Only change the hypothesis when the new objective data genuinely contradicts or outweighs the previous one.
3. When (and only when) you change it, you MUST fill the "hypothesisChange" field with: the previous hypothesis, the current one, and a clear patient-friendly justification naming which premium answers/tests drove the revision. If you keep the same line, set "hypothesisChange" to null.
` : ""}
Response format (JSON):
{
  "hypothesis": "SHORT diagnostic label ONLY: condition + affected structure/side (+ optional mechanism category). ONE sentence, max 20 words, no semicolons/lists. NEVER include aggravating or relieving factors, ROM/strength values, pain scores, functional impact, mobility findings, prognosis or reasoning — those go in summary/reasoning",
  "confidence": "low" | "moderate" | "high",
  "summary": "Brief 1-2 sentence summary of the hypothesis",
  "redFlags": ${redFlagsList.length > 0 ? JSON.stringify(redFlagsList) : "[]"},
  "hypothesisSuppressed": ${redFlagsList.length > 0 && !redFlagsDismissed ? "true" : "false"},${mechanismJsonSpec}
  ${isBasic || isProfessional ? "" : `"explanation": "Detailed explanation of what's happening in the body (2-3 paragraphs). Reference questionnaire findings when available.",
  "reasoning": "Why this hypothesis based on the provided data, including questionnaire score interpretation",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "functionalProfile": "Summary of the patient's functional limitations based on questionnaire subscale scores (e.g., most affected areas: daily activities, sport, quality of life)",`}
  ${previousBasicDiagnosis?.hypothesis && !isBasic ? `"hypothesisChange": null | { "previousHypothesis": "...", "currentHypothesis": "...", "reason": "Patient-friendly explanation of why the hypothesis changed, citing the premium answers/tests responsible" },
  ` : ""}"disclaimer": "${isProfessional ? (lang === "English" ? "Preliminary hypothesis for triage purposes. The definitive diagnosis will be the responsibility of the attending physiotherapist." : "Hipótese preliminar para fins de triagem. O diagnóstico definitivo será de responsabilidade do fisioterapeuta responsável.") : "Medical disclaimer text"}"
}`;

    const userPrompt = `${preventiveReasoningContext(anamnesisData)}
Patient anamnesis data:
- Chief complaints: ${chiefComplaints.join(", ") || anamnesisData.customComplaint}
- Custom complaint details: ${anamnesisData.customComplaint || "N/A"}
- Onset: ${anamnesisData.onset}
- Pain regions: ${anamnesisData.painRegions?.join(", ") || "Not specified"}${anamnesisData.painRegionRefinements && Object.keys(anamnesisData.painRegionRefinements).length > 0 ? `
- **ANATOMICAL REFINEMENT PER REGION (medial/lateral, anterior/posterior, proximal/distal for limbs; right side / left side / central for axial regions — use to localize the pain generator within each region and to drive differential diagnosis, e.g. medial vs lateral epicondylitis, anterior vs posterior knee pain, proximal vs distal hamstring lesion):**
${Object.entries(anamnesisData.painRegionRefinements).map(([k, v]: [string, any]) => `    • ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")}` : ""}
- Pain types: ${anamnesisData.painTypes?.join(", ") || "Not specified"}
- Evolution: ${anamnesisData.evolution}
- Aggravating factors: ${anamnesisData.aggravatingFactors || "Not specified"}
- Relieving factors: ${anamnesisData.relievingFactors || "Not specified"}
- Activity level: ${anamnesisData.activityLevel}
- Pain score (0-10) — general/overall: ${anamnesisData.painScore}
- Pain score mode: ${painScoreMode}${painScoreMode === "per_region" && Object.keys(painScoresPerRegion).length > 0 ? `
- **PAIN INTENSITY PER BODY REGION (USE THIS AS PRIMARY PAIN INPUT — the general score above is only an average/reference):**
${Object.entries(painScoresPerRegion).map(([k, v]) => `    • ${k}: ${v}/10`).join("\n")}
- MANDATORY: When per-region scores are provided, your clinical reasoning, hypothesis selection, severity grading and prioritization of objectives MUST be driven by which regions carry the highest pain scores, not by the overall average. Explicitly reference the most painful region(s) in the summary/reasoning and let the score asymmetry guide differential diagnosis (e.g. unilateral vs bilateral, proximal vs distal, dominant pain generator vs referred pain).` : ""}
- Pain duration: ${anamnesisData.painDuration || "Not specified"}
- Sex: ${anamnesisData.sex || "Not specified"}
- Age range: ${anamnesisData.ageRange || "Not specified"}
${formatHealthHistoryForPrompt(anamnesisData)}
- Prior surgery: ${hasPriorSurgery === "anamnesis.surgery.yes" ? `Yes — ${surgeryDetails}` : "No"}
- Pain sub-area: ${painSubArea || "Not specified"}
- Knee twist: ${hadTwist || "N/A"}
- Ankle sprain: ${hadSprain || "N/A"}
- Shoulder dislocation history: ${hadDislocation || "N/A"}
- Ottawa rules (weight-bearing): ${ottawaPositive || "N/A"}
- Local swelling/edema: ${hasLocalSwelling === "anamnesis.trauma.yes" ? "YES — patient reports joint swelling" : hasLocalSwelling === "anamnesis.trauma.no" ? "No swelling reported" : "N/A"}
- Pain pattern: ${painPattern || "Not specified"}
- Weekly frequency: ${painWeeklyFrequency || "N/A"}
- Night waking: ${painNightWaking || "N/A"}
- Photophobia: ${hasPhotophobia || "N/A"}
- Visual aura: ${hasVisualAura || "N/A"}
- Nausea during crises: ${hasNausea || "N/A"}
- Headache crisis frequency: ${headacheCrisisFrequency || "N/A"}
${anamnesisData.painTypesPerRegion && Object.keys(anamnesisData.painTypesPerRegion).length > 1 ? `
- **PAIN TYPE PER REGION (use to differentiate mechanical vs neural vs referred pain):**
${Object.entries(anamnesisData.painTypesPerRegion).map(([k, v]) => `    • ${k}: ${v}`).join("\n")}` : ""}
${buildProfessionalContext(anamnesisData).join("\n")}

${additionalInfo ? `Additional information provided by the patient (USE THIS to refine your hypothesis and potentially increase confidence):
${additionalInfo}` : ""}

${testResults && testResults.length > 0 ? `Functional test results:
${testResults.map((t: any) => `- ${t.testId}: ${t.painful ? "PAINFUL/UNCOMFORTABLE" : "No discomfort"}`).join("\n")}` : "No functional tests performed."}

${Array.isArray(questionnaireResults) && questionnaireResults.some((q: any) => q && (q.questionnaireId || q.questionnaireName)) ? `Validated questionnaire results:
${questionnaireResults.filter((q: any) => q && (q.questionnaireId || q.questionnaireName)).map((q: any) => `- ${q.questionnaireName || "Questionnaire"} (${String(q.questionnaireId || "unknown").toUpperCase()}): Total score ${q.percentageScore ?? "N/A"}% | Interpretation: ${q.interpretation_pt || q.interpretation_en || "N/A"} | Severity: ${q.severity || "N/A"}
  Subscale scores: ${Object.entries(q.subscaleScores || {}).map(([k, v]) => `${k}: ${v}%`).join(", ")}`).join("\n")}` : "No validated questionnaires applied."}

${Array.isArray(anamnesisData?.romTable) && anamnesisData.romTable.length > 0 ? `Joint mobility / ROM (range of motion):
${anamnesisData.romTable.filter((r: any) => r?.joint || r?.leftValue || r?.rightValue).map((r: any) => `- ${r.joint || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}`).join("\n")}` : ""}

${Array.isArray(anamnesisData?.strengthTable) && anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).length > 0 ? `Dynamometry (muscle strength, kgf):
${anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).map((r: any) => {
  const L = parseFloat(String(r.leftValue || "").replace(",", "."));
  const R = parseFloat(String(r.rightValue || "").replace(",", "."));
  const asym = (isFinite(L) && isFinite(R) && L > 0 && R > 0) ? `${Math.round((Math.abs(L - R) / Math.max(L, R)) * 100)}%` : "n/a";
  return `- ${r.movement || "?"}: L ${r.leftValue || "—"} kgf | R ${r.rightValue || "—"} kgf | Asymmetry ${asym}`;
}).join("\n")}

INTERPRETATION RULES for dynamometry:
- Treat asymmetries > 20% as a strong sign of muscle INHIBITION/WEAKNESS in the D.I.F.I framework. Reflect this in the hypothesis reasoning and in the prioritized objectives.
- Compare strength values with the painful regions reported above. Weakness on the symptomatic side, with concordant pain, supports a primary contractile (tendon/muscle) generator.
- Bilateral low values (both sides clearly below reference for sex/age) suggest deconditioning rather than focal pathology.` : `Dynamometry: NOT RECORDED for this patient.
- Do NOT assume, infer or invent strength values. Base reasoning solely on the available exam findings, ROM, functional tests and questionnaires.
- You may briefly note in the explanation that objective strength data could refine the hypothesis if collected in a future session, but do not let its absence weaken the rest of the reasoning.`}


Assessment mode: ${isBasic ? "Basic (provide only hypothesis, confidence, summary and disclaimer)" : isProfessional ? "Professional triage (provide only hypothesis, confidence, summary and disclaimer. The disclaimer MUST state this is a preliminary hypothesis for triage and the definitive diagnosis is the responsibility of the attending physiotherapist)" : "Premium (provide full detailed analysis including functional test findings and questionnaire-based functional profile)"}


Generate the diagnostic hypothesis in valid JSON format.`;

    const callAi = (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    // Cost control: Pro removed from the chain — Flash/Flash-Lite are sufficient
    // for this structured task and cost a fraction per call.
    const modelChain = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let response: Response | null = null;
    let usedModel = "";
    let usedIndex = 0;
    let lastStatus = 0;
    let lastBody = "";
    for (const m of modelChain) {
      const r = await callAi(m);
      if (r.ok) { response = r; usedModel = m; usedIndex = modelChain.indexOf(m); console.log(`[generate-diagnosis] using ${m}`); break; }
      lastStatus = r.status;
      lastBody = await r.text();
      console.warn(`[generate-diagnosis] ${m} failed ${r.status}: ${lastBody.slice(0,200)}`);
      if (r.status !== 402 && r.status !== 429) break;
    }
    if (!response) {
      console.error("AI Gateway error (all models):", lastStatus, lastBody);
      const errCode = lastStatus === 402 ? "ai_credits_exhausted" : lastStatus === 429 ? "ai_rate_limit" : "ai_error";
      return new Response(JSON.stringify({ error: errCode, status: lastStatus }), {
        status: lastStatus || 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    logAiTokenUsage({ functionName: "generate-diagnosis", model: usedModel, usage: aiResult?.usage, fallbackIndex: usedIndex });
    const content = aiResult.choices[0].message.content;

    // Extract JSON from response — robust multi-layer parsing
    let jsonStr = content.trim();
    // Layer 1: Remove markdown code fences
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    // Layer 2: Find first { and match to last }
    if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
      const braceStart = jsonStr.indexOf('{');
      if (braceStart !== -1) {
        jsonStr = jsonStr.slice(braceStart);
      }
    }
    // Layer 3: Trim trailing content after last closing brace
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < jsonStr.length - 1) {
      jsonStr = jsonStr.slice(0, lastBrace + 1);
    }

    let diagnosis: any;
    try {
      diagnosis = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Layer 4: Try to fix common JSON issues (trailing commas, unescaped newlines in strings)
      console.error("Initial JSON parse failed, attempting cleanup:", parseErr);
      const cleaned = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, (ch: string) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
      diagnosis = JSON.parse(cleaned);
    }

    // --- Passo D1: mecanismo de dor com fallback determinístico ---------------
    // Nunca deixamos a geração falhar por causa deste campo: o resultado das
    // regras é a base, a IA só refina o que for válido.
    if (rulesMechanism && diagnosis && typeof diagnosis === "object") {
      const ai = (diagnosis as any).pain_mechanism;
      const pick = (v: unknown, allowed: string[], fb: string) =>
        typeof v === "string" && allowed.includes(v) ? v : fb;
      const text = (v: unknown) =>
        typeof v === "string" && v.trim().length > 4 ? v.trim() : null;

      const aiObj = ai && typeof ai === "object" ? (ai as Record<string, unknown>) : {};
      const aiMechanism = typeof aiObj.mechanism === "string" && MECHANISM_KEYS.includes(aiObj.mechanism) && aiObj.mechanism !== "unknown"
        ? (aiObj.mechanism as string)
        : null;
      const overridden = !!aiMechanism && aiMechanism !== rulesMechanism.mechanism;

      (diagnosis as any).pain_mechanism = {
        ...rulesMechanism,
        mechanism: aiMechanism ?? rulesMechanism.mechanism,
        secondary:
          typeof aiObj.secondary === "string" && MECHANISM_KEYS.includes(aiObj.secondary) && aiObj.secondary !== "unknown"
            ? aiObj.secondary
            : (rulesMechanism.secondary ?? null),
        axis: pick(aiObj.axis, AXIS_KEYS, rulesMechanism.axis || "unknown"),
        confidence: pick(aiObj.confidence, CONFIDENCE_KEYS, rulesMechanism.confidence || "low"),
        patient_explanation: text(aiObj.patient_explanation),
        reasoning: text(aiObj.reasoning),
        pain_extent: painExtentValueNum,
        // "rules" quando a IA não trouxe nada aproveitável; "ai" quando refinou.
        source: aiMechanism || text(aiObj.patient_explanation) ? "ai" : "rules",
        rules_mechanism: rulesMechanism.mechanism,
        ai_overrode_rules: overridden,
        version: 1,
      };
      console.log("[generate-diagnosis] pain_mechanism:", JSON.stringify({
        rules: rulesMechanism.mechanism,
        final: (diagnosis as any).pain_mechanism.mechanism,
        source: (diagnosis as any).pain_mechanism.source,
        overridden,
      }));
    } else if (diagnosis && typeof diagnosis === "object" && (diagnosis as any).pain_mechanism) {
      // Sem triagem no prontuário: descartamos qualquer mecanismo alucinado.
      delete (diagnosis as any).pain_mechanism;
    }

    if (admin && diagnosis && typeof diagnosis === "object") {
      await setCachedAiResponse(admin, "generate-diagnosis", cachePayload, { diagnosis }, AI_CACHE_TTL_30D);
    }

    await persistAssessment(diagnosis);

    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating diagnosis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
