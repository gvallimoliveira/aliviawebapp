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
}

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function checkPage(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > 280) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

export function generateAssessmentPdf({ diagnosis, treatmentPlan, language }: PdfOptions) {
  const doc = new jsPDF();
  const isPt = language === "pt";
  let y = MARGIN;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MoveWell", MARGIN, y);
  y += 8;
  doc.setFontSize(14);
  doc.text(isPt ? "Relatório Clínico" : "Clinical Report", MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" }), MARGIN, y);
  doc.setTextColor(0);
  y += 4;
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // Diagnosis Section
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isPt ? "Hipótese Diagnóstica" : "Diagnostic Hypothesis", MARGIN, y);
  y += 7;

  doc.setFontSize(11);
  doc.text(diagnosis.hypothesis, MARGIN, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const confidenceLabel = isPt ? "Nível de confiança" : "Confidence level";
  const confidenceMap: Record<string, string> = isPt
    ? { low: "Baixo", moderate: "Moderado", high: "Alto" }
    : { low: "Low", moderate: "Moderate", high: "High" };
  doc.text(`${confidenceLabel}: ${confidenceMap[diagnosis.confidence] || diagnosis.confidence}`, MARGIN, y);
  y += 8;

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(isPt ? "Resumo" : "Summary", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(diagnosis.summary, CONTENT_WIDTH);
  y = checkPage(doc, y, summaryLines.length * 4);
  doc.text(summaryLines, MARGIN, y);
  y += summaryLines.length * 4 + 6;

  // Explanation
  if (diagnosis.explanation) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(isPt ? "O que está acontecendo?" : "What's happening?", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(diagnosis.explanation, CONTENT_WIDTH);
    y = checkPage(doc, y, lines.length * 4);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 6;
  }

  // Reasoning
  if (diagnosis.reasoning) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(isPt ? "Raciocínio clínico" : "Clinical reasoning", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(diagnosis.reasoning, CONTENT_WIDTH);
    y = checkPage(doc, y, lines.length * 4);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 6;
  }

  // Treatment Plan
  y = checkPage(doc, y, 20);
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isPt ? "Plano de Tratamento" : "Treatment Plan", MARGIN, y);
  y += 10;

  const phaseNames: Record<string, Record<string, string>> = {
    pt: { short_term: "Fase 1 — Curto Prazo", medium_term: "Fase 2 — Médio Prazo", long_term: "Fase 3 — Longo Prazo" },
    en: { short_term: "Phase 1 — Short Term", medium_term: "Phase 2 — Medium Term", long_term: "Phase 3 — Long Term" },
  };

  for (const phase of treatmentPlan.phases) {
    y = checkPage(doc, y, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(phaseNames[language][phase.id] || phase.id, MARGIN, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`${phase.duration} | ${isPt ? "Objetivo" : "Goal"}: ${phase.goal}`, MARGIN, y);
    doc.setTextColor(0);
    y += 6;

    for (const ex of phase.exercises) {
      y = checkPage(doc, y, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`• ${ex.name}`, MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(ex.description, CONTENT_WIDTH - 6);
      y = checkPage(doc, y, descLines.length * 3.5);
      doc.text(descLines, MARGIN + 4, y);
      y += descLines.length * 3.5 + 1;
      doc.setTextColor(100);
      doc.text(`${ex.sets} ${isPt ? "séries" : "sets"} × ${ex.reps} | ${ex.frequency}`, MARGIN + 4, y);
      doc.setTextColor(0);
      y += 6;
    }
    y += 4;
  }

  // Guidelines
  if (treatmentPlan.generalGuidelines?.length) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(isPt ? "Orientações Gerais" : "General Guidelines", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const g of treatmentPlan.generalGuidelines) {
      y = checkPage(doc, y, 8);
      const lines = doc.splitTextToSize(`• ${g}`, CONTENT_WIDTH - 4);
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * 4 + 2;
    }
    y += 4;
  }

  // Disclaimer
  y = checkPage(doc, y, 30);
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text(isPt ? "AVISO IMPORTANTE" : "IMPORTANT DISCLAIMER", MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  const disclaimer = isPt
    ? "Este relatório foi gerado por um sistema de inteligência artificial e tem caráter exclusivamente informativo e educacional. Ele NÃO substitui uma consulta médica, avaliação fisioterapêutica presencial ou qualquer outro atendimento profissional de saúde. As hipóteses diagnósticas e sugestões de tratamento apresentadas devem ser validadas por um profissional habilitado antes de serem seguidas. Em caso de dor intensa, piora dos sintomas ou qualquer emergência, procure atendimento médico imediatamente."
    : "This report was generated by an artificial intelligence system and is for informational and educational purposes only. It does NOT replace a medical consultation, in-person physiotherapy assessment, or any other professional healthcare. The diagnostic hypotheses and treatment suggestions presented must be validated by a qualified professional before being followed. In case of severe pain, worsening symptoms, or any emergency, seek medical attention immediately.";

  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH);
  y = checkPage(doc, y, disclaimerLines.length * 3.5);
  doc.text(disclaimerLines, MARGIN, y);

  doc.save(`MoveWell_${isPt ? "Relatorio" : "Report"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
