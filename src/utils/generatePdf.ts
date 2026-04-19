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
  clinicLogoUrl?: string;
  clinicName?: string;
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
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 170mm
// Unified inner padding: all text content uses the same inset as the patient name box (6mm each side)
const SECTION_X = MARGIN + 6;            // left edge for all body text
const SECTION_TEXT_W = CONTENT_WIDTH - 12; // 158mm — max text width for ALL dynamic content
const TEXT_MAX_WIDTH = SECTION_TEXT_W;      // alias kept for backward compat
const LIST_X = MARGIN + 10;               // indented lists / bullets
const LIST_TEXT_W = CONTENT_WIDTH - 16;    // text width for indented items
const PAGE_BOTTOM = 275;                   // max y before forced page break

function checkPage(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > PAGE_BOTTOM) {
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

// ─────────────────────────────────────────────────────────────────────────────
// RIGID TEXT-IN-BOX RENDERER
// ─────────────────────────────────────────────────────────────────────────────
// Root cause of past PDF overflows: text was measured (splitTextToSize) using
// a different font/size than the one used at draw time, so the green/colored
// containers ended up too narrow or too short for the actual rendered text.
//
// These helpers ENFORCE the correct order:
//   1) set font + size  →  2) sanitize  →  3) wrap to actual inner width
//   4) compute exact height  →  5) page-break check  →  6) draw box
//   7) render text inside the box
//
// Use `drawTextCard` for any colored container that holds prose
// (clinical impression, hypothesis, narrative, disclaimer, professional notes).
// ─────────────────────────────────────────────────────────────────────────────

interface TextCardStyle {
  font: "helvetica";
  weight: "normal" | "bold" | "italic" | "bolditalic";
  size: number;
  /** vertical line spacing in mm (per text line) */
  lineHeight: number;
  textColor: [number, number, number];
}

interface TextCardOptions {
  /** outer-left x of the card */
  x?: number;
  /** total card width */
  width?: number;
  /** horizontal inner padding (mm) on each side */
  padX?: number;
  /** vertical inner padding (mm) — top & bottom share this same value */
  padY?: number;
  /** corner radius */
  radius?: number;
  /** background fill */
  fill: [number, number, number];
  /** optional border color */
  stroke?: [number, number, number];
  /** required to guarantee correct measurement at draw-time font */
  body: TextCardStyle;
  /** optional bold label rendered inline before the body */
  label?: { text: string; color: [number, number, number]; size?: number };
  /** extra empty space reserved at the bottom of the box (safety for italic/descenders) */
  bottomSafety?: number;
}

function sanitizePdfText(input: string | undefined | null): string {
  if (!input) return "";
  return String(input)
    // strip zero-width chars
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // normalize line breaks
    .replace(/\r\n?/g, "\n")
    // collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Wrap text using the EXACT font/size that will be used to render it.
 * Always call AFTER `setFont` + `setFontSize` of the body style.
 */
function measureWrappedLines(
  doc: jsPDF,
  text: string,
  innerWidth: number,
  body: TextCardStyle
): string[] {
  doc.setFont(body.font, body.weight);
  doc.setFontSize(body.size);
  const safe = sanitizePdfText(text);
  if (!safe) return [];
  // Use a 0.5mm safety inset on the wrap width so italic/oblique glyphs that
  // visually expand beyond their advance width still stay inside the frame.
  const wrapW = Math.max(10, innerWidth - 0.5);
  const lines = doc.splitTextToSize(safe, wrapW) as string[];
  return Array.isArray(lines) ? lines : [lines];
}

/**
 * Draw a rounded text card whose height is computed from the ACTUAL wrapped
 * text using the body font/size. Returns the new y AFTER the card.
 */
function drawTextCard(
  doc: jsPDF,
  y: number,
  text: string,
  opts: TextCardOptions
): number {
  const x = opts.x ?? MARGIN;
  const width = opts.width ?? CONTENT_WIDTH;
  const padX = opts.padX ?? 8;
  const padY = opts.padY ?? 8;
  const radius = opts.radius ?? 4;
  const safety = opts.bottomSafety ?? 2;

  const innerW = width - padX * 2;

  // Optional inline label sits on its OWN first line above the body,
  // measured with its own size to avoid surprises.
  let labelLines: string[] = [];
  let labelLineH = 0;
  if (opts.label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.label.size ?? Math.max(opts.body.size, 8));
    labelLineH = (opts.label.size ?? Math.max(opts.body.size, 8)) * 0.45 + 1.5;
    labelLines = doc.splitTextToSize(sanitizePdfText(opts.label.text), innerW) as string[];
    if (!Array.isArray(labelLines)) labelLines = [labelLines as unknown as string];
  }

  const bodyLines = measureWrappedLines(doc, text, innerW, opts.body);
  const bodyH = bodyLines.length * opts.body.lineHeight;
  const labelBlockH = labelLines.length > 0 ? labelLines.length * labelLineH + 2 : 0;

  // Total height = top padding + label block + body height + bottom padding + safety
  const totalH = padY + labelBlockH + bodyH + padY + safety;

  // Page break: if the WHOLE card cannot fit on the current page, push it down.
  // (Cards are anti-orphan: no internal split.)
  y = checkPage(doc, y, totalH);

  // 1) Draw container
  drawRoundedRect(doc, x, y, width, totalH, radius, opts.fill, opts.stroke);

  // 2) Render label (if any)
  let cursorY = y + padY;
  if (labelLines.length > 0 && opts.label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.label.size ?? Math.max(opts.body.size, 8));
    doc.setTextColor(...opts.label.color);
    for (const ln of labelLines) {
      // text() y is baseline; bias by ~0.8 of size in mm to align top.
      doc.text(ln, x + padX, cursorY + (opts.label.size ?? 8) * 0.35);
      cursorY += labelLineH;
    }
    cursorY += 2;
  }

  // 3) Render body — REAPPLY font/size right before drawing
  doc.setFont(opts.body.font, opts.body.weight);
  doc.setFontSize(opts.body.size);
  doc.setTextColor(...opts.body.textColor);
  for (let i = 0; i < bodyLines.length; i++) {
    doc.text(bodyLines[i], x + padX, cursorY + opts.body.size * 0.35);
    cursorY += opts.body.lineHeight;
  }

  return y + totalH + 2;
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
  const fields: { label: string; value: string }[] = [];

  if (anamnesis.chiefComplaint) {
    fields.push({ label: isPt ? "Queixa Principal" : "Chief Complaint", value: translateKey(anamnesis.chiefComplaint, isPt) });
  }
  if (anamnesis.customComplaint) {
    fields.push({ label: isPt ? "Queixa Adicional" : "Additional Complaint", value: anamnesis.customComplaint });
  }
  if (anamnesis.onset) {
    fields.push({ label: isPt ? "Modo de Inicio" : "Onset", value: translateKey(anamnesis.onset, isPt) });
  }
  if (anamnesis.painScore != null) {
    fields.push({ label: isPt ? "Nivel de Dor (EVA)" : "Pain Level (VAS)", value: `${anamnesis.painScore}/10` });
  }
  if (anamnesis.painTypes?.length) {
    fields.push({ label: isPt ? "Tipos de Dor" : "Pain Types", value: anamnesis.painTypes.map(p => translateKey(p, isPt)).join(", ") });
  }
  if (anamnesis.evolution) {
    fields.push({ label: isPt ? "Evolucao" : "Evolution", value: translateKey(anamnesis.evolution, isPt) });
  }
  if (anamnesis.painDuration) {
    fields.push({ label: isPt ? "Duracao da Dor" : "Pain Duration", value: translateKey(anamnesis.painDuration, isPt) });
  }
  if (anamnesis.aggravatingFactors) {
    fields.push({ label: isPt ? "Fatores Agravantes" : "Aggravating Factors", value: anamnesis.aggravatingFactors });
  }
  if (anamnesis.relievingFactors) {
    fields.push({ label: isPt ? "Fatores Aliviantes" : "Relieving Factors", value: anamnesis.relievingFactors });
  }
  if (anamnesis.activityLevel) {
    fields.push({ label: isPt ? "Nivel de Atividade" : "Activity Level", value: translateKey(anamnesis.activityLevel, isPt) });
  }
  if (anamnesis.hasGymAccess) {
    fields.push({ label: isPt ? "Acesso a Academia" : "Gym Access", value: translateKey(anamnesis.hasGymAccess, isPt) });
  }
  if (anamnesis.sex) {
    fields.push({ label: isPt ? "Sexo Biologico" : "Biological Sex", value: translateKey(anamnesis.sex, isPt) });
  }
  if (anamnesis.ageRange) {
    fields.push({ label: isPt ? "Faixa Etaria" : "Age Range", value: translateKey(anamnesis.ageRange, isPt) });
  }
  if (anamnesis.painPattern) {
    fields.push({ label: isPt ? "Padrao da Dor" : "Pain Pattern", value: translateKey(anamnesis.painPattern, isPt) });
  }
  if (anamnesis.painWeeklyFrequency) {
    fields.push({ label: isPt ? "Frequencia Semanal" : "Weekly Frequency", value: translateKey(anamnesis.painWeeklyFrequency, isPt) });
  }
  if (anamnesis.painNightWaking) {
    fields.push({ label: isPt ? "Dor Noturna (Acorda)" : "Night Pain (Waking)", value: translateKey(anamnesis.painNightWaking, isPt) });
  }
  if (anamnesis.hasPhotophobia) {
    fields.push({ label: isPt ? "Fotofobia" : "Photophobia", value: translateKey(anamnesis.hasPhotophobia, isPt) });
  }
  if (anamnesis.hasVisualAura) {
    fields.push({ label: isPt ? "Aura Visual" : "Visual Aura", value: translateKey(anamnesis.hasVisualAura, isPt) });
  }
  if (anamnesis.hasNausea) {
    fields.push({ label: isPt ? "Nausea nas Crises" : "Nausea During Episodes", value: translateKey(anamnesis.hasNausea, isPt) });
  }
  if (anamnesis.headacheCrisisFrequency) {
    fields.push({ label: isPt ? "Frequencia de Crises" : "Crisis Frequency", value: translateKey(anamnesis.headacheCrisisFrequency, isPt) });
  }
  if (anamnesis.painRegions?.length) {
    const regionLabels = anamnesis.painRegions.map(id => {
      for (const view of Object.values(regionsByView)) {
        const r = view.find(reg => reg.id === id);
        if (r) return isPt ? r.label_pt : r.label_en;
      }
      return id;
    });
    fields.push({ label: isPt ? "Regioes de Dor" : "Pain Regions", value: regionLabels.join(", ") });
  }
  if (anamnesis.painScoreMode === "per_region" && anamnesis.painScoresPerRegion && Object.keys(anamnesis.painScoresPerRegion).length > 0) {
    const regionScores = Object.entries(anamnesis.painScoresPerRegion)
      .map(([key, score]) => `${translateKey(key, isPt)}: ${score}/10`)
      .join(", ");
    fields.push({ label: isPt ? "Dor por Regiao" : "Pain by Region", value: regionScores });
  }

  if (fields.length === 0) return y;

  // Keep title + first 2 fields together to avoid orphan
  const firstFieldsH = Math.min(fields.length, 2) * 12;
  y = checkPage(doc, y, 14 + firstFieldsH);
  y = renderSectionTitle(doc, y, isPt ? "Anamnese" : "Anamnesis", COLORS.primary);

  for (const field of fields) {
    y = checkPage(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.foreground);
    const labelText = `${field.label}: `;
    doc.text(labelText, SECTION_X, y);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    const availW = SECTION_TEXT_W - labelW;
    const valueLines = doc.splitTextToSize(field.value, availW > 30 ? availW : SECTION_TEXT_W);
    if (availW > 30) {
      doc.text(valueLines, SECTION_X + labelW, y);
    } else {
      y += 3.5;
      doc.text(valueLines, SECTION_X + 4, y);
    }
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
      const qDef = questionnaires.find(qd => qd.id === q.questionnaireId);
      const qName = q.questionnaireName || q.questionnaireId.toUpperCase();
      const fullName = qDef ? (isPt ? qDef.fullName_pt : qDef.fullName_en) : "";
      const pct = Math.round(q.percentageScore);
      const severity = q.severity || "";
      const interpretation = isPt ? (q.interpretation_pt || severity) : (q.interpretation_en || severity);
      const entries = q.subscaleScores && typeof q.subscaleScores === "object" ? Object.entries(q.subscaleScores) : [];
      const hasSubscales = entries.length > 1;

      // Pre-compute text lines for accurate height estimation
      const interpLines = interpretation ? doc.splitTextToSize(interpretation, TEXT_MAX_WIDTH - 8) : [];
      const fullNameLines = fullName ? doc.splitTextToSize(fullName, TEXT_MAX_WIDTH - 40) : [];
      const subscaleRows = hasSubscales ? Math.ceil(entries.length / 2) : 0;
      const cardH = 12 + (fullNameLines.length * 3.5) + (interpLines.length * 3.5 + 1) + (subscaleRows * 4.5 + (hasSubscales ? 1 : 0)) + (qDef ? 4 : 0) + 6;
      y = checkPage(doc, y, cardH + 4);

      const cardStartY = y - 2;

      // Abbreviated name (bold, larger)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.foreground);
      doc.text(qName, MARGIN + 5, y + 2);

      // Percentage on the right, large and colored
      const sevColor: [number, number, number] =
        severity === "minimal" ? COLORS.green :
        severity === "mild" ? [60, 130, 200] as [number, number, number] :
        severity === "moderate" ? COLORS.yellow : COLORS.red;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...sevColor);
      const pctText = `${pct}%`;
      const pctW = doc.getTextWidth(pctText);
      doc.text(pctText, MARGIN + CONTENT_WIDTH - 5 - pctW, y + 3);
      y += 6;

      // Full name (muted, smaller)
      if (fullNameLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(fullNameLines, MARGIN + 5, y);
        y += fullNameLines.length * 3.5;
      }

      // Interpretation (colored)
      if (interpLines.length > 0) {
        y += 1;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...sevColor);
        doc.text(interpLines, MARGIN + 5, y);
        y += interpLines.length * 3.5;
      }

      // Subscale scores — 2-column grid (no page break inside card)
      if (hasSubscales) {
        y += 1;
        doc.setFontSize(7);
        const colW = (TEXT_MAX_WIDTH - 8) / 2;
        for (let i = 0; i < entries.length; i += 2) {
          for (let col = 0; col < 2 && i + col < entries.length; col++) {
            const [key, score] = entries[i + col];
            const label = qDef?.subscaleLabels?.[key]
              ? (isPt ? qDef.subscaleLabels[key].pt : qDef.subscaleLabels[key].en)
              : key;
            const xPos = MARGIN + 5 + col * colW;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.muted);
            const labelText = label + ":";
            const truncLabel = doc.getTextWidth(labelText) > colW - 12
              ? labelText.substring(0, 18) + "…:"
              : labelText;
            doc.text(truncLabel, xPos, y);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.foreground);
            doc.text(`${score}%`, xPos + colW - 12, y);
          }
          y += 4.5;
        }
      }

      // Scale note (italic, muted)
      if (qDef) {
        y += 0.5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(160, 155, 148);
        const scaleNote = qDef.scoringDirection === "higher_better"
          ? (isPt ? "Escala: 100% = melhor | 0% = pior" : "Scale: 100% = best | 0% = worst")
          : (isPt ? "Escala: 0% = melhor | 100% = pior" : "Scale: 0% = best | 100% = worst");
        doc.text(scaleNote, MARGIN + 5, y);
        y += 3;
      }

      // Draw card border (stroke only, no fill to avoid covering text)
      const cardFinalH = y - (cardStartY) + 2;
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, cardStartY, CONTENT_WIDTH, cardFinalH, 2, 2, "S");

      y += 5;
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
        doc.text(`${name}: `, SECTION_X, y);
        const lw = doc.getTextWidth(`${name}: `);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        const availW = SECTION_TEXT_W - lw;
        const resultLines = doc.splitTextToSize(String(result), availW > 30 ? availW : SECTION_TEXT_W);
        doc.text(resultLines, SECTION_X + lw, y);
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

  // Hypothesis card — RIGID layout (measure with the SAME font used to render)
  y = drawTextCard(doc, y, options.diagnosis.hypothesis, {
    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 8,
    padY: 7,
    body: { font: "helvetica", weight: "bold", size: 11, lineHeight: 5, textColor: COLORS.primary },
  });
  y += 2;

  // Confidence badge — only show for high confidence
  if (options.diagnosis.confidence === "high") {
    const confLabel = isPt ? "Confiança: Alta" : "Confidence: High";
    drawBadge(doc, confLabel.toUpperCase(), MARGIN, y + 4, COLORS.green, COLORS.white);
    y += 12;
  }

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
        ? `+ Questionario ${q.name} - ${q.fullName_pt.replace(/\s*\(.*\)/, '')}`
        : `+ ${q.name} questionnaire - ${q.fullName_en.replace(/\s*\(.*\)/, '')}`)
    : [isPt
        ? "+ Questionarios validados cientificamente para sua condicao"
        : "+ Scientifically validated questionnaires for your condition"];

  const bulletsPt = [
    "+ Explicacao clinica detalhada do seu quadro",
    "+ Raciocinio clinico baseado em evidencias cientificas",
    "+ Recomendacoes personalizadas para o seu caso",
    "+ Plano de tratamento completo em 3 fases progressivas",
    "+ Exercicios com series, repeticoes e progressao",
  ];
  const bulletsEn = [
    "+ Detailed clinical explanation of your condition",
    "+ Evidence-based clinical reasoning",
    "+ Personalized recommendations for your case",
    "+ Complete 3-phase progressive treatment plan",
    "+ Exercises with sets, reps and progression",
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

  // Disclaimer — RIGID layout
  const disclaimerText = isPt
    ? "Este relatório foi gerado por um sistema de inteligência artificial e tem caráter exclusivamente informativo e educacional. Ele NÃO substitui uma consulta médica ou avaliação fisioterapêutica presencial. Em caso de dor intensa ou piora dos sintomas, procure atendimento médico imediatamente."
    : "This report was generated by an artificial intelligence system and is for informational and educational purposes only. It does NOT replace a medical consultation or in-person physiotherapy assessment. In case of severe pain or worsening symptoms, seek medical attention immediately.";
  y = drawTextCard(doc, y, disclaimerText, {
    fill: [255, 245, 245],
    stroke: COLORS.red,
    padX: 6,
    padY: 6,
    label: { text: isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", color: COLORS.red, size: 8 },
    body: { font: "helvetica", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
    bottomSafety: 1,
  });

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

async function _buildPdfDoc({ diagnosis, treatmentPlan, language, userName, anamnesisData, painRegions, testResults, professionalNotes, professionalLogoUrl, clinicLogoUrl, clinicName }: PdfOptions): Promise<jsPDF> {
  const doc = new jsPDF();
  const isPt = language === "pt";
  let y = MARGIN;

  // Load logos — clinic logo replaces Aliv.iA logo when present
  const isClinicBranded = !!clinicLogoUrl;
  const logoBase64 = isClinicBranded ? await loadExternalImageAsBase64(clinicLogoUrl) : await loadLogoBase64();
  const proLogoBase64 = (!isClinicBranded && professionalLogoUrl) ? await loadExternalImageAsBase64(professionalLogoUrl) : null;

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
  doc.text(isClinicBranded && clinicName ? clinicName : "Aliv.iA", textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(isPt ? "Relatório Clínico Personalizado" : "Personalized Clinical Report", textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);

  // Professional logo in top-right of header (only if NOT clinic-branded)
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

  // Hypothesis card — RIGID
  y = drawTextCard(doc, y, diagnosis.hypothesis, {
    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 8,
    padY: 7,
    body: { font: "helvetica", weight: "bold", size: 11, lineHeight: 5, textColor: COLORS.primary },
  });
  y += 2;

  // Confidence badge — only show for high confidence
  if (diagnosis.confidence === "high") {
    const confLabel = isPt ? "Confiança: Alta" : "Confidence: High";
    drawBadge(doc, confLabel.toUpperCase(), MARGIN, y + 4, COLORS.green, COLORS.white);
    y += 12;
  }

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
    y += 6;

    // Overview in rounded box — RIGID (italic 9; lineHeight 4.5; safety for italic descenders)
    y = drawTextCard(doc, y, clinicalImpression.overview, {
      fill: COLORS.primaryLight,
      stroke: COLORS.primary,
      padX: 8,
      padY: 7,
      body: { font: "helvetica", weight: "italic", size: 9, lineHeight: 4.5, textColor: COLORS.foreground },
      bottomSafety: 2,
    });
    y += 1;

    // Therapeutic objectives
    if (clinicalImpression.therapeuticObjectives?.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      const objLabel = isPt ? "Objetivos Terapêuticos:" : "Therapeutic Objectives:";
      doc.text(objLabel, MARGIN, y + 4);
      y += 8;

      clinicalImpression.therapeuticObjectives.forEach((obj: string) => {
        y = checkPage(doc, y, 10);
        // If objective text is too long for a badge, wrap it
        doc.setFontSize(7);
        const objW = doc.getTextWidth(obj) + 8; // badge padding
        if (objW > TEXT_MAX_WIDTH) {
          const objLines = doc.splitTextToSize(obj, TEXT_MAX_WIDTH - 12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...COLORS.primary);
          doc.text(objLines, MARGIN + 6, y);
          y += objLines.length * 3.5 + 2;
        } else {
          drawBadge(doc, obj, MARGIN + 4, y, COLORS.primary, COLORS.white);
          y += 8;
        }
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
    // RIGID RULE: Title + first phase header MUST stay together (no orphan title).
    // Reserve: divider(8) + title(14) + phase header(18) + goal+focus min(24) = 64mm
    y = checkPage(doc, y, 64);
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

      // Goal & Focus — RIGID: label on its own line indent, value wraps fully within SECTION_TEXT_W
      if (phase.goal) {
        const labelGoal = isPt ? "Objetivo:" : "Goal:";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const labelGoalW = doc.getTextWidth(labelGoal + " ");
        const goalLines = doc.splitTextToSize(phase.goal, SECTION_TEXT_W - labelGoalW - 2);
        y = checkPage(doc, y, goalLines.length * 3.5 + 4);
        doc.setTextColor(...COLORS.foreground);
        doc.text(labelGoal, SECTION_X, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(goalLines, SECTION_X + labelGoalW + 2, y);
        y += goalLines.length * 3.5 + 4;
      }

      if (phase.focus) {
        const labelFocus = isPt ? "Foco:" : "Focus:";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const labelFocusW = doc.getTextWidth(labelFocus + " ");
        const focusLines = doc.splitTextToSize(phase.focus, SECTION_TEXT_W - labelFocusW - 2);
        y = checkPage(doc, y, focusLines.length * 3.5 + 4);
        doc.setTextColor(...COLORS.foreground);
        doc.text(labelFocus, SECTION_X, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(focusLines, SECTION_X + labelFocusW + 2, y);
        y += focusLines.length * 3.5 + 4;
      }

      // Exercises
      for (const ex of phase.exercises) {
        // Pre-compute heights to keep entire exercise block together
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const exNameFull = `- ${ex.name}`;
        const nameLines = doc.splitTextToSize(exNameFull, LIST_TEXT_W);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const descLines = doc.splitTextToSize(ex.description, LIST_TEXT_W - 4);
        const blockH = nameLines.length * 3.8 + 4 + descLines.length * 3.5 + 6;
        y = checkPage(doc, y, blockH);

        // Exercise name — always on its own line(s); category badge BELOW name to avoid overlap
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(nameLines, LIST_X, y);
        y += nameLines.length * 3.8;

        // Category badge on its own line, indented (small, muted, no measurement overlap risk)
        const catLabel = ex.category.replace(/_/g, " ");
        const catBadgeText = `[${catLabel}]`;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.muted);
        doc.text(catBadgeText, LIST_X + 4, y);
        y += 3.5;

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(descLines, LIST_X + 4, y);
        y += descLines.length * 3.5 + 2;

        // Sets / Reps / Frequency
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.foreground);
        const setsRepsText = `${ex.sets} x ${ex.reps}  |  ${ex.frequency}`;
        const srLines = doc.splitTextToSize(setsRepsText, LIST_TEXT_W - 4);
        doc.text(srLines, LIST_X + 4, y);
        y += srLines.length * 3.5 + 3;
      }

      y += 4;
    }

    // General Guidelines
    if (treatmentPlan.generalGuidelines && treatmentPlan.generalGuidelines.length > 0) {
      // Keep title + first guideline together
      y = checkPage(doc, y, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      doc.text(isPt ? "Orientacoes Gerais" : "General Guidelines", SECTION_X, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      for (const g of treatmentPlan.generalGuidelines) {
        y = checkPage(doc, y, 8);
        const gLines = doc.splitTextToSize(`- ${g}`, LIST_TEXT_W);
        doc.text(gLines, LIST_X, y);
        y += gLines.length * 3.5 + 2;
      }
      y += 4;
    }

    // Progression Criteria
    if (treatmentPlan.progressionCriteria) {
      y = checkPage(doc, y, 20);
      y = renderSubSection(doc, y, isPt ? "Criterios de Progressao" : "Progression Criteria", treatmentPlan.progressionCriteria);
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
    y = drawTextCard(doc, y, professionalNotes, {
      fill: [245, 243, 240],
      stroke: COLORS.border,
      padX: 6,
      padY: 7,
      body: { font: "helvetica", weight: "italic", size: 8, lineHeight: 4, textColor: COLORS.muted },
      bottomSafety: 2,
    });
    y += 4;
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

  y = drawTextCard(doc, y, disclaimerText, {
    fill: [255, 245, 245],
    stroke: COLORS.red,
    padX: 6,
    padY: 6,
    label: { text: isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", color: COLORS.red, size: 8 },
    body: { font: "helvetica", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
    bottomSafety: 1,
  });

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
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(body, SECTION_TEXT_W);
  const minBodyLines = Math.min(lines.length, 3);
  const neededForGroup = 5 + minBodyLines * 3.5 + 6;
  y = checkPage(doc, y, neededForGroup);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(title, SECTION_X, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  y = checkPage(doc, y, lines.length * 3.5);
  doc.text(lines, SECTION_X, y);
  y += lines.length * 3.5 + 6;
  return y;
}

// ── Evolution Report PDF ──
export interface EvolutionSummary {
  narrative: string;
  painChange: string;
  questionnaireChanges?: { name: string; firstScore: number; lastScore: number; changePercent: number }[];
  conclusion: string;
  recommendation: "discharge" | "continue" | "reassess";
}

export interface EvolutionPdfOptions {
  patientName: string;
  firstAssessment: {
    date: string;
    pain_score: number | null;
    pain_regions: string[];
    test_results: any;
    hypothesis?: string;
  };
  lastAssessment: {
    date: string;
    pain_score: number | null;
    pain_regions: string[];
    test_results: any;
    hypothesis?: string;
  };
  totalAssessments: number;
  summary: EvolutionSummary;
  language: string;
  professionalLogoUrl?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
}

export async function generateEvolutionPdfBlob(options: EvolutionPdfOptions): Promise<Blob> {
  const doc = new jsPDF();
  const isPt = options.language === "pt";
  const isEs = options.language === "es";
  let y = MARGIN;

  // Load logos — clinic logo replaces Aliv.iA logo when present
  const isClinicBranded = !!options.clinicLogoUrl;
  const logoBase64 = isClinicBranded ? await loadExternalImageAsBase64(options.clinicLogoUrl!) : await loadLogoBase64();
  const proLogoBase64 = (!isClinicBranded && options.professionalLogoUrl) ? await loadExternalImageAsBase64(options.professionalLogoUrl) : null;

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
    } catch { /* fallback */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  const titleY = logoY + logoH / 2 + 2;
  doc.text(isClinicBranded && options.clinicName ? options.clinicName : "Aliv.iA", textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const reportTitle = isPt ? "Relatório de Evolução" : isEs ? "Informe de Evolución" : "Evolution Report";
  doc.text(reportTitle, textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : isEs ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);

  if (proLogoBase64) {
    try {
      doc.addImage(proLogoBase64, "PNG", PAGE_WIDTH - MARGIN - logoW, logoY, logoW, logoH);
    } catch { /* fallback */ }
  }
  y = 48;

  // ── Patient Info + Period ──
  const firstDate = new Date(options.firstAssessment.date).toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  const lastDate = new Date(options.lastAssessment.date).toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  const periodText = `${firstDate} → ${lastDate} (${options.totalAssessments} ${isPt ? "avaliações" : isEs ? "evaluaciones" : "assessments"})`;

  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 20, 4, COLORS.background, COLORS.border);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  const pLabel = isPt ? "Paciente: " : "Patient: ";
  doc.text(pLabel, MARGIN + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(options.patientName, MARGIN + 6 + doc.getTextWidth(pLabel), y + 8);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(periodText, MARGIN + 6, y + 15);
  y += 26;

  // ── Pain Score Comparison ──
  const firstScore = options.firstAssessment.pain_score;
  const lastScore = options.lastAssessment.pain_score;
  if (firstScore != null && lastScore != null) {
    y = renderSectionTitle(doc, y, isPt ? "Comparativo de Dor (EVA)" : "Pain Comparison (VAS)", COLORS.primary);

    const colW = CONTENT_WIDTH / 2 - 4;
    const boxH = 28;

    // First assessment box
    drawRoundedRect(doc, MARGIN, y, colW, boxH, 4, COLORS.background, COLORS.border);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(isPt ? "1ª Avaliação" : "1st Assessment", MARGIN + 6, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const firstColor: [number, number, number] = firstScore <= 3 ? COLORS.green : firstScore <= 6 ? COLORS.yellow : COLORS.red;
    doc.setTextColor(...firstColor);
    doc.text(`${firstScore}/10`, MARGIN + 6, y + 22);

    // Last assessment box
    const lastX = MARGIN + colW + 8;
    drawRoundedRect(doc, lastX, y, colW, boxH, 4, COLORS.background, COLORS.border);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(isPt ? "Última Avaliação" : "Last Assessment", lastX + 6, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const lastColor: [number, number, number] = lastScore <= 3 ? COLORS.green : lastScore <= 6 ? COLORS.yellow : COLORS.red;
    doc.setTextColor(...lastColor);
    doc.text(`${lastScore}/10`, lastX + 6, y + 22);

    y += boxH + 4;

    // Change indicator
    const diff = firstScore - lastScore;
    const improved = diff > 0;
    const worsened = diff < 0;
    const changeBg: [number, number, number] = improved ? [230, 250, 235] : worsened ? [255, 235, 235] : [245, 243, 240];
    const changeFg: [number, number, number] = improved ? COLORS.green : worsened ? COLORS.red : COLORS.muted;
    const changeText = improved
      ? (isPt ? `↓ Melhora de ${diff} pontos` : `↓ Improvement of ${diff} points`)
      : worsened
      ? (isPt ? `↑ Piora de ${Math.abs(diff)} pontos` : `↑ Worsening of ${Math.abs(diff)} points`)
      : (isPt ? "— Estável" : "— Stable");

    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 10, 3, changeBg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...changeFg);
    doc.text(changeText, MARGIN + 6, y + 7);
    y += 16;
  }

  // ── Questionnaire Comparison ──
  const firstTests = normalizeTestResults(options.firstAssessment.test_results);
  const lastTests = normalizeTestResults(options.lastAssessment.test_results);
  const firstQ = firstTests.filter((t: any) => t.questionnaireId && t.percentageScore != null);
  const lastQ = lastTests.filter((t: any) => t.questionnaireId && t.percentageScore != null);

  if (firstQ.length > 0 || lastQ.length > 0) {
    y = renderSectionTitle(doc, y, isPt ? "Questionários Funcionais" : "Functional Questionnaires", COLORS.primary);

    // Find questionnaires present in both
    const matched: { name: string; firstPct: number; lastPct: number; change: number }[] = [];
    const onlyFirst: string[] = [];
    const onlyLast: string[] = [];

    for (const fq of firstQ) {
      const lq = lastQ.find((l: any) => l.questionnaireId === fq.questionnaireId);
      if (lq) {
        const fp = Math.round(fq.percentageScore);
        const lp = Math.round(lq.percentageScore);
        matched.push({ name: fq.questionnaireName || fq.questionnaireId.toUpperCase(), firstPct: fp, lastPct: lp, change: lp - fp });
      } else {
        onlyFirst.push(fq.questionnaireName || fq.questionnaireId.toUpperCase());
      }
    }
    for (const lq of lastQ) {
      if (!firstQ.find((f: any) => f.questionnaireId === lq.questionnaireId)) {
        onlyLast.push(lq.questionnaireName || lq.questionnaireId.toUpperCase());
      }
    }

    // Render matched questionnaires table
    if (matched.length > 0) {
      const headerLabels = [
        isPt ? "Questionário" : "Questionnaire",
        isPt ? "1ª Aval." : "1st",
        isPt ? "Última" : "Last",
        isPt ? "Variação" : "Change",
      ];
      const colWidths = [CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.18, CONTENT_WIDTH * 0.18, CONTENT_WIDTH * 0.24];

      // Table header
      y = checkPage(doc, y, 10 + matched.length * 8);
      drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 8, 2, COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      let cx = MARGIN + 4;
      for (let i = 0; i < headerLabels.length; i++) {
        doc.text(headerLabels[i], cx, y + 5.5);
        cx += colWidths[i];
      }
      y += 9;

      // Table rows
      for (const row of matched) {
        y = checkPage(doc, y, 8);
        const rowBg: [number, number, number] = matched.indexOf(row) % 2 === 0 ? COLORS.background : COLORS.white;
        drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 7, 0, rowBg);

        cx = MARGIN + 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.foreground);
        doc.text(row.name, cx, y + 5);
        cx += colWidths[0];

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(`${row.firstPct}%`, cx, y + 5);
        cx += colWidths[1];
        doc.text(`${row.lastPct}%`, cx, y + 5);
        cx += colWidths[2];

        const changeColor: [number, number, number] = row.change < 0 ? COLORS.green : row.change > 0 ? COLORS.red : COLORS.muted;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...changeColor);
        const sign = row.change > 0 ? "+" : "";
        doc.text(`${sign}${row.change}%`, cx, y + 5);

        y += 7;
      }
      y += 4;
    }

    // Exclusive questionnaires
    if (onlyFirst.length > 0 || onlyLast.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      if (onlyFirst.length > 0) {
        const text = `${isPt ? "Aplicado apenas na 1ª avaliação" : "Applied only in 1st assessment"}: ${onlyFirst.join(", ")}`;
        y = checkPage(doc, y, 5);
        doc.text(text, SECTION_X, y);
        y += 5;
      }
      if (onlyLast.length > 0) {
        const text = `${isPt ? "Aplicado apenas na última avaliação" : "Applied only in last assessment"}: ${onlyLast.join(", ")}`;
        y = checkPage(doc, y, 5);
        doc.text(text, SECTION_X, y);
        y += 5;
      }
      y += 4;
    }
  }

  // ── Pain Regions Comparison ──
  const firstRegions = options.firstAssessment.pain_regions || [];
  const lastRegions = options.lastAssessment.pain_regions || [];
  if (firstRegions.length > 0 || lastRegions.length > 0) {
    y = renderSectionTitle(doc, y, isPt ? "Regiões de Dor" : "Pain Regions", COLORS.primary);

    const resolved = firstRegions.filter(r => !lastRegions.includes(r));
    const newRegions = lastRegions.filter(r => !firstRegions.includes(r));
    const persistent = firstRegions.filter(r => lastRegions.includes(r));

    const regionLabel = (id: string) => {
      for (const view of Object.values(regionsByView)) {
        const r = view.find(reg => reg.id === id);
        if (r) return isPt ? r.label_pt : r.label_en;
      }
      return id;
    };

    if (resolved.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.green);
      doc.text(isPt ? "✓ Resolvidas:" : "✓ Resolved:", SECTION_X, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const resolvedText = resolved.map(regionLabel).join(", ");
      const resolvedLines = doc.splitTextToSize(resolvedText, TEXT_MAX_WIDTH);
      doc.text(resolvedLines, SECTION_X + 4, y);
      y += resolvedLines.length * 3.5 + 3;
    }

    if (newRegions.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.red);
      doc.text(isPt ? "✗ Novas:" : "✗ New:", SECTION_X, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      const newText = newRegions.map(regionLabel).join(", ");
      const newLines = doc.splitTextToSize(newText, TEXT_MAX_WIDTH);
      doc.text(newLines, SECTION_X + 4, y);
      y += newLines.length * 3.5 + 3;
    }

    if (persistent.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(isPt ? "— Mantidas:" : "— Persistent:", SECTION_X, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const persistText = persistent.map(regionLabel).join(", ");
      const persistLines = doc.splitTextToSize(persistText, TEXT_MAX_WIDTH);
      doc.text(persistLines, SECTION_X + 4, y);
      y += persistLines.length * 3.5 + 3;
    }

    y += 4;
  }

  // ── AI Narrative Summary ──
  y = renderSectionTitle(doc, y, isPt ? "Resumo Narrativo (IA)" : "AI Narrative Summary", COLORS.primary);
  y = drawTextCard(doc, y, options.summary.narrative, {
    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 6,
    padY: 7,
    body: { font: "helvetica", weight: "italic", size: 8, lineHeight: 4, textColor: COLORS.foreground },
    bottomSafety: 2,
  });
  y += 4;

  // ── Conclusion + Recommendation Badge ──
  y = renderSectionTitle(doc, y, isPt ? "Conclusão" : "Conclusion", COLORS.primary);
  const conclusionLines = doc.splitTextToSize(options.summary.conclusion, TEXT_MAX_WIDTH);
  y = checkPage(doc, y, conclusionLines.length * 3.5 + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(conclusionLines, SECTION_X, y);
  y += conclusionLines.length * 3.5 + 6;

  // Recommendation badge
  const recMap: Record<string, { label: string; bg: [number, number, number]; fg: [number, number, number] }> = {
    discharge: {
      label: isPt ? "RECOMENDAÇÃO: ALTA" : "RECOMMENDATION: DISCHARGE",
      bg: COLORS.green,
      fg: COLORS.white,
    },
    continue: {
      label: isPt ? "RECOMENDAÇÃO: CONTINUAR TRATAMENTO" : "RECOMMENDATION: CONTINUE TREATMENT",
      bg: COLORS.yellow,
      fg: COLORS.white,
    },
    reassess: {
      label: isPt ? "RECOMENDAÇÃO: REAVALIAR" : "RECOMMENDATION: REASSESS",
      bg: [60, 130, 200] as [number, number, number],
      fg: COLORS.white,
    },
  };
  const rec = recMap[options.summary.recommendation] || recMap.continue;
  drawBadge(doc, rec.label, MARGIN, y + 4, rec.bg, rec.fg);
  y += 16;

  // ── Disclaimer ──
  y = checkPage(doc, y, 40);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;
  const disclaimerText = isPt
    ? "Este relatório de evolução foi gerado por inteligência artificial com base nos dados das avaliações realizadas. Tem caráter informativo e educacional, não substituindo avaliação presencial. As conclusões devem ser validadas por um profissional habilitado."
    : "This evolution report was generated by artificial intelligence based on assessment data. It is for informational and educational purposes only, and does not replace in-person evaluation. Conclusions must be validated by a qualified professional.";
  y = drawTextCard(doc, y, disclaimerText, {
    fill: [255, 245, 245],
    stroke: COLORS.red,
    padX: 6,
    padY: 6,
    label: { text: isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", color: COLORS.red, size: 8 },
    body: { font: "helvetica", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
    bottomSafety: 1,
  });

  // ── Footer ──
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
    doc.text(`Aliv.iA — ${isPt ? "Relatório de Evolução" : "Evolution Report"}`, footerTextX, 290);

    if (proLogoBase64) {
      try {
        doc.addImage(proLogoBase64, "PNG", PAGE_WIDTH - MARGIN - footerLogoSize, 285.5, footerLogoSize, footerLogoSize);
      } catch { /* fallback */ }
    }
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - (proLogoBase64 ? footerLogoSize + 10 : 8), 290);
  }

  return doc.output("blob");
}

// Helper normalize for evolution PDF
function normalizeTestResults(tr: any): any[] {
  if (Array.isArray(tr)) return tr;
  if (tr && typeof tr === "object" && Object.keys(tr).length > 0) return [tr];
  return [];
}
