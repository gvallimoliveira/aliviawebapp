import jsPDF from "jspdf";
import { regionsByView, type View, type ClickableRegion } from "@/components/assessment/painMapData";

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
}

interface PdfOptions {
  diagnosis: Diagnosis;
  treatmentPlan?: TreatmentPlanData;
  language: "pt" | "en";
  userName?: string;
  anamnesisData?: AnamnesisData;
  painRegions?: string[];
  testResults?: any;
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

  y = checkPage(doc, y, 65);
  y = renderSectionTitle(doc, y, isPt ? "Mapa de Dor" : "Pain Map", COLORS.primary);

  const mapW = 35;
  const mapH = mapW * (440 / 200); // maintain aspect ratio
  const gap = 4;
  const totalW = images.length * mapW + (images.length - 1) * gap;
  let startX = MARGIN + (CONTENT_WIDTH - totalW) / 2;

  y = checkPage(doc, y, mapH + 12);

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
  if (!testResults || (Array.isArray(testResults) && testResults.length === 0)) return y;

  y = checkPage(doc, y, 16);
  y = renderSectionTitle(doc, y, isPt ? "Resultados dos Testes" : "Test Results", COLORS.primary);

  const items = Array.isArray(testResults) ? testResults : [testResults];
  for (const test of items) {
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
      doc.text(String(result), MARGIN + 2 + lw, y);
      y += 5;
    }
  }
  y += 4;
  return y;
}

export async function generateAssessmentPdf({ diagnosis, treatmentPlan, language, userName, anamnesisData, painRegions, testResults }: PdfOptions) {
  const doc = new jsPDF();
  const isPt = language === "pt";
  let y = MARGIN;

  // Load logo
  const logoBase64 = await loadLogoBase64();

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

  // ── Anamnesis Section ──
  if (anamnesisData) {
    y = renderAnamnesisSection(doc, y, anamnesisData, isPt);
  }

  // ── Pain Map ──
  const regions = painRegions || anamnesisData?.painRegions;
  if (regions && regions.length > 0) {
    y = await renderPainMapSection(doc, y, regions, isPt);
  }

  // ── Test Results ──
  if (testResults) {
    y = renderTestResultsSection(doc, y, testResults, isPt);
  }

  // ── Separator before diagnosis ──
  if (anamnesisData || (regions && regions.length > 0)) {
    y = checkPage(doc, y, 10);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 8;
  }

  // ── Diagnosis Section ──
  y = renderSectionTitle(doc, y, isPt ? "Hipótese Diagnóstica" : "Diagnostic Hypothesis", COLORS.primary);

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
      y = checkPage(doc, y, 30);

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
        const gLines = doc.splitTextToSize(`✓ ${g}`, CONTENT_WIDTH - 6);
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

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Aliv.iA — ${isPt ? "Relatório gerado por IA" : "AI-generated report"}`, MARGIN, 290);
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - 8, 290);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, 287, PAGE_WIDTH - MARGIN, 287);
  }

  doc.save(`AliviA_${isPt ? "Relatorio" : "Report"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Helper: Section Title ──
function renderSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number]): number {
  y = checkPage(doc, y, 14);
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
  y = checkPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(title, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const lines = doc.splitTextToSize(body, CONTENT_WIDTH);
  y = checkPage(doc, y, lines.length * 3.5);
  doc.text(lines, MARGIN, y);
  y += lines.length * 3.5 + 6;
  return y;
}
