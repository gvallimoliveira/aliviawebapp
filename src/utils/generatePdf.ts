import jsPDF from "jspdf";

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

interface PdfOptions {
  diagnosis: Diagnosis;
  treatmentPlan: TreatmentPlanData;
  language: "pt" | "en";
  userName?: string;
}

// Design tokens from webapp (HSL converted to RGB)
const COLORS = {
  primary: [39, 124, 103] as [number, number, number],       // hsl(168,55%,38%)
  primaryLight: [230, 245, 241] as [number, number, number],  // light teal bg
  foreground: [35, 28, 22] as [number, number, number],       // hsl(20,30%,12%)
  muted: [120, 110, 100] as [number, number, number],         // muted text
  accent: [250, 225, 210] as [number, number, number],        // hsl(24,80%,92%)
  accentDark: [180, 100, 50] as [number, number, number],     // warm accent
  background: [252, 250, 247] as [number, number, number],    // hsl(30,50%,98%)
  border: [220, 215, 208] as [number, number, number],        // hsl(30,20%,88%)
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

export function generateAssessmentPdf({ diagnosis, treatmentPlan, language, userName }: PdfOptions) {
  const doc = new jsPDF();
  const isPt = language === "pt";
  let y = MARGIN;

  // ── Header Band ──
  drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 38, 0, COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text("Aliv.iA", MARGIN, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(isPt ? "Relatório Clínico Personalizado" : "Personalized Clinical Report", MARGIN, 27);
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
    doc.text(pc.label[language] || phase.id, MARGIN + 6, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const durText = phase.duration;
    doc.text(durText, PAGE_WIDTH - MARGIN - 6 - doc.getTextWidth(durText), y + 9);
    y += 18;

    // Goal & Focus
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.foreground);
    const goalLabel = isPt ? "Objetivo: " : "Goal: ";
    doc.text(goalLabel, MARGIN + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    const goalLines = doc.splitTextToSize(phase.goal, CONTENT_WIDTH - 4 - doc.getTextWidth(goalLabel));
    doc.text(goalLines, MARGIN + 2 + doc.getTextWidth(goalLabel), y);
    y += goalLines.length * 3.5 + 4;

    // Exercises
    for (const ex of phase.exercises) {
      const descLines = doc.splitTextToSize(ex.description, CONTENT_WIDTH - 20);
      const exH = 10 + descLines.length * 3.5 + 8;
      y = checkPage(doc, y, exH);

      // Exercise card
      drawRoundedRect(doc, MARGIN + 2, y, CONTENT_WIDTH - 4, exH, 3, COLORS.background, COLORS.border);

      // Exercise name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.foreground);
      doc.text(ex.name, MARGIN + 8, y + 6);

      // Category badge
      const catLabels: Record<string, Record<string, string>> = {
        stretching: { pt: "Along.", en: "Stretch" },
        strengthening: { pt: "Fortal.", en: "Strength" },
        mobility: { pt: "Mobilid.", en: "Mobility" },
        breathing: { pt: "Respir.", en: "Breath" },
        stability: { pt: "Estabil.", en: "Stability" },
        pain_management: { pt: "Dor", en: "Pain Mgmt" },
      };
      const catText = (catLabels[ex.category]?.[language] || ex.category).toUpperCase();
      const catTw = doc.getTextWidth(catText) + 1;
      drawRoundedRect(doc, PAGE_WIDTH - MARGIN - 6 - catTw - 6, y + 1.5, catTw + 8, 7, 2, COLORS.accent);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.foreground);
      doc.text(catText, PAGE_WIDTH - MARGIN - 6 - catTw - 2, y + 6);

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(descLines, MARGIN + 8, y + 12);

      // Sets/reps/frequency
      const metaY = y + 12 + descLines.length * 3.5 + 2;
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.primary);
      doc.setFont("helvetica", "bold");
      const meta = `${ex.sets} ${isPt ? "séries" : "sets"} × ${ex.reps}  |  ${ex.frequency}`;
      doc.text(meta, MARGIN + 8, metaY);

      y += exH + 3;
    }
    y += 4;
  }

  // ── General Guidelines ──
  if (treatmentPlan.generalGuidelines?.length) {
    y = checkPage(doc, y, 20);
    y = renderSectionTitle(doc, y, isPt ? "Orientações Gerais" : "General Guidelines", COLORS.primary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    for (const g of treatmentPlan.generalGuidelines) {
      y = checkPage(doc, y, 10);
      doc.setTextColor(...COLORS.primary);
      doc.text("✓", MARGIN + 2, y);
      doc.setTextColor(...COLORS.foreground);
      const lines = doc.splitTextToSize(g, CONTENT_WIDTH - 10);
      doc.text(lines, MARGIN + 8, y);
      y += lines.length * 3.5 + 3;
    }
    y += 4;
  }

  // ── Progression Criteria ──
  if (treatmentPlan.progressionCriteria) {
    y = checkPage(doc, y, 20);
    y = renderSubSection(doc, y, isPt ? "Critérios de Progressão" : "Progression Criteria", treatmentPlan.progressionCriteria);
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

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Aliv.iA — ${isPt ? "Relatório gerado por IA" : "AI-generated report"}`, MARGIN, 290);
    doc.text(`${i}/${totalPages}`, PAGE_WIDTH - MARGIN - 8, 290);
    // Bottom accent line
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
