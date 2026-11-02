// Suggest specialty (cardio/geri) questionnaires based on anamnesis signals.
// Returns up to 3 suggestions sorted by priority.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirror of catalog (kept in sync manually with src/data/specialtyQuestionnaires.ts).
type Domain = "cardio" | "geri" | "psychosocial" | "spine";
interface Item { id: string; domain: Domain; name: string; triggers: string[]; ageGate?: boolean; basePriority: number; avgMinutes: number; }

const FABQ_TRIGGERS = [
  "medo de mover", "medo de movimento", "medo de piorar", "cinesiofobia", "kinesiophobia",
  "catastrofização", "catastrofizacao", "catastrophizing", "evitação", "evitacao", "avoidance",
  "dor crônica", "dor cronica", "chronic pain", "nociplástica", "nociplastica", "nociplastic",
  "sensibilização central", "sensibilizacao central", "central sensitization",
  "afastamento", "atestado", "licença médica", "licenca medica", "sick leave",
  "dor relacionada ao trabalho", "ler", "dort", "work-related",
  "recidiva", "recorrente", "não melhorou", "nao melhorou", "sem melhora", "failed treatment",
  "tenho medo", "insegurança para se movimentar", "inseguranca para se movimentar",
];

const CATALOG: Item[] = [
  { id: "mmrc", domain: "cardio", name: "mMRC (Dispneia)", triggers: ["dispneia", "dyspnea", "falta de ar", "dpoc", "copd", "asma", "asthma", "tosse", "cough", "pós-covid", "post-covid", "long covid"], basePriority: 80, avgMinutes: 1 },
  { id: "cat", domain: "cardio", name: "CAT (DPOC)", triggers: ["dpoc", "copd", "enfisema", "bronquite crônica", "bronquite cronica"], basePriority: 85, avgMinutes: 3 },
  { id: "borg_cr10", domain: "cardio", name: "Borg CR-10", triggers: ["esforço", "esforco", "exertion", "rpe", "reabilitação cardíaca", "reabilitacao cardiaca", "reabilitação pulmonar", "reabilitacao pulmonar", "heart failure", "insuficiência cardíaca", "icc"], basePriority: 60, avgMinutes: 1 },
  { id: "tug", domain: "geri", name: "TUG", triggers: ["queda", "quedas", "fall", "falls", "equilíbrio", "equilibrio", "balance", "marcha", "gait", "idoso", "elderly", "fragilidade", "frailty"], ageGate: true, basePriority: 85, avgMinutes: 2 },
  { id: "fes_i", domain: "geri", name: "FES-I", triggers: ["medo de cair", "fear of falling", "queda", "quedas", "fall", "falls", "insegurança", "inseguranca"], ageGate: true, basePriority: 75, avgMinutes: 5 },
  { id: "berg", domain: "geri", name: "Berg", triggers: ["equilíbrio", "equilibrio", "balance", "instabilidade", "instability", "parkinson"], ageGate: true, basePriority: 70, avgMinutes: 15 },
  { id: "sppb", domain: "geri", name: "SPPB", triggers: ["fragilidade", "frailty", "sarcopenia", "marcha", "gait", "fraqueza", "weakness"], ageGate: true, basePriority: 65, avgMinutes: 10 },
  { id: "fabq_brasil", domain: "psychosocial", name: "FABQ-Brasil", triggers: FABQ_TRIGGERS, basePriority: 80, avgMinutes: 4 },
  { id: "srs22r", domain: "spine", name: "SRS-22r (Escoliose/coluna)", triggers: ["escoliose", "escoliotica", "escoliótica", "scoliosis", "cobb", "gibosidade", "colete", "hipercifose", "cifose", "kyphosis", "coluna torácica", "coluna toracica", "dorsalgia", "thoracic spine", "deformidade da coluna", "artrodese"], basePriority: 85, avgMinutes: 6 },
  { id: "fabq_pa", domain: "psychosocial", name: "FABQ-PA (curto)", triggers: FABQ_TRIGGERS, basePriority: 70, avgMinutes: 1 },
];

// Structured (non-textual) psychosocial signals: chronic duration and
// nociplastic / central sensitisation mechanism from the pain screening.
function psychosocialSignals(anamnesis: any): string[] {
  const out: string[] = [];
  const onset = String(anamnesis?.onset || anamnesis?.painDuration || "").toLowerCase();
  if (/(more_than_3|over_3|3_months|6_months|more_than_6|year|cron|chronic)/.test(onset)) {
    out.push("dor persistente (> 3 meses)");
  }
  const mech = String(
    anamnesis?.painMechanism?.classification ||
    anamnesis?.painMechanism?.primary ||
    anamnesis?.painMechanismClassification || ""
  ).toLowerCase();
  if (mech.includes("nocipl") || mech.includes("central")) out.push("mecanismo nociplástico");
  const score = Number(anamnesis?.painScore);
  if (Number.isFinite(score) && score >= 8) out.push("dor de alta intensidade");
  return out;
}

function buildBlob(anamnesis: any, extra?: string): string {
  const parts: string[] = [];
  const pushArr = (v: any) => Array.isArray(v) && parts.push(v.join(" "));
  const pushStr = (v: any) => typeof v === "string" && parts.push(v);
  pushArr(anamnesis?.chiefComplaints);
  pushArr(anamnesis?.painTypes);
  pushArr(anamnesis?.comorbidities);
  pushArr(anamnesis?.conditions);
  pushArr(anamnesis?.medicalHistory);
  pushStr(anamnesis?.complaintDescription);
  pushStr(anamnesis?.notes);
  pushStr(anamnesis?.observations);
  pushStr(anamnesis?.history);
  pushStr(anamnesis?.additionalInfo);
  pushStr(extra);
  return parts.join(" ").toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Regra 100% local (catálogo + gatilhos): não consome créditos de IA.
    const { anamnesisData, additionalInfo } = await req.json();
    if (!anamnesisData) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blob = buildBlob(anamnesisData, additionalInfo);
    const ageRange: string = anamnesisData.ageRange || "";
    const isOlderAdult = ageRange === "anamnesis.age.over_55" || ageRange === "anamnesis.age.45_55";
    const psySignals = psychosocialSignals(anamnesisData);

    const matches: { id: string; domain: Domain; reason: string; priority: number; avgMinutes: number; name: string }[] = [];

    for (const item of CATALOG) {
      const matched = item.triggers.filter((k) => blob.includes(k));
      const ageOK = !item.ageGate || isOlderAdult;
      const isPsy = item.domain === "psychosocial";
      const psyOK = isPsy && psySignals.length > 0;
      if ((matched.length === 0 && !psyOK) || !ageOK) continue;

      const reasonBits: string[] = [];
      if (matched.length > 0) reasonBits.push(`Sinais: ${matched.slice(0, 3).join(", ")}`);
      if (isPsy && psySignals.length > 0) reasonBits.push(psySignals.slice(0, 2).join(", "));
      if (item.ageGate && isOlderAdult) reasonBits.push("idoso(a)");

      matches.push({
        id: item.id,
        domain: item.domain,
        name: item.name,
        reason: reasonBits.join(" · "),
        priority: item.basePriority + matched.length * 5 + (isPsy ? psySignals.length * 5 : 0),
        avgMinutes: item.avgMinutes,
      });
    }

    matches.sort((a, b) => b.priority - a.priority);
    // Cap: up to 3 clinical (cardio/geri) + at most 1 psychosocial instrument,
    // so the yellow-flag suggestion never crowds out the specialty ones.
    const suggestions = [
      ...matches.filter((m) => m.domain !== "psychosocial").slice(0, 3),
      ...matches.filter((m) => m.domain === "psychosocial").slice(0, 1),
    ];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-specialty-questionnaires error:", err);
    return new Response(JSON.stringify({ suggestions: [], error: String(err) }), {
      status: 200, // graceful failure — step will be skipped client-side
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
