import jsPDF from "jspdf";
import { regionsByView, type View, type ClickableRegion } from "@/components/assessment/painMapData";
import { questionnaires, getApplicableQuestionnaires } from "@/data/questionnaireData";

interface Exercise {
  name: string;
  description: string;
  sets: string;
  reps: string;
  frequency: string;
  category: string;
}

interface Phase {
  id: string;
  duration: string;
  goal: string;
  focus: string;
  exercises: Exercise[];
}

interface TreatmentPlanData {
  phases: Phase[];
  generalGuidelines: string[];
  progressionCriteria: string;
  disclaimer: string;
}

interface Diagnosis {
  hypothesis: string;
  confidence: string;
  summary: string;
  explanation?: string;
  reasoning?: string;
  recommendations?: string[];
  disclaimer: string;
}

interface AnamnesisData {
  chiefComplaint: string;
  customComplaint: string;
  onset: string;
  painRegions: string[];
  painTypes: string[];
  evolution: string;
  aggravatingFactors: string;
  relievingFactors: string;
  activityLevel: string;
  painScore: number;
  hasGymAccess: string;
  painDuration: string;
  sex: string;
  ageRange: string;
  painPattern?: string;
  painWeeklyFrequency?: string;
  painNightWaking?: string;
  hasPhotophobia?: string;
  hasVisualAura?: string;
  hasNausea?: string;
  headacheCrisisFrequency?: string;
  painScoreMode?: string;
  painScoresPerRegion?: Record<string, number>;
}

interface PdfOptions {
  diagnosis: Diagnosis;
  treatmentPlan?: TreatmentPlanData;
  language: string;
  userName?: string;
  anamnesisData?: AnamnesisData;
  painRegions?: string[];
  testResults?: any;
  professionalNotes?: string;
  professionalLogoUrl?: string;
}

// Design tokens from webapp (HSL converted to RGB)
const COLORS = {
  primary: [39, 124, 103] as [number, number, number],
  primaryLight: [230, 245, 241] as [number, number, number],
  foreground: [35, 28, 22] as [number, number, number],
  muted: [120, 110, 100] as [number, number, number],
  accent: [250, 225, 210] as [number, number, number],
  accentDark: [180, 100, 50] as [number, number, number],
  background: [252, 250, 247] as [number, number, number],
  border: [220, 215, 208] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  red: [200, 60, 60] as [number, number, number],
  yellow: [180, 140, 40] as [number, number, number],
  green: [50, 140, 80] as [number, number, number],
};

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT_MAX_WIDTH = CONTENT_WIDTH - 12; // Max text width matching patient name box inner padding (6mm each side)

function checkPage(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > 275) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  r: number,
  fill: [number, number, number],
  stroke?: [number, number, number]
) {
  doc.setFillColor(...fill);
  if (stroke) {
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  } else {
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

function drawBadge(
  doc: jsPDF,
  text: string,
  x: number, y: number,
  bg: [number, number, number],
  fg: [number, number, number]
) {
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(text);
  const padX = 4, padY = 2, h = 8;
  drawRoundedRect(doc, x, y - padY - 3, tw + padX * 2, h, 2, bg);
  doc.setTextColor(...fg);
  doc.text(text, x + padX, y);
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const { default: logoUrl } = await import("@/assets/logo-alivia.png");
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadExternalImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadImageAsBase64(importFn: () => Promise<{ default: string }>): Promise<string | null> {
  try {
    const { default: url } = await importFn();
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Translate i18n keys to display text for PDF
function translateKey(key: string, isPt: boolean): string {
  const map: Record<string, [string, string]> = {
    "anamnesis.complaint.neck_pain": ["Dor no pescoço", "Neck pain"],
    "anamnesis.complaint.back_pain": ["Dor nas costas", "Back pain"],
    "anamnesis.complaint.shoulder_pain": ["Dor no ombro", "Shoulder pain"],
    "anamnesis.complaint.knee_pain": ["Dor no joelho", "Knee pain"],
    "anamnesis.complaint.hip_pain": ["Dor no quadril", "Hip pain"],
    "anamnesis.complaint.ankle_pain": ["Dor no tornozelo", "Ankle pain"],
    "anamnesis.complaint.wrist_pain": ["Dor no punho", "Wrist pain"],
    "anamnesis.complaint.elbow_pain": ["Dor no cotovelo", "Elbow pain"],
    "anamnesis.complaint.foot_pain": ["Dor no pé", "Foot pain"],
    "anamnesis.complaint.headache": ["Cefaleia", "Headache"],
    "anamnesis.onset.sudden": ["Início súbito", "Sudden onset"],
    "anamnesis.onset.gradual": ["Início gradual", "Gradual onset"],
    "anamnesis.onset.trauma": ["Trauma / Lesão", "Trauma / Injury"],
    "anamnesis.pain_type.local": ["Dor local", "Local pain"],
    "anamnesis.pain_type.radiating": ["Dor irradiada", "Radiating pain"],
    "anamnesis.pain_type.burning": ["Queimação", "Burning"],
    "anamnesis.pain_type.tingling": ["Formigamento", "Tingling"],
    "anamnesis.pain_type.throbbing": ["Latejante", "Throbbing"],
    "anamnesis.pain_type.stabbing": ["Pontada", "Stabbing"],
    "anamnesis.evolution.improving": ["Melhorando", "Improving"],
    "anamnesis.evolution.stable": ["Estável", "Stable"],
    "anamnesis.evolution.worsening": ["Piorando", "Worsening"],
    "anamnesis.activity.sedentary": ["Sedentário", "Sedentary"],
    "anamnesis.activity.light": ["Atividade leve", "Light activity"],
    "anamnesis.activity.regular": ["Atividade regular", "Regular activity"],
    "anamnesis.activity.athlete": ["Atleta", "Athlete"],
    "anamnesis.duration.less_week": ["Menos de uma semana", "Less than a week"],
    "anamnesis.duration.one_month": ["Cerca de 1 mês", "About 1 month"],
    "anamnesis.duration.three_six_months": ["3 a 6 meses", "3 to 6 months"],
    "anamnesis.duration.one_year_plus": ["1 ano ou mais", "1 year or more"],
    "anamnesis.gym.yes": ["Sim", "Yes"],
    "anamnesis.gym.no": ["Não", "No"],
    "anamnesis.sex.male": ["Masculino", "Male"],
    "anamnesis.sex.female": ["Feminino", "Female"],
    "anamnesis.age.under_25": ["Menos de 25 anos", "Under 25"],
    "anamnesis.age.25_34": ["25–34 anos", "25–34"],
    "anamnesis.age.35_44": ["35–44 anos", "35–44"],
    "anamnesis.age.45_55": ["45–55 anos", "45–55"],
    "anamnesis.age.over_55": ["Mais de 55 anos", "Over 55"],
    "anamnesis.pain_pattern.continuous": ["Contínua (24h)", "Continuous (24h)"],
    "anamnesis.pain_pattern.intermittent": ["Intermitente", "Intermittent"],
    "anamnesis.weekly_freq.daily": ["Todos os dias", "Every day"],
    "anamnesis.weekly_freq.4_6": ["4-6x/semana", "4-6x/week"],
    "anamnesis.weekly_freq.2_3": ["2-3x/semana", "2-3x/week"],
    "anamnesis.weekly_freq.1_or_less": ["1x/semana ou menos", "Once a week or less"],
    "anamnesis.night_waking.frequent": ["Sim, frequentemente", "Yes, frequently"],
    "anamnesis.night_waking.sometimes": ["Às vezes", "Sometimes"],
    "anamnesis.night_waking.no": ["Não", "No"],
    "anamnesis.migraine_freq.daily": ["Diariamente", "Daily"],
    "anamnesis.migraine_freq.weekly": ["Semanalmente", "Weekly"],
    "anamnesis.migraine_freq.monthly": ["Mensalmente", "Monthly"],
    "anamnesis.migraine_freq.sporadic": ["Esporádica", "Sporadic"],
    "anamnesis.trauma.yes": ["Sim", "Yes"],
    "anamnesis.trauma.no": ["Não", "No"],
  };
  const entry = map[key];
  if (entry) return isPt ? entry[0] : entry[1];
  return key;
}

// ── Pain Map SVG rendering ──
async function generatePainMapImages(painRegions: string[]): Promise<{ view: string; dataUrl: string }[]> {
  const viewImages: Record<View, () => Promise<{ default: string }>> = {
    front: () => import("@/assets/body-front.jpg"),
    back: () => import("@/assets/body-back.jpg"),
    left: () => import("@/assets/body-left.jpg"),
    right: () => import("@/assets/body-right.jpg"),
  };

  const results: { view: string; dataUrl: string }[] = [];

  for (const view of (["front", "back", "left", "right"] as View[])) {
    const regions = regionsByView[view];
    const selectedInView = regions.filter(r => painRegions.includes(r.id));
    if (selectedInView.length === 0) continue;

    const imgBase64 = await loadImageAsBase64(viewImages[view]);
    if (!imgBase64) continue;

    const pathsSvg = selectedInView.map(r =>
      `<path d="${r.d}" fill="rgba(220, 50, 50, 0.45)" stroke="rgba(200, 40, 40, 0.8)" stroke-width="1.5"/>`
    ).join("\n");

    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 440" width="200" height="440">
      <image href="${imgBase64}" x="0" y="0" width="200" height="440" preserveAspectRatio="xMidYMid slice"/>
      ${pathsSvg}
    </svg>`;

    try {
      const dataUrl = await svgToDataUrl(svgStr, 200, 440);
      const viewLabels: Record<string, string> = { front: "Frontal", back: "Posterior", left: "Lat. Esq.", right: "Lat. Dir." };
      results.push({ view: viewLabels[view] || view, dataUrl });
    } catch (e) {
      console.error(`Error rendering pain map view ${view}:`, e);
    }
  }

  return results;
}

function svgToDataUrl(svgStr: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject("No canvas context"); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject("Image load failed"); };
    img.src = url;
  });
}

// ── Render Anamnesis Section ──
function renderAnamnesisSection(doc: jsPDF, y: number, anamnesis: AnamnesisData, isPt: boolean): number {
  y = renderSectionTitle(doc, y, isPt ? "Anamnese" : "Anamnesis", COLORS.primary);

  const fields: { label: string; value: string }[] = [];

  if (anamnesis.chiefComplaint) {
    fields.push({ label: isPt ? "Queixa Principal" : "Chief Complaint", value: translateKey(anamnesis.chiefComplaint, isPt) });
  }
  if (anamnesis.customComplaint) {
    fields.push({ label: isPt ? "Queixa Adicional" : "Additional Complaint", value: anamnesis.customComplaint });
  }
  if (anamnesis.onset) {
    fields.push({ label: isPt ? "Modo de Início" : "Onset", value: translateKey(anamnesis.onset, isPt) });
  }
  if (anamnesis.painScore != null) {
    fields.push({ label: isPt ? "Nível de Dor (EVA)" : "Pain Level (VAS)", value: `${anamnesis.painScore}/10` });
  }
  if (anamnesis.painTypes?.length) {
    fields.push({ label: isPt ? "Tipos de Dor" : "Pain Types", value: anamnesis.painTypes.map(p => translateKey(p, isPt)).join(", ") });
  }
  if (anamnesis.evolution) {
    fields.push({ label: isPt ? "Evolução" : "Evolution", value: translateKey(anamnesis.evolution, isPt) });
  }
  if (anamnesis.painDuration) {
    fields.push({ label: isPt ? "Duração da Dor" : "Pain Duration", value: translateKey(anamnesis.painDuration, isPt) });
  }
  if (anamnesis.aggravatingFactors) {
    fields.push({ label: isPt ? "Fatores Agravantes" : "Aggravating Factors", value: anamnesis.aggravatingFactors });
  }
  if (anamnesis.relievingFactors) {
    fields.push({ label: isPt ? "Fatores Aliviantes" : "Relieving Factors", value: anamnesis.relievingFactors });
  }
  if (anamnesis.activityLevel) {
    fields.push({ label: isPt ? "Nível de Atividade" : "Activity Level", value: translateKey(anamnesis.activityLevel, isPt) });
  }
  if (anamnesis.hasGymAccess) {
    fields.push({ label: isPt ? "Acesso a Academia" : "Gym Access", value: translateKey(anamnesis.hasGymAccess, isPt) });
  }
  if (anamnesis.sex) {
    fields.push({ label: isPt ? "Sexo Biológico" : "Biological Sex", value: translateKey(anamnesis.sex, isPt) });
  }
  if (anamnesis.ageRange) {
    fields.push({ label: isPt ? "Faixa Etária" : "Age Range", value: translateKey(anamnesis.ageRange, isPt) });
  }

  // New fields: pain pattern, frequency, night waking
  if (anamnesis.painPattern) {
    fields.push({ label: isPt ? "Padrão da Dor" : "Pain Pattern", value: translateKey(anamnesis.painPattern, isPt) });
  }
  if (anamnesis.painWeeklyFrequency) {
    fields.push({ label: isPt ? "Frequência Semanal" : "Weekly Frequency", value: translateKey(anamnesis.painWeeklyFrequency, isPt) });
  }
  if (anamnesis.painNightWaking) {
    fields.push({ label: isPt ? "Dor Noturna (Acorda)" : "Night Pain (Waking)", value: translateKey(anamnesis.painNightWaking, isPt) });
  }

  // Migraine screening
  if (anamnesis.hasPhotophobia) {
    fields.push({ label: isPt ? "Fotofobia" : "Photophobia", value: translateKey(anamnesis.hasPhotophobia, isPt) });
  }
  if (anamnesis.hasVisualAura) {
    fields.push({ label: isPt ? "Aura Visual" : "Visual Aura", value: translateKey(anamnesis.hasVisualAura, isPt) });
  }
  if (anamnesis.hasNausea) {
    fields.push({ label: isPt ? "Náusea nas Crises" : "Nausea During Episodes", value: translateKey(anamnesis.hasNausea, isPt) });
  }
  if (anamnesis.headacheCrisisFrequency) {
    fields.push({ label: isPt ? "Frequência de Crises" : "Crisis Frequency", value: translateKey(anamnesis.headacheCrisisFrequency, isPt) });
  }

  // Pain regions as text
  if (anamnesis.painRegions?.length) {
    const regionLabels = anamnesis.painRegions.map(id => {
      for (const view of Object.values(regionsByView)) {
        const r = view.find(reg => reg.id === id);
        if (r) return isPt ? r.label_pt : r.label_en;
      }
      return id;
    });
    fields.push({ label: isPt ? "Regiões de Dor" : "Pain Regions", value: regionLabels.join(", ") });
  }

  // Per-region pain scores
  if (anamnesis.painScoreMode === "per_region" && anamnesis.painScoresPerRegion && Object.keys(anamnesis.painScoresPerRegion).length > 0) {
    const regionScores = Object.entries(anamnesis.painScoresPerRegion)
      .map(([key, score]) => `${translateKey(key, isPt)}: ${score}/10`)
      .join(", ");
    fields.push({ label: isPt ? "Dor por Região" : "Pain by Region", value: regionScores });
  }

  for (const field of fields) {
    y = checkPage(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.foreground);
    const labelText = `${field.label}: `;
    doc.text(labelText, MARGIN + 2, y);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    const valueLines = doc.splitTextToSize(field.value, CONTENT_WIDTH - 4 - labelW);
    doc.text(valueLines, MARGIN + 2 + labelW, y);
    y += valueLines.length * 3.5 + 2;
  }

  y += 4;
  return y;
}

// ── Render Pain Map Images Section ──
async function renderPainMapSection(doc: jsPDF, y: number, painRegions: string[], isPt: boolean): Promise<number> {
  const images = await generatePainMapImages(painRegions);
  if (images.length === 0) return y;

  const mapW = 35;
  const mapH = mapW * (440 / 200); // maintain aspect ratio
  const gap = 4;
  const totalW = images.length * mapW + (images.length - 1) * gap;
  let startX = MARGIN + (CONTENT_WIDTH - totalW) / 2;

  // Single checkPage for title + images together to prevent splitting
  y = checkPage(doc, y, mapH + 24);
  y = renderSectionTitle(doc, y, isPt ? "Mapa de Dor" : "Pain Map", COLORS.primary);

  for (const img of images) {
    try {
      doc.addImage(img.dataUrl, "PNG", startX, y, mapW, mapH);
      // View label below
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      const labelW = doc.getTextWidth(img.view);
      doc.text(img.view, startX + (mapW - labelW) / 2, y + mapH + 4);
    } catch (e) {
      console.error("Error adding pain map image:", e);
    }
    startX += mapW + gap;
  }

  y += mapH + 10;
  return y;
}

// ── Render Test Results Section ──
function renderTestResultsSection(doc: jsPDF, y: number, testResults: any, isPt: boolean): number {
  // Normalize: could be null, empty object {}, or array
  if (!testResults) return y;
  if (typeof testResults === "object" && !Array.isArray(testResults) && Object.keys(testResults).length === 0) return y;
  if (Array.isArray(testResults) && testResults.length === 0) return y;

  const items = Array.isArray(testResults) ? testResults : [testResults];
  const questionnaireItems = items.filter((t: any) => t.questionnaireId && t.percentageScore != null);
  const genericItems = items.filter((t: any) => !t.questionnaireId);

  // Render validated questionnaire results
  if (questionnaireItems.length > 0) {
    y = checkPage(doc, y, 44);
    y = renderSectionTitle(doc, y, isPt ? "Questionários Funcionais" : "Functional Questionnaires", COLORS.primary, 30);

    for (const q of questionnaireItems) {
      y = checkPage(doc, y, 22);
      const qName = q.questionnaireName || q.questionnaireId.toUpperCase();
      const pct = Math.round(q.percentageScore);
      const severity = q.severity || "";
      const interpretation = isPt ? (q.interpretation_pt || severity) : (q.interpretation_en || severity);

      // Name + score
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      doc.text(qName, MARGIN + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${pct}%`, MARGIN + 2 + doc.getTextWidth(qName + "  "), y);
      y += 4;

      // Progress bar
      const barW = CONTENT_WIDTH - 4;
      const barH = 3;
      drawRoundedRect(doc, MARGIN + 2, y, barW, barH, 1, [230, 230, 230]);
      const filledW = (pct / 100) * barW;
      const barColor: [number, number, number] = severity === "minimal" || severity === "mild"
        ? COLORS.green
        : severity === "moderate" ? COLORS.yellow : COLORS.red;
      if (filledW > 0) {
        drawRoundedRect(doc, MARGIN + 2, y, filledW, barH, 1, barColor);
      }
      y += 5;

      // Interpretation label
      if (interpretation) {
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        const interpText = `${isPt ? "Interpretação" : "Interpretation"}: ${interpretation}`;
        const interpLines = doc.splitTextToSize(interpText, TEXT_MAX_WIDTH);
        doc.text(interpLines, MARGIN + 2, y);
        y += interpLines.length * 3.5;
      }

      // Subscale scores — highlight top 3 most limited
      if (q.subscaleScores && typeof q.subscaleScores === "object") {
        const entries = Object.entries(q.subscaleScores);
        if (entries.length > 1) {
          // Determine scoring direction from questionnaire data
          const qDef = questionnaires.find(qd => qd.id === q.questionnaireId);
          const higherWorse = !qDef || qDef.scoringDirection === "higher_worse";

          // Sort to find top 3 most limited
          const sorted = [...entries].sort(([, a], [, b]) => {
            const va = typeof a === "number" ? a : parseFloat(String(a)) || 0;
            const vb = typeof b === "number" ? b : parseFloat(String(b)) || 0;
            return higherWorse ? vb - va : va - vb; // worst first
          });
          const top3Keys = new Set(sorted.slice(0, 3).map(([k]) => k));

          // Render top 3 highlighted block
          y = checkPage(doc, y, 6);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...COLORS.foreground);
          doc.text(isPt ? "Principais limitações funcionais:" : "Top functional limitations:", MARGIN + 4, y);
          y += 4;

          // Determine max value for bar scaling
          const top3 = sorted.slice(0, 3);
          const allVals = entries.map(([, v]) => typeof v === "number" ? v : parseFloat(String(v)) || 0);
          const maxVal = Math.max(...allVals, 1);

          const barMaxW = 55; // max bar width in mm
          const labelColW = CONTENT_WIDTH - 8 - barMaxW - 14; // space for label
          const rowH = 8;

          for (const [key, val] of top3) {
            y = checkPage(doc, y, rowH + 2);
            const label = qDef?.subscaleLabels?.[key]
              ? (isPt ? qDef.subscaleLabels[key].pt : qDef.subscaleLabels[key].en)
              : key;
            const numVal = typeof val === "number" ? val : parseFloat(String(val)) || 0;

            // Row background
            drawRoundedRect(doc, MARGIN + 4, y - 3.5, CONTENT_WIDTH - 8, rowH, 1.5, COLORS.accent);

            // Label text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.accentDark);
            const truncLabel = label.length > 22 ? label.substring(0, 20) + "…" : label;
            doc.text(`▸ ${truncLabel}`, MARGIN + 6, y);

            // Mini horizontal bar
            const barX = MARGIN + 6 + labelColW;
            const barY = y - 2.5;
            const barH = 4;
            // Bar track (light gray)
            drawRoundedRect(doc, barX, barY, barMaxW, barH, 1.5, [230, 230, 230]);
            // Bar fill — proportional to max
            const fillW = Math.max(2, (numVal / maxVal) * barMaxW);
            // For higher_worse: high ratio = red (bad). For higher_better: high ratio = green (good).
            const ratio = numVal / maxVal;
            let barColor: [number, number, number];
            if (higherWorse) {
              barColor = ratio > 0.7 ? COLORS.red : ratio > 0.4 ? COLORS.yellow : COLORS.green;
            } else {
              // higher_better: low values = worse (red), high values = better (green)
              barColor = ratio < 0.4 ? COLORS.red : ratio < 0.7 ? COLORS.yellow : COLORS.green;
            }
            drawRoundedRect(doc, barX, barY, fillW, barH, 1.5, barColor);

            // Value label at end of bar
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.foreground);
            doc.text(String(numVal), barX + barMaxW + 2, y);

            y += rowH + 1;
          }

          // Remaining subscales (if any)
          const remaining = entries.filter(([k]) => !top3Keys.has(k));
          if (remaining.length > 0) {
            y += 1;
            doc.setFontSize(7);
            for (const [key, val] of remaining) {
              y = checkPage(doc, y, 5);
              const label = qDef?.subscaleLabels?.[key]
                ? (isPt ? qDef.subscaleLabels[key].pt : qDef.subscaleLabels[key].en)
                : key;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(...COLORS.muted);
              doc.text(`  ${label}: ${val}`, MARGIN + 4, y);
              y += 3.5;
            }
          }
        }
      }
      y += 3;
    }
    y += 2;
  }

  // Render generic test results (non-questionnaire)
  if (genericItems.length > 0) {
    y = checkPage(doc, y, 16);
    y = renderSectionTitle(doc, y, isPt ? "Resultados dos Testes" : "Test Results", COLORS.primary);

    for (const test of genericItems) {
      y = checkPage(doc, y, 10);
      const name = test.name || test.testName || test.id || "";
      const result = test.result || test.score || test.value || "";
      if (name) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(`${name}: `, MARGIN + 2, y);
        const lw = doc.getTextWidth(`${name}: `);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        const resultLines = doc.splitTextToSize(String(result), TEXT_MAX_WIDTH - lw);
        doc.text(resultLines, MARGIN + 2 + lw, y);
        y += resultLines.length * 3.5 + 1.5;
      }
    }
    y += 4;
  }

  return y;
}

export async function generateAssessmentPdfBlob(options: PdfOptions): Promise<Blob> {
  const doc = await _buildPdfDoc(options);
  return doc.output("blob");
}

// ── Shared VAS Renderer (one bar per region or single bar) ──
function renderVasBar(doc: jsPDF, barX: number, y: number, barW: number, barH: number, score: number, label?: string, isPt?: boolean): number {
  // Label above bar if provided
  if (label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.foreground);
    doc.text(label, barX, y);
    y += 4;
  }

  // Gradient background bar
  const gradientStops = [
    { pos: 0, color: [50, 180, 100] },
    { pos: 0.3, color: [180, 180, 50] },
    { pos: 0.6, color: [220, 140, 40] },
    { pos: 1, color: [200, 50, 50] },
  ];
  const segments = 20;
  const segW = barW / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    let c = gradientStops[0].color;
    for (let s = 0; s < gradientStops.length - 1; s++) {
      if (t >= gradientStops[s].pos && t <= gradientStops[s + 1].pos) {
        const ratio = (t - gradientStops[s].pos) / (gradientStops[s + 1].pos - gradientStops[s].pos);
        c = gradientStops[s].color.map((v, idx) => Math.round(v + (gradientStops[s + 1].color[idx] - v) * ratio));
        break;
      }
    }
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(barX + i * segW, y, segW + 0.5, barH, "F");
  }

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(barX, y, barW, barH, 2, 2, "S");

  // Score marker
  const markerX = barX + (score / 10) * barW;
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.foreground);
  doc.setLineWidth(1);
  doc.circle(markerX, y + barH / 2, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.foreground);
  doc.text(`${score}`, markerX - (score >= 10 ? 2.5 : 1.5), y + barH / 2 + 2.5);
  y += barH + 3;

  // End labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  const noPainLabel = isPt ? "Sem dor" : "No pain";
  const worstLabel = isPt ? "Pior dor" : "Worst pain";
  doc.text(noPainLabel, barX, y + 3);
  doc.text(worstLabel, barX + barW - doc.getTextWidth(worstLabel), y + 3);

  // Score text centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const scoreColor: [number, number, number] = score <= 3 ? COLORS.green : score <= 6 ? COLORS.yellow : COLORS.red;
  doc.setTextColor(...scoreColor);
  const scoreText = `${score}/10`;
  doc.text(scoreText, barX + barW / 2 - doc.getTextWidth(scoreText) / 2, y + 3);
  y += 10;

  return y;
}

function renderVasSection(doc: jsPDF, y: number, isPt: boolean, painScore: number | undefined, anamnesisData?: AnamnesisData | any): number {
  const hasPerRegion = anamnesisData?.painScoreMode === "per_region" && anamnesisData?.painScoresPerRegion && Object.keys(anamnesisData.painScoresPerRegion).length > 0;
  const score = painScore ?? anamnesisData?.painScore;
  if (score == null && !hasPerRegion) return y;

  const barX = MARGIN + 2;
  const barW = CONTENT_WIDTH - 4;
  const barH = 8;

  if (hasPerRegion) {
    const entries = Object.entries(anamnesisData!.painScoresPerRegion!) as [string, number][];
    const neededHeight = 20 + entries.length * 28;
    y = checkPage(doc, y, neededHeight);
    y = renderSectionTitle(doc, y, isPt ? "Escala Visual de Dor (EVA)" : "Visual Analog Scale (VAS)", COLORS.primary, 25);

    for (const [key, regionScore] of entries) {
      y = checkPage(doc, y, 26);
      const label = `${translateKey(key, isPt)} — ${regionScore}/10`;
      y = renderVasBar(doc, barX, y, barW, barH, regionScore, label, isPt);
      y += 2;
    }

    // Average
    if (score != null) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const avgColor: [number, number, number] = score <= 3 ? COLORS.green : score <= 6 ? COLORS.yellow : COLORS.red;
      doc.setTextColor(...avgColor);
      const avgText = isPt ? `Média geral: ${score}/10` : `Overall average: ${score}/10`;
      doc.text(avgText, barX + barW / 2 - doc.getTextWidth(avgText) / 2, y);
      y += 8;
    }
  } else if (score != null) {
    y = checkPage(doc, y, 35);
    y = renderSectionTitle(doc, y, isPt ? "Escala Visual de Dor (EVA)" : "Visual Analog Scale (VAS)", COLORS.primary, 25);
    y = renderVasBar(doc, barX, y, barW, barH, score, undefined, isPt);
  }

  return y;
}

// ── Basic Report PDF (for WhatsApp sharing — hypothesis, confidence, summary, pain map, VAS, disclaimer) ──
interface BasicReportOptions {
  diagnosis: Diagnosis;
  language: string;
  patientName?: string;
  painRegions?: string[];
  painScore?: number;
  anamnesisData?: any;
}

export async function generateBasicReportPdfBlob(options: BasicReportOptions): Promise<Blob> {
  const doc = new jsPDF();
  const isPt = options.language === "pt";
  let y = MARGIN;

  const logoBase64 = await loadLogoBase64();

  // Header band
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  const logoH = 14;
  const logoW = 14;
  const logoY = (38 - logoH) / 2;
  let textStartX = MARGIN;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", MARGIN, logoY, logoW, logoH);
      textStartX = MARGIN + logoW + 3;
    } catch { /* fallback */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  const titleY = logoY + logoH / 2 + 2;
  doc.text("Aliv.iA", textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(isPt ? "Resultado da Avaliação Básica" : "Basic Assessment Result", textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);
  y = 48;

  // Patient name
  if (options.patientName) {
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 14, 4, COLORS.background, COLORS.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    const pLabel = isPt ? "Paciente: " : "Patient: ";
    doc.text(pLabel, MARGIN + 6, y + 9);
    doc.setFont("helvetica", "normal");
    doc.text(options.patientName, MARGIN + 6 + doc.getTextWidth(pLabel), y + 9);
    y += 20;
  }

  // Diagnosis section
  y = renderSectionTitle(doc, y, isPt ? "Hipótese Diagnóstica" : "Diagnostic Hypothesis", COLORS.primary);

  // Hypothesis card
  const hypoLines = doc.splitTextToSize(options.diagnosis.hypothesis, CONTENT_WIDTH - 16);
  const hypoH = hypoLines.length * 5 + 14;
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, hypoH, 4, COLORS.primaryLight, COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(hypoLines, MARGIN + 8, y + 9);
  y += hypoH + 4;

  // Confidence badge
  const confidenceMap: Record<string, { label: string; color: [number, number, number] }> = isPt
    ? { low: { label: "Confiança: Baixa", color: COLORS.yellow }, moderate: { label: "Confiança: Moderada", color: COLORS.primary }, high: { label: "Confiança: Alta", color: COLORS.green } }
    : { low: { label: "Confidence: Low", color: COLORS.yellow }, moderate: { label: "Confidence: Moderate", color: COLORS.primary }, high: { label: "Confidence: High", color: COLORS.green } };
  const conf = confidenceMap[options.diagnosis.confidence] || confidenceMap.moderate;
  drawBadge(doc, conf.label.toUpperCase(), MARGIN, y + 4, conf.color, COLORS.white);
  y += 12;

  // Summary
  y = renderSubSection(doc, y, isPt ? "Resumo" : "Summary", options.diagnosis.summary);

  // ── Pain Score (VAS) — uses shared renderer ──
  y = renderVasSection(doc, y, isPt, options.painScore, options.anamnesisData);

  // ── Pain Map ──
  if (options.painRegions && options.painRegions.length > 0) {
    y = await renderPainMapSection(doc, y, options.painRegions, isPt);
  }

  // Premium upsell banner
  y += 6;
  y = checkPage(doc, y, 100);

  const upsellTitle = isPt ? "Desbloqueie sua Avaliação Completa" : "Unlock Your Full Assessment";
  
  // Match pain regions to applicable questionnaires using the same logic as the assessment
  const regions = options.painRegions || [];
  const applicableQuestionnaires = getApplicableQuestionnaires(regions);
  
  const questionnaireBullets: string[] = applicableQuestionnaires.length > 0
    ? applicableQuestionnaires.map(q => isPt
        ? `✅ Questionário ${q.name} — ${q.fullName_pt.replace(/\s*\(.*\)/, '')}`
        : `✅ ${q.name} questionnaire — ${q.fullName_en.replace(/\s*\(.*\)/, '')}`)
    : [isPt
        ? "✅ Questionários validados cientificamente para sua condição"
        : "✅ Scientifically validated questionnaires for your condition"];

  const bulletsPt = [
    "✅ Explicação clínica detalhada do seu quadro",
    "✅ Raciocínio clínico baseado em evidências científicas",
    "✅ Recomendações personalizadas para o seu caso",
    "✅ Plano de tratamento completo em 3 fases progressivas",
    "✅ Exercícios com séries, repetições e progressão",
  ];
  const bulletsEn = [
    "✅ Detailed clinical explanation of your condition",
    "✅ Evidence-based clinical reasoning",
    "✅ Personalized recommendations for your case",
    "✅ Complete 3-phase progressive treatment plan",
    "✅ Exercises with sets, reps and progression",
  ];
  const bullets = [...(isPt ? bulletsPt : bulletsEn), ...questionnaireBullets];
  
  const motivationalPt = "Já tenho uma boa ideia por onde começar seu tratamento!\nAdquira a avaliação premium para refinar nosso plano terapêutico\ne receber todas as orientações disponíveis! Vamos juntos resolver essa dor.";
  const motivationalEn = "I already have a good idea of where to start your treatment!\nGet the premium assessment to refine our treatment plan\nand receive all available guidance! Let's solve this pain together.";
  const motivational = isPt ? motivationalPt : motivationalEn;

  const totalBulletH = bullets.length * 5.5;
  const motInnerW = CONTENT_WIDTH - 24; // 12px padding each side of the inner box
  const motivationalLines = doc.splitTextToSize(motivational, motInnerW - 28);
  const motivationalH = motivationalLines.length * 5 + 10;
  const upsellH = 20 + totalBulletH + motivationalH + 16;
  
  // Outer container with gradient-like effect
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, upsellH, 4, COLORS.primaryLight, COLORS.primary);
  
  // Title with icon
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(upsellTitle, MARGIN + 8, y + 11);
  
  // Divider line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 8, y + 14, MARGIN + CONTENT_WIDTH - 8, y + 14);
  
  // Bullets
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.foreground);
  let bulletY = y + 20;
  for (const b of bullets) {
    const bLines = doc.splitTextToSize(b, TEXT_MAX_WIDTH - 4);
    doc.text(bLines, MARGIN + 10, bulletY);
    bulletY += bLines.length * 3.5 + 2;
  }
  
  // Motivational message in a highlighted inner box
  const motBoxY = bulletY + 2;
  const logoMotSize = 10;
  const motTextW = motInnerW - 28; // leave space for logo on right
  const motBoxH = motivationalLines.length * 5 + 8;
  // Inner accent background
  doc.setFillColor(39, 124, 103); // primary
  doc.roundedRect(MARGIN + 6, motBoxY - 2, CONTENT_WIDTH - 12, motBoxH, 3, 3, "F");
  
  // Logo in the right side of the green box
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", MARGIN + CONTENT_WIDTH - 6 - logoMotSize - 2, motBoxY, logoMotSize, logoMotSize);
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  for (let i = 0; i < motivationalLines.length; i++) {
    doc.text(motivationalLines[i], MARGIN + 12, motBoxY + 5 + i * 5);
  }
  y += upsellH + 8;

  // Disclaimer
  const disclaimerText = isPt
    ? "Este relatório foi gerado por um sistema de inteligência artificial e tem caráter exclusivamente informativo e educacional. Ele NÃO substitui uma consulta médica ou avaliação fisioterapêutica presencial. Em caso de dor intensa ou piora dos sintomas, procure atendimento médico imediatamente."
    : "This report was generated by an artificial intelligence system and is for informational and educational purposes only. It does NOT replace a medical consultation or in-person physiotherapy assessment. In case of severe pain or worsening symptoms, seek medical attention immediately.";
  const discLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 12);
  const discH = discLines.length * 3.5 + 14;
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, discH, 4, [255, 245, 245], COLORS.red);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.red);
  doc.text(isPt ? "⚠  AVISO IMPORTANTE" : "⚠  IMPORTANT DISCLAIMER", MARGIN + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 80);
  doc.text(discLines, MARGIN + 6, y + 14);

  // Footer with logo
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);

    const footerLogoSize = 8;
    let footerTextX = MARGIN;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", MARGIN, 285.5, footerLogoSize, footerLogoSize);
        footerTextX = MARGIN + footerLogoSize + 2;
      } catch { /* fallback */ }
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Aliv.iA — ${isPt ? "Relatório gerado por IA" : "AI-generated report"}`, footerTextX, 290);
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - 8, 290);
  }

  return doc.output("blob");
}

export async function generateAssessmentPdf(options: PdfOptions) {
  const doc = await _buildPdfDoc(options);
  const isPt = options.language === "pt";
  doc.save(`AliviA_${isPt ? "Relatorio" : "Report"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function _buildPdfDoc({ diagnosis, treatmentPlan, language, userName, anamnesisData, painRegions, testResults, professionalNotes, professionalLogoUrl }: PdfOptions): Promise<jsPDF> {
  const doc = new jsPDF();
  const isPt = language === "pt";
  let y = MARGIN;

  // Load logos
  const logoBase64 = await loadLogoBase64();
  const proLogoBase64 = professionalLogoUrl ? await loadExternalImageAsBase64(professionalLogoUrl) : null;

  // ── Header Band ──
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  
  const logoH = 14;
  const logoW = 14;
  const logoY = (38 - logoH) / 2;
  let textStartX = MARGIN;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", MARGIN, logoY, logoW, logoH);
      textStartX = MARGIN + logoW + 3;
    } catch { /* fallback without logo */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  const titleY = logoY + logoH / 2 + 2;
  doc.text("Aliv.iA", textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(isPt ? "Relatório Clínico Personalizado" : "Personalized Clinical Report", textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);

  // Professional logo in top-right of header
  if (proLogoBase64) {
    try {
      doc.addImage(proLogoBase64, "PNG", PAGE_WIDTH - MARGIN - logoW, logoY, logoW, logoH);
    } catch { /* fallback */ }
  }

  y = 48;

  // ── Patient Info ──
  if (userName) {
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 14, 4, COLORS.background, COLORS.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    doc.text(isPt ? "Paciente: " : "Patient: ", MARGIN + 6, y + 9);
    const labelW = doc.getTextWidth(isPt ? "Paciente: " : "Patient: ");
    doc.setFont("helvetica", "normal");
    doc.text(userName, MARGIN + 6 + labelW, y + 9);
    y += 20;
  }

  // ── Diagnosis Section (FIRST after patient info) ──
  y = renderSectionTitle(doc, y, isPt ? "Hipótese Diagnóstica" : "Diagnostic Hypothesis", COLORS.primary, 30);

  // Hypothesis card
  const hypoLines = doc.splitTextToSize(diagnosis.hypothesis, CONTENT_WIDTH - 16);
  const hypoH = hypoLines.length * 5 + 14;
  y = checkPage(doc, y, hypoH + 4);
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, hypoH, 4, COLORS.primaryLight, COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(hypoLines, MARGIN + 8, y + 9);
  y += hypoH + 4;

  // Confidence badge
  const confidenceMap: Record<string, { label: string; color: [number, number, number] }> = isPt
    ? {
        low: { label: "Confiança: Baixa", color: COLORS.yellow },
        moderate: { label: "Confiança: Moderada", color: COLORS.primary },
        high: { label: "Confiança: Alta", color: COLORS.green },
      }
    : {
        low: { label: "Confidence: Low", color: COLORS.yellow },
        moderate: { label: "Confidence: Moderate", color: COLORS.primary },
        high: { label: "Confidence: High", color: COLORS.green },
      };
  const conf = confidenceMap[diagnosis.confidence] || confidenceMap.moderate;
  drawBadge(doc, conf.label.toUpperCase(), MARGIN, y + 4, conf.color, COLORS.white);
  y += 12;

  // Summary
  y = renderSubSection(doc, y, isPt ? "Resumo" : "Summary", diagnosis.summary);

  // Explanation
  if (diagnosis.explanation) {
    y = renderSubSection(doc, y, isPt ? "O que está acontecendo?" : "What's happening?", diagnosis.explanation);
  }

  // Reasoning
  if (diagnosis.reasoning) {
    y = renderSubSection(doc, y, isPt ? "Raciocínio Clínico" : "Clinical Reasoning", diagnosis.reasoning);
  }

  // ── Clinical Impression (if available) ──
  const clinicalImpression = (diagnosis as any)?.clinicalImpression;
  if (clinicalImpression?.overview) {
    y = checkPage(doc, y, 50);
    y += 4;
    const ciTitle = isPt ? "Impressão Clínica" : "Clinical Impression";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(ciTitle, MARGIN, y);
    // IA badge
    const titleW = doc.getTextWidth(ciTitle);
    drawBadge(doc, "IA", MARGIN + titleW + 4, y - 3, COLORS.primary, COLORS.white);
    y += 6;

    // Overview in rounded box
    const overviewLines = doc.splitTextToSize(clinicalImpression.overview, CONTENT_WIDTH - 16);
    const overviewH = overviewLines.length * 4.5 + 12;
    y = checkPage(doc, y, overviewH + 20);
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, overviewH, 4, COLORS.primaryLight, COLORS.primary);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    doc.text(overviewLines, MARGIN + 8, y + 8);
    y += overviewH + 4;

    // Therapeutic objectives
    if (clinicalImpression.therapeuticObjectives?.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      const objLabel = isPt ? "Objetivos Terapêuticos:" : "Therapeutic Objectives:";
      doc.text(objLabel, MARGIN, y + 4);
      y += 8;

      clinicalImpression.therapeuticObjectives.forEach((obj: string) => {
        y = checkPage(doc, y, 8);
        drawBadge(doc, obj, MARGIN + 4, y, COLORS.primary, COLORS.white);
        y += 8;
      });
      y += 2;
    }
    y += 4;
  }

  y = checkPage(doc, y, 10);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // ── Anamnesis Section ──
  if (anamnesisData) {
    y = renderAnamnesisSection(doc, y, anamnesisData, isPt);
  }

  // ── Pain Map ──
  const regions = painRegions || anamnesisData?.painRegions;
  if (regions && regions.length > 0) {
    y = await renderPainMapSection(doc, y, regions, isPt);
  }

  // ── Pain Score (VAS) — uses shared renderer ──
  const vasScore = anamnesisData?.painScore ?? undefined;
  y = renderVasSection(doc, y, isPt, vasScore, anamnesisData);

  // ── Test Results (Questionnaires) ──
  if (testResults) {
    y = renderTestResultsSection(doc, y, testResults, isPt);
  }

  // ── Treatment Plan ──
  if (treatmentPlan) {
    y = checkPage(doc, y, 30);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 8;
    y = renderSectionTitle(doc, y, isPt ? "Plano de Tratamento" : "Treatment Plan", COLORS.primary);

    const phaseConfig: Record<string, {
      label: Record<string, string>;
      color: [number, number, number];
      bg: [number, number, number];
    }> = {
      short_term: {
        label: { pt: "Fase 1 — Curto Prazo", en: "Phase 1 — Short Term" },
        color: COLORS.yellow,
        bg: [255, 248, 230],
      },
      medium_term: {
        label: { pt: "Fase 2 — Médio Prazo", en: "Phase 2 — Medium Term" },
        color: COLORS.primary,
        bg: COLORS.primaryLight,
      },
      long_term: {
        label: { pt: "Fase 3 — Longo Prazo", en: "Phase 3 — Long Term" },
        color: COLORS.green,
        bg: [230, 248, 235],
      },
    };

    for (const phase of treatmentPlan.phases) {
      const pc = phaseConfig[phase.id] || phaseConfig.short_term;
      // Phase header + goal/focus should stay together (min ~45mm)
      y = checkPage(doc, y, 45);

      // Phase header bar
      drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 14, 3, pc.bg, pc.color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...pc.color);
      doc.text(pc.label[language] || pc.label.en, MARGIN + 6, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(phase.duration, PAGE_WIDTH - MARGIN - doc.getTextWidth(phase.duration) - 6, y + 9);
      y += 18;

      // Goal & Focus
      if (phase.goal) {
        y = checkPage(doc, y, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(isPt ? "Objetivo:" : "Goal:", MARGIN + 4, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        const goalLines = doc.splitTextToSize(phase.goal, CONTENT_WIDTH - 30);
        doc.text(goalLines, MARGIN + 28, y);
        y += goalLines.length * 3.5 + 4;
      }

      if (phase.focus) {
        y = checkPage(doc, y, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(isPt ? "Foco:" : "Focus:", MARGIN + 4, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        const focusLines = doc.splitTextToSize(phase.focus, CONTENT_WIDTH - 30);
        doc.text(focusLines, MARGIN + 28, y);
        y += focusLines.length * 3.5 + 4;
      }

      // Exercises
      for (const ex of phase.exercises) {
        y = checkPage(doc, y, 25);

        // Exercise name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(`• ${ex.name}`, MARGIN + 6, y);

        // Category badge
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.muted);
        const catLabel = ex.category.replace(/_/g, " ");
        doc.text(`[${catLabel}]`, MARGIN + 6 + doc.getTextWidth(`• ${ex.name}  `), y);
        y += 4;

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        const descLines = doc.splitTextToSize(ex.description, CONTENT_WIDTH - 14);
        y = checkPage(doc, y, descLines.length * 3.5);
        doc.text(descLines, MARGIN + 10, y);
        y += descLines.length * 3.5 + 2;

        // Sets / Reps / Frequency
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.foreground);
        doc.text(`${ex.sets} × ${ex.reps}  |  ${ex.frequency}`, MARGIN + 10, y);
        y += 6;
      }

      y += 4;
    }

    // General Guidelines
    if (treatmentPlan.generalGuidelines && treatmentPlan.generalGuidelines.length > 0) {
      y = checkPage(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      doc.text(isPt ? "Orientações Gerais" : "General Guidelines", MARGIN, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      for (const g of treatmentPlan.generalGuidelines) {
        y = checkPage(doc, y, 8);
        const gLines = doc.splitTextToSize(`✓ ${g}`, CONTENT_WIDTH - 10);
        doc.text(gLines, MARGIN + 4, y);
        y += gLines.length * 3.5 + 2;
      }
      y += 4;
    }

    // Progression Criteria
    if (treatmentPlan.progressionCriteria) {
      y = checkPage(doc, y, 20);
      y = renderSubSection(doc, y, isPt ? "Critérios de Progressão" : "Progression Criteria", treatmentPlan.progressionCriteria);
    }
  } // end if (treatmentPlan)

  // ── Professional Notes ──
  if (professionalNotes) {
    y = checkPage(doc, y, 30);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 8;
    y = renderSectionTitle(doc, y, isPt ? "Notas do Profissional" : "Professional Notes", COLORS.primary);
    const noteLines = doc.splitTextToSize(professionalNotes, CONTENT_WIDTH - 12);
    const noteH = noteLines.length * 3.5 + 12;
    y = checkPage(doc, y, noteH);
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, noteH, 4, [245, 243, 240], COLORS.border);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(noteLines, MARGIN + 6, y + 8);
    y += noteH + 6;
  }

  // ── Disclaimer ──
  y = checkPage(doc, y, 40);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  const disclaimerText = isPt
    ? "Este relatório foi gerado por um sistema de inteligência artificial e tem caráter exclusivamente informativo e educacional. Ele NÃO substitui uma consulta médica, avaliação fisioterapêutica presencial ou qualquer outro atendimento profissional de saúde. As hipóteses diagnósticas e sugestões de tratamento apresentadas devem ser validadas por um profissional habilitado antes de serem seguidas. Em caso de dor intensa, piora dos sintomas ou qualquer emergência, procure atendimento médico imediatamente."
    : "This report was generated by an artificial intelligence system and is for informational and educational purposes only. It does NOT replace a medical consultation, in-person physiotherapy assessment, or any other professional healthcare. The diagnostic hypotheses and treatment suggestions presented must be validated by a qualified professional before being followed. In case of severe pain, worsening symptoms, or any emergency, seek medical attention immediately.";

  const discLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 12);
  const discH = discLines.length * 3.5 + 14;
  y = checkPage(doc, y, discH);
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, discH, 4, [255, 245, 245], COLORS.red);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.red);
  doc.text(isPt ? "⚠  AVISO IMPORTANTE" : "⚠  IMPORTANT DISCLAIMER", MARGIN + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 80);
  doc.text(discLines, MARGIN + 6, y + 14);

  // ── Footer on every page with logo ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);

    const footerLogoSize = 8;
    let footerTextX = MARGIN;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", MARGIN, 285.5, footerLogoSize, footerLogoSize);
        footerTextX = MARGIN + footerLogoSize + 2;
      } catch { /* fallback */ }
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Aliv.iA — ${isPt ? "Relatório gerado por IA" : "AI-generated report"}`, footerTextX, 290);

    // Professional logo on footer right side
    if (proLogoBase64) {
      try {
        doc.addImage(proLogoBase64, "PNG", PAGE_WIDTH - MARGIN - footerLogoSize, 285.5, footerLogoSize, footerLogoSize);
      } catch { /* fallback */ }
    }

    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - (proLogoBase64 ? footerLogoSize + 10 : 8), 290);
  }

  return doc;
}

// ── Helper: Section Title ──
function renderSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number], extraContentHeight: number = 0): number {
  y = checkPage(doc, y, 14 + extraContentHeight);
  doc.setDrawColor(...color);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, MARGIN + 12, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color);
  doc.text(title, MARGIN + 16, y + 1);
  doc.setLineWidth(0.3);
  return y + 10;
}

// ── Helper: Sub-section with body text ──
function renderSubSection(doc: jsPDF, y: number, title: string, body: string): number {
  // Calculate minimum needed: title + at least 3 lines of body
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(body, CONTENT_WIDTH);
  const minBodyLines = Math.min(lines.length, 3);
  const neededForGroup = 5 + minBodyLines * 3.5 + 6;
  y = checkPage(doc, y, neededForGroup);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(title, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  y = checkPage(doc, y, lines.length * 3.5);
  doc.text(lines, MARGIN, y);
  y += lines.length * 3.5 + 6;
  return y;
}
