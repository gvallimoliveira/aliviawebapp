// Knowledge base derived from 40 PEDro studies (score >= 7/10)
// covering Cardiorespiratory Physiotherapy and Geriatric Physiotherapy.
// Injected into AI prompts ONLY when the anamnesis shows clinical signals
// relevant to these domains (see shouldIncludePedroKnowledge below).

export const PEDRO_KNOWLEDGE_BASE = `
SPECIALIZED KNOWLEDGE BASE — Evidence from PEDro (score ≥ 7/10)
Use ONLY when the case clearly involves CARDIORESPIRATORY or GERIATRIC physiotherapy.

CARDIORESPIRATORY (COPD, Heart Failure, post-COVID, asthma, post-operative pulmonary):
- Pulmonary rehabilitation (8–12 weeks, 2–3x/week) is first-line for COPD: aerobic training (60–80% peak workload) + resistance training of large muscle groups.
- Use validated instruments: mMRC (dyspnea), CAT (COPD impact), 6-Minute Walk Test (6MWT), Borg CR-10 (dyspnea/exertion), MRC sum-score (peripheral strength).
- Inspiratory Muscle Training (IMT) at 30–50% MIP improves dyspnea and exercise tolerance when PImax < 60 cmH2O.
- Heart Failure (NYHA II–III): supervised aerobic training (HIIT 4x4 or moderate continuous) + resistance is safe and improves VO2peak; monitor with Borg, HR reserve, symptoms.
- Post-COVID: graded exercise with symptom-titrated progression; screen for PESE/post-exertional symptom exacerbation before HIIT.
- Red flags: SpO2 < 88% on exertion, resting HR > 120 bpm, new arrhythmia, chest pain, syncope, RPE rapidly disproportionate → stop and refer.

GERIATRICS (frailty, sarcopenia, falls, Parkinson's, dementia, osteoporosis):
- Screen with: SPPB, Timed Up and Go (TUG ≥ 13.5s = fall risk), Berg Balance Scale, Gait Speed (< 0.8 m/s = frailty), Hand-Grip strength, FES-I (fear of falling).
- Otago Exercise Programme and multicomponent training (strength + balance + gait, 3x/week, ≥12 weeks) reduce falls ~30%.
- Sarcopenia: progressive resistance training 2–3x/week at 70–80% 1RM (or RPE 7–8) + protein intake guidance.
- Parkinson's: PDSAFE, LSVT-BIG, treadmill with cueing, dual-task training improve gait and reduce falls.
- Dementia: structured, repetitive, supervised exercise improves ADL and reduces neuropsychiatric symptoms.
- Red flags: unexplained weight loss, recurrent falls, new confusion, syncope, severe osteoporosis with acute back pain (vertebral fracture) → refer.

CLINICAL OUTPUT GUIDANCE WHEN THIS BASE APPLIES:
- Prefer the validated instruments above when suggesting questionnaires/tests.
- Dose exercises with the evidence-based parameters above.
- Mention the specific red flags relevant to the detected population.
`;

// ---------------------------------------------------------------------------
// Conditional activation — return true ONLY when the anamnesis shows signals
// of cardiorespiratory or geriatric physiotherapy. Keeps prompts lean and
// avoids confusing the AI on plain musculoskeletal cases.
// ---------------------------------------------------------------------------
export function shouldIncludePedroKnowledge(
  anamnesisData: any,
  additionalInfo?: string,
): boolean {
  if (!anamnesisData) return false;

  // 1) Geriatric signal: age bucket over_55 (highest available bucket).
  const ageRange: string = anamnesisData.ageRange || "";
  const isOlderAdult = ageRange === "anamnesis.age.over_55";

  // 2) Build a single searchable text blob from common free-text fields.
  const parts: string[] = [];
  const pushArr = (v: any) => Array.isArray(v) && parts.push(v.join(" "));
  const pushStr = (v: any) => typeof v === "string" && parts.push(v);

  pushArr(anamnesisData.chiefComplaints);
  pushArr(anamnesisData.painTypes);
  pushArr(anamnesisData.comorbidities);
  pushArr(anamnesisData.conditions);
  pushArr(anamnesisData.medicalHistory);
  pushStr(anamnesisData.complaintDescription);
  pushStr(anamnesisData.notes);
  pushStr(anamnesisData.observations);
  pushStr(anamnesisData.history);
  pushStr(anamnesisData.additionalInfo);
  pushStr(additionalInfo);

  const blob = parts.join(" ").toLowerCase();

  const cardioRespKeywords = [
    "dpoc", "copd", "enfisema", "bronquite",
    "asma", "asthma",
    "insuficiência cardíaca", "insuficiencia cardiaca", "heart failure", "icc",
    "pós-covid", "pos-covid", "post-covid", "long covid", "covid longa",
    "dispneia", "dyspnea", "falta de ar", "shortness of breath",
    "tosse crônica", "tosse cronica", "chronic cough",
    "fadiga respiratória", "respiratory fatigue",
    "spo2", "oxigenação", "oxigenacao", "oxygen",
    "cirurgia cardíaca", "cirurgia cardiaca", "cardiac surgery",
    "pós-operatório torácico", "thoracic surgery",
    "reabilitação pulmonar", "pulmonary rehabilitation",
    "reabilitação cardíaca", "cardiac rehabilitation",
    "fibrose pulmonar", "pulmonary fibrosis",
  ];

  const geriatricKeywords = [
    "idoso", "idosa", "elderly", "geriatr",
    "sarcopenia",
    "fragilidade", "frailty",
    "queda", "quedas", "fall", "falls",
    "parkinson",
    "demência", "demencia", "dementia", "alzheimer",
    "osteoporose", "osteoporosis", "fratura vertebral", "vertebral fracture",
    "marcha lenta", "gait speed",
    "equilíbrio", "equilibrio", "balance deficit",
    "incontinência", "incontinencia",
  ];

  const hasCardioResp = cardioRespKeywords.some((k) => blob.includes(k));
  const hasGeriatric = geriatricKeywords.some((k) => blob.includes(k));

  // Older adult alone is not enough — require an associated clinical signal
  // OR an explicit geriatric/cardiorresp condition at any age.
  return hasCardioResp || hasGeriatric || (isOlderAdult && /equil[íi]brio|queda|fadig|fraqueza|dispneia|falta de ar/.test(blob));
}
