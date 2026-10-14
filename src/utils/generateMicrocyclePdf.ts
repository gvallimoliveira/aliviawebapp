import jsPDF from "jspdf";
import { applyPdfBranding } from "@/lib/pdfBranding";
import { drawBrandLogo, loadExternalImageAsBase64 } from "./generatePdf";
import { registerInterFonts } from "./fonts/registerInterFonts";
import { plannedLoad } from "@/lib/periodization";
import type { PeriodizationSession } from "@/lib/periodizationData";
import { PLANNED_LOAD_LABEL, TRACK_LABEL } from "@/components/dashboard/periodization/scales";

/**
 * Relatório do microciclo semanal planejado — feito para ser entregue ao
 * paciente ("como será a sua semana"). Segue as mesmas margens dos outros PDFs
 * do app: conteúdo útil de 158mm.
 */

const COLORS = {
  primary: [39, 124, 103] as [number, number, number],
  primaryLight: [230, 245, 241] as [number, number, number],
  foreground: [35, 28, 22] as [number, number, number],
  muted: [120, 110, 100] as [number, number, number],
  border: [220, 215, 208] as [number, number, number],
  soft: [246, 244, 240] as [number, number, number],
};

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 170mm
const SECTION_X = MARGIN + 6;
const TEXT_W = CONTENT_WIDTH - 12; // 158mm
const PAGE_BOTTOM = 275;

const DOW = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export interface MicrocyclePdfOptions {
  weekStart: string; // segunda-feira (YYYY-MM-DD)
  sessions: PeriodizationSession[];
  patientName?: string | null;
  professionalName?: string | null;
  sport?: string | null;
  /** Fase atual do macrociclo marcada pelo profissional. */
  currentPhase?: string | null;
  notes?: string | null;
  clinicName?: string;
  clinicLogoUrl?: string;
  professionalLogoUrl?: string;
  brandColor?: string;
}

export async function generateMicrocyclePdfBlob(options: MicrocyclePdfOptions): Promise<Blob> {
  const doc = new jsPDF();
  applyPdfBranding(doc, options.brandColor);
  registerInterFonts(doc);
  doc.setFont("Inter", "normal");

  const days = Array.from({ length: 7 }, (_, i) => addDays(options.weekStart, i));
  const byDay = new Map<string, PeriodizationSession[]>();
  options.sessions.forEach((s) => {
    const key = s.session_date.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) || []), s]);
  });

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  const metaBits: string[] = [];
  if (options.patientName) metaBits.push(`Paciente: ${options.patientName}`);
  if (options.professionalName) metaBits.push(`Profissional: ${options.professionalName}`);
  if (options.sport) metaBits.push(`Atividade: ${options.sport}`);
  metaBits.push(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`);

  const logoUrl = options.clinicLogoUrl || options.professionalLogoUrl;
  const logo = logoUrl ? await loadExternalImageAsBase64(logoUrl) : null;
  const headerTextW = TEXT_W - (logo ? 34 : 0);
  doc.setFontSize(8);
  const metaLines = (doc.splitTextToSize(metaBits.join(" · "), headerTextW) as string[]).slice(0, 2);
  const headerH = 24 + metaLines.length * 4;

  doc.setFillColor(...COLORS.primaryLight);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, MARGIN - 6, CONTENT_WIDTH, headerH, 3, 3, "FD");

  doc.setFont("Inter", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  const title = options.clinicName || "Aliv.iA";
  while (doc.getTextWidth(title) > headerTextW && doc.getFontSize() > 8) doc.setFontSize(doc.getFontSize() - 1);
  doc.text(doc.splitTextToSize(title, headerTextW), SECTION_X, MARGIN + 2);
  if (logo) drawBrandLogo(doc, logo, SECTION_X + TEXT_W - 28, MARGIN - 2, 28, 14, "right");

  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.foreground);
  doc.text("Plano da semana — microciclo", SECTION_X, MARGIN + 8);

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(metaLines, SECTION_X, MARGIN + 12.5, { lineHeightFactor: 1.3 });

  doc.setFont("Inter", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.foreground);
  doc.text(
    `${fmt(options.weekStart)} a ${fmt(days[6])}${options.currentPhase ? ` · Fase: ${options.currentPhase}` : ""}`,
    SECTION_X,
    MARGIN + 12.5 + metaLines.length * 4 + 2,
  );

  let y = MARGIN - 6 + headerH + 8;

  const ensure = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Dias ─────────────────────────────────────────────────────────────────
  days.forEach((date, i) => {
    const items = byDay.get(date) || [];

    // Medimos com a MESMA fonte/tamanho do desenho, para a caixa nunca
    // ficar menor que o texto (fonte de erros de sobreposição em PDF).
    doc.setFont("Inter", "normal");
    doc.setFontSize(8.5);
    const measured = items.map((s) => {
      const track = TRACK_LABEL[s.track] || s.track;
      const level = PLANNED_LOAD_LABEL[s.planned_load] || s.planned_load;
      const isRest = s.planned_load === "rest" || plannedLoad(s.planned_duration_min, s.planned_rpe) <= 0;
      const dose = isRest
        ? "duração e esforço a combinar na sessão"
        : `${s.planned_duration_min} min · esforço alvo ${s.planned_rpe}/10 · intensidade ${String(level).toLowerCase()}`;
      const detail = `${dose}${s.title ? ` — ${s.title}` : ""}`;
      return { track, lines: doc.splitTextToSize(detail, TEXT_W - 8) as string[] };
    });

    const itemsH = measured.reduce((acc, m) => acc + 4.5 + m.lines.length * 4, 0);
    const rowH = items.length === 0 ? 15 : 9 + itemsH + 1;
    ensure(rowH + 2);

    doc.setFillColor(...(items.length ? COLORS.soft : COLORS.primaryLight));
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, rowH, 2.5, 2.5, "FD");

    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.foreground);
    doc.text(`${DOW[i]} · ${fmt(date)}`, SECTION_X, y + 6);

    if (items.length === 0) {
      doc.setFont("Inter", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text("Descanso — sem sessão planejada", SECTION_X, y + 11.5);
    } else {
      let ly = y + 11.5;
      measured.forEach((m) => {
        doc.setFont("Inter", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.primary);
        doc.text(`• ${m.track}`, SECTION_X, ly);

        doc.setFont("Inter", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.foreground);
        doc.text(m.lines, SECTION_X + 4, ly + 4, { lineHeightFactor: 1.35 });
        ly += 4.5 + m.lines.length * 4;
      });
    }

    y += rowH + 2;
  });

  // ── Como usar / legenda ──────────────────────────────────────────────────
  const guide = [
    "O esforço alvo (0 a 10) é a percepção de dificuldade da sessão: 3 é leve, 5-6 moderado, 8 é difícil.",
    "Depois de cada sessão, registre no seu link de check-in quanto tempo treinou e o esforço que sentiu.",
    "Dor que aumenta muito ou permanece no dia seguinte é sinal para reduzir a dose e avisar seu profissional.",
  ];
  if (options.notes) guide.push(options.notes);

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  const guideLines = guide.flatMap((g) => doc.splitTextToSize(`• ${g}`, TEXT_W - 4) as string[]);
  const boxH = 10 + guideLines.length * 4;
  ensure(boxH + 4);

  doc.setFillColor(...COLORS.primaryLight);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 2.5, 2.5, "FD");
  doc.setFont("Inter", "bold");
  doc.setTextColor(...COLORS.foreground);
  doc.text("Como acompanhar a semana", SECTION_X, y + 6);
  doc.setFont("Inter", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text(guideLines, SECTION_X, y + 11, { lineHeightFactor: 1.35 });

  return doc.output("blob");
}

/** Gera e baixa o PDF do microciclo. */
export async function downloadMicrocyclePdf(options: MicrocyclePdfOptions): Promise<void> {
  const blob = await generateMicrocyclePdfBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Semana_${options.weekStart}${options.patientName ? `_${options.patientName.replace(/\s+/g, "_")}` : ""}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
