import { isPreventiveAssessment, normalizeAssessmentPurpose, preventiveReasoningContext } from "../_shared/assessment-purpose.ts";
import { requireUserOrAssessment, userCanAccessAssessment } from "../_shared/caller-auth.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { logAiTokenUsage } from "../_shared/ai-fallback.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";
import { formatHealthHistoryForPrompt } from "../_shared/health-history.ts";
import { buildRlcaReference, RLCA_REFERENCE_VERSION } from "../_shared/rlca-reference.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { anamnesisData: rawAnamnesisData, testResults, questionnaireResults, diagnosis, mode, language, forceRefresh, painMechanism: bodyPainMechanism, painExtent: bodyPainExtent, assessmentId } = await req.json();
    const __gate = await requireUserOrAssessment(req, corsHeaders, assessmentId);
    if (__gate instanceof Response) return __gate;
    const anamnesisData = normalizeAssessmentPurpose(rawAnamnesisData || {});
    const preventive = isPreventiveAssessment(anamnesisData);
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "generate-treatment", {
      metadata: { assessment_id: __gate.anonAssessment || (assessmentId && await userCanAccessAssessment(req, String(assessmentId))) ? assessmentId : null },
    });
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    // --- Content-addressed cache (TTL 30d) ---
    // Key = hash of the full clinical payload (anamnesis + tests + questionnaires
    // + diagnosis). Any update to the patient's record changes the key and forces
    // a fresh, case-specific plan. `forceRefresh: true` bypasses the cache.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    // Passo D3 — mecanismo de dor entra na chave de cache: o mesmo caso com
    // mecanismo diferente precisa de um plano diferente.
    const resolvedMechanism = (() => {
      if (preventive) return null;
      const raw = (diagnosis && typeof diagnosis === "object" ? (diagnosis as any).pain_mechanism : null)
        ?? bodyPainMechanism
        ?? (anamnesisData && typeof anamnesisData === "object" ? (anamnesisData as any).painMechanismResolved : null);
      if (!raw || typeof raw !== "object") return null;
      const m = String((raw as any).mechanism ?? "");
      if (!["nociceptive", "neuropathic", "nociplastic", "mixed"].includes(m)) return null;
      return raw as Record<string, any>;
    })();
    const resolvedExtent = typeof bodyPainExtent === "number"
      ? bodyPainExtent
      : typeof (resolvedMechanism as any)?.pain_extent === "number"
        ? (resolvedMechanism as any).pain_extent
        : null;
    const cachePayload = { v: "treatment-purpose-v2", reference: RLCA_REFERENCE_VERSION, anamnesisData, testResults, questionnaireResults, diagnosis, mode, language, painMechanism: resolvedMechanism, painExtent: resolvedExtent };
    if (admin && !forceRefresh) {
      const cached = await getCachedAiResponse<{ treatmentPlan: unknown }>(admin, "generate-treatment", cachePayload);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    const lang = language === "es" ? "Spanish" : language === "en" ? "English" : "Portuguese (Brazil)";
    const painScore = preventive ? null : anamnesisData?.painScore ?? 5;
    const isHighPain = typeof painScore === "number" && painScore >= 6;
    const hasGym = anamnesisData?.hasGymAccess?.includes("yes") ?? false;
    const isProfessional = mode === "professional";
    const hasEdema = anamnesisData?.painTypes?.includes("anamnesis.pain_type.edema") || anamnesisData?.painTypes?.includes("edema") || anamnesisData?.chiefComplaints?.some((c: string) => c.toLowerCase().includes("edema")) || false;
    const needsProfGuidelines = isProfessional && (isHighPain || hasEdema);

    const equipmentContext = hasGym
      ? "The patient HAS ACCESS to a gym with free weights, resistance machines, and standard gym equipment. You can prescribe exercises using barbells, dumbbells, cable machines, leg press, etc."
      : "The patient does NOT have access to a gym. All exercises MUST be bodyweight-based OR use minimal/affordable equipment like resistance bands (elastic bands), tennis balls, foam rollers, or towels. Suggest resistance bands as an affordable alternative when appropriate, mentioning they are low-cost and versatile.";

    const { PEDRO_KNOWLEDGE_BASE, shouldIncludePedroKnowledge } = await import("../_shared/pedro-knowledge.ts");
    const includePedro = shouldIncludePedroKnowledge(anamnesisData);

    const cardioGeriProtocol = includePedro ? `

PROTOCOL — INTEGRATED CARDIORESPIRATORY + GERIATRIC + ORTHOPEDIC EXERCISE PRESCRIPTION (MANDATORY when this block is present):
This case shows cardiorespiratory and/or geriatric signals (e.g., dyspnea, deconditioning post-hospitalization, frailty, fall risk, older adult). You MUST build a MULTICOMPONENT exercise plan that EXPLICITLY combines the 3 domains in EVERY phase. NEVER return phases with only goals/focus and an empty exercises array — exercises are MANDATORY.

Required composition per phase (always include exercises from EACH of the 4 axes below):
  A) BREATHING / CARDIO RECONDITIONING (cardiorespiratory axis):
     - Diaphragmatic breathing, pursed-lip breathing, thoracic expansion exercises
     - Inspiratory Muscle Training (IMT) at 30–50% MIP when applicable (Powerbreathe/Threshold IMT) — 30 reps, 2x/day
     - Aerobic reconditioning: seated/standing marching, stationary cycling, short walking bouts (start 5–10 min, Borg CR-10 target 3–4 short-term; 4–6 medium; 5–7 long-term); HR reserve 40–60% short, 60–70% medium, 70–80% long
     - Monitor: SpO2 ≥ 90%, Borg dyspnea ≤ 5, HR within reserve. Stop if SpO2 < 88%, chest pain, syncope.
  B) GERIATRIC FUNCTIONAL TRAINING (balance + gait + falls prevention):
     - Static balance: tandem stance, single-leg stance (progress eyes open → closed, firm → foam)
     - Dynamic balance: tandem walking, sidesteps, multidirectional weight shifts, Otago-style routines
     - Gait training: marching with arm swing, obstacle stepping, dual-task (walk + count backwards)
     - Sit-to-stand power (chair rise) — key against sarcopenia
  C) ORTHOPEDIC / MUSCULOSKELETAL STRENGTHENING (large muscle groups, sarcopenia prevention):
     - Lower limb: chair squats, mini-squats, step-ups, hip abduction (clamshell, side-lying), calf raises, glute bridges
     - Upper limb: scapular retraction, shoulder external rotation with band, wall push-ups, biceps/triceps with light dumbbells or bands
     - Core: bird-dog, dead bug, modified plank — for trunk stability and ADL transfers
     - Dosage: progressive resistance 2–3x/week, RPE 5–7 (short), 7–8 (medium/long), 8–12 reps, 2–3 sets
  D) ADL / FUNCTIONAL TRANSFER TRAINING:
     - Sit-to-stand from progressively lower chairs, bed mobility, stair climbing simulation (step-ups), reaching tasks, carrying light loads
     - Tie each ADL exercise to the patient's reported limitations (e.g., "dificuldade em movimentação de AVDs após internação")

PHASE-SPECIFIC EXERCISE COUNT (cardio/geri integrated plan — OVERRIDES generic ranges):
  - short_term (1–2 weeks): 6–8 exercises = 2 breathing + 1–2 balance + 2 strengthening (low load) + 1–2 ADL/aerobic warm-up
  - medium_term (3–6 weeks): 7–9 exercises = 1–2 breathing/IMT + 2 balance/gait + 3 strengthening (progressive) + 1–2 aerobic + 1 ADL
  - long_term (7–12 weeks): 7–9 exercises = 1 IMT maintenance + 2 advanced balance/dual-task + 3–4 strengthening (RPE 7–8) + 1–2 aerobic continuous/HIIT-light + functional integration

Each exercise MUST include practical dosage (sets, reps OR duration, frequency) AND mention monitoring parameters (Borg/SpO2/HR) in the description when on the cardio axis.

ABSOLUTE RULE: If this protocol block is present, the "exercises" array in EVERY phase MUST contain at least 6 concrete exercises mixing the 4 axes above. A plan with empty or near-empty exercise lists is invalid.
` : "";

    // -------------------------------------------------------------------
    // Passo D3 — protocolo por mecanismo de dor (Kosek 2021 / Finnerup 2016).
    // Só entra no prompt quando houve triagem; sem triagem o plano segue o
    // raciocínio padrão (a triagem é opcional na avaliação manual).
    // -------------------------------------------------------------------
    const mechanismProtocol = resolvedMechanism ? `

PROTOCOL — PAIN MECHANISM DRIVEN PRESCRIPTION (MANDATORY when this block is present):
Screening result for this patient (frameworks: Kosek et al. 2021 for nociplastic, Finnerup et al. 2016 for neuropathic):
- Predominant mechanism: ${resolvedMechanism.mechanism}
- Secondary mechanism: ${resolvedMechanism.secondary || "none"}
- Clinical subtype: ${resolvedMechanism.subtype || "not specified"}
- Axis: ${resolvedMechanism.axis || "unknown"} (peripheral vs central)
- Central sensitization likely: ${resolvedMechanism.central_sensitization_likely ? "YES" : "no"}
- Screening confidence: ${resolvedMechanism.confidence || "low"}
${typeof resolvedMechanism.csi_score === "number" ? `- CSI score: ${resolvedMechanism.csi_score} (>= 40 supports central sensitization)` : ""}
${resolvedExtent !== null ? `- Pain extent: ~${resolvedExtent}% of body surface` : ""}

The mechanism DICTATES the dosage logic, the progression speed and the education content of every phase:

A) NOCICEPTIVE (peripheral, load/tissue driven):
   - Classic tissue-directed progression: relative rest/unloading only while irritable, then progressive mechanical loading (HIMA → HSR when tendon; graded strength otherwise).
   - Dose by load and tissue tolerance; use pain during exercise <= 3/10 as the guardrail.
   - Progress phases on measurable objective criteria (ROM, strength, tolerance to load).
   - Inflammatory/irritative subtype: lower irritability FIRST (isometrics, thermal/analgesic resources, unloading), only then load.

B) NEUROPATHIC (nerve involved):
   - Include neural mobility work: neurodynamic sliders BEFORE tensioners, low amplitude, no reproduction of paresthesia/shock.
   - Postures/exercises must NOT hold the nerve in tension or in the compressive position (e.g. avoid loaded end-range positions that close the neural interface).
   - If lumbar radicular: use McKenzie directional preference and monitor CENTRALIZATION; stop any direction that peripheralizes.
   - Progression is SLOWER; guardrail is the neural symptom (burning/shock/numbness), not just pain intensity.
   - Educate on symptom fluctuation and on the difference between "sensitive nerve" and "damaged nerve".

C) NOCIPLASTIC (sensitized system, central axis):
   - Lead with PAIN NEUROSCIENCE EDUCATION + graded exposure and time-contingent (not pain-contingent) dosing.
   - Start clearly BELOW the tolerance threshold, use aerobic/global movement, breathing and pacing; accept a mild transient increase in symptoms without dropping the plan.
   - Prioritize sleep, stress and activity regularity as explicit plan items (they are treatment, not advice).
   - AVOID: passive-only, high-intensity provocative testing, and load jumps. Do NOT chase a structural culprit — reinforce that hurt does not equal harm.
   - Progression on function and consistency (adherence, minutes, ADL milestones), never on pain reduction alone.

D) MIXED / secondary sensitization:
   - Treat the tissue AND the sensitization: keep mechanical progression for the nociceptive component, but pace and educate as in the nociplastic protocol, using the MORE irritable component to set the ceiling.

SAFETY (unchanged, applies to all mechanisms): no unstable surfaces (BOSU/wobble boards) — use firm ground, reduced base of support, load/band perturbations and sensory manipulation instead; and respect the positional/ergonomic screening rules below.

REQUIRED OUTPUT: add a "painMechanismStrategy" field to the JSON with:
{ "mechanism": "${resolvedMechanism.mechanism}", "rationale": "1-2 sentences on how this mechanism shaped the plan", "patientMessage": "2-3 sentences in ${lang} in PLAIN LANGUAGE (no jargon like 'nociplastic', 'sensitization', 'neurodynamic'), warm and reassuring, explaining how the plan respects the way this pain behaves", "avoid": ["what to avoid for this mechanism"], "progressionRule": "criteria used to progress phases for this mechanism" }
` : "";

    const symptomaticSystemPrompt = `You are an experienced physiotherapist AI assistant (musculoskeletal, cardiorespiratory and geriatric). Based on the patient's data, diagnostic hypothesis, and functional test results, create a personalized treatment plan in 3 phases.
${mechanismProtocol}
${includePedro ? PEDRO_KNOWLEDGE_BASE : ""}
${cardioGeriProtocol}

PROPRIETARY FRAMEWORK — STEPS (Rehabilitation Ladder):
The treatment plan MUST follow the STEPS framework — a 6-step progressive rehabilitation ladder from injury (ground zero) to discharge:
- Step 1: Inflammatory & Pain Control (ice/heat, rest, protection, pain education)
- Step 2: Tissue Repair & Healing (fundamental for acute injuries and post-surgical cases)
- Step 3: Mobility & Flexibility (restore range of motion, joint mobilization, stretching)
- Step 4: General Strength & Motor Control (functional strengthening, neuromuscular re-education)
- Step 5: Sport-Specific Strength & Motor Control (for athletes — sport-specific drills, plyometrics)
- Step 6: Return to Sport / Discharge (full activity clearance, prevention program)

Map the 3 treatment phases to STEPS as follows:
- short_term → Steps 1-2 (Pain Control & Tissue Repair)
- medium_term → Steps 3-4 (Mobility & General Strength)
- long_term → Steps 5-6 (Specific Strength & Return to Activity)

Each phase MUST include a "stepsMapping" field indicating which Steps it covers. Example: "stepsMapping": "Steps 1-2: Controle Inflamatório & Reparo Tecidual"

PROPRIETARY MODEL — D.I.F.I. (Pain Feedback Cycle):
D.I.F.I. stands for: Dor (Pain) → Inibição (Inhibition) → Fraqueza (Weakness) → Incapacidade (Disability) → back to more Pain.
This is a vicious feedback cycle that perpetuates chronic musculoskeletal conditions:
1. Pain causes reflexive muscle inhibition (the body "shuts down" muscles to protect the area)
2. Inhibition leads to progressive weakness (disuse atrophy, motor control deficits)
3. Weakness creates functional disability (inability to perform daily tasks, sports)
4. Disability generates more pain (compensatory patterns, overload of adjacent structures)

WHEN TO USE D.I.F.I.: If the patient has chronic pain (evolution = worsening or stable for >3 months) OR pain score (EVA) ≥ 5, you MUST:
- Reference the D.I.F.I. cycle in the generalGuidelines, explaining that the rehabilitation plan is designed to BREAK this cycle
- In the explanation, identify WHERE in the cycle the patient currently is (e.g., "You are likely in the Inhibition→Weakness phase")
- Add a "difiContext" field in the JSON response with a brief patient-facing explanation of the cycle and how the plan addresses it
- Frame the treatment as: "Each phase targets a specific point in the D.I.F.I. cycle to break the chain"

KNOWLEDGE BASE (use as clinical reference):
- Sociedade Brasileira de Ortopedia e Traumatologia (SBOT) publications and guidelines
- SONAFE (Sociedade Nacional de Fisioterapia Esportiva) publications
- "Kinesiology of the Musculoskeletal System" by Donald Neumann
- "Clinical Neurodynamics" by Michael Shacklock
- Ellenbecker & Cools (BJSM 2010): Evidence-based shoulder impingement rehab - scapular stabilization exercises, rotator cuff strengthening progression, addressing posterior capsule tightness with sleeper stretches and cross-body adduction
- Fahlstrom et al. (2003): Eccentric calf-muscle training protocol for chronic mid-portion Achilles tendinosis (Alfredson protocol) - 89% success rate. IMPORTANT: This protocol is NOT effective for insertional Achilles tendon pain (only 32% success); for insertional pain, avoid exercises that compress the tendon against the calcaneus
- Werner et al. (J Shoulder Elbow Surg 2010): Sleep position guidance for shoulder patients - recommend supine sleeping to reduce subacromial pressure; avoid side-lying on affected shoulder and prone positions
- Teng & Powers (J Athletic Training 2016): For runners with knee pain, assess hip-extensor strength; weak hip extensors → upright trunk → knee overload. Treatment should include hip-extensor strengthening and forward-lean trunk posture training
- Maranhão-Filho et al. (2011): Unstable surfaces (wobble boards, BOSU) do NOT effectively train proprioception. Prefer progressive balance challenges with firm surfaces and sensory manipulation (eyes closed, head movements)
- VISA-A Questionnaire: Use for Achilles tendon disorder severity assessment (0-100 scale); scores below 50 indicate significant functional limitation

POSITIONAL / ERGONOMIC SAFETY RULE (mandatory for every exercise, mobility and stretching prescription):
- Screen not only load and intensity, but the BODY POSITION the exercise demands. A tolerable load in a provocative position is still provocative.
- Anterior knee pain (patellar chondropathy / PFP, patellar or quadriceps tendinopathy, Hoffa's fat pad syndrome / hoffite), high irritability, or restricted knee flexion → prescribe KNEE-FRIENDLY positions only:
  * AVOID kneeling and half-kneeling positions (e.g. kneeling hip-flexor stretch), deep knee flexion under load, full squats/lunges to end range, direct pressure on the patella or infrapatellar fat pad, and prolonged loaded flexion.
  * PREFER standing, supine, prone, side-lying or seated alternatives: standing/supine (Thomas-position on bed) hip-flexor stretch, prone quad stretch, standing hip extension with band, isometrics in pain-free ranges, and load progression within a tolerated flexion range.
  * If kneeling is unavoidable, explicitly state padding/reduced range and a non-kneeling substitute.
- Apply the same positional screening to other regions: avoid overhead/ABER positions in irritable shoulders, avoid loaded end-range lumbar flexion in acute disc-related pain, avoid prolonged cervical extension in irritable necks.
- Always describe in the observations WHY the chosen position is safe for this patient.

PROTOCOL — HIMA (Holding Isometric Muscle Action):
- Definition: yielding isometric where the patient HOLDS a position against submaximal load for time (10s–45s). Different from PIMA (pushing against an immovable object).
- Exercises by muscle group:
  * Triceps sural: isometric calf raise hold (sustained plantarflexion at top, unilateral, 30-45s)
  * Quadriceps: wall sit (isometric at 60-90° knee flexion, 20-45s); isometric knee extension hold at 30° flexion
  * Glutes: glute bridge hold (sustained at top, 20-30s); single-leg bridge hold
  * Hamstrings: Nordic hamstring isometric hold (sustained at intermediate position); prone hamstring curl hold
  * Lumbar: prone superman hold; bird-dog hold sustained
  * Adductors: Copenhagen adductor hold (side plank with leg on bench); squeeze ball hold between knees
- Dosage: 3-5 sets × 10-45s, submaximal intensity (30-70% MVC)
- EQUIPMENT ADAPTATION: All HIMA exercises are bodyweight-based. If gym available, add external load (ankle weights, dumbbells) for progression. If no gym, use body position and leverage to modulate difficulty.
- ACTIVITY LEVEL ADAPTATION: Sedentary patients start with 10-15s holds; active patients can use 30-45s holds with higher intensity.
- Clinical indications: acute/reactive tendinopathy (analgesic effect — Rio et al. 2015), post-injury joint stabilization, early muscle activation (Steps 1-2)
- References: Rio et al. (BJSM 2015) — isometric contractions reduce patellar tendon pain; Thacker et al. (2019)

PROTOCOL — Heavy Slow Resistance (HSR):
- Definition: heavy load + slow tempo (3s concentric + 3s eccentric) for tendon remodeling
- Original protocol (Kongsgaard et al. 2009 — patellar tendinopathy): decline squat, leg press, hack squat — 3x/week, 12 weeks
- Load progression: weeks 1-2 (15RM), weeks 3-4 (12RM), weeks 5-8 (10RM), weeks 9-12 (8RM → 6RM)
- Achilles adaptation (Beyer et al. 2015): seated + standing heel raise with progressive load
- Applicable to: gluteus medius, proximal hamstring, and other lower limb tendinopathies
- EQUIPMENT ADAPTATION: HSR requires PROGRESSIVE EXTERNAL LOADING. With gym: use machines (leg press, hack squat, seated calf raise). WITHOUT gym: use heavy resistance bands, loaded backpack, or single-leg progressions to approximate load. Note: pure bodyweight may be insufficient for advanced HSR phases — recommend the patient acquire at minimum heavy resistance bands.
- ACTIVITY LEVEL ADAPTATION: Sedentary patients start at 15RM with longer adaptation (2 weeks per phase). Athletic patients can progress faster and reach 6RM. Always respect pain monitoring (≤3/10 during exercise).
- Indications: degenerative/remodeling tendinopathies (Steps 3-5), when isolated eccentrics are insufficient
- Relative contraindication: acute reactive tendon (use HIMA first)
- References: Kongsgaard et al. (Scand J Med Sci Sports 2009); Beyer et al. (Knee Surg Sports Traumatol Arthrosc 2015)

PROTOCOL — McKenzie Method (MDT — Mechanical Diagnosis and Therapy):
- Definition: assessment and treatment system based on directional preference using repeated movements and sustained positions
- Core principles: CENTRALIZATION (pain migrating from distal to proximal = good prognosis) vs PERIPHERALIZATION (contraindicates continuing in that direction)
- Extension protocol for discogenic lumbar pain / sciatica:
  1. Prone lying (passive prone, 5-10 min)
  2. Prone on elbows (sustained extension on elbows, 2-3 min)
  3. Prone press-up (active extension with arms, 10 reps every 2-3h)
  4. Standing extension (standing with hands on lower back)
- Flexion protocol (for spinal stenosis, facet joint pain): supine knee-to-chest, seated flexion, standing flexion
- Clinical rule: if patient reports radiating leg pain (sciatica), test extension first; if pain CENTRALIZES (improves in leg, concentrates in lumbar) = continue extension; if it PERIPHERALIZES = stop and test flexion
- Dosage: 10 repetitions every 2-3 hours in acute phase; reduce to 3-4x/day as improves
- ACTIVITY LEVEL ADAPTATION: Sedentary patients benefit from more sustained positions (prone lying) before progressing to active movements. Active patients can progress faster to press-ups and standing extension.
- Indications: lumbar disc herniation/protrusion, sciatica with centralization, mechanical low back pain (Steps 1-3)
- References: McKenzie & May (2003) "The Lumbar Spine: Mechanical Diagnosis and Therapy"; Lam et al. (Phys Ther 2018)

CONDITIONAL PROTOCOL SELECTION RULES:
- If TENDINOPATHY + pain score ≥ 6 (high pain): Use HIMA in SHORT-TERM phase for isometric analgesia (Steps 1-2). Do NOT prescribe HSR until pain is controlled.
- If TENDINOPATHY + medium/long-term phases: Prescribe HSR with progressive loading (Steps 3-5). Transition from HIMA → HSR as pain decreases below 4/10.
- If LUMBAR PAIN with RADIATING pain to lower limbs (sciatica/radiculopathy): Include McKenzie extension protocol in SHORT-TERM phase. Monitor for centralization response.
- If lumbar pain WITHOUT radiation: McKenzie may still be useful but is less critical; consider based on mechanical pain pattern.
- ALWAYS consider activity level (${anamnesisData?.activityLevel || "not specified"}) and gym access (${hasGym ? "YES" : "NO"}) when selecting exercise difficulty and equipment.

IMPORTANT RULES:
- Always respond in ${lang}.
- This is for educational purposes only — always include a disclaimer.
- Never recommend medication.
- Be empathetic and use accessible language.
- EQUIPMENT CONTEXT: ${equipmentContext}
- When validated questionnaire results (e.g., KOOS, HOOS, FAOS, SPADI, ODI) are provided, use the subscale scores to identify the most impaired functional areas and prioritize exercises that target those specific deficits.
- For example: if the sport/recreation subscale is most affected, include sport-specific rehabilitation exercises in medium/long-term phases.
- If daily living (ADL) subscale is most affected, prioritize functional exercises for everyday tasks.
- Include therapeutic goals derived from questionnaire findings (e.g., "Improve stair climbing ability based on KOOS ADL score of 45%").
- Adapt the plan based on pain score (${painScore}/10):
  ${isHighPain
    ? "- Pain score is HIGH (≥6): Short-term phase should focus ONLY on conservative/analgesic approaches (rest, ice/heat, gentle stretching, breathing). NO muscle activation or strengthening in short-term."
    : "- Pain score is MODERATE/LOW (<6): Short-term can include gentle muscle activation and mobility exercises alongside pain management."
  }

CRITICAL RULE FOR YOUTUBE VIDEOS:
- Do NOT invent or fabricate YouTube URLs. AI-generated URLs will lead to broken pages.
- Instead of providing videoUrls, provide a "searchQuery" field for each exercise. This search query should be a specific YouTube search string that the user can use to find the correct demonstration video.
- The search query for "searchQueryShorts" should be in the same language as the response (${lang}).
- For each exercise, generate TWO search query fields:
  - "searchQueryPro": the exercise keywords translated to ENGLISH + " physiotutors" (reference channel for professionals). ALWAYS in English regardless of the response language.
  - "searchQueryShorts": the exercise keywords in the SAME language as the response + " shorts" (short-form videos)
- Example: "searchQueryPro": "shoulder external rotation exercise physiotutors", "searchQueryShorts": "exercício rotação externa ombro shorts"

Response format (JSON):
{
  "phases": [
    {
      "id": "short_term",
      "duration": "1-2 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "stepsMapping": "Steps 1-2: Inflammatory & Pain Control + Tissue Repair",
      "exercises": [
        {
          "name": "Exercise name",
          "description": "Clear instruction for performing the exercise",
          "sets": "3",
          "reps": "10-12",
          "frequency": "Daily",
          "searchQueryPro": "exercise keywords physiotutors",
          "searchQueryShorts": "exercise keywords shorts",
          "category": "stretching" | "strengthening" | "mobility" | "breathing" | "stability" | "pain_management"
        }
      ]
    },
    {
      "id": "medium_term",
      "duration": "3-6 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "stepsMapping": "Steps 3-4: Mobility & Flexibility + General Strength & Motor Control",
      "exercises": [...]
    },
    {
      "id": "long_term",
      "duration": "7-12 weeks",
      "goal": "Brief goal description",
      "focus": "Main focus of this phase",
      "stepsMapping": "Steps 5-6: Sport-Specific Strength + Return to Activity",
      "exercises": [...]
    }
  ],
  "generalGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "progressionCriteria": "When to progress to the next phase",
  "difiContext": "Patient-facing explanation of the D.I.F.I. cycle and how this plan breaks it (ONLY if applicable — chronic pain or EVA ≥ 5). If not applicable, omit this field.",
  "disclaimer": "Medical disclaimer",
  "references": ["Reference 1", "Reference 2"]${mode === "professional" ? `,
  "professionalGuidelines": [
    {
      "category": "Category name (e.g. Manual Therapy, Electrotherapy)",
      "techniques": [
        {
          "name": "Technique name",
          "indication": "When to use",
          "notes": "Additional clinical notes"
        }
      ]
    }
  ]` : ""}
}

THERMOTHERAPY AND INJURY PROTOCOL GUIDELINES:
- Analyze the pain characteristics (onset, pain types, presence of edema/swelling) to determine the appropriate protocol:

1. For ACUTE injuries (recent onset, presence of edema/swelling, traumatic mechanism):
   - Include the P.R.I.C.E. protocol in generalGuidelines: Protection, Rest, Ice (crioterapia - aplicar gelo por 15-20 min a cada 2-3 horas), Compression (bandagem compressiva), Elevation (elevar o membro acima do nível do coração).
   - Emphasize ice/cold therapy for the first 48-72 hours to reduce swelling and inflammation.
   - Reference: van den Bekerom et al. (2012) - PRICE protocol for acute soft tissue injuries.

2. For CHRONIC pain or MYOFASCIAL pain (gradual onset, muscle tension, trigger points, stiffness, no acute edema):
   - Include the P.E.A.C.E. & L.O.V.E. protocol in generalGuidelines:
     * PEACE (initial phase): Protection, Elevation, Avoid anti-inflammatory modalities, Compression, Education & patient empowerment.
     * LOVE (subsequent management): Load (progressive loading), Optimism (positive mindset), Vascularisation (cardiovascular activity), Exercise (active approach to recovery).
   - Recommend HEAT THERAPY (termoterapia de adição): bolsa de água quente ou compressa morna por 15-20 minutos antes dos exercícios para relaxamento muscular, aumento do fluxo sanguíneo e alívio da rigidez.
   - Reference: Dubois & Esculier (2020) - PEACE & LOVE framework for soft tissue injuries, BJSM.

3. For SUBACUTE conditions (2-6 weeks post-injury, resolving edema):
   - Transition from PRICE to PEACE & LOVE approach.
   - Can introduce contrast therapy (alternância quente/frio) if appropriate.

EXERCISE GUIDELINES (UNIVERSAL — applies to all cases):
- Every phase MUST contain a non-empty "exercises" array with concrete, prescribable exercises. NEVER return a phase with only goal/focus and no exercises.
- Short-term: 3-5 exercises focused on pain relief and gentle mobility (or 6-8 if cardio/geri protocol is active)
- Medium-term: 4-6 exercises adding strengthening and functional movements (or 7-9 if cardio/geri)
- Long-term: 4-6 exercises for return to full activity and prevention (or 7-9 if cardio/geri)
- Each exercise MUST have "searchQueryPro" and "searchQueryShorts" fields (NOT videoUrls or searchQuery)
- Adapt exercises based on equipment availability: ${hasGym ? "gym equipment available" : "bodyweight and resistance bands only"}
- Adapt intensity based on activity level: ${anamnesisData?.activityLevel || "not specified"}
- Include references from the knowledge base sources listed above

${needsProfGuidelines ? `
PROFESSIONAL GUIDELINES (ONLY for professional mode — B2B):
Since this is a PROFESSIONAL assessment (mode=professional) and the patient has ${isHighPain ? `high pain (${painScore}/10 ≥ 6)` : ""}${isHighPain && hasEdema ? " and " : ""}${hasEdema ? "presence of edema" : ""}, you MUST include a "professionalGuidelines" array in the JSON response.

These are clinical suggestions directed at the treating physiotherapist (NOT the patient). No specific dosage parameters — the professional will adjust.

Include the following categories and techniques as relevant to the case:

${isHighPain ? `**Analgesic & Anti-inflammatory Resources (Pain ≥ 6):**
- TENS (conventional mode for acute analgesia; burst mode for chronic pain)
- Thermotherapy by addition (superficial heat) or Tecartherapy (deep heat) for muscle relaxation and blood flow
- Myofascial release of the affected region
- Maitland joint mobilization grades 1-2 of the painful region (oscillatory, within pain-free range)
- Mulligan mobilization with movement (MWM) or SNAG when applicable to the affected joint
- Phonophoresis with therapeutic ultrasound
- Combined therapy (TENS + therapeutic ultrasound)
- Low-level laser therapy with high energy delivery (inhibition spectrum — Arndt-Schultz Law)` : ""}

${hasEdema ? `**Edema Management:**
- Manual lymphatic drainage of the affected region
- Lower limb edema drainage associated with TENS at 2Hz with lower limb elevation` : ""}

Format for professionalGuidelines:
"professionalGuidelines": [
  {
    "category": "Category name",
    "techniques": [
      { "name": "Technique name", "indication": "When/why to use", "notes": "Clinical notes" }
    ]
  }
]
` : ""}`;


    const systemPrompt = preventive ? `You are a clinical physiotherapy expert preparing a preventive functional follow-up plan, not treating assumed pain or disease.
${preventiveReasoningContext(anamnesisData)}
Write in ${lang}. ${equipmentContext}
Keep the existing JSON structure: generalGuidelines and short_term, medium_term, long_term phases, each with goal, duration, stepsMapping and a nonempty exercises array. Exercises need name, sets, reps, frequency, observations, searchQueryPro and searchQueryShorts.
Use STEPS only where applicable: short_term maps to Steps 3-4 (mobility, general strength and motor control); medium_term and long_term progressively use Steps 4-6, according to actual goals and findings. Steps 1-2 are not indicated without current injury/pain findings. Never assume a D.I.F.I pain cycle; omit difiContext and painMechanismStrategy.
Base progression on actual function, activity and tolerance; do not assume disability from posture or injury history. Preserve safety screening, red flags and referral precautions. Do not invent clearance, norms or measured values. Do not prescribe passive analgesic or tissue repair modalities without actual indications. Do not use BOSU/wobble boards.
Include 3-5 appropriate exercises per phase, and avoid positions contraindicated by recorded findings. Include only references relevant to actual findings.
${formatHealthHistoryForPrompt(anamnesisData)}` : symptomaticSystemPrompt;

    const painfulTests = testResults?.filter((t: any) => t.painful).map((t: any) => t.testId) || [];
    const normalTests = testResults?.filter((t: any) => !t.painful).map((t: any) => t.testId) || [];

    const userPrompt = `${preventiveReasoningContext(anamnesisData)}
${preventive ? "Preventive mode overrides pain-specific stages: retain STEPS structure but do not prescribe pain/inflammation or tissue repair interventions without actual findings. D.I.F.I is not evidence of pain in an asymptomatic patient." : ""}
Patient data:
- Chief complaint: ${anamnesisData?.chiefComplaints?.join(", ") || anamnesisData?.chiefComplaint || anamnesisData?.customComplaint}
- Pain regions: ${anamnesisData?.painRegions?.join(", ") || "Not specified"}${anamnesisData?.painRegionRefinements && Object.keys(anamnesisData.painRegionRefinements).length > 0 ? `
- Anatomical refinement per region (use to target structures and progression — medial/lateral, anterior/posterior, proximal/distal for limbs; right/left side or central for axial regions):
${Object.entries(anamnesisData.painRegionRefinements).map(([k, v]: [string, any]) => `    • ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")}` : ""}
- Pain types: ${anamnesisData?.painTypes?.join(", ") || "Not specified"}
- Pain score: ${painScore === null ? "not collected" : `${painScore}/10`}
- Evolution: ${anamnesisData?.evolution}
- Aggravating factors: ${anamnesisData?.aggravatingFactors || "Not specified"}
- Relieving factors: ${anamnesisData?.relievingFactors || "Not specified"}
- Activity level: ${anamnesisData?.activityLevel}
- Onset: ${anamnesisData?.onset}
- Previous surgeries / surgical restrictions: ${anamnesisData?.previousSurgeries ?? anamnesisData?.previous_surgeries ?? "Not recorded"}
${formatHealthHistoryForPrompt(anamnesisData)}
- Gym access: ${hasGym ? "Yes — has access to gym with free weights and resistance machines" : "No — no gym access, exercises should be bodyweight or use resistance bands"}

Diagnostic hypothesis: ${diagnosis?.hypothesis || "Not available"}
${resolvedMechanism ? `Pain mechanism screening: predominant ${resolvedMechanism.mechanism}${resolvedMechanism.secondary ? ` + secondary ${resolvedMechanism.secondary}` : ""}${resolvedMechanism.subtype ? ` (subtype: ${resolvedMechanism.subtype})` : ""}, axis ${resolvedMechanism.axis || "unknown"}, confidence ${resolvedMechanism.confidence || "low"}${resolvedExtent !== null ? `, pain extent ~${resolvedExtent}% of body surface` : ""}. FOLLOW the pain-mechanism protocol and return "painMechanismStrategy".` : "Pain mechanism screening: not performed — use standard clinical reasoning and do NOT return painMechanismStrategy."}

${questionnaireResults && questionnaireResults.length > 0 ? `Validated questionnaire results:
${questionnaireResults.map((q: any) => `- ${q.questionnaireName} (${q.questionnaireId.toUpperCase()}): Total score ${q.percentageScore}% | Interpretation: ${q.interpretation_pt || q.interpretation_en} | Severity: ${q.severity}
  Subscale scores: ${Object.entries(q.subscaleScores || {}).map(([k, v]) => `${k}: ${v}%`).join(", ")}
  IMPORTANT: Use these subscale scores to prioritize exercises targeting the weakest functional areas.`).join("\n")}` : "No validated questionnaires applied."}

${testResults && testResults.length > 0 ? `Functional test results:
- Painful/Uncomfortable tests: ${painfulTests.join(", ") || "None"}
- Normal tests: ${normalTests.join(", ") || "None"}` : "No functional tests performed."}

${Array.isArray(anamnesisData?.strengthTable) && anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).length > 0 ? `Dynamometry (muscle strength, kgf):
${anamnesisData.strengthTable.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue).map((r: any) => {
  const L = parseFloat(String(r.leftValue || "").replace(",", "."));
  const R = parseFloat(String(r.rightValue || "").replace(",", "."));
  const asym = (isFinite(L) && isFinite(R) && L > 0 && R > 0) ? `${Math.round((Math.abs(L - R) / Math.max(L, R)) * 100)}%` : "n/a";
  return `- ${r.movement || "?"}: L ${r.leftValue || "—"} kgf | R ${r.rightValue || "—"} kgf | Asymmetry ${asym}`;
}).join("\n")}

USE these strength values to CALIBRATE the initial load of STEPS phases 3–6: start at ~50–60% of the WEAKER side's measured value for the targeted movement; on movements with asymmetry > 20%, prioritize unilateral work on the weaker side before bilateral loading.` : `Dynamometry: NOT RECORDED — calibrate initial loads conservatively from clinical reasoning (pain score, functional tests, ROM). Do NOT invent strength numbers; progress loads based on tolerance and RPE.`}

Generate a personalized 3-phase treatment plan in valid JSON format. Focus exercises on the affected regions, address deficits found in functional tests, and target the most impaired functional areas identified by the validated questionnaires. Remember: use "searchQueryPro" and "searchQueryShorts" instead of "videoUrls" or "searchQuery" for each exercise.`;

    const callAi = (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt + buildRlcaReference({ anamnesisData, diagnosis, questionnaireResults }) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    // Cost control: Pro removed from the chain (routine structured generation).
    const modelChain = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let response: Response | null = null;
    let usedModel = "";
    let usedIndex = 0;
    let lastStatus = 0;
    let lastBody = "";
    for (const m of modelChain) {
      const r = await callAi(m);
      if (r.ok) { response = r; usedModel = m; usedIndex = modelChain.indexOf(m); console.log(`[generate-treatment] using ${m}`); break; }
      lastStatus = r.status;
      lastBody = await r.text();
      console.warn(`[generate-treatment] ${m} failed ${r.status}: ${lastBody.slice(0,200)}`);
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
    logAiTokenUsage({ functionName: "generate-treatment", model: usedModel, usage: aiResult?.usage, fallbackIndex: usedIndex });
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

    /**
     * Repairs JSON that was cut off mid-generation (token limit): drops the
     * incomplete tail and closes every still-open array/object.
     * This is what used to break the premium treatment plan with
     * "Expected ',' or ']' after array element".
     */
    const repairTruncatedJson = (raw: string): string => {
      const stack: string[] = [];
      let inString = false;
      let escaped = false;
      let lastSafe = -1; // index (inclusive) of last completed value at depth >= 1

      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (inString) {
          if (escaped) { escaped = false; continue; }
          if (ch === '\\') { escaped = true; continue; }
          if (ch === '"') { inString = false; if (stack.length) lastSafe = i; }
          continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === '{' || ch === '[') { stack.push(ch === '{' ? '}' : ']'); continue; }
        if (ch === '}' || ch === ']') { stack.pop(); if (stack.length) lastSafe = i; continue; }
        if (ch === ',' && stack.length) { lastSafe = i - 1; continue; }
        if (/[\d\w]/.test(ch) && stack.length) lastSafe = i; // numbers / true / false / null
      }

      let body = raw;
      if (stack.length > 0 && lastSafe >= 0) {
        // Truncated: cut back to the last fully-formed value, then close everything.
        body = raw.slice(0, lastSafe + 1).replace(/,\s*$/, '');
        body += stack.reverse().join('');
      }
      return body;
    };

    let treatmentPlan: any;
    try {
      // Layer 3: Trim trailing content after last closing brace only when the
      // payload is already balanced (otherwise it destroys truncated output).
      let candidate = jsonStr;
      try {
        JSON.parse(candidate);
      } catch {
        const lastBrace = candidate.lastIndexOf('}');
        if (lastBrace !== -1 && lastBrace < candidate.length - 1) {
          const trimmed = candidate.slice(0, lastBrace + 1);
          try { JSON.parse(trimmed); candidate = trimmed; } catch { /* keep original */ }
        }
      }
      treatmentPlan = JSON.parse(candidate);
    } catch (parseErr) {
      // Layer 4: trailing commas, control chars, then truncation repair
      console.warn("Initial JSON parse failed, attempting cleanup:", parseErr);
      const cleaned = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, (ch: string) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
      try {
        treatmentPlan = JSON.parse(cleaned);
      } catch {
        const repaired = repairTruncatedJson(jsonStr);
        console.warn("[generate-treatment] using truncation repair layer");
        treatmentPlan = JSON.parse(repaired);
      }
    }


    if (admin && treatmentPlan && typeof treatmentPlan === "object") {
      await setCachedAiResponse(admin, "generate-treatment", cachePayload, { treatmentPlan }, AI_CACHE_TTL_30D);
    }

    return new Response(JSON.stringify({ treatmentPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating treatment plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
