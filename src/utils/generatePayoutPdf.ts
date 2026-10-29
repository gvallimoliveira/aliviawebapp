import jsPDF from "jspdf";
import { applyPdfBranding } from "@/lib/pdfBranding";
import { drawBrandLogo, loadExternalImageAsBase64 } from "./generatePdf";
import { registerInterFonts } from "./fonts/registerInterFonts";
import type { ProfessionalPayout } from "@/lib/payouts";

/** Demonstrativo mensal de repasse por profissional (158mm úteis). */
const MARGIN = 20, X = MARGIN + 6, W = 158, BOTTOM = 275;
const FG: [number, number, number] = [35, 28, 22], MUTED: [number, number, number] = [120, 110, 100], LINE: [number, number, number] = [220, 215, 208];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dmy = (iso: string) => iso.split("-").reverse().join("/");

export async function downloadPayoutPdf(o: { payout: ProfessionalPayout; month: string; clinicName: string; logoUrl?: string | null; brandColor?: string | null }) {
  const doc = new jsPDF();
  const pal = applyPdfBranding(doc, o.brandColor) as any;
  registerInterFonts(doc);
  const primary: [number, number, number] = pal?.primary ?? [39, 124, 103];
  const font = (s: "normal" | "bold", size: number, c = FG) => { doc.setFont("Inter", s); doc.setFontSize(size); doc.setTextColor(...c); };
  const [y0, m0] = o.month.split("-").map(Number);
  const monthName = new Date(Date.UTC(y0, m0 - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  let y = MARGIN;
  if (o.logoUrl) { const img = await loadExternalImageAsBase64(o.logoUrl).catch(() => null); if (img) try { drawBrandLogo(doc, img, X + W - 28, y - 2, 28, 14); } catch { /* logo optional */ } }
  font("bold", 15, primary); doc.text("Demonstrativo de repasse", X, y + 4);
  font("normal", 9, MUTED); doc.text(doc.splitTextToSize(`${o.clinicName} · competência ${monthName} · emitido em ${new Date().toLocaleDateString("pt-BR")}`, W - 32), X, y + 10);
  y += 20;
  const p = o.payout;
  font("bold", 11); doc.text(doc.splitTextToSize(p.name, W), X, y); y += 5;
  font("normal", 9, MUTED); doc.text(doc.splitTextToSize(`Regra contratada: ${p.rule}`, W), X, y); y += 8;

  const cols = [{ h: "Data", w: 18 }, { h: "Paciente", w: 40 }, { h: "Serviço", w: 32 }, { h: "Valor", w: 20 }, { h: "Base", w: 18 }, { h: "Regra", w: 14 }, { h: "Repasse", w: 16 }];
  const header = () => {
    doc.setFillColor(246, 244, 240); doc.rect(X, y - 4, W, 6, "F");
    font("bold", 7.5, MUTED); let cx = X + 1; cols.forEach((c) => { doc.text(c.h, cx, y); cx += c.w; }); y += 5;
  };
  header();
  for (const l of p.lines) {
    if (y > BOTTOM - 6) { doc.addPage(); y = MARGIN; header(); }
    const cells = [dmy(l.date), l.patient, l.service, brl(l.gross), brl(l.base), l.rule.replace("/sessão", "").replace("sem repasse por sessão", "—"), brl(l.payout)];
    font("normal", 7.5); let cx = X + 1;
    cells.forEach((v, i) => { doc.text((doc.splitTextToSize(v, cols[i].w - 1.5) as string[])[0], cx, y); cx += cols[i].w; });
    doc.setDrawColor(...LINE); doc.line(X, y + 1.5, X + W, y + 1.5); y += 5;
  }
  if (!p.lines.length) { font("normal", 8.5, MUTED); doc.text("Nenhum atendimento realizado no mês.", X + 1, y); y += 6; }

  const summary: [string, string][] = [
    ["Atendimentos realizados", String(p.sessions)],
    ["Faturamento bruto gerado", brl(p.gross)],
    ["Descontos/impostos na base", `- ${brl(p.deductions)}`],
    ["Repasse por atendimentos", brl(p.sessionPayout)],
    ...(p.monthlyFixed ? [["Valor fixo mensal (salário/bolsa)", brl(p.monthlyFixed)] as [string, string]] : []),
    ...p.adjustments.map((a) => [a.label, `${a.amount < 0 ? "- " : "+ "}${brl(Math.abs(a.amount))}`] as [string, string]),
  ];
  const need = summary.length * 5.5 + 30;
  if (y + need > BOTTOM) { doc.addPage(); y = MARGIN; }
  y += 6; font("bold", 10, primary); doc.text("Fechamento", X, y); y += 6;
  for (const [k, v] of summary) { font("normal", 9); doc.text(doc.splitTextToSize(k, W - 45)[0], X, y); doc.text(v, X + W, y, { align: "right" }); y += 5.5; }
  doc.setDrawColor(...primary); doc.line(X, y - 2, X + W, y - 2);
  font("bold", 11); doc.text("Total líquido a repassar", X, y + 3); doc.text(brl(p.total), X + W, y + 3, { align: "right" });
  y += 22;
  doc.setDrawColor(...MUTED); doc.line(X, y, X + 70, y); doc.line(X + W - 70, y, X + W, y);
  font("normal", 8, MUTED); doc.text("Gestor(a) da clínica", X, y + 4); doc.text(p.name.slice(0, 40), X + W - 70, y + 4);
  doc.save(`repasse-${p.name.replace(/\s+/g, "-").toLowerCase()}-${o.month}.pdf`);
}
