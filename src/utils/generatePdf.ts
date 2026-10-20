import { getAllRegions } from "@/components/assessment/painMapData";
import { isPreventiveAssessment, type PurposeData } from "@/lib/assessmentPurpose";
import { preventionGoalLabels } from "@/components/assessment/AssessmentPurposeFields";
import jsPDF from "jspdf";
import { applyPdfBranding, pdfBrandPalette } from "@/lib/pdfBranding";
import { regionsByView, type View, type ClickableRegion } from "@/components/assessment/painMapData";
import { questionnaires, getApplicableQuestionnaires } from "@/data/questionnaireData";
import { functionalTests } from "@/data/functionalTestsData";
import ptLocale from "@/locales/pt.json";
import enLocale from "@/locales/en.json";
import esLocale from "@/locales/es.json";
import { formatHealthConditions, formatContinuousMedication } from "@/lib/healthHistory";
import { normalizeMovementKey, pickMovementLabel, parseMeasurementValue } from "@/lib/movementNormalize";
import { registerInterFonts } from "./fonts/registerInterFonts";
import { emptyStar, evaluateSpine, hasSpineContent, type MaigneAxis, type SpineBiomechanicsData } from "@/lib/spineBiomechanics";
import { MAIGNE_CENTER, MAIGNE_ENDS, savedSpineExams } from "@/lib/spinePresentation";
import {
  MECHANISM_CRITERIA,
  getMechanismLabel,
  getMechanismLay,
  getMechanismTechnical,
  getSubtypeLabel,
  parseStoredMechanism,
} from "@/lib/painMechanism";

/**
 * Resolves the display name of a functional test (id → i18n name), so the PDF
 * "Test Results" section is never blank when the assessment only stored
 * `{ testId, painful }` entries.
 */
function resolveFunctionalTestName(testId: string, isPt: boolean, lang?: string): string {
  const def = functionalTests.find((t) => t.id === testId);
  const dict = (lang === "es" ? esLocale : isPt ? ptLocale : enLocale) as Record<string, string>;
  if (def && dict[def.nameKey]) return dict[def.nameKey];
  return testId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


/**
 * Creates a new jsPDF document with the embedded Inter font family registered.
 * Always use this instead of `new jsPDF()` so that text renders consistently
 * across every PDF viewer (avoids the Standard-14 Helvetica substitution bug
 * that produces visible character gaps in bold text).
 */
function createPdfDoc(): jsPDF {
  const doc = new jsPDF();
  registerInterFonts(doc);
  doc.setFont("Inter", "normal");
  return doc;
}

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
  /** Diagnósticos diferenciais considerados (só entra no PDF quando includeInPdf). */
  differentialDiagnosis?: {
    differentials?: Array<{
      hypothesis?: string;
      plausibility?: string;
      competesBecause?: string;
      arguesAgainst?: string | null;
      discriminators?: string[];
      whyItMatters?: string;
      referralFlag?: boolean;
    }>;
    includeInPdf?: boolean;
    generatedAt?: string;
  } | null;
}

interface AnamnesisData extends PurposeData {
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
  /** Joint mobility / Range of Motion table (manual assessment). */
  romTable?: Array<{ joint: string; leftValue: string; rightValue: string }>;
  spineBiomechanics?: SpineBiomechanicsData;
  /** Dynamometry / muscle strength table (manual assessment). Values in kgf. */
  strengthTable?: Array<{
    movement: string;
    leftValue: string;
    rightValue: string;
    unit?: string;
    leftTrials?: Array<{ value: string; timeToPeak?: string }>;
    rightTrials?: Array<{ value: string; timeToPeak?: string }>;
  }>;
  /** Free-text clinical history (manual assessment anamnesis). */
  history?: string;
  /** Free-text complementary exams (imaging, lab, etc.). */
  complementaryExams?: string;
  /** Source of the assessment — "external_upload" indicates AI-interpreted external document. */
  source?: string;
  /** Free-text content from the external file that didn't map to native fields. */
  additionalExternalInfo?: string;
  /** Field names that were filled by AI from external upload (badge metadata). */
  aiInterpretedFields?: string[];
  /** Reference to the original uploaded file (patient_files row id). */
  externalSourceFileId?: string;
}

export interface ResponsibleProfessional {
  name: string;
  crefito?: string;
  /** Optional signature image as data URL (PNG with transparent bg).
   *  When present, rendered above the signature line. */
  signatureImageDataUrl?: string;
  /** Student access flag. When true, PDF shows "Alivia Acadêmico" disclaimer
   *  instead of CREFITO and adds a top banner identifying the academic report. */
  isStudent?: boolean;
  studentInstitution?: string;
  studentPeriod?: string;
}

interface PdfOptions {
  diagnosis: Diagnosis;
  /** Passo E2 — triagem de mecanismo de dor (jsonb). Fallback: diagnosis.pain_mechanism. */
  painMechanism?: unknown;
  /** % de superfície corporal com dor (assessments.pain_extent). */
  painExtent?: number | null;
  /** When set, replaces the AI hypothesis with the professional override. */
  finalHypothesis?: string;
  treatmentPlan?: TreatmentPlanData;
  language: string;
  userName?: string;
  anamnesisData?: AnamnesisData;
  painRegions?: string[];
  testResults?: any;
  /** Red flags detected during assessment (assessment.red_flags?.detected). */
  redFlags?: string[];
  /** When set, indicates the red flag was professionally dismissed (medical clearance). */
  redFlagsDismissal?: { at?: string; by?: string; reason?: string } | null;
  /** Full Q&A audit (assessment.red_flags?.answers) — rendered as a probatory table. */
  redFlagAnswers?: Array<{ key?: string; question: string; answer: "yes" | "no" }>;
  /** ISO timestamp when the red-flag screening was completed (assessment.red_flags?.answered_at). */
  redFlagsAnsweredAt?: string;
  professionalNotes?: string;
  /** Adendos ("informações adicionais") registrados após a avaliação. */
  addenda?: Array<{ content: string; created_at: string; author_type?: string; author_name?: string | null }>;
  professionalLogoUrl?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
  brandColor?: string;
  /** Technical responsible (name + CREFITO) printed above the footer. */
  responsibleProfessional?: ResponsibleProfessional;
}

/** Renders the "Responsável Técnico" signature block above the footer.
 *  Adds a new page if there isn't enough vertical room. Async because we
 *  measure the signature image to preserve its aspect ratio. */
async function drawResponsibleBlock(
  doc: jsPDF,
  y: number,
  isPt: boolean,
  prof: ResponsibleProfessional
): Promise<number> {
  const hasSignature = !!prof.signatureImageDataUrl;
  // Measure signature once so we know how much vertical room to reserve
  const sigBoxMaxW = 60;
  const sigBoxMaxH = 18;
  let sigDrawW = 0;
  let sigDrawH = 0;
  if (hasSignature) {
    const dims = await _measureImage(prof.signatureImageDataUrl!);
    const fit = fitContain(dims.natW, dims.natH, sigBoxMaxW, sigBoxMaxH);
    sigDrawW = fit.w;
    sigDrawH = fit.h;
  }
  const blockHeight = hasSignature ? (sigDrawH + 28) : 26;
  // Footer line is at y=284 — keep a 6mm buffer so credentials never touch it
  const SAFE_BOTTOM = 276;
  if (y + blockHeight > SAFE_BOTTOM) {
    doc.addPage();
    y = MARGIN;
  } else {
    y += 6;
  }

  const lineW = 80;
  const lineX = (PAGE_WIDTH - lineW) / 2;

  // Embed signature image (aspect-ratio preserved) just above the line
  if (hasSignature && sigDrawW > 0) {
    const imgX = (PAGE_WIDTH - sigDrawW) / 2;
    try {
      doc.addImage(prof.signatureImageDataUrl!, "PNG", imgX, y, sigDrawW, sigDrawH, undefined, "FAST");
    } catch {
      // ignore image errors and fall back to text block
    }
    y += sigDrawH + 1;
  }

  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.4);
  doc.line(lineX, y, lineX + lineW, y);
  y += 4.5;

  doc.setFont("Inter", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(prof.name || (isPt ? "Responsável Técnico" : "Technical Responsible"), PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  let credentialTxt: string;
  if (prof.isStudent) {
    const pieces = ["Alivia Acadêmico"];
    if (prof.studentInstitution) pieces.push(prof.studentInstitution);
    if (prof.studentPeriod) pieces.push(prof.studentPeriod);
    credentialTxt = pieces.join(" · ");
  } else {
    credentialTxt = prof.crefito
      ? `CREFITO: ${prof.crefito}`
      : (isPt ? "CREFITO não cadastrado" : "CREFITO not registered");
  }
  credentialTxt = truncateToWidth(doc, credentialTxt, CONTENT_WIDTH - 4);
  doc.text(credentialTxt, PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  const today = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US");
  doc.text(
    isPt ? `Relatório emitido em ${today}` : `Report issued on ${today}`,
    PAGE_WIDTH / 2,
    y,
    { align: "center" }
  );
  y += 4;
  return y;
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
  doc.setFont("Inter", "bold");
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
  font: "Inter";
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
 * Height a card WILL occupy (same math as drawTextCard) without drawing it.
 * Used to keep a section title glued to its card (anti-orphan titles).
 */
function measureTextCardHeight(doc: jsPDF, text: string, opts: TextCardOptions): number {
  const width = opts.width ?? CONTENT_WIDTH;
  const padX = opts.padX ?? 8;
  const padY = opts.padY ?? 8;
  const safety = opts.bottomSafety ?? 2;
  const innerW = width - padX * 2;
  let labelBlockH = 0;
  if (opts.label) {
    const size = opts.label.size ?? Math.max(opts.body.size, 8);
    doc.setFont("Inter", "bold");
    doc.setFontSize(size);
    let labelLines = doc.splitTextToSize(sanitizePdfText(opts.label.text), innerW) as string[];
    if (!Array.isArray(labelLines)) labelLines = [labelLines as unknown as string];
    labelBlockH = labelLines.length * (size * 0.45 + 1.5) + 2;
  }
  const bodyH = measureWrappedLines(doc, text, innerW, opts.body).length * opts.body.lineHeight;
  return padY + labelBlockH + bodyH + padY + safety;
}

/**
 * Breaks the page BEFORE a title when the title + its card would not fit
 * together, so a heading never ends up alone at the bottom of a page.
 * Never breaks when the card alone is taller than a full page.
 */
function keepTitleWithCard(
  doc: jsPDF,
  y: number,
  titleH: number,
  text: string,
  opts: TextCardOptions,
): number {
  const cardH = measureTextCardHeight(doc, text, opts);
  const pageCapacity = PAGE_BOTTOM - MARGIN;
  const needed = titleH + Math.min(cardH, pageCapacity - titleH);
  return checkPage(doc, y, needed);
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
    doc.setFont("Inter", "bold");
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
    doc.setFont("Inter", "bold");
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

/**
 * Renders the "Red Flags" warning card used in both basic-blob and full PDF
 * variants. Returns the y position right after the card (or the original `y`
 * when there are no flags). Non-blocking by design: when a professional
 * supervised the assessment, red flags are documented but do NOT terminate
 * the report flow.
 */
function renderRedFlagsCard(
  doc: jsPDF,
  y: number,
  redFlags: string[] | undefined,
  isPt: boolean,
  dismissal?: { at?: string; by?: string; reason?: string } | null
): number {
  if (!redFlags || redFlags.length === 0) return y;
  const isDismissed = !!dismissal?.at;
  const title = isPt
    ? (isDismissed ? "Sinais de Alerta (Red Flags) — Dispensada" : "Sinais de Alerta (Red Flags)")
    : (isDismissed ? "Warning Signs (Red Flags) — Dismissed" : "Warning Signs (Red Flags)");
  const note = isDismissed
    ? (isPt
        ? `Dispensada em ${dismissal?.at ? new Date(dismissal.at).toLocaleDateString("pt-BR") : "—"} por ${dismissal?.by || "—"}.${dismissal?.reason ? ` Motivo: ${dismissal.reason}` : ""} A hipótese fisioterapêutica foi liberada para uso clínico.`
        : `Dismissed on ${dismissal?.at ? new Date(dismissal.at).toLocaleDateString("en-US") : "—"} by ${dismissal?.by || "—"}.${dismissal?.reason ? ` Reason: ${dismissal.reason}` : ""} The physiotherapy hypothesis was released for clinical use.`)
    : (isPt
        ? "ATENÇÃO: identificados durante a avaliação. A hipótese fisioterapêutica abaixo fica SOB RESSALVA e NÃO deve ser usada para definir conduta até avaliação e liberação médica do(s) item(ns) acima."
        : "ATTENTION: identified during the assessment. The physiotherapy hypothesis below is UNDER RESERVATION and must NOT guide treatment until medical evaluation and clearance of the item(s) above.");
  const bullets = redFlags.map((rf) => `• ${rf}`).join("\n");
  const body = `${bullets}\n\n${note}`;
  y = checkPage(doc, y, 30);
  y += 2;
  return drawTextCard(doc, y, body, {
    fill: isDismissed ? [220, 240, 252] : [253, 232, 220],
    stroke: isDismissed ? COLORS.primary : COLORS.yellow,
    padX: 8,
    padY: 7,
    body: { font: "Inter", weight: "normal", size: 9, lineHeight: 4.5, textColor: COLORS.foreground },
    label: { text: title, color: isDismissed ? COLORS.primary : COLORS.yellow, size: 10 },
  });
}

/**
 * Renders a probatory Q&A table for the red-flag screening.
 * Used to prove the user consciously answered each safety question before
 * the assessment continued (or before payment). Renders even when no flag
 * was triggered, so the report always documents the screening took place.
 */
function renderRedFlagsAuditTable(
  doc: jsPDF,
  y: number,
  answers: Array<{ key?: string; question: string; answer: "yes" | "no" }> | undefined,
  answeredAt: string | undefined,
  isPt: boolean,
): number {
  if (!answers || answers.length === 0) return y;

  const title = isPt
    ? "Registro da Triagem de Sinais de Alerta"
    : "Safety Screening Record";
  const subtitle = isPt
    ? "Perguntas e respostas confirmadas pelo paciente. Documento probatório do preenchimento."
    : "Questions and answers confirmed by the patient. Probatory record of completion.";
  const yesLabel = isPt ? "SIM" : "YES";
  const noLabel = isPt ? "NÃO" : "NO";

  // Keep the title together with the subtitle and the first rows
  y = checkPage(doc, y, 58);
  y += 4;
  y = renderSectionTitle(doc, y, title, COLORS.foreground);

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const dateText = answeredAt
    ? (isPt
        ? `Preenchido em ${new Date(answeredAt).toLocaleString("pt-BR")}`
        : `Completed on ${new Date(answeredAt).toLocaleString("en-US")}`)
    : "";
  doc.text(subtitle, SECTION_X, y);
  y += 4;
  if (dateText) {
    doc.text(dateText, SECTION_X, y);
    y += 5;
  } else {
    y += 1;
  }

  const qWidth = SECTION_TEXT_W - 22;
  const answerColX = SECTION_X + qWidth + 4;
  doc.setFont("Inter", "normal");
  doc.setFontSize(9);

  answers.forEach((entry, i) => {
    const isYes = entry.answer === "yes";
    const number = `${i + 1}.`;
    const lines = doc.splitTextToSize(`${number} ${entry.question}`, qWidth);
    const rowH = Math.max(7, lines.length * 4.2 + 3);
    y = checkPage(doc, y, rowH + 2);

    // Row background — light yellow when YES, neutral when NO
    drawRoundedRect(
      doc,
      MARGIN,
      y,
      CONTENT_WIDTH,
      rowH,
      2,
      isYes ? [253, 244, 220] : [250, 248, 244],
      COLORS.border,
    );
    doc.setTextColor(...COLORS.foreground);
    doc.text(lines, SECTION_X, y + 4.5);

    // Answer badge
    drawBadge(
      doc,
      isYes ? yesLabel : noLabel,
      answerColX,
      y + 4.7,
      isYes ? COLORS.red : COLORS.green,
      COLORS.white,
    );
    y += rowH + 1.5;
  });

  return y + 3;
}



export type BrandImage = { dataUrl: string; natW: number; natH: number };

async function _blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function _measureImage(dataUrl: string): Promise<{ natW: number; natH: number }> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => resolve({ natW: img.naturalWidth || 1, natH: img.naturalHeight || 1 });
      img.onerror = () => resolve({ natW: 1, natH: 1 });
      img.src = dataUrl;
    } catch {
      resolve({ natW: 1, natH: 1 });
    }
  });
}

async function loadLogoBase64(): Promise<BrandImage | null> {
  try {
    const { default: logoUrl } = await import("@/assets/logo-alivia.png");
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    const dataUrl = await _blobToDataUrl(blob);
    if (!dataUrl) return null;
    const { natW, natH } = await _measureImage(dataUrl);
    return { dataUrl, natW, natH };
  } catch {
    return null;
  }
}

export async function loadExternalImageAsBase64(url: string): Promise<BrandImage | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await _blobToDataUrl(blob);
    if (!dataUrl) return null;
    const { natW, natH } = await _measureImage(dataUrl);
    return { dataUrl, natW, natH };
  } catch {
    return null;
  }
}

/** Compute width/height that fits inside maxW × maxH while preserving the
 *  source aspect ratio. Returned dims are anchored to the top-left. */
function fitContain(natW: number, natH: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / Math.max(natW, 1), maxH / Math.max(natH, 1));
  return { w: natW * ratio, h: natH * ratio };
}

/** Draws a brand logo inside the given bounding box without distorting it.
 *  Returns the actual rendered width (so callers can offset text). */
export function drawBrandLogo(
  doc: jsPDF,
  img: BrandImage,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: "left" | "right" = "left",
): number {
  const { w, h } = fitContain(img.natW, img.natH, maxW, maxH);
  const drawX = align === "right" ? x + (maxW - w) : x;
  const drawY = y + (maxH - h) / 2; // vertically centered in the box
  try {
    doc.addImage(img.dataUrl, "PNG", drawX, drawY, w, h, undefined, "FAST");
  } catch {
    /* ignore */
  }
  return w;
}

/** Truncates text to fit within maxW at the current font size using an ellipsis. */
function truncateToWidth(doc: jsPDF, text: string, maxW: number): string {
  if (!text) return text;
  if (doc.getTextWidth(text) <= maxW) return text;
  const ell = "…";
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + ell) > maxW) {
    t = t.slice(0, -1);
  }
  return t.replace(/[\s·]+$/, "") + ell;
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
    "anamnesis.complaint.arm_pain": ["Dor no braço", "Arm pain"],
    "anamnesis.complaint.hand_pain": ["Dor na mão", "Hand pain"],
    "anamnesis.complaint.foot_pain": ["Dor no pé", "Foot pain"],
    "anamnesis.complaint.headache": ["Cefaleia", "Headache"],
    "anamnesis.onset.sudden": ["Início súbito", "Sudden onset"],
    "anamnesis.onset.gradual": ["Início gradual", "Gradual onset"],
    "anamnesis.onset.trauma": ["Trauma / Lesão", "Trauma / Injury"],
    "anamnesis.onset.post_surgery": ["Pós-operatório", "Post-operative"],
    "anamnesis.pain_type.local": ["Dor local", "Local pain"],
    "anamnesis.pain_type.radiating": ["Dor irradiada", "Radiating pain"],
    "anamnesis.pain_type.burning": ["Queimação", "Burning"],
    "anamnesis.pain_type.tingling": ["Formigamento", "Tingling"],
    "anamnesis.pain_type.throbbing": ["Latejante", "Throbbing"],
    "anamnesis.pain_type.stabbing": ["Pontada", "Stabbing"],
    "anamnesis.evolution.improving": ["Melhorando", "Improving"],
    "anamnesis.evolution.stable": ["Estável", "Stable"],
    "anamnesis.evolution.worsening": ["Piorando", "Worsening"],
    "anamnesis.evolution.fluctuating": ["Oscilando", "Fluctuating"],
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
  // Fallback: bare values like "sudden"/"gradual"/"trauma" stored by manual assessment
  const suffix = "." + key;
  for (const k of Object.keys(map)) {
    if (k.endsWith(suffix)) return isPt ? map[k][0] : map[k][1];
  }
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

    const pathsSvg = selectedInView.map(r =>
      `<path d="${r.d}" fill="rgba(220, 50, 50, 0.45)" stroke="rgba(200, 40, 40, 0.8)" stroke-width="1.5"/>`
    ).join("\n");

    try {
      const dataUrl = await composePainMapPng(imgBase64, pathsSvg);
      const viewLabels: Record<string, string> = { front: "Frontal", back: "Posterior", left: "Lat. Esq.", right: "Lat. Dir." };
      results.push({ view: viewLabels[view] || view, dataUrl });
    } catch (e) {
      console.error(`Error rendering pain map view ${view}:`, e);
    }
  }

  return results;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/**
 * Composes the body silhouette + selected pain regions into a single PNG.
 * The background photo is drawn directly onto the canvas (never nested inside
 * the SVG), because Safari/iOS refuses to rasterize <image href="data:..."/>
 * inside an SVG loaded through an <img> tag — which made the body disappear
 * from the PDF and left only the red region visible.
 */
async function composePainMapPng(bodyDataUrl: string | null, pathsSvg: string): Promise<string> {
  const SCALE = 3;
  const W = 200;
  const H = 440;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(SCALE, SCALE);

  // 1) Body photo
  if (bodyDataUrl) {
    try {
      const bodyImg = await loadHtmlImage(bodyDataUrl);
      ctx.drawImage(bodyImg, 0, 0, W, H);
    } catch (e) {
      console.error("Pain map: body image failed, rendering regions only", e);
    }
  }

  // 2) Region overlay (paths only – always rasterizes reliably)
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${pathsSvg}</svg>`;
  const overlayUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(overlaySvg)}`;
  try {
    const overlayImg = await loadHtmlImage(overlayUrl);
    ctx.drawImage(overlayImg, 0, 0, W, H);
  } catch (e) {
    console.error("Pain map: overlay rasterization failed", e);
  }

  return canvas.toDataURL("image/png");
}


// ── Render Anamnesis Section ──
function renderAnamnesisSection(doc: jsPDF, y: number, anamnesis: AnamnesisData, isPt: boolean, language = isPt ? "pt" : "en"): number {
  const fields: { label: string; value: string }[] = [];
  if (isPreventiveAssessment(anamnesis)) {
    fields.push({ label: isPt ? "Finalidade" : language === "es" ? "Finalidad" : "Purpose", value: isPt ? "Avaliação preventiva — sem dor atual" : language === "es" ? "Evaluación preventiva — sin dolor actual" : "Preventive assessment — no current pain" });
    if (anamnesis.preventionGoals?.length) fields.push({ label: isPt ? "Objetivos" : language === "es" ? "Objetivos" : "Goals", value: preventionGoalLabels(anamnesis.preventionGoals, language === "es" ? "es" : isPt ? "pt" : "en") });
    if (anamnesis.preventionGoalDetails) fields.push({ label: isPt ? "Objetivo descrito" : language === "es" ? "Objetivo descrito" : "Goal details", value: anamnesis.preventionGoalDetails });
    if (anamnesis.historyRegions?.length) fields.push({ label: isPt ? "Histórico / regiões de atenção (não dolorosas)" : language === "es" ? "Historia / regiones de atención (no dolorosas)" : "History / attention sites (not painful)", value: anamnesis.historyRegions.map(id => getAllRegions()[id]?.[isPt ? "label_pt" : "label_en"] || id).join(", ") });
  }

  if (anamnesis.chiefComplaint) {
    fields.push({ label: isPt ? "Queixa Principal" : "Chief Complaint", value: translateKey(anamnesis.chiefComplaint, isPt) });
  }
  if (anamnesis.customComplaint && anamnesis.customComplaint !== anamnesis.chiefComplaint) {
    fields.push({ label: isPt ? "Queixa Adicional" : "Additional Complaint", value: anamnesis.customComplaint });
  }
  if (anamnesis.onset) {
    fields.push({ label: isPt ? "Modo de Inicio" : "Onset", value: translateKey(anamnesis.onset, isPt) });
  }
  const _healthLang = isPt ? "pt" : "en";
  const _healthConditions = formatHealthConditions(anamnesis, _healthLang);
  if (_healthConditions) {
    fields.push({ label: isPt ? "Condicoes de Saude" : "Health Conditions", value: _healthConditions });
  }
  const _continuousMed = formatContinuousMedication(anamnesis, _healthLang);
  if (_continuousMed) {
    fields.push({ label: isPt ? "Medicacao de Uso Continuo" : "Continuous Medication", value: _continuousMed });
  }
  if (!isPreventiveAssessment(anamnesis) && anamnesis.painScore != null) {
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
  if (!isPreventiveAssessment(anamnesis) && anamnesis.painRegions?.length) {
    const regionLabels = anamnesis.painRegions.map(id => {
      for (const view of Object.values(regionsByView)) {
        const r = view.find(reg => reg.id === id);
        if (r) return isPt ? r.label_pt : r.label_en;
      }
      return id;
    });
    fields.push({ label: isPt ? "Regioes de Dor" : "Pain Regions", value: regionLabels.join(", ") });
  }
  if (!isPreventiveAssessment(anamnesis) && anamnesis.painScoreMode === "per_region" && anamnesis.painScoresPerRegion && Object.keys(anamnesis.painScoresPerRegion).length > 0) {
    const regionScores = Object.entries(anamnesis.painScoresPerRegion)
      .map(([key, score]) => `${painRegionLabel(key, isPt)}: ${score}/10`)
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
    doc.setFont("Inter", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.foreground);
    const labelText = `${field.label}: `;
    doc.text(labelText, SECTION_X, y);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("Inter", "normal");
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

  // Long-text blocks (Histórico, Exames complementares) rendered below the grid
  const longBlocks: { label: string; value: string }[] = [];
  if (anamnesis.history) {
    longBlocks.push({ label: isPt ? "Histórico" : "History", value: anamnesis.history });
  }
  if (anamnesis.complementaryExams) {
    longBlocks.push({ label: isPt ? "Exames Complementares" : "Complementary Exams", value: anamnesis.complementaryExams });
  }
  for (const block of longBlocks) {
    y += 2;
    y = checkPage(doc, y, 14);
    doc.setFont("Inter", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.foreground);
    doc.text(`${block.label}:`, SECTION_X, y);
    y += 4;
    doc.setFont("Inter", "normal");
    doc.setTextColor(...COLORS.muted);
    const lines = doc.splitTextToSize(block.value, SECTION_TEXT_W);
    for (const line of lines) {
      y = checkPage(doc, y, 5);
      doc.text(line, SECTION_X, y);
      y += 3.8;
    }
    y += 1;
  }

  y += 4;
  return y;
}

// ── Render Joint Mobility / ROM Table ──
// ── Render Specialty / Psychosocial Questionnaires (FABQ, mMRC, TUG…) ──
function renderSpecialtyResultsSection(doc: jsPDF, y: number, results: any[], isPt: boolean): number {
  const items = (results || []).filter((r) => r && r.score && typeof r.score.total === "number");
  if (items.length === 0) return y;

  y = checkPage(doc, y, 26);
  y = renderSectionTitle(
    doc,
    y,
    isPt ? "Questionários Complementares" : "Complementary Questionnaires",
    COLORS.primary,
  );

  for (const it of items) {
    const name = it.questionnaireName || it.questionnaireId || "";
    // Psychosocial instruments (e.g. FABQ) are reported as raw scores only.
    // No interpretive text / risk flags in the PDF — that stays in the clinician's record.
    const isPsychosocial = it.domain === "psychosocial";
    const interp = isPsychosocial
      ? ""
      : isPt
        ? (it.score.interpretation_pt || "")
        : (it.score.interpretation_en || "");
    const subs: any[] = Array.isArray(it.score.subscores) ? it.score.subscores : [];

    y = checkPage(doc, y, 14 + subs.length * 4.5);
    doc.setFont("Inter", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.foreground);
    doc.text(`${name}: ${it.score.total}/${it.score.max}`, SECTION_X, y);
    y += 4;

    for (const sub of subs) {
      doc.setFont("Inter", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...(!isPsychosocial && sub.high ? COLORS.red : COLORS.muted));
      const label = isPt ? sub.label_pt : sub.label_en;
      const cut = !isPsychosocial && sub.cutoff != null
        ? ` (${isPt ? "corte" : "cut-off"} ${sub.cutoff}${sub.high ? (isPt ? " — acima" : " — above") : ""})`
        : "";
      doc.text(`• ${label}: ${sub.total}/${sub.max}${cut}`, SECTION_X + 2, y);
      y += 4;
    }

    if (interp) {
      doc.setFont("Inter", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      const lines = doc.splitTextToSize(interp, SECTION_TEXT_W);
      y = checkPage(doc, y, lines.length * 3.6 + 2);
      doc.text(lines, SECTION_X, y);
      y += lines.length * 3.6 + 2;
    }
    y += 1.5;
  }


  y += 3;
  return y;
}

function renderRomTableSection(
  doc: jsPDF,
  y: number,
  rows: Array<{ joint: string; leftValue: string; rightValue: string }> | undefined,
  isPt: boolean,
  language: string,
  caption?: string,
): number {
  if (!rows || rows.length === 0) return y;
  const cleaned = rows
    .map((r) => ({
      joint: (r?.joint || "").trim(),
      leftValue: (r?.leftValue || "").trim(),
      rightValue: (r?.rightValue || "").trim(),
    }))
    .filter((r) => r.joint || r.leftValue || r.rightValue);
  if (cleaned.length === 0) return y;

  const title =
    language === "es"
      ? "Movilidad articular y flexibilidad"
      : isPt
        ? "Mobilidade articular e flexibilidade"
        : "Joint mobility and flexibility";
  const colJoint =
    language === "es" ? "Articulación / Movimiento" : isPt ? "Articulação / Movimento" : "Joint / Movement";
  const colLeft = language === "es" ? "Izquierda" : isPt ? "Esquerda" : "Left";
  const colRight = language === "es" ? "Derecha" : isPt ? "Direita" : "Right";

  // Reserve space for title + header + 2 rows to avoid orphan
  y = checkPage(doc, y, 14 + 8 + 16 + (caption ? 5 : 0));
  y = renderSectionTitle(doc, y, title, COLORS.primary);
  if (caption) {
    doc.setFont("Inter", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(caption, SECTION_X, y + 1);
    y += 5;
  }

  // Column widths within SECTION_TEXT_W (158mm)
  const valueColW = 28;
  const jointColW = SECTION_TEXT_W - valueColW * 2;
  const xJoint = SECTION_X;
  const xLeft = SECTION_X + jointColW;
  const xRight = SECTION_X + jointColW + valueColW;
  const headerH = 7;

  // Header row
  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, headerH, 1.5, COLORS.primaryLight, COLORS.border);
  doc.setFont("Inter", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text(colJoint, xJoint, y + 4.8);
  doc.text(colLeft, xLeft + valueColW / 2, y + 4.8, { align: "center" });
  doc.text(colRight, xRight + valueColW / 2, y + 4.8, { align: "center" });
  y += headerH;




  doc.setFont("Inter", "normal");
  doc.setFontSize(9);

  cleaned.forEach((r, i) => {
    const jointLines = doc.splitTextToSize(r.joint || "—", jointColW - 3);
    const rowH = Math.max(7, jointLines.length * 4.2 + 2.5);
    y = checkPage(doc, y, rowH + 1);

    // Zebra background
    drawRoundedRect(
      doc,
      MARGIN,
      y,
      CONTENT_WIDTH,
      rowH,
      0.8,
      i % 2 === 1 ? [248, 246, 242] : COLORS.white,
      COLORS.border,
    );

    doc.setTextColor(...COLORS.foreground);
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.text(jointLines, xJoint, y + 4.5);

    doc.setFont("Inter", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(r.leftValue || "—", xLeft + valueColW / 2, y + 4.5, { align: "center" });
    doc.text(r.rightValue || "—", xRight + valueColW / 2, y + 4.5, { align: "center" });

    y += rowH + 0.5;
  });

  return y + 4;
}

/** Saved exam, shared by assessment and evolution reports; never requires ROM rows. */
export function renderSpineBiomechanicsSection(doc: jsPDF, y: number, data: SpineBiomechanicsData | undefined, language: string, date?: string): number {
  if (!data || !hasSpineContent(data)) return y;
  const pt = language === "pt", es = language === "es";
  const title = pt ? "Estrela de Maigne" : es ? "Estrella de Maigne" : "Maigne star";
  y = checkPage(doc, y, 74);
  y = renderSectionTitle(doc, y, title, COLORS.primary);
  const region = data.region === "thoracic" ? (pt ? "Torácica" : es ? "Torácica" : "Thoracic") : data.region === "lumbar" ? "Lumbar" : data.region === "cervical" ? "Cervical" : "";
  const caption = [date ? new Date(date).toLocaleDateString(pt ? "pt-BR" : es ? "es-ES" : "en-US") : "", region, data.level].filter(Boolean).join(" · ");
  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const captionLines = doc.splitTextToSize(caption, SECTION_TEXT_W);
  doc.text(captionLines, SECTION_X, y + 2);
  y += captionLines.length * 4 + 4;
  y = checkPage(doc, y, 55);
  const scale = 0.21, x = SECTION_X, top = y;
  const star = data.star || emptyStar();
  const cx = x + MAIGNE_CENTER.x * scale, cy = top + MAIGNE_CENTER.y * scale;
  for (const axis of Object.keys(MAIGNE_ENDS) as MaigneAxis[]) {
    const e = MAIGNE_ENDS[axis];
    const n = Math.max(0, Math.min(3, Math.floor(star[axis] || 0)));
    const dx = e.x - MAIGNE_CENTER.x, dy = e.y - MAIGNE_CENTER.y;
    const length = Math.hypot(dx, dy), px = -dy / length, py = dx / length;
    doc.setDrawColor(...(n ? COLORS.red : COLORS.primary));
    doc.setLineWidth(n ? 0.6 : 0.4);
    doc.line(cx, cy, x + e.x * scale, top + e.y * scale);
    for (let i = 0; i < n; i++) {
      const t = 0.55 + i * 0.12;
      const tx = cx + dx * t * scale, ty = cy + dy * t * scale;
      doc.line(tx + px * 8 * scale, ty + py * 8 * scale, tx - px * 8 * scale, ty - py * 8 * scale);
    }
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.foreground);
    doc.text(e.main, x + e.lx * scale, top + e.ly * scale);
    if (e.sub) {
      doc.setFontSize(7);
      doc.text(e.sub, x + e.lx * scale + doc.getTextWidth(e.main) + 0.4, top + e.ly * scale + 1);
    }
  }
  y += 54;
  const p = data.palpation || {};
  const side = (v: string | null | undefined) => v === "right" ? (pt ? "D posterior" : es ? "D posterior" : "R posterior") : v === "left" ? (pt ? "E posterior" : es ? "I posterior" : "L posterior") : v === "none" ? (pt ? "Nivelados" : es ? "Nivelados" : "Level") : "—";
  const behavior = (v: string | null | undefined) => v === "levels" ? (pt ? "Nivela (indolor)" : es ? "Se nivela (sin dolor)" : "Levels (painless)") : v === "worsens" ? (pt ? "Acentua (dor/limitação)" : es ? "Acentúa (dolor/limitación)" : "Worsens (pain/limitation)") : v === "unchanged" ? (pt ? "Sem alteração" : es ? "Sin cambios" : "Unchanged") : "—";
  if (p.neutral || p.extension || p.flexion) {
    y = renderSubSection(doc, y, pt ? "Teste palpatório — 3 posições" : es ? "Prueba palpatoria — 3 posiciones" : "Palpation — 3 positions",
      `${pt ? "Neutro" : es ? "Neutro" : "Neutral"}: ${side(p.neutral)}. ${pt ? "Extensão" : es ? "Extensión" : "Extension"}: ${behavior(p.extension)}. ${pt ? "Flexão" : es ? "Flexión" : "Flexion"}: ${behavior(p.flexion)}.`);
  }
  const h = evaluateSpine(data);
  if (h.summary && pt) y = renderSubSection(doc, y, "Hipótese biomecânica revisável", h.summary);
  if (h.label && !pt) y = renderSubSection(doc, y, es ? "Hipótesis biomecánica revisable" : "Revisable biomechanical hypothesis", `${h.classification} — ${h.side === "right" ? (es ? "Derecha" : "Right") : (es ? "Izquierda" : "Left")}`);
  if (data.notes?.trim()) y = renderSubSection(doc, y, pt ? "Observações" : es ? "Observaciones" : "Notes", data.notes);
  return renderSubSection(doc, y, pt ? "Ressalva clínica" : es ? "Advertencia clínica" : "Clinical caveat", pt ? "Hipótese clínica revisável; não substitui red flags nem exame neurológico." : es ? "Hipótesis clínica revisable; no sustituye la evaluación de señales de alarma ni el examen neurológico." : "Revisable clinical hypothesis; does not replace red-flag screening or neurological examination.");
}

// ── Longitudinal evolution charts (ROM / dynamometry) ──
export interface LongitudinalPoint {
  dateLabel: string;
  esq: number | null;
  dir: number | null;
}
export interface LongitudinalSeries {
  label: string;
  points: LongitudinalPoint[];
}

interface LongitudinalAssessmentInput {
  date: string;
  romTable?: Array<{ joint: string; leftValue: string; rightValue: string }>;
  strengthTable?: Array<{
    movement: string;
    leftValue: string;
    rightValue: string;
    leftTrials?: Array<{ value: string }>;
    rightTrials?: Array<{ value: string }>;
  }>;
}

/**
 * Groups ROM or dynamometry rows across assessments into per-movement dated
 * series. Movement labels are normalized (normalizeMovementKey) so spelling
 * variants/abbreviations share one series — same rule as the dashboard charts.
 * Only movements with 2+ points carrying a numeric value are returned.
 */
export function buildLongitudinalSeries(
  assessments: LongitudinalAssessmentInput[],
  kind: "rom" | "strength",
  locale: string,
): LongitudinalSeries[] {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? ""
      : dt.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "2-digit" });
  };
  const sideMean = (
    value: string | undefined,
    trials: Array<{ value: string }> | undefined,
  ): number | null => {
    const nums = (trials || [])
      .map((t) => parseFloat(String(t?.value ?? "").replace(",", ".")))
      .filter((n) => isFinite(n) && n > 0);
    if (nums.length > 0) return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
    return parseMeasurementValue(value);
  };

  const map = new Map<string, { labels: string[]; points: LongitudinalPoint[] }>();
  assessments
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((a) => {
      const rows =
        kind === "rom"
          ? (a.romTable || []).map((r) => ({
              name: (r?.joint || "").trim(),
              esq: parseMeasurementValue(r?.leftValue),
              dir: parseMeasurementValue(r?.rightValue),
            }))
          : (a.strengthTable || []).map((r) => ({
              name: (r?.movement || "").trim(),
              esq: sideMean(r?.leftValue, r?.leftTrials),
              dir: sideMean(r?.rightValue, r?.rightTrials),
            }));
      rows.forEach((r) => {
        if (!r.name) return;
        const key = normalizeMovementKey(r.name) || r.name.toLowerCase();
        const entry = map.get(key) || { labels: [], points: [] };
        entry.labels.push(r.name);
        entry.points.push({ dateLabel: fmt(a.date), esq: r.esq, dir: r.dir });
        map.set(key, entry);
      });
    });

  const out: LongitudinalSeries[] = [];
  map.forEach((entry) => {
    const numericCount = entry.points.filter((p) => p.esq != null || p.dir != null).length;
    if (numericCount >= 2) {
      out.push({ label: pickMovementLabel(entry.labels), points: entry.points });
    }
  });
  return out;
}

/**
 * Draws one longitudinal line-chart card (Esq solid × Dir dashed) with a
 * caption stating the first/last measurement dates of that movement.
 */
function renderLongitudinalChartCard(
  doc: jsPDF,
  y: number,
  series: LongitudinalSeries,
  unit: string,
  isPt: boolean,
  language: string,
): number {
  const numericPoints = series.points.filter((p) => p.esq != null || p.dir != null);
  if (numericPoints.length < 2) return y;

  const esLbl = language === "es" ? "Izq" : isPt ? "Esq" : "Left";
  const dirLbl = language === "es" ? "Der" : isPt ? "Dir" : "Right";

  const cardH = 56;
  y = checkPage(doc, y, cardH + 4);
  const cardTop = y;
  drawRoundedRect(doc, MARGIN, cardTop, CONTENT_WIDTH, cardH, 2, COLORS.white, COLORS.border);

  // Movement label
  doc.setFont("Inter", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.foreground);
  doc.text(truncateToWidth(doc, series.label, CONTENT_WIDTH - 12), SECTION_X, cardTop + 5.5);

  // Caption: first/last measurement dates of this movement
  const firstLbl = language === "es" ? "Primera medición" : isPt ? "Primeira medição" : "First measurement";
  const lastLbl = language === "es" ? "Última" : isPt ? "Última" : "Last";
  doc.setFont("Inter", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `${firstLbl}: ${numericPoints[0].dateLabel} · ${lastLbl}: ${numericPoints[numericPoints.length - 1].dateLabel}`,
    SECTION_X,
    cardTop + 9.5,
  );

  // Plot geometry
  const plotX = MARGIN + 18;
  const plotW = CONTENT_WIDTH - 18 - 8;
  const plotTop = cardTop + 13;
  const plotH = 28;

  const values = series.points.flatMap((p) => [p.esq, p.dir]).filter((v): v is number => v != null);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  let min = dataMin;
  let max = dataMax;
  if (min === max) {
    min -= 2;
    max += 2;
  }
  const spanPad = (max - min) * 0.12;
  min -= spanPad;
  max += spanPad;
  const xFor = (i: number) =>
    plotX + (series.points.length === 1 ? plotW / 2 : (i / (series.points.length - 1)) * plotW);
  const yFor = (v: number) => plotTop + plotH - ((v - min) / (max - min)) * plotH;

  // Gridlines at data min / mid / max, with y-axis labels
  doc.setFont("Inter", "normal");
  doc.setFontSize(5.5);
  [dataMin, (dataMin + dataMax) / 2, dataMax].forEach((gv) => {
    const gy = yFor(gv);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.15);
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${Math.round(gv * 10) / 10}${unit}`, plotX - 1.5, gy + 1.5, { align: "right" });
  });

  // Lines (nulls skipped, segments connect across gaps — mirrors the UI chart)
  const drawSide = (key: "esq" | "dir", color: [number, number, number], dashed: boolean) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.7);
    doc.setLineDashPattern(dashed ? [1.6, 1.1] : [], 0);
    let prev: { x: number; y: number } | null = null;
    series.points.forEach((p, i) => {
      const v = p[key];
      if (v == null) return;
      const px = xFor(i);
      const py = yFor(v);
      if (prev) doc.line(prev.x, prev.y, px, py);
      prev = { x: px, y: py };
    });
    doc.setLineDashPattern([], 0);
    doc.setFillColor(...color);
    series.points.forEach((p, i) => {
      const v = p[key];
      if (v == null) return;
      doc.circle(xFor(i), yFor(v), 0.9, "F");
    });
  };
  drawSide("esq", COLORS.primary, false);
  drawSide("dir", COLORS.muted, true);

  // X-axis: first and last dates
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.muted);
  doc.text(series.points[0].dateLabel, plotX, plotTop + plotH + 3.5);
  doc.text(series.points[series.points.length - 1].dateLabel, plotX + plotW, plotTop + plotH + 3.5, {
    align: "right",
  });

  // Centered legend
  const legendY = cardTop + cardH - 2.5;
  doc.setFontSize(6.5);
  const esW = doc.getTextWidth(esLbl);
  const dirW = doc.getTextWidth(dirLbl);
  const totalW = 8 + 1.5 + esW + 6 + 8 + 1.5 + dirW;
  let lx = MARGIN + (CONTENT_WIDTH - totalW) / 2;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.7);
  doc.line(lx, legendY - 1.2, lx + 8, legendY - 1.2);
  doc.setTextColor(...COLORS.foreground);
  doc.text(esLbl, lx + 9.5, legendY);
  lx += 8 + 1.5 + esW + 6;
  doc.setDrawColor(...COLORS.muted);
  doc.setLineDashPattern([1.6, 1.1], 0);
  doc.line(lx, legendY - 1.2, lx + 8, legendY - 1.2);
  doc.setLineDashPattern([], 0);
  doc.text(dirLbl, lx + 9.5, legendY);

  return cardTop + cardH + 3;
}

// ── Render Dynamometry / Muscle Strength Table ──
function renderStrengthTableSection(
  doc: jsPDF,
  y: number,
  rows:
    | Array<{
        movement: string;
        leftValue: string;
        rightValue: string;
        unit?: string;
        leftTrials?: Array<{ value: string; timeToPeak?: string }>;
        rightTrials?: Array<{ value: string; timeToPeak?: string }>;
      }>
    | undefined,
  isPt: boolean,
  language: string,
): number {
  if (!rows || rows.length === 0) return y;
  const sideAgg = (
    value: string | undefined,
    trials: Array<{ value: string; timeToPeak?: string }> | undefined,
  ): { display: string; detail: string; mean: number | null } => {
    const nums = (trials || [])
      .map((t) => parseFloat(String(t?.value ?? "").replace(",", ".")))
      .filter((n) => isFinite(n) && n > 0);
    // Time to peak is optional: only rendered when at least one trial carries it.
    const peaks = (trials || [])
      .map((t) => parseFloat(String(t?.timeToPeak ?? "").replace(",", ".")))
      .filter((n) => isFinite(n) && n > 0);
    const peakLbl = language === "es" ? "t. pico" : isPt ? "t. pico" : "peak t.";
    const peakTxt = peaks.length
      ? ` · ${peakLbl} ${Math.round((peaks.reduce((a, b) => a + b, 0) / peaks.length) * 100) / 100}s`
      : "";
    if (nums.length === 0) {
      const single = parseFloat(String(value || "").replace(",", "."));
      return {
        display: (value || "").trim() || "—",
        detail: peakTxt ? peakTxt.replace(" · ", "") : "",
        mean: isFinite(single) && single > 0 ? single : null,
      };
    }
    const mean = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    const best = Math.round(Math.max(...nums) * 10) / 10;
    const bestLbl = language === "es" ? "mejor" : isPt ? "melhor" : "best";
    return { display: String(mean), detail: `${bestLbl} ${best} · n=${nums.length}${peakTxt}`, mean };
  };

  const cleaned = rows
    .map((r) => {
      const L = sideAgg(r?.leftValue, r?.leftTrials);
      const R = sideAgg(r?.rightValue, r?.rightTrials);
      return {
        movement: (r?.movement || "").trim(),
        leftValue: L.display === "—" ? "" : L.display,
        rightValue: R.display === "—" ? "" : R.display,
        leftDetail: L.detail,
        rightDetail: R.detail,
        leftMean: L.mean,
        rightMean: R.mean,
      };
    })
    .filter((r) => r.movement || r.leftValue || r.rightValue);
  if (cleaned.length === 0) return y;

  const hasTrials = cleaned.some((r) => r.leftDetail || r.rightDetail);

  const title =
    language === "es"
      ? "Dinamometría — Fuerza Muscular (kgf)"
      : isPt
        ? "Dinamometria — Força Muscular (kgf)"
        : "Dynamometry — Muscle Strength (kgf)";
  const colMov =
    language === "es" ? "Movimiento evaluado" : isPt ? "Movimento testado" : "Tested movement";
  const colLeft = language === "es" ? "Izquierda" : isPt ? "Esquerda" : "Left";
  const colRight = language === "es" ? "Derecha" : isPt ? "Direita" : "Right";
  const colAsym = language === "es" ? "Asimetría" : isPt ? "Assimetria" : "Asymmetry";

  // Reserve title + header + 2 rows.
  y = checkPage(doc, y, 14 + 8 + 16);
  y = renderSectionTitle(doc, y, title, COLORS.primary);

  const valueColW = 34;
  const asymColW = 24;
  const movColW = SECTION_TEXT_W - valueColW * 2 - asymColW;
  const xMov = SECTION_X;
  const xLeft = xMov + movColW;
  const xRight = xLeft + valueColW;
  const xAsym = xRight + valueColW;
  const headerH = 7;

  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, headerH, 1.5, COLORS.primaryLight, COLORS.border);
  doc.setFont("Inter", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text(colMov, xMov, y + 4.8);
  doc.text(colLeft, xLeft + valueColW / 2, y + 4.8, { align: "center" });
  doc.text(colRight, xRight + valueColW / 2, y + 4.8, { align: "center" });
  doc.text(colAsym, xAsym + asymColW / 2, y + 4.8, { align: "center" });
  y += headerH;

  if (hasTrials) {
    doc.setFont("Inter", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      language === "es"
        ? "Valor mostrado = media de las medidas del lado."
        : isPt
          ? "Valor exibido = média das medidas do lado."
          : "Displayed value = mean of the side's trials.",
      SECTION_X,
      y + 3.2,
    );
    y += 4.5;
  }

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);

  cleaned.forEach((r, i) => {
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    const movLines = doc.splitTextToSize(r.movement || "—", movColW - 3);
    doc.setFontSize(7);
    const leftLines: string[] = r.leftDetail ? doc.splitTextToSize(r.leftDetail, valueColW - 4) : [];
    const rightLines: string[] = r.rightDetail ? doc.splitTextToSize(r.rightDetail, valueColW - 4) : [];
    const rowH = Math.max(8, movLines.length * 4.2 + 3, 7 + Math.max(leftLines.length, rightLines.length) * 3.4);
    if (y + rowH + 1 > PAGE_BOTTOM) {
      doc.addPage();
      y = MARGIN;
      drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, headerH, 1.5, COLORS.primaryLight, COLORS.border);
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.primary);
      doc.text(colMov, xMov, y + 4.8);
      doc.text(colLeft, xLeft + valueColW / 2, y + 4.8, { align: "center" });
      doc.text(colRight, xRight + valueColW / 2, y + 4.8, { align: "center" });
      doc.text(colAsym, xAsym + asymColW / 2, y + 4.8, { align: "center" });
      y += headerH;
    }

    drawRoundedRect(
      doc,
      MARGIN,
      y,
      CONTENT_WIDTH,
      rowH,
      0.8,
      i % 2 === 1 ? [248, 246, 242] : COLORS.white,
      COLORS.border,
    );

    doc.setTextColor(...COLORS.foreground);
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.text(movLines, xMov, y + 4.5);

    doc.setFont("Inter", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(r.leftValue || "—", xLeft + valueColW / 2, y + 4.5, { align: "center" });
    doc.text(r.rightValue || "—", xRight + valueColW / 2, y + 4.5, { align: "center" });

    if (r.leftDetail || r.rightDetail) {
      doc.setFont("Inter", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      leftLines.forEach((line, index) => doc.text(line, xLeft + valueColW / 2, y + 8 + index * 3.4, { align: "center" }));
      rightLines.forEach((line, index) => doc.text(line, xRight + valueColW / 2, y + 8 + index * 3.4, { align: "center" }));
      doc.setFontSize(9);
    }

    // Asymmetry calc (uses the mean of trials when available)
    const L = r.leftMean ?? NaN;
    const R = r.rightMean ?? NaN;
    let asymText = "—";
    let asymColor: [number, number, number] = COLORS.muted as [number, number, number];
    if (isFinite(L) && isFinite(R) && L > 0 && R > 0) {
      const pct = Math.round((Math.abs(L - R) / Math.max(L, R)) * 100);
      asymText = `${pct}%`;
      asymColor = pct > 10 ? [190, 45, 60] : [22, 130, 95];
    }
    doc.setFont("Inter", "bold");
    doc.setTextColor(...asymColor);
    doc.text(asymText, xAsym + asymColW / 2, y + 4.5, { align: "center" });

    y += rowH + 0.5;
  });

  y = renderAgonistAntagonistBlock(doc, y + 2, cleaned, isPt, language);

  return y + 4;
}

/** Intra-side agonist/antagonist asymmetries (shoulder rotation, knee, hip). */
function renderAgonistAntagonistBlock(
  doc: jsPDF,
  y: number,
  cleaned: Array<{ movement: string; leftMean: number | null; rightMean: number | null }>,
  isPt: boolean,
  language: string,
): number {
  const norm = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  type Pair = { title: string; region: RegExp; aRe: RegExp; bRe: RegExp; excludeA?: RegExp };
  const pairs: Pair[] = [
    {
      title:
        language === "es"
          ? "Hombro — rotación interna vs externa"
          : isPt
            ? "Ombro — rotação interna vs externa"
            : "Shoulder — internal vs external rotation",
      region: /(ombro|shoulder|hombro)/,
      aRe: /(rotac|rotat).*(intern|medial)|(intern|medial).*(rotac|rotat)/,
      bRe: /(rotac|rotat).*(extern|lateral)|(extern|lateral).*(rotac|rotat)/,
    },
    {
      title:
        language === "es"
          ? "Rodilla — extensión vs flexión"
          : isPt
            ? "Joelho — extensão vs flexão"
            : "Knee — extension vs flexion",
      region: /(joelho|knee|rodilla)/,
      aRe: /exten/,
      bRe: /flex/,
    },
    {
      title:
        language === "es"
          ? "Cadera — extensión vs flexión"
          : isPt
            ? "Quadril — extensão vs flexão"
            : "Hip — extension vs flexion",
      region: /(quadril|hip|cadera)/,
      aRe: /exten/,
      bRe: /flex/,
    },
    {
      title:
        language === "es"
          ? "Cadera — aducción vs abducción"
          : isPt
            ? "Quadril — adução vs abdução"
            : "Hip — adduction vs abduction",
      region: /(quadril|hip|cadera)/,
      aRe: /(aducao|aducc|adduc|aduc)/,
      bRe: /abduc/,
      excludeA: /abduc/,
    },
  ];

  const lines: Array<{ title: string; left: string; right: string; worst: number }> = [];
  for (const p of pairs) {
    const find = (re: RegExp, exclude?: RegExp) =>
      cleaned.find((r) => {
        const m = norm(r.movement);
        if (exclude && exclude.test(m)) return false;
        return p.region.test(m) && re.test(m);
      });
    const a = find(p.aRe, p.excludeA);
    const b = find(p.bRe);
    if (!a || !b) continue;
    const side = (k: "leftMean" | "rightMean") => {
      const av = a[k];
      const bv = b[k];
      if (av == null || bv == null || av <= 0 || bv <= 0) return null;
      return Math.round((Math.abs(av - bv) / Math.max(av, bv)) * 100);
    };
    const l = side("leftMean");
    const r = side("rightMean");
    if (l == null && r == null) continue;
    lines.push({
      title: p.title,
      left: l == null ? "—" : `${l}%`,
      right: r == null ? "—" : `${r}%`,
      worst: Math.max(l ?? 0, r ?? 0),
    });
  }
  if (lines.length === 0) return y;

  const heading =
    language === "es"
      ? "Asimetría agonista/antagonista (mismo lado)"
      : isPt
        ? "Assimetria agonista/antagonista (mesmo lado)"
        : "Agonist/antagonist asymmetry (same side)";
  const colLeft = language === "es" ? "Izquierda" : isPt ? "Esquerda" : "Left";
  const colRight = language === "es" ? "Derecha" : isPt ? "Direita" : "Right";

  y = checkPage(doc, y, 14 + lines.length * 7);
  doc.setFont("Inter", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text(heading, SECTION_X, y + 4);
  y += 7;

  const valueColW = 22;
  const labelW = SECTION_TEXT_W - valueColW * 2;
  const xLabel = SECTION_X;
  const xL = xLabel + labelW;
  const xR = xL + valueColW;

  doc.setFont("Inter", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(colLeft, xL + valueColW / 2, y + 3, { align: "center" });
  doc.text(colRight, xR + valueColW / 2, y + 3, { align: "center" });
  y += 5;

  lines.forEach((ln, i) => {
    const labelLines = doc.splitTextToSize(ln.title, labelW - 3);
    const rowH = Math.max(7, labelLines.length * 4.2 + 2.5);
    y = checkPage(doc, y, rowH + 1);
    drawRoundedRect(
      doc,
      MARGIN,
      y,
      CONTENT_WIDTH,
      rowH,
      0.8,
      i % 2 === 1 ? [248, 246, 242] : COLORS.white,
      COLORS.border,
    );
    doc.setFont("Inter", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.foreground);
    doc.text(labelLines, xLabel, y + 4.5);

    const paint = (text: string, x: number) => {
      const pct = parseInt(text, 10);
      const color: [number, number, number] = isFinite(pct)
        ? pct > 10
          ? [190, 45, 60]
          : [22, 130, 95]
        : (COLORS.muted as [number, number, number]);
      doc.setFont("Inter", "bold");
      doc.setTextColor(...color);
      doc.text(text, x + valueColW / 2, y + 4.5, { align: "center" });
    };
    paint(ln.left, xL);
    paint(ln.right, xR);

    y += rowH + 0.5;
  });

  return y + 2;
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
      doc.setFont("Inter", "normal");
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
function renderTestResultsSection(doc: jsPDF, y: number, testResults: any, isPt: boolean, lang?: string): number {
  // Normalize: could be null, empty object {}, or array
  if (!testResults) return y;
  if (typeof testResults === "object" && !Array.isArray(testResults) && Object.keys(testResults).length === 0) return y;
  if (Array.isArray(testResults) && testResults.length === 0) return y;

  const items = Array.isArray(testResults) ? testResults : [testResults];
  const questionnaireItems = items.filter((t: any) => t.questionnaireId && t.percentageScore != null);
  const genericItems = items.filter((t: any) => !t.questionnaireId);

  const measureQuestionnaireCard = (q: any): number => {
    const qDef = questionnaires.find(qd => qd.id === q.questionnaireId);
    const fullName = qDef ? (isPt ? qDef.fullName_pt : qDef.fullName_en) : "";
    const severity = q.severity || "";
    const interpretation = isPt ? (q.interpretation_pt || severity) : (q.interpretation_en || severity);
    const entries = q.subscaleScores && typeof q.subscaleScores === "object" ? Object.entries(q.subscaleScores) : [];

    // Match the exact fonts used by the card before wrapping. This avoids a
    // shorter estimate when a previous PDF block left another font active.
    doc.setFont("Inter", "bold");
    doc.setFontSize(8);
    const interpLines = interpretation ? doc.splitTextToSize(interpretation, TEXT_MAX_WIDTH - 8) : [];
    doc.setFont("Inter", "normal");
    doc.setFontSize(7);
    const fullNameLines = fullName ? doc.splitTextToSize(fullName, TEXT_MAX_WIDTH - 40) : [];
    const subscaleRows = entries.length > 1 ? Math.ceil(entries.length / 2) : 0;

    return 12
      + (fullNameLines.length * 3.5)
      + (interpLines.length * 3.5 + 1)
      + (subscaleRows * 4.5 + (entries.length > 1 ? 1 : 0))
      + (qDef ? 4 : 0)
      + 6;
  };

  // Render validated questionnaire results
  if (questionnaireItems.length > 0) {
    // Keep the heading and the ENTIRE first questionnaire card on the same
    // page. A fixed guard was insufficient for questionnaires with long names,
    // interpretations or subscales, leaving the heading orphaned.
    const firstCardH = measureQuestionnaireCard(questionnaireItems[0]);
    y = renderSectionTitle(
      doc,
      y,
      isPt ? "Questionários Funcionais" : "Functional Questionnaires",
      COLORS.primary,
      firstCardH + 4,
    );

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
      const cardH = measureQuestionnaireCard(q);
      y = checkPage(doc, y, cardH + 4);

      const cardStartY = y - 2;

      // Abbreviated name (bold, larger)
      doc.setFont("Inter", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.foreground);
      doc.text(qName, MARGIN + 5, y + 2);

      // Percentage on the right, large and colored
      const sevColor: [number, number, number] =
        severity === "minimal" ? COLORS.green :
        severity === "mild" ? [60, 130, 200] as [number, number, number] :
        severity === "moderate" ? COLORS.yellow : COLORS.red;
      doc.setFont("Inter", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...sevColor);
      const pctText = `${pct}%`;
      const pctW = doc.getTextWidth(pctText);
      doc.text(pctText, MARGIN + CONTENT_WIDTH - 5 - pctW, y + 3);
      y += 6;

      // Full name (muted, smaller)
      if (fullNameLines.length > 0) {
        doc.setFont("Inter", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(fullNameLines, MARGIN + 5, y);
        y += fullNameLines.length * 3.5;
      }

      // Interpretation (colored)
      if (interpLines.length > 0) {
        y += 1;
        doc.setFont("Inter", "bold");
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
            doc.setFont("Inter", "normal");
            doc.setTextColor(...COLORS.muted);
            const labelText = label + ":";
            const truncLabel = doc.getTextWidth(labelText) > colW - 12
              ? labelText.substring(0, 18) + "…:"
              : labelText;
            doc.text(truncLabel, xPos, y);
            doc.setFont("Inter", "bold");
            doc.setTextColor(...COLORS.foreground);
            doc.text(`${score}%`, xPos + colW - 12, y);
          }
          y += 4.5;
        }
      }

      // Scale note (italic, muted)
      if (qDef) {
        y += 0.5;
        doc.setFont("Inter", "italic");
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

  // Render generic test results (non-questionnaire).
  // Functional tests are stored as { testId, painful } — resolve name/result first
  // and only draw the section when there is something to show (avoids blank block).
  const painfulLabel = isPt
    ? "Doloroso / desconfortável"
    : lang === "es" ? "Doloroso / incómodo" : "Painful / uncomfortable";
  const okLabel = isPt
    ? "Sem desconforto"
    : lang === "es" ? "Sin molestias" : "No discomfort";

  const genericRows = genericItems
    .map((test: any) => {
      const name = test.name || test.testName
        || (test.testId ? resolveFunctionalTestName(test.testId, isPt, lang) : "")
        || (typeof test.id === "string" ? resolveFunctionalTestName(test.id, isPt, lang) : "");
      let result = test.result ?? test.score ?? test.value ?? "";
      if (result === "" && typeof test.painful === "boolean") {
        result = test.painful ? painfulLabel : okLabel;
      }
      return { name, result: String(result), painful: test.painful === true };
    })
    .filter((r) => r.name);

  if (genericRows.length > 0) {
    y = checkPage(doc, y, 16);
    y = renderSectionTitle(doc, y, isPt ? "Resultados dos Testes" : "Test Results", COLORS.primary);

    for (const row of genericRows) {
      y = checkPage(doc, y, 10);
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.foreground);
      doc.text(`${row.name}: `, SECTION_X, y);
      const lw = doc.getTextWidth(`${row.name}: `);
      doc.setFont("Inter", "normal");
      doc.setTextColor(...(row.painful ? COLORS.red : COLORS.muted));
      const availW = SECTION_TEXT_W - lw;
      const resultLines = doc.splitTextToSize(row.result, availW > 30 ? availW : SECTION_TEXT_W);
      doc.text(resultLines, SECTION_X + lw, y);
      y += resultLines.length * 3.5 + 1.5;
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
    doc.setFont("Inter", "bold");
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
  doc.setFont("Inter", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.foreground);
  doc.text(`${score}`, markerX - (score >= 10 ? 2.5 : 1.5), y + barH / 2 + 2.5);
  y += barH + 3;

  // End labels
  doc.setFont("Inter", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  const noPainLabel = isPt ? "Sem dor" : "No pain";
  const worstLabel = isPt ? "Pior dor" : "Worst pain";
  doc.text(noPainLabel, barX, y + 3);
  doc.text(worstLabel, barX + barW - doc.getTextWidth(worstLabel), y + 3);

  // Score text centered
  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  const scoreColor: [number, number, number] = score <= 3 ? COLORS.green : score <= 6 ? COLORS.yellow : COLORS.red;
  doc.setTextColor(...scoreColor);
  const scoreText = `${score}/10`;
  doc.text(scoreText, barX + barW / 2 - doc.getTextWidth(scoreText) / 2, y + 3);
  y += 10;

  return y;
}

/** Human label for a pain-map region id (falls back to i18n key translation). */
function painRegionLabel(id: string, isPt: boolean): string {
  for (const view of Object.values(regionsByView)) {
    const r = view.find((reg: any) => reg.id === id);
    if (r) return isPt ? r.label_pt : r.label_en;
  }
  return translateKey(id, isPt);
}

function renderVasSection(doc: jsPDF, y: number, isPt: boolean, painScore: number | undefined, anamnesisData?: AnamnesisData | any): number {
  if (isPreventiveAssessment(anamnesisData)) return y;
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
      const label = `${painRegionLabel(key, isPt)} — ${regionScore}/10`;
      y = renderVasBar(doc, barX, y, barW, barH, regionScore, label, isPt);
      y += 2;
    }

    // Average
    if (score != null) {
      doc.setFont("Inter", "bold");
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
  /** Passo E2 — triagem de mecanismo de dor (jsonb). Fallback: diagnosis.pain_mechanism. */
  painMechanism?: unknown;
  painExtent?: number | null;
  /** When set, replaces the AI hypothesis with the professional override. */
  finalHypothesis?: string;
  language: string;
  patientName?: string;
  painRegions?: string[];
  painScore?: number;
  anamnesisData?: any;
  /** Red flags detected during assessment (assessment.red_flags?.detected). */
  redFlags?: string[];
  /** When set, indicates the red flag was professionally dismissed. */
  redFlagsDismissal?: { at?: string; by?: string; reason?: string } | null;
  /** Full Q&A audit (assessment.red_flags?.answers). */
  redFlagAnswers?: Array<{ key?: string; question: string; answer: "yes" | "no" }>;
  /** ISO timestamp when the red-flag screening was completed. */
  redFlagsAnsweredAt?: string;
  /** Solo professional logo (used when there is no clinic branding). */
  professionalLogoUrl?: string;
  /** Clinic logo — takes precedence over the professional logo. */
  clinicLogoUrl?: string;
  /** Clinic name, shown as the report header title when clinic-branded. */
  clinicName?: string;
  brandColor?: string;
}

export async function generateBasicReportPdfBlob(options: BasicReportOptions): Promise<Blob> {
  const doc = createPdfDoc();
  applyPdfBranding(doc, options.brandColor);
  const isPt = options.language === "pt";
  let y = MARGIN;

  // Branding: clinic logo wins; otherwise the solo professional logo shows on
  // the right of the Aliv.iA lockup, exactly like the premium report.
  const isClinicBranded = !!(options.clinicName || options.clinicLogoUrl);
  const logoBase64 = options.clinicLogoUrl
    ? (await loadExternalImageAsBase64(options.clinicLogoUrl) || await loadLogoBase64())
    : await loadLogoBase64();
  const proLogoBase64 = !isClinicBranded && options.professionalLogoUrl
    ? await loadExternalImageAsBase64(options.professionalLogoUrl)
    : null;

  // Header band
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  const logoMaxH = 14;
  const logoMaxW = isClinicBranded ? 40 : 28;
  const logoY = (38 - logoMaxH) / 2;
  let textStartX = MARGIN;
  if (logoBase64) {
    const drawnW = drawBrandLogo(doc, logoBase64, MARGIN, logoY, logoMaxW, logoMaxH);
    textStartX = MARGIN + drawnW + 3;
  }
  const logoH = logoMaxH; // kept for downstream y math
  let titleMaxW = PAGE_WIDTH - MARGIN - textStartX;
  if (proLogoBase64) {
    const proMaxW = 22;
    drawBrandLogo(doc, proLogoBase64, PAGE_WIDTH - MARGIN - proMaxW, logoY, proMaxW, logoH, "right");
    titleMaxW -= proMaxW + 4;
  }
  doc.setFont("Inter", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...pdfBrandPalette(options.brandColor).foreground);
  const titleY = logoY + logoH / 2 + 2;
  const headerTitle = isClinicBranded && options.clinicName ? options.clinicName : "Aliv.iA";
  doc.text(truncateToWidth(doc, headerTitle, Math.max(titleMaxW, 20)), textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("Inter", "normal");
  doc.text(
    truncateToWidth(
      doc,
      isPt ? "Resultado da Autoavaliação Básica" : "Basic Self-Assessment Result",
      Math.max(titleMaxW, 20),
    ),
    textStartX,
    titleY + 9,
  );
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);

  y = 48;

  // Patient name — always rendered so the report is never anonymous
  {
    const nameValue = options.patientName?.trim() || (isPt ? "Paciente" : "Patient");
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 14, 4, COLORS.background, COLORS.border);
    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    const pLabel = isPt ? "Paciente: " : "Patient: ";
    doc.text(pLabel, MARGIN + 6, y + 9);
    doc.setFont("Inter", "normal");
    doc.text(nameValue, MARGIN + 6 + doc.getTextWidth(pLabel) + 1.5, y + 9);
    y += 20;
  }


  // Diagnosis section
  y = renderSectionTitle(doc, y, isPt ? "Hipótese Preliminar" : "Preliminary Hypothesis", COLORS.primary);

  // Hypothesis card — RIGID layout (measure with the SAME font used to render)
  y = drawTextCard(doc, y, options.finalHypothesis?.trim() || options.diagnosis.hypothesis, {
    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 8,
    padY: 7,
    body: { font: "Inter", weight: "bold", size: 11, lineHeight: 5, textColor: COLORS.primary },
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

  // Red flags (documented but non-blocking when professional supervised)
  y = renderRedFlagsCard(doc, y, options.redFlags, isPt, options.redFlagsDismissal);

  // ── Anamnesis summary (same fields shown in the online assessment summary) ──
  if (options.anamnesisData) {
    y = renderAnamnesisSection(doc, y, options.anamnesisData, isPt, options.language);
  }
  y = renderSpineBiomechanicsSection(doc, y, options.anamnesisData?.spineBiomechanics, options.language);

  // Passo E2 — mecanismo de dor (apresentado após a anamnese)
  y = renderPainMechanismBlock(
    doc, y,
    (options.diagnosis as any)?.pain_mechanism ?? (options as any).painMechanism,
    (options as any).painExtent ?? null,
    isPt,
  );

  // ── Pain Score (VAS) — uses shared renderer ──
  y = renderVasSection(doc, y, isPt, options.painScore, options.anamnesisData);

  // ── Pain Map ──
  if (!isPreventiveAssessment(options.anamnesisData) && options.painRegions && options.painRegions.length > 0) {
    y = await renderPainMapSection(doc, y, options.painRegions, isPt);
  }


  // ── Safety screening record (probatory Q&A) ──
  y = renderRedFlagsAuditTable(doc, y, options.redFlagAnswers, options.redFlagsAnsweredAt, isPt);


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
  doc.setFont("Inter", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(upsellTitle, MARGIN + 8, y + 11);
  
  // Divider line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 8, y + 14, MARGIN + CONTENT_WIDTH - 8, y + 14);
  
  // Bullets
  doc.setFont("Inter", "normal");
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
  
  // Logo in the right side of the green box (preserves aspect ratio)
  if (logoBase64) {
    drawBrandLogo(doc, logoBase64, MARGIN + CONTENT_WIDTH - 6 - logoMotSize - 2, motBoxY, logoMotSize, logoMotSize);
  }
  
  doc.setFont("Inter", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  for (let i = 0; i < motivationalLines.length; i++) {
    doc.text(motivationalLines[i], MARGIN + 12, motBoxY + 5 + i * 5);
  }
  y += upsellH + 8;

  // Disclaimer — RIGID layout
  const disclaimerText = isPt
    ? "AUTOAVALIAÇÃO — Este relatório foi gerado a partir de uma autoavaliação preenchida pelo próprio usuário, processada por sistema de inteligência artificial baseado em método clínico. NÃO constitui diagnóstico médico nem substitui consulta médica ou avaliação fisioterapêutica presencial. Em caso de dor intensa, piora dos sintomas, trauma recente ou qualquer emergência, procure atendimento imediato ou ligue 192 (SAMU)."
    : "SELF-ASSESSMENT — This report was generated from a self-assessment completed by the user, processed by an artificial intelligence system based on a clinical method. It does NOT constitute a medical diagnosis and does not replace a medical consultation or in-person physiotherapy assessment. In case of severe pain, worsening symptoms, recent trauma, or any emergency, seek immediate care or call your local emergency number (192 in Brazil — SAMU).";
  y = drawTextCard(doc, y, disclaimerText, {
    fill: [255, 245, 245],
    stroke: COLORS.red,
    padX: 6,
    padY: 6,
    label: { text: isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", color: COLORS.red, size: 8 },
    body: { font: "Inter", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
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
    const footerLogoMaxW = 18;
    let footerTextX = MARGIN;
    if (logoBase64) {
      const w = drawBrandLogo(doc, logoBase64, MARGIN, 285.5, footerLogoMaxW, footerLogoSize);
      footerTextX = MARGIN + w + 2;
    }
    doc.setFontSize(7);
    doc.setFont("Inter", "normal");
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

async function _buildPdfDoc({ diagnosis, painMechanism, painExtent, finalHypothesis, treatmentPlan, language, userName, anamnesisData, painRegions, testResults, redFlags, redFlagsDismissal, redFlagAnswers, redFlagsAnsweredAt, professionalNotes, addenda, professionalLogoUrl, clinicLogoUrl, clinicName, brandColor, responsibleProfessional }: PdfOptions): Promise<jsPDF> {
  const doc = createPdfDoc();
  applyPdfBranding(doc, brandColor);
  const isPt = language === "pt";
  let y = MARGIN;

  // Load logos — clinic logo replaces Aliv.iA logo when present
  const isClinicBranded = !!(clinicName || clinicLogoUrl);
  const logoBase64 = clinicLogoUrl ? (await loadExternalImageAsBase64(clinicLogoUrl) || await loadLogoBase64()) : await loadLogoBase64();
  const proLogoBase64 = (!isClinicBranded && professionalLogoUrl) ? await loadExternalImageAsBase64(professionalLogoUrl) : null;

  // ── Header Band ──
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  
  const logoH = 14;
  const logoMaxW = isClinicBranded ? 40 : 14; // clinic logos are usually wide
  const logoY = (38 - logoH) / 2;
  let textStartX = MARGIN;
  let leftLogoWidth = 0;
  if (logoBase64) {
    leftLogoWidth = drawBrandLogo(doc, logoBase64, MARGIN, logoY, logoMaxW, logoH);
    textStartX = MARGIN + leftLogoWidth + 3;
  }

  // Professional logo in top-right of header (only if NOT clinic-branded) — reserved area
  const proLogoMaxW = 28;
  let rightReservedW = 0;
  if (proLogoBase64) {
    const w = drawBrandLogo(doc, proLogoBase64, PAGE_WIDTH - MARGIN - proLogoMaxW, logoY, proLogoMaxW, logoH, "right");
    rightReservedW = w + 4;
  }

  doc.setFont("Inter", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...pdfBrandPalette(brandColor).foreground);
  const titleY = logoY + logoH / 2 + 2;
  const titleMaxW = PAGE_WIDTH - MARGIN - textStartX - Math.max(rightReservedW, 30);
  const headerTitle = isClinicBranded && clinicName ? clinicName : "Aliv.iA";
  doc.text(truncateToWidth(doc, headerTitle, titleMaxW), textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("Inter", "normal");
  const subtitle = isPt ? "Relatório Clínico Personalizado" : "Personalized Clinical Report";
  doc.text(truncateToWidth(doc, subtitle, titleMaxW), textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);

  y = 48;

  // ── Academic disclaimer banner (student access) ──
  if (responsibleProfessional?.isStudent) {
    const bannerH = 10;
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, bannerH, 3, COLORS.accent, COLORS.accentDark);
    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accentDark);
    const studentSuffix = [
      responsibleProfessional.name,
      responsibleProfessional.studentInstitution,
      responsibleProfessional.studentPeriod,
    ].filter(Boolean).join(" · ");
    const bannerLabel = isPt
      ? `Alivia Acadêmico · Avaliação realizada por estudante — ${studentSuffix}`
      : `Alivia Academic · Assessment by student — ${studentSuffix}`;
    const maxBannerW = CONTENT_WIDTH - 12;
    let truncated = bannerLabel;
    if (doc.getTextWidth(truncated) > maxBannerW) {
      const ell = "…";
      while (truncated.length > 1 && doc.getTextWidth(truncated + ell) > maxBannerW) {
        truncated = truncated.slice(0, -1);
      }
      truncated = truncated.replace(/[\s·]+$/, "") + ell;
    }
    doc.text(truncated, PAGE_WIDTH / 2, y + 6.5, { align: "center" });
    y += bannerH + 2;

    // Strong academic disclaimer for student reports
    const academicDisclaimer = isPt
      ? "Documento de caráter exclusivamente acadêmico — sem valor profissional. As informações deste relatório não substituem uma consulta fisioterapêutica. Se necessário, busque orientação de um fisioterapeuta formado e habilitado."
      : "Document of exclusively academic nature — no professional value. The information in this report does not replace a physiotherapy consultation. If needed, seek guidance from a qualified physiotherapist.";
    y = drawTextCard(doc, y, academicDisclaimer, {
      fill: [255, 251, 235],
      stroke: COLORS.yellow,
      padX: 6,
      padY: 5,
      body: { font: "Inter", weight: "normal", size: 8, lineHeight: 3.8, textColor: COLORS.yellow },
      label: { text: isPt ? "AVISO ACADÊMICO" : "ACADEMIC NOTICE", color: COLORS.yellow, size: 8 },
    });
    y += 2;
  }


  // ── Patient Info — always rendered so no report is anonymous ──
  {
    const nameValue = userName?.trim() || (isPt ? "Paciente" : "Patient");
    drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 14, 4, COLORS.background, COLORS.border);
    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    doc.text(isPt ? "Paciente: " : "Patient: ", MARGIN + 6, y + 9);
    const labelW = doc.getTextWidth(isPt ? "Paciente: " : "Patient: ");
    doc.setFont("Inter", "normal");
    doc.text(nameValue, MARGIN + 6 + labelW + 1.5, y + 9);
    y += 20;
  }


  // External assessments carry no AI disclaimer banner: the professional has
  // already reviewed and approved the data in the patient chart.



  // ── Diagnosis Section (FIRST after patient info) ──
  y = renderSectionTitle(doc, y, isPt ? "Hipótese Preliminar" : "Preliminary Hypothesis", COLORS.primary, 30);

  // Hypothesis card — RIGID
  y = drawTextCard(doc, y, finalHypothesis?.trim() || diagnosis.hypothesis, {
    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 8,
    padY: 7,
    body: { font: "Inter", weight: "bold", size: 11, lineHeight: 5, textColor: COLORS.primary },
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

  // Red flags (documented but non-blocking when professional supervised)
  y = renderRedFlagsCard(doc, y, redFlags, isPt, redFlagsDismissal);
  y = renderRedFlagsAuditTable(doc, y, redFlagAnswers, redFlagsAnsweredAt, isPt);

  // Explanation
  if (diagnosis.explanation) {
    y = renderSubSection(doc, y, isPt ? "O que está acontecendo?" : "What's happening?", diagnosis.explanation);
  }

  // Reasoning
  if (diagnosis.reasoning) {
    y = renderSubSection(doc, y, isPt ? "Raciocínio Clínico" : "Clinical Reasoning", diagnosis.reasoning);
  }

  // Diagnósticos diferenciais (opcional — só quando marcado no prontuário)
  y = renderDifferentialBlock(doc, y, diagnosis.differentialDiagnosis, isPt);

  // ── Clinical Impression (if available) ──
  const clinicalImpression = (diagnosis as any)?.clinicalImpression;
  if (clinicalImpression?.overview) {
    const ciCardOpts: TextCardOptions = {
      fill: COLORS.primaryLight,
      stroke: COLORS.primary,
      padX: 8,
      padY: 7,
      body: { font: "Inter", weight: "italic", size: 9, lineHeight: 4.5, textColor: COLORS.foreground },
      bottomSafety: 2,
    };

    // Title must never be orphaned from its card.
    y = keepTitleWithCard(doc, y + 4, 6, clinicalImpression.overview, ciCardOpts);
    const ciTitle = isPt ? "Impressão Clínica" : "Clinical Impression";
    doc.setFont("Inter", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(ciTitle, MARGIN, y);
    y += 6;

    // Overview in rounded box — RIGID (italic 9; lineHeight 4.5; safety for italic descenders)
    y = drawTextCard(doc, y, clinicalImpression.overview, ciCardOpts);

    y += 1;

    // Therapeutic objectives — badges em flow horizontal, com wrap por linha
    if (clinicalImpression.therapeuticObjectives?.length > 0) {
      y = checkPage(doc, y, 18);
      doc.setFont("Inter", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      const objLabel = isPt ? "Objetivos Terapêuticos:" : "Therapeutic Objectives:";
      doc.text(objLabel, MARGIN, y + 4);
      y += 9; // espaço entre label e a primeira linha de badges

      const badgeH = 8;
      const badgeGapX = 3;
      const badgeGapY = 3;
      const badgePadX = 4;
      const rowMaxRight = MARGIN + TEXT_MAX_WIDTH;
      let cursorX = MARGIN;
      let rowH = badgeH;

      doc.setFontSize(7);
      doc.setFont("Inter", "bold");

      clinicalImpression.therapeuticObjectives.forEach((obj: string) => {
        const tw = doc.getTextWidth(obj);
        const badgeW = tw + badgePadX * 2;
        // wrap para nova linha se ultrapassar a largura útil
        if (cursorX + badgeW > rowMaxRight && cursorX > MARGIN) {
          y += rowH + badgeGapY;
          y = checkPage(doc, y, badgeH + 4);
          cursorX = MARGIN;
        }
        // drawBadge usa y como baseline do texto; posicionamos pela borda superior
        drawBadge(doc, obj, cursorX, y + badgeH - 2, COLORS.primary, COLORS.white);
        cursorX += badgeW + badgeGapX;
      });
      y += badgeH + 4;
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
    y = renderAnamnesisSection(doc, y, anamnesisData, isPt, language);
  }

  // Passo E2 — mecanismo de dor (apresentado após a anamnese)
  y = renderPainMechanismBlock(
    doc, y,
    (diagnosis as any)?.pain_mechanism ?? painMechanism,
    painExtent ?? null,
    isPt,
  );

  // ── Additional External Info (from external assessment upload) ──
  if (anamnesisData?.additionalExternalInfo?.trim()) {
    y = checkPage(doc, y, 24);
    y = renderSectionTitle(doc, y, isPt ? "Informações Externas Adicionais" : "Additional External Information", COLORS.primary, 20);
    y = drawTextCard(doc, y, anamnesisData.additionalExternalInfo.trim(), {
      fill: COLORS.background,
      stroke: COLORS.border,
      padX: 6,
      padY: 5,
      body: { font: "Inter", weight: "normal", size: 9, lineHeight: 4.2, textColor: COLORS.foreground },
      label: { text: isPt ? "CONTEÚDO DA AVALIAÇÃO EXTERNA" : "EXTERNAL ASSESSMENT CONTENT", color: COLORS.muted, size: 7 },
    });
    y += 4;
  }

  // ── Professional notes & exam findings (manual assessment) ──
  {
    const proBlocks: Array<[string, string, string]> = [
      [isPt ? "Observações clínicas do profissional" : "Professional clinical observations", isPt ? "ANOTAÇÕES DO FISIOTERAPEUTA" : "PHYSIOTHERAPIST NOTES", String((anamnesisData as any)?.additionalClinicalNotes || "").trim()],
      [isPt ? "Achados dos testes / exame físico" : "Test / physical exam findings", isPt ? "REGISTRADO EM CONSULTA" : "RECORDED IN CONSULTATION", String((anamnesisData as any)?.functionalTests || "").trim()],
    ];
    for (const [title, label, text] of proBlocks) {
      if (!text) continue;
      y = checkPage(doc, y, 24);
      y = renderSectionTitle(doc, y, title, COLORS.primary, 20);
      y = drawTextCard(doc, y, text, {
        fill: COLORS.background, stroke: COLORS.border, padX: 6, padY: 5,
        body: { font: "Inter", weight: "normal", size: 9, lineHeight: 4.2, textColor: COLORS.foreground },
        label: { text: label, color: COLORS.muted, size: 7 },
      });
      y += 4;
    }
  }

  // ── Test Results (Questionnaires) — right after anamnesis ──
  if (testResults) {
    y = renderTestResultsSection(doc, y, testResults, isPt, language);
  }

  // ── Specialty / Psychosocial questionnaires (FABQ etc.) ──
  const specialtyResults = (anamnesisData as any)?.specialtyResults;
  if (Array.isArray(specialtyResults) && specialtyResults.length > 0) {
    y = renderSpecialtyResultsSection(doc, y, specialtyResults, isPt);
  }

  // ── Joint Mobility (ROM) — before pain map / VAS ──
  if (anamnesisData?.romTable && anamnesisData.romTable.length > 0) {
    y = renderRomTableSection(doc, y, anamnesisData.romTable, isPt, language);
  }

  // ── Dynamometry / Muscle Strength — right after ROM ──
  y = renderSpineBiomechanicsSection(doc, y, anamnesisData?.spineBiomechanics, language);
  if (anamnesisData?.strengthTable && anamnesisData.strengthTable.length > 0) {
    y = renderStrengthTableSection(doc, y, anamnesisData.strengthTable, isPt, language);
  }

  // ── Pain Map ──
  const regions = painRegions || anamnesisData?.painRegions;
  if (!isPreventiveAssessment(anamnesisData) && regions && regions.length > 0) {
    y = await renderPainMapSection(doc, y, regions, isPt);
  }

  // ── Pain Score (VAS) — uses shared renderer ──
  const vasScore = anamnesisData?.painScore ?? undefined;
  y = renderVasSection(doc, y, isPt, vasScore, anamnesisData);

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
      doc.setFont("Inter", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...pc.color);
      doc.text(pc.label[language] || pc.label.en, MARGIN + 6, y + 9);
      doc.setFont("Inter", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(phase.duration, PAGE_WIDTH - MARGIN - doc.getTextWidth(phase.duration) - 6, y + 9);
      y += 18;

      // Goal & Focus — RIGID: label on its own line indent, value wraps fully within SECTION_TEXT_W
      if (phase.goal) {
        const labelGoal = isPt ? "Objetivo:" : "Goal:";
        doc.setFont("Inter", "bold");
        doc.setFontSize(8);
        const labelGoalW = doc.getTextWidth(labelGoal + " ");
        const goalLines = doc.splitTextToSize(phase.goal, SECTION_TEXT_W - labelGoalW - 2);
        y = checkPage(doc, y, goalLines.length * 3.5 + 4);
        doc.setTextColor(...COLORS.foreground);
        doc.text(labelGoal, SECTION_X, y);
        doc.setFont("Inter", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(goalLines, SECTION_X + labelGoalW + 2, y);
        y += goalLines.length * 3.5 + 4;
      }

      if (phase.focus) {
        const labelFocus = isPt ? "Foco:" : "Focus:";
        doc.setFont("Inter", "bold");
        doc.setFontSize(8);
        const labelFocusW = doc.getTextWidth(labelFocus + " ");
        const focusLines = doc.splitTextToSize(phase.focus, SECTION_TEXT_W - labelFocusW - 2);
        y = checkPage(doc, y, focusLines.length * 3.5 + 4);
        doc.setTextColor(...COLORS.foreground);
        doc.text(labelFocus, SECTION_X, y);
        doc.setFont("Inter", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(focusLines, SECTION_X + labelFocusW + 2, y);
        y += focusLines.length * 3.5 + 4;
      }

      // Exercises
      for (const ex of phase.exercises) {
        // Pre-compute heights to keep entire exercise block together
        doc.setFont("Inter", "bold");
        doc.setFontSize(8);
        const exNameFull = `- ${ex.name}`;
        const nameLines = doc.splitTextToSize(exNameFull, LIST_TEXT_W);
        doc.setFont("Inter", "normal");
        doc.setFontSize(7.5);
        const descLines = doc.splitTextToSize(ex.description, LIST_TEXT_W - 4);
        const blockH = nameLines.length * 3.8 + 4 + descLines.length * 3.5 + 6;
        y = checkPage(doc, y, blockH);

        // Exercise name — always on its own line(s); category badge BELOW name to avoid overlap
        doc.setFont("Inter", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.foreground);
        doc.text(nameLines, LIST_X, y);
        y += nameLines.length * 3.8;

        // Category badge on its own line, indented (small, muted, no measurement overlap risk)
        const catLabel = ex.category.replace(/_/g, " ");
        const catBadgeText = `[${catLabel}]`;
        doc.setFont("Inter", "italic");
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.muted);
        doc.text(catBadgeText, LIST_X + 4, y);
        y += 3.5;

        // Description
        doc.setFont("Inter", "normal");
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
      doc.setFont("Inter", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      doc.text(isPt ? "Orientacoes Gerais" : "General Guidelines", SECTION_X, y);
      y += 6;
      doc.setFont("Inter", "normal");
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
    const notesCardOpts: TextCardOptions = {
      fill: [245, 243, 240],
      stroke: COLORS.border,
      padX: 6,
      padY: 7,
      body: { font: "Inter", weight: "italic", size: 8, lineHeight: 4, textColor: COLORS.muted },
      bottomSafety: 2,
    };
    y = keepTitleWithCard(doc, y, 12, professionalNotes, notesCardOpts);
    y = renderSectionTitle(doc, y, isPt ? "Notas do Profissional" : "Professional Notes", COLORS.primary);
    y = drawTextCard(doc, y, professionalNotes, notesCardOpts);

    y += 4;
  }

  // ── Informações adicionais (adendos) ──
  const addendaRows = (addenda || []).filter((a) => (a.content || "").trim().length > 0);
  if (addendaRows.length > 0) {
    y = checkPage(doc, y, 26);
    y = renderSectionTitle(
      doc,
      y,
      isPt ? "Informações Adicionais" : language === "es" ? "Información Adicional" : "Additional Information",
      COLORS.primary,
    );
    for (const row of addendaRows) {
      const who = row.author_name
        || (row.author_type === "patient"
          ? (isPt ? "Paciente" : language === "es" ? "Paciente" : "Patient")
          : (isPt ? "Profissional" : language === "es" ? "Profesional" : "Professional"));
      const when = row.created_at
        ? new Date(row.created_at).toLocaleDateString(isPt ? "pt-BR" : language === "es" ? "es-ES" : "en-US")
        : "";
      y = checkPage(doc, y, 14);
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.foreground);
      doc.text(`${who}${when ? ` — ${when}` : ""}`, SECTION_X, y);
      y += 4;
      doc.setFont("Inter", "normal");
      doc.setTextColor(...COLORS.muted);
      const lines = doc.splitTextToSize(row.content.trim(), SECTION_TEXT_W);
      for (const line of lines) {
        y = checkPage(doc, y, 8);
        doc.text(line, SECTION_X, y);
        y += 3.8;
      }
      y += 3;
    }
    y += 2;
  }

  // ── Disclaimer ──
  y = checkPage(doc, y, 40);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  const isSelfAssessment = !responsibleProfessional;
  const disclaimerText = isSelfAssessment
    ? (isPt
        ? "AUTOAVALIAÇÃO — Este relatório foi gerado a partir de uma autoavaliação preenchida pelo próprio usuário, processada por sistema de inteligência artificial baseado em método clínico. As hipóteses e sugestões NÃO constituem diagnóstico médico nem substituem consulta presencial. Devem ser validadas por um profissional habilitado antes de serem seguidas. Em caso de dor intensa, piora dos sintomas, trauma recente ou qualquer emergência, procure atendimento imediato ou ligue 192 (SAMU)."
        : "SELF-ASSESSMENT — This report was generated from a self-assessment completed by the user, processed by an artificial intelligence system based on a clinical method. The hypotheses and suggestions do NOT constitute a medical diagnosis and do not replace an in-person consultation. They must be validated by a qualified professional before being followed. In case of severe pain, worsening symptoms, recent trauma, or any emergency, seek immediate care or call your local emergency number (192 in Brazil — SAMU).")
    : (isPt
        ? "Este relatório foi gerado por um sistema de inteligência artificial e tem caráter exclusivamente informativo e educacional. Ele NÃO substitui uma consulta médica, avaliação fisioterapêutica presencial ou qualquer outro atendimento profissional de saúde. As hipóteses diagnósticas e sugestões de tratamento apresentadas devem ser validadas por um profissional habilitado antes de serem seguidas. Em caso de dor intensa, piora dos sintomas ou qualquer emergência, procure atendimento médico imediatamente."
        : "This report was generated by an artificial intelligence system and is for informational and educational purposes only. It does NOT replace a medical consultation, in-person physiotherapy assessment, or any other professional healthcare. The diagnostic hypotheses and treatment suggestions presented must be validated by a qualified professional before being followed. In case of severe pain, worsening symptoms, or any emergency, seek medical attention immediately.");

  y = drawTextCard(doc, y, disclaimerText, {
    fill: [255, 245, 245],
    stroke: COLORS.red,
    padX: 6,
    padY: 6,
    label: { text: isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", color: COLORS.red, size: 8 },
    body: { font: "Inter", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
    bottomSafety: 1,
  });

  // ── Responsible Technician Block (last page, before footer) ──
  if (responsibleProfessional) {
    y = await drawResponsibleBlock(doc, y, isPt, responsibleProfessional);
  }

  // ── Footer on every page with logo ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);

    const footerLogoH = 8;
    const footerLogoMaxW = isClinicBranded ? 22 : 12;
    let footerTextX = MARGIN;
    if (logoBase64) {
      const w = drawBrandLogo(doc, logoBase64, MARGIN, 285.5, footerLogoMaxW, footerLogoH);
      footerTextX = MARGIN + w + 2;
    }
    doc.setFontSize(7);
    doc.setFont("Inter", "normal");
    doc.setTextColor(...COLORS.muted);
    const footerLabel = isClinicBranded && clinicName
      ? `${clinicName} · ${isPt ? "Powered by" : "Powered by"} Aliv.iA`
      : `Aliv.iA — ${isPt ? "Relatório gerado por IA" : "AI-generated report"}`;
    // Reserve room for page counter (and optional pro logo) on the right
    const rightReserveW = 16 + (proLogoBase64 ? 14 : 0);
    const footerTextMaxW = PAGE_WIDTH - MARGIN - footerTextX - rightReserveW;
    doc.text(truncateToWidth(doc, footerLabel, footerTextMaxW), footerTextX, 290);

    // Professional logo on footer right side
    let pageCounterRightOffset = 8;
    if (proLogoBase64) {
      const proFootMaxW = 18;
      const w = drawBrandLogo(doc, proLogoBase64, PAGE_WIDTH - MARGIN - proFootMaxW, 285.5, proFootMaxW, footerLogoH, "right");
      pageCounterRightOffset = w + 10;
    }

    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - pageCounterRightOffset, 290);
  }

  return doc;
}

// ── Helper: Section Title ──
function renderSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number], extraContentHeight: number = 0): number {
  // Proteção global contra título órfão: além do título (14mm), exige espaço
  // mínimo para o início do conteúdo da seção (>= 30mm) em TODOS os PDFs.
  const MIN_CONTENT_GUARD = 30;
  y = checkPage(doc, y, 14 + Math.max(extraContentHeight, MIN_CONTENT_GUARD));

  doc.setDrawColor(...color);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, MARGIN + 12, y);
  doc.setFont("Inter", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color);
  doc.text(title, MARGIN + 16, y + 1);
  doc.setLineWidth(0.3);
  return y + 10;
}

// ── Passo E2 — bloco de mecanismo de dor no relatório ─────────────────────
// Só imprime quando houve triagem registrada. Complementa a hipótese, nunca a
// substitui. Respeita a largura útil de 158mm e protege o título contra órfão.
function renderPainMechanismBlock(
  doc: jsPDF,
  y: number,
  mechanismRaw: unknown,
  painExtent: number | null | undefined,
  isPt: boolean,
): number {
  const parsed = parseStoredMechanism(mechanismRaw);
  if (!parsed || parsed.mechanism === "unknown") return y;

  const lang: "pt" | "en" = isPt ? "pt" : "en";
  const raw = (mechanismRaw || {}) as Record<string, any>;
  const label = getMechanismLabel(parsed.mechanism, lang);
  const subtype = getSubtypeLabel(parsed.subtype, lang);
  const confMap: Record<string, string> = isPt
    ? { low: "baixa", moderate: "moderada", high: "alta" }
    : { low: "low", moderate: "moderate", high: "high" };

  const headline = [
    `${isPt ? "Mecanismo predominante" : "Predominant mechanism"}: ${label}`,
    parsed.secondary && parsed.secondary !== "unknown"
      ? `${isPt ? "secundário" : "secondary"}: ${getMechanismLabel(parsed.secondary, lang)}`
      : null,
    subtype ? `${isPt ? "subtipo" : "subtype"}: ${subtype}` : null,
    parsed.central_sensitization_likely
      ? (isPt ? "sensibilização central provável" : "central sensitization likely")
      : null,
    typeof parsed.csi_score === "number" ? `CSI: ${parsed.csi_score}` : null,
    `${isPt ? "confiança da triagem" : "screening confidence"}: ${confMap[parsed.confidence] || parsed.confidence}`,
    typeof painExtent === "number"
      ? `${isPt ? "extensão da dor" : "pain extent"}: ~${painExtent}% ${isPt ? "da superfície corporal" : "of body surface"}`
      : null,
  ].filter(Boolean).join(" · ");

  const explanation =
    (typeof raw.patient_explanation === "string" && raw.patient_explanation.trim()) ||
    getMechanismLay(parsed.mechanism, lang);
  const technical = getMechanismTechnical(parsed.mechanism, lang);

  const criteriaLabels = (parsed.criteria || [])
    .map((key) => MECHANISM_CRITERIA.find((c) => c.key === key))
    .filter(Boolean)
    .map((c) => `• ${c!.label[lang]}`);

  const bodyText = [
    headline,
    "",
    explanation,
    technical && technical !== explanation ? `\n${technical}` : null,
    criteriaLabels.length
      ? `\n${isPt ? "Critérios marcados na triagem" : "Criteria marked in screening"}:\n${criteriaLabels.join("\n")}`
      : null,
    `\n${isPt
      ? "Classificação por critérios clínicos (Kosek 2021 / Finnerup 2016). Complementa a hipótese diagnóstica — não a substitui."
      : "Classification based on clinical criteria (Kosek 2021 / Finnerup 2016). Complements the diagnostic hypothesis — does not replace it."}`,
  ].filter(Boolean).join("\n");

  const cardOpts: TextCardOptions = {
    fill: COLORS.background,
    stroke: COLORS.border,
    padX: 8,
    padY: 7,
    body: { font: "Inter", weight: "normal", size: 8.5, lineHeight: 4.2, textColor: COLORS.foreground },
    bottomSafety: 2,
  };

  y = keepTitleWithCard(doc, y + 4, 6, bodyText, cardOpts);
  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(isPt ? "Mecanismo de Dor" : "Pain Mechanism", MARGIN, y);
  y += 6;
  y = drawTextCard(doc, y, bodyText, cardOpts);
  return y + 2;
}

// ── Helper: Sub-section with body text ──
/**
 * Bloco opcional "Diagnósticos diferenciais considerados".
 * Só é renderizado quando o profissional marcou `includeInPdf` no prontuário.
 */
function renderDifferentialBlock(
  doc: jsPDF,
  y: number,
  differential: Diagnosis["differentialDiagnosis"],
  isPt: boolean,
): number {
  const items = (differential?.differentials || []).filter((d) => d?.hypothesis);
  if (!differential?.includeInPdf || items.length === 0) return y;

  const plausibilityLabel = (p?: string) =>
    isPt
      ? p === "high" ? "plausibilidade alta" : p === "low" ? "plausibilidade baixa" : "plausibilidade média"
      : p === "high" ? "high plausibility" : p === "low" ? "low plausibility" : "medium plausibility";

  y = checkPage(doc, y, 40);
  y += 4;
  y = renderSectionTitle(
    doc, y,
    isPt ? "Diagnósticos Diferenciais Considerados" : "Differential Diagnoses Considered",
    COLORS.primary,
    30,
  );

  for (const item of items) {
    const parts: string[] = [];
    if (item.competesBecause) parts.push(`${isPt ? "Por que compete" : "Why it competes"}: ${item.competesBecause}`);
    if (item.arguesAgainst) parts.push(`${isPt ? "O que fala contra" : "Arguments against"}: ${item.arguesAgainst}`);
    if (item.discriminators?.length) {
      parts.push(`${isPt ? "Como diferenciar" : "How to differentiate"}: ${item.discriminators.join(" | ")}`);
    }
    if (item.whyItMatters) parts.push(`${isPt ? "Por que importa" : "Why it matters"}: ${item.whyItMatters}`);

    const label = `${item.hypothesis} (${plausibilityLabel(item.plausibility)}${item.referralFlag ? isPt ? " — triagem médica" : " — medical screening" : ""})`;

    y = drawTextCard(doc, y, parts.join("\n"), {
      fill: COLORS.background,
      stroke: COLORS.border,
      padX: 7,
      padY: 6,
      label: { text: label, color: COLORS.foreground, size: 9 },
      body: { font: "Inter", weight: "normal", size: 8, lineHeight: 4, textColor: COLORS.muted },
    });
    y += 2;
  }

  doc.setFont("Inter", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  y = checkPage(doc, y, 8);
  doc.text(
    isPt
      ? "Hipóteses concorrentes levantadas como apoio ao raciocínio clínico. A decisão diagnóstica é do fisioterapeuta responsável."
      : "Competing hypotheses raised to support clinical reasoning. The diagnostic decision belongs to the attending physiotherapist.",
    SECTION_X, y,
  );
  y += 6;
  doc.setFont("Inter", "normal");

  return y;
}

function renderSubSection(doc: jsPDF, y: number, title: string, body: string): number {
  const LH = 3.5;
  doc.setFontSize(8);
  const lines: string[] = doc.splitTextToSize(body, SECTION_TEXT_W);

  const drawTitle = (yy: number) => {
    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    doc.text(title, SECTION_X, yy);
    doc.setFont("Inter", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    return yy + 5;
  };

  // Keep the title with at least 5 lines of body — otherwise start a new page.
  const minGroup = 5 + Math.min(lines.length, 5) * LH + 4;
  y = checkPage(doc, y, minGroup);
  y = drawTitle(y);

  // Paginate the body line by line so text never runs over the footer.
  let i = 0;
  while (i < lines.length) {
    const fit = Math.max(1, Math.floor((PAGE_BOTTOM - y) / LH));
    const chunk = lines.slice(i, i + fit);
    doc.text(chunk, SECTION_X, y);
    y += chunk.length * LH;
    i += chunk.length;
    if (i < lines.length) {
      doc.addPage();
      y = MARGIN;
      doc.setFont("Inter", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
    }
  }
  return y + 6;
}

// ── Evolution Report PDF ──
export interface EvolutionSummary {
  narrative: string;
  painChange: string;
  anamnesisSynthesis?: string;
  questionnaireAnalysis?: string;
  objectiveFindings?: string;
  sessionNotesSynthesis?: string;
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
    /** Joint mobility / ROM table measured at the last assessment. */
    romTable?: Array<{ joint: string; leftValue: string; rightValue: string }>;
    spineBiomechanics?: SpineBiomechanicsData;
  };
  /**
   * Every assessment (any order) carrying objective measures. Feeds the
   * longitudinal evolution charts (ROM ° / dynamometry kgf) — movements with
   * 2+ dated numeric measurements get a line chart with first/last captions.
   */
  longitudinalAssessments?: Array<{
    date: string;
    spineBiomechanics?: SpineBiomechanicsData;
    romTable?: Array<{ joint: string; leftValue: string; rightValue: string }>;
    strengthTable?: Array<{
      movement: string;
      leftValue: string;
      rightValue: string;
      leftTrials?: Array<{ value: string }>;
      rightTrials?: Array<{ value: string }>;
    }>;
  }>;
  totalAssessments: number;
  summary: EvolutionSummary;
  language: string;
  professionalLogoUrl?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
  brandColor?: string;
  responsibleProfessional?: ResponsibleProfessional;
}

export async function generateEvolutionPdfBlob(options: EvolutionPdfOptions): Promise<Blob> {
  const doc = createPdfDoc();
  applyPdfBranding(doc, options.brandColor);
  const isPt = options.language === "pt";
  const isEs = options.language === "es";
  let y = MARGIN;

  // Load logos — clinic logo replaces Aliv.iA logo when present
  const isClinicBranded = !!(options.clinicName || options.clinicLogoUrl);
  const logoBase64 = options.clinicLogoUrl ? (await loadExternalImageAsBase64(options.clinicLogoUrl) || await loadLogoBase64()) : await loadLogoBase64();
  const proLogoBase64 = (!isClinicBranded && options.professionalLogoUrl) ? await loadExternalImageAsBase64(options.professionalLogoUrl) : null;

  // ── Header Band ──
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  const logoH = 14;
  const logoMaxW = isClinicBranded ? 40 : 14;
  const logoY = (38 - logoH) / 2;
  let textStartX = MARGIN;
  if (logoBase64) {
    const w = drawBrandLogo(doc, logoBase64, MARGIN, logoY, logoMaxW, logoH);
    textStartX = MARGIN + w + 3;
  }
  let rightReservedW = 0;
  if (proLogoBase64) {
    const proMaxW = 28;
    const w = drawBrandLogo(doc, proLogoBase64, PAGE_WIDTH - MARGIN - proMaxW, logoY, proMaxW, logoH, "right");
    rightReservedW = w + 4;
  }
  doc.setFont("Inter", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...pdfBrandPalette(options.brandColor).foreground);
  const titleY = logoY + logoH / 2 + 2;
  const titleMaxW = PAGE_WIDTH - MARGIN - textStartX - Math.max(rightReservedW, 30);
  const headerTitle = isClinicBranded && options.clinicName ? options.clinicName : "Aliv.iA";
  doc.text(truncateToWidth(doc, headerTitle, titleMaxW), textStartX, titleY);
  doc.setFontSize(11);
  doc.setFont("Inter", "normal");
  const reportTitle = isPt ? "Relatório de Evolução" : isEs ? "Informe de Evolución" : "Evolution Report";
  doc.text(truncateToWidth(doc, reportTitle, titleMaxW), textStartX, titleY + 9);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : isEs ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, PAGE_WIDTH - MARGIN - doc.getTextWidth(dateStr), 33);
  y = 48;

  // ── Patient Info + Period ──
  const firstDate = new Date(options.firstAssessment.date).toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  const lastDate = new Date(options.lastAssessment.date).toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  const periodText = `${firstDate} → ${lastDate} (${options.totalAssessments} ${isPt ? "avaliações" : isEs ? "evaluaciones" : "assessments"})`;

  drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 20, 4, COLORS.background, COLORS.border);
  doc.setFont("Inter", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  const pLabel = isPt ? "Paciente: " : "Patient: ";
  doc.text(pLabel, MARGIN + 6, y + 8);
  doc.setFont("Inter", "normal");
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
    doc.setFont("Inter", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(isPt ? "1ª Avaliação" : "1st Assessment", MARGIN + 6, y + 8);
    doc.setFont("Inter", "bold");
    doc.setFontSize(18);
    const firstColor: [number, number, number] = firstScore <= 3 ? COLORS.green : firstScore <= 6 ? COLORS.yellow : COLORS.red;
    doc.setTextColor(...firstColor);
    doc.text(`${firstScore}/10`, MARGIN + 6, y + 22);

    // Last assessment box
    const lastX = MARGIN + colW + 8;
    drawRoundedRect(doc, lastX, y, colW, boxH, 4, COLORS.background, COLORS.border);
    doc.setFont("Inter", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(isPt ? "Última Avaliação" : "Last Assessment", lastX + 6, y + 8);
    doc.setFont("Inter", "bold");
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
    doc.setFont("Inter", "bold");
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

    // Reserve the real first content block before drawing the heading. The
    // table itself paginates row by row, so it must not run a second whole-table
    // break that could strand the title on the previous page.
    const firstComparisonContentH = matched.length > 0 ? 17 : 10;
    y = renderSectionTitle(
      doc,
      y,
      isPt ? "Questionários Funcionais" : "Functional Questionnaires",
      COLORS.primary,
      firstComparisonContentH,
    );

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
      y = checkPage(doc, y, 17);
      drawRoundedRect(doc, MARGIN, y, CONTENT_WIDTH, 8, 2, COLORS.primary);
      doc.setFont("Inter", "bold");
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
        doc.setFont("Inter", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.foreground);
        doc.text(row.name, cx, y + 5);
        cx += colWidths[0];

        doc.setFont("Inter", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(`${row.firstPct}%`, cx, y + 5);
        cx += colWidths[1];
        doc.text(`${row.lastPct}%`, cx, y + 5);
        cx += colWidths[2];

        const changeColor: [number, number, number] = row.change < 0 ? COLORS.green : row.change > 0 ? COLORS.red : COLORS.muted;
        doc.setFont("Inter", "bold");
        doc.setTextColor(...changeColor);
        const sign = row.change > 0 ? "+" : "";
        doc.text(`${sign}${row.change}%`, cx, y + 5);

        y += 7;
      }
      y += 4;
    }

    // Exclusive questionnaires
    if (onlyFirst.length > 0 || onlyLast.length > 0) {
      doc.setFont("Inter", "italic");
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
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.green);
      doc.text(isPt ? "✓ Resolvidas:" : "✓ Resolved:", SECTION_X, y);
      y += 4;
      doc.setFont("Inter", "normal");
      doc.setFontSize(7);
      const resolvedText = resolved.map(regionLabel).join(", ");
      const resolvedLines = doc.splitTextToSize(resolvedText, TEXT_MAX_WIDTH);
      doc.text(resolvedLines, SECTION_X + 4, y);
      y += resolvedLines.length * 3.5 + 3;
    }

    if (newRegions.length > 0) {
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.red);
      doc.text(isPt ? "✗ Novas:" : "✗ New:", SECTION_X, y);
      y += 4;
      doc.setFont("Inter", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      const newText = newRegions.map(regionLabel).join(", ");
      const newLines = doc.splitTextToSize(newText, TEXT_MAX_WIDTH);
      doc.text(newLines, SECTION_X + 4, y);
      y += newLines.length * 3.5 + 3;
    }

    if (persistent.length > 0) {
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(isPt ? "— Mantidas:" : "— Persistent:", SECTION_X, y);
      y += 4;
      doc.setFont("Inter", "normal");
      doc.setFontSize(7);
      const persistText = persistent.map(regionLabel).join(", ");
      const persistLines = doc.splitTextToSize(persistText, TEXT_MAX_WIDTH);
      doc.text(persistLines, SECTION_X + 4, y);
      y += persistLines.length * 3.5 + 3;
    }

    y += 4;
  }

  // ── Joint Mobility (ROM) — values measured at the LAST assessment ──
  const lastRom = (options.lastAssessment.romTable || []).filter(
    (r: any) => (r?.joint || "").trim() || (r?.leftValue || "").trim() || (r?.rightValue || "").trim(),
  );
  if (lastRom.length > 0) {
    const romDate = new Date(options.lastAssessment.date).toLocaleDateString(
      isPt ? "pt-BR" : isEs ? "es-ES" : "en-US",
      { day: "2-digit", month: "short", year: "numeric" },
    );
    const romCaption = isPt
      ? `Valores medidos na última avaliação (${romDate})`
      : isEs
        ? `Valores medidos en la última evaluación (${romDate})`
        : `Values measured at the last assessment (${romDate})`;
    y = renderRomTableSection(doc, y, lastRom, isPt, options.language, romCaption);
  }

  const spineExams = savedSpineExams(options.longitudinalAssessments || []);
  if (spineExams.length) {
    for (const exam of spineExams) y = renderSpineBiomechanicsSection(doc, y, exam.data, options.language, exam.date);
  } else {
    y = renderSpineBiomechanicsSection(doc, y, options.lastAssessment.spineBiomechanics, options.language, options.lastAssessment.date);
  }

  // ── Longitudinal evolution charts (ROM ° / dynamometry kgf) ──
  if (options.longitudinalAssessments && options.longitudinalAssessments.length >= 2) {
    const chartLocale = isPt ? "pt-BR" : isEs ? "es-ES" : "en-US";
    const romSeries = buildLongitudinalSeries(options.longitudinalAssessments, "rom", chartLocale);
    const strengthSeries = buildLongitudinalSeries(options.longitudinalAssessments, "strength", chartLocale);

    if (romSeries.length > 0) {
      y = checkPage(doc, y, 70);
      y = renderSectionTitle(
        doc,
        y,
        isPt
          ? "Evolução da ADM por Movimento"
          : isEs
            ? "Evolución de la Movilidad por Movimiento"
            : "ROM Evolution by Movement",
        COLORS.primary,
      );
      for (const s of romSeries) y = renderLongitudinalChartCard(doc, y, s, "°", isPt, options.language);
      y += 2;
    }

    if (strengthSeries.length > 0) {
      y = checkPage(doc, y, 70);
      y = renderSectionTitle(
        doc,
        y,
        isPt
          ? "Dinamometria — Evolução por Movimento"
          : isEs
            ? "Dinamometría — Evolución por Movimiento"
            : "Dynamometry — Evolution by Movement",
        COLORS.primary,
      );
      for (const s of strengthSeries) y = renderLongitudinalChartCard(doc, y, s, "kgf", isPt, options.language);
      y += 2;
    }
  }

  // ── AI Narrative Summary ──
  y = renderSectionTitle(doc, y, isPt ? "Resumo Narrativo (IA)" : "AI Narrative Summary", COLORS.primary);
  y = drawTextCard(doc, y, options.summary.narrative, {

    fill: COLORS.primaryLight,
    stroke: COLORS.primary,
    padX: 6,
    padY: 7,
    body: { font: "Inter", weight: "italic", size: 8, lineHeight: 4, textColor: COLORS.foreground },
    bottomSafety: 2,
  });
  y += 4;

  // ── Deep clinical analysis (optional AI sections) ──
  const deepSections: { title: string; body?: string }[] = [
    {
      title: isPt ? "Síntese da Anamnese" : isEs ? "Síntesis de la Anamnesis" : "Anamnesis Synthesis",
      body: options.summary.anamnesisSynthesis,
    },
    {
      title: isPt ? "Análise dos Questionários" : isEs ? "Análisis de los Cuestionarios" : "Questionnaire Analysis",
      body: options.summary.questionnaireAnalysis,
    },
    {
      title: isPt ? "Testes Objetivos (Dinamometria / ADM)" : isEs ? "Pruebas Objetivas (Dinamometría / ROM)" : "Objective Tests (Dynamometry / ROM)",
      body: options.summary.objectiveFindings,
    },
    {
      title: isPt ? "Evolução das Sessões" : isEs ? "Evolución de las Sesiones" : "Session Course",
      body: options.summary.sessionNotesSynthesis,
    },
  ].filter((s) => (s.body || "").trim().length > 0);

  if (deepSections.length > 0) {
    y = renderSectionTitle(doc, y, isPt ? "Análise Clínica Detalhada" : isEs ? "Análisis Clínico Detallado" : "Detailed Clinical Analysis", COLORS.primary);
    for (const section of deepSections) {
      y = renderSubSection(doc, y, section.title, (section.body || "").trim());
      y += 2;
    }
    y += 2;
  }


  // ── Conclusion + Recommendation Badge ──
  y = renderSectionTitle(doc, y, isPt ? "Conclusão" : "Conclusion", COLORS.primary);
  const conclusionLines = doc.splitTextToSize(options.summary.conclusion, TEXT_MAX_WIDTH);
  y = checkPage(doc, y, conclusionLines.length * 3.5 + 16);
  doc.setFont("Inter", "normal");
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
    body: { font: "Inter", weight: "normal", size: 7, lineHeight: 3.6, textColor: [100, 80, 80] },
    bottomSafety: 1,
  });

  // ── Responsible Technician Block (last page, before footer) ──
  if (options.responsibleProfessional) {
    y = await drawResponsibleBlock(doc, y, isPt, options.responsibleProfessional);
  }

  // ── Footer ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);

    const footerLogoH = 8;
    const footerLogoMaxW = isClinicBranded ? 22 : 12;
    let footerTextX = MARGIN;
    if (logoBase64) {
      const w = drawBrandLogo(doc, logoBase64, MARGIN, 285.5, footerLogoMaxW, footerLogoH);
      footerTextX = MARGIN + w + 2;
    }
    doc.setFontSize(7);
    doc.setFont("Inter", "normal");
    doc.setTextColor(...COLORS.muted);
    const footerLabel = isClinicBranded && options.clinicName
      ? `${options.clinicName} · Powered by Aliv.iA`
      : `Aliv.iA — ${isPt ? "Relatório de Evolução" : "Evolution Report"}`;
    const rightReserveW = 16 + (proLogoBase64 ? 14 : 0);
    const footerTextMaxW = PAGE_WIDTH - MARGIN - footerTextX - rightReserveW;
    doc.text(truncateToWidth(doc, footerLabel, footerTextMaxW), footerTextX, 290);

    let pageCounterRightOffset = 8;
    if (proLogoBase64) {
      const proFootMaxW = 18;
      const w = drawBrandLogo(doc, proLogoBase64, PAGE_WIDTH - MARGIN - proFootMaxW, 285.5, proFootMaxW, footerLogoH, "right");
      pageCounterRightOffset = w + 10;
    }
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - pageCounterRightOffset, 290);
  }

  return doc.output("blob");
}

// Helper normalize for evolution PDF
function normalizeTestResults(tr: any): any[] {
  if (Array.isArray(tr)) return tr;
  if (tr && typeof tr === "object" && Object.keys(tr).length > 0) return [tr];
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT CHAT TRANSCRIPT PDF (compact 2-column layout)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentChatPdfCitation {
  id?: string;
  title?: string;
  authors?: string;
  year?: number;
  pedro_score?: number;
  doi?: string;
  source_url?: string;
  pmid?: string;
}

export interface AgentChatPdfMessage {
  role: string;
  text: string;
  created_at?: string;
  citations?: AgentChatPdfCitation[] | null;
}

export interface AgentChatPdfOptions {
  title: string;
  messages: AgentChatPdfMessage[];
  professionalName?: string | null;
  patientName?: string | null;
  createdAt?: string | null;
}

/**
 * Renders a Clinical Agent conversation as a compact, newspaper-style
 * 2-column transcript so a long chat fits in very few pages.
 */
export async function generateAgentChatPdfBlob(options: AgentChatPdfOptions): Promise<Blob> {
  const doc = createPdfDoc();

  const COL_GAP = 8;
  const COL_W = (SECTION_TEXT_W - COL_GAP) / 2;
  const COL_X = [SECTION_X, SECTION_X + COL_W + COL_GAP];
  const TOP = MARGIN;
  const BOTTOM = PAGE_BOTTOM;

  let col = 0;
  let y = TOP;
  /** Top of the columns on the current page (first page reserves the header). */
  let columnTop = TOP;

  const nextColumn = () => {
    if (col === 0) {
      col = 1;
      y = columnTop;
    } else {
      doc.addPage();
      col = 0;
      columnTop = TOP;
      y = columnTop;
    }
  };

  /** Ensures `needed` mm are available in the current column. */
  const ensure = (needed: number) => {
    if (y + needed > BOTTOM) nextColumn();
  };

  // ── Header (full width, first page only) ────────────────────────────────
  const metaBits: string[] = [];
  if (options.professionalName) metaBits.push(`Profissional: ${options.professionalName}`);
  if (options.patientName) metaBits.push(`Paciente: ${options.patientName}`);
  if (options.createdAt) {
    metaBits.push(`Conversa iniciada em ${new Date(options.createdAt).toLocaleDateString("pt-BR")}`);
  }
  metaBits.push(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`);

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  const metaLines: string[] = (doc.splitTextToSize(metaBits.join(" · "), SECTION_TEXT_W) as string[]).slice(0, 2);
  const headerH = 22 + metaLines.length * 4;

  drawRoundedRect(doc, MARGIN, MARGIN - 6, CONTENT_WIDTH, headerH, 3, COLORS.primaryLight, COLORS.border);

  doc.setFont("Inter", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text("Aliv.iA", SECTION_X, MARGIN + 2);

  doc.setFont("Inter", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(
    truncateToWidth(doc, "Registro de Conversa — Agente de Raciocínio Clínico", SECTION_TEXT_W),
    SECTION_X,
    MARGIN + 8,
  );

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(metaLines, SECTION_X, MARGIN + 12.5, { lineHeightFactor: 1.3 });

  doc.setFont("Inter", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.foreground);
  doc.text(
    truncateToWidth(doc, sanitizePdfText(options.title) || "Conversa", SECTION_TEXT_W),
    SECTION_X,
    MARGIN + 12.5 + metaLines.length * 4 + 2,
  );

  columnTop = MARGIN - 6 + headerH + 4;
  y = columnTop;

  // ── Messages ────────────────────────────────────────────────────────────
  const PAD = 2;
  const LINE_H = 3.4;

  for (const msg of options.messages) {
    const isUser = msg.role === "user";
    const label = isUser ? "Você" : "Aliv.iA";
    const time = msg.created_at
      ? new Date(msg.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";
    const body = sanitizePdfText(msg.text);
    if (!body) continue;

    doc.setFont("Inter", "normal");
    doc.setFontSize(7.5);
    const lines: string[] = doc.splitTextToSize(body, COL_W - PAD * 2 - 2);

    // Header (label) must never be orphaned: require label + 2 lines of text.
    ensure(5 + LINE_H * Math.min(2, lines.length) + PAD * 2);

    let index = 0;
    let first = true;
    while (index < lines.length) {
      const available = BOTTOM - y;
      const headerH = first ? 5 : 0;
      const capacity = Math.max(1, Math.floor((available - headerH - PAD * 2) / LINE_H));
      const chunk = lines.slice(index, index + capacity);
      const boxH = headerH + chunk.length * LINE_H + PAD * 2;

      drawRoundedRect(
        doc,
        COL_X[col],
        y,
        COL_W,
        boxH,
        1.5,
        isUser ? COLORS.white : COLORS.primaryLight,
        COLORS.border,
      );

      let ty = y + PAD + 2.6;
      if (first) {
        doc.setFont("Inter", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(...(isUser ? COLORS.muted : COLORS.primary));
        doc.text(label, COL_X[col] + PAD + 1, ty);
        if (time) {
          doc.setFont("Inter", "normal");
          doc.setTextColor(...COLORS.muted);
          doc.text(time, COL_X[col] + COL_W - PAD - 1, ty, { align: "right" });
        }
        ty += 4.4;
      }

      doc.setFont("Inter", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.foreground);
      for (const line of chunk) {
        doc.text(line, COL_X[col] + PAD + 1, ty);
        ty += LINE_H;
      }

      y += boxH + 2;
      index += chunk.length;
      first = false;
      if (index < lines.length) nextColumn();
    }
  }

  // ── Scientific references ───────────────────────────────────────────────
  const seen = new Set<string>();
  const refs: AgentChatPdfCitation[] = [];
  for (const msg of options.messages) {
    for (const c of msg.citations || []) {
      const key = (c.doi || c.pmid || c.source_url || c.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      refs.push(c);
    }
  }

  if (refs.length > 0) {
    ensure(14);
    doc.setFont("Inter", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("Referências científicas", COL_X[col], y + 3);
    y += 7;

    refs.forEach((ref, i) => {
      const parts: string[] = [];
      const head = `${i + 1}. ${sanitizePdfText(ref.title) || "Referência"}`;
      const detail: string[] = [];
      if (ref.authors) detail.push(sanitizePdfText(ref.authors));
      if (ref.year) detail.push(String(ref.year));
      if (typeof ref.pedro_score === "number") detail.push(`PEDro ${ref.pedro_score}`);
      if (ref.pmid) detail.push(`PMID ${ref.pmid}`);
      else if (ref.doi) detail.push(`DOI ${ref.doi}`);
      parts.push(head);
      if (detail.length) parts.push(detail.join(" · "));

      doc.setFont("Inter", "normal");
      doc.setFontSize(7);
      const refLines: string[] = doc.splitTextToSize(parts.join("\n"), COL_W - 2);
      ensure(refLines.length * 3.1 + 2);
      doc.setTextColor(...COLORS.foreground);
      let ry = y + 2.4;
      for (const line of refLines) {
        doc.text(line, COL_X[col], ry);
        ry += 3.1;
      }
      y += refLines.length * 3.1 + 2.5;
    });
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);
    doc.setFont("Inter", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      truncateToWidth(
        doc,
        "Aliv.iA — Registro de conversa do Agente de Raciocínio Clínico. Apoio ao raciocínio clínico; não substitui avaliação.",
        CONTENT_WIDTH - 16,
      ),
      MARGIN,
      288,
    );
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN, 288, { align: "right" });
  }

  return doc.output("blob");
}

/** Standalone export of saved, dated measurements. No AI inference. */
export async function generateMeasurementPdfBlob(options: {
  kind: "strength" | "questionnaires";
  patientName: string;
  date: string;
  language: string;
  strengthTable?: AnamnesisData["strengthTable"];
  questionnaireResults?: any[];
  specialtyResults?: any[];
} & Pick<PdfOptions, "professionalLogoUrl" | "clinicLogoUrl" | "clinicName" | "brandColor" | "responsibleProfessional">): Promise<Blob> {
  const doc = createPdfDoc();
  applyPdfBranding(doc, options.brandColor);
  const isPt = options.language === "pt";
  const isEs = options.language === "es";
  const title = options.kind === "strength"
    ? (isPt ? "Relatório de dinamometria" : isEs ? "Informe de dinamometría" : "Dynamometry report")
    : (isPt ? "Relatório de questionário" : isEs ? "Informe de cuestionario" : "Questionnaire report");
  const logo = options.clinicLogoUrl || options.professionalLogoUrl;
  const logoData = logo ? await loadExternalImageAsBase64(logo) : await loadLogoBase64();
  if (logoData) drawBrandLogo(doc, logoData, SECTION_X, 15, 36, 16);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  const brandLines = doc.splitTextToSize(options.clinicName || "Aliv.iA", SECTION_TEXT_W - 42);
  doc.text(brandLines, SECTION_X + 42, 21);
  let y = Math.max(40, 24 + brandLines.length * 5);
  y = renderSectionTitle(doc, y, title, COLORS.primary);
  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  const locale = isPt ? "pt-BR" : isEs ? "es-ES" : "en-US";
  for (const text of [
    `${isPt || isEs ? "Paciente" : "Patient"}: ${options.patientName}`,
    `${isPt ? "Avaliação" : isEs ? "Evaluación" : "Assessment"}: ${new Date(options.date).toLocaleDateString(locale)}`,
  ]) {
    const lines = doc.splitTextToSize(text, SECTION_TEXT_W);
    doc.text(lines, SECTION_X, y);
    y += lines.length * 4.2 + 2;
  }
  y += 4;
  if (options.kind === "strength") {
    y = renderStrengthTableSection(doc, y, options.strengthTable, isPt, options.language);
  } else {
    y = renderTestResultsSection(doc, y, options.questionnaireResults, isPt, options.language);
    y = renderSpecialtyResultsSection(doc, y, options.specialtyResults || [], isPt);
  }
  if (options.responsibleProfessional) await drawResponsibleBlock(doc, y + 6, isPt, options.responsibleProfessional);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);
    doc.setFont("Inter", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("Aliv.iA", SECTION_X, 290);
    doc.text(`${i}/${pages}`, PAGE_WIDTH - SECTION_X, 290, { align: "right" });
  }
  return doc.output("blob");
}
