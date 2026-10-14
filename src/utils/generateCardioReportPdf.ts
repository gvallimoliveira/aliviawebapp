import jsPDF from "jspdf";
import { registerInterFonts } from "./fonts/registerInterFonts";
import {
  CARDIO_CAVEATS, CARDIO_REFERENCES, WHO_MODERATE_MIN, fmtNum, profileGoal, shortDate,
  cardioReportSections, type PeriodAnalysis,
} from "@/lib/cardioAnalysis";
import { OXIMETER_GUIDE, profileRule, type HrCeiling } from "@/lib/cardioSafety";
import { TRACK_LABEL } from "@/components/dashboard/periodization/scales";
import { profileEducation, CARDIO_EDUCATION } from "@/lib/cardioEducation";

/**
 * Relatório cardiovascular especial — duas versões a partir da mesma análise
 * (`cardioAnalysis.ts`): técnica (fisioterapeuta / cardiologista) e do paciente.
 * Margens iguais aos outros PDFs do app: conteúdo útil de 158 mm; títulos
 * nunca ficam sozinhos no fim da página.
 */

type RGB = [number, number, number];
const C = {
  primary: [39, 124, 103] as RGB,
  primaryLight: [230, 245, 241] as RGB,
  primarySoft: [150, 200, 186] as RGB,
  foreground: [35, 28, 22] as RGB,
  muted: [120, 110, 100] as RGB,
  border: [220, 215, 208] as RGB,
  soft: [246, 244, 240] as RGB,
  alert: [176, 58, 46] as RGB,
  alertLight: [251, 236, 233] as RGB,
  amber: [184, 115, 51] as RGB,
};

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 170 mm (caixas)
const X = MARGIN + 6;
const W = CONTENT_WIDTH - 12; // 158 mm úteis
const PAGE_BOTTOM = 277;

export interface BrandLogo { dataUrl: string; natW: number; natH: number }

export interface CardioReportOptions {
  variant: "technical" | "patient";
  period: PeriodAnalysis;
  readings: string[];
  ceiling: HrCeiling;
  profile: string;
  betaBlocker: boolean;
  age: number | null;
  patientName?: string | null;
  professionalName?: string | null;
  logo?: BrandLogo | null;
  /** Testes funcionais do período (TSL, TC6M, degrau), já interpretados por regras fixas. */
  functionalTests?: { date: string; label: string; result: string; percent: number | null; patterns: string[]; alerts: string[] }[];
}

/** A fonte embutida cobre Latim + pontuação; troca símbolos matemáticos por texto. */
export function pdfSafe(s: string): string {
  return s
    .replace(/₂/g, "2")
    .replace(/−/g, "-")
    .replace(/≤\s?/g, "até ")
    .replace(/≥\s?/g, "a partir de ")
    .replace(/\s?→\s?/g, " para ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR");

export async function generateCardioReportPdfBlob(o: CardioReportOptions): Promise<Blob> {
  const doc = new jsPDF();
  registerInterFonts(doc);
  const tech = o.variant === "technical";
  const p = o.period;
  const rule = profileRule(o.profile);
  const goal = profileGoal(o.profile);
  const summary = cardioReportSections(p, o.profile, !tech, o.readings);
  let y = MARGIN;

  const font = (size: number, weight: "normal" | "bold" | "italic" = "normal", color: RGB = C.foreground) => {
    doc.setFont("Inter", weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const wrap = (text: string, width = W) => doc.splitTextToSize(pdfSafe(text), width) as string[];
  const ensure = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) { doc.addPage(); y = MARGIN; }
  };
  /** Título + altura do primeiro bloco: o título nunca fica órfão. */
  const section = (title: string, firstBlock: number) => {
    ensure(9 + firstBlock);
    font(10.5, "bold", C.primary);
    doc.text(pdfSafe(title), X, y + 4);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(X, y + 6, X + W, y + 6);
    y += 10;
  };
  const bullets = (items: string[], size = 8.5, color: RGB = C.foreground) => {
    items.forEach((it) => {
      font(size, "normal", color);
      const lines = wrap(it, W - 4);
      const h = lines.length * size * 0.45 + 1.4;
      ensure(h);
      doc.text("•", X, y + 3);
      doc.text(lines, X + 4, y + 3, { lineHeightFactor: 1.3 });
      y += h;
    });
  };
  const bulletsHeight = (items: string[], size = 8.5) => {
    font(size);
    return items.slice(0, 2).reduce((a, it) => a + wrap(it, W - 4).length * size * 0.45 + 1.4, 0);
  };

  // ── Cabeçalho ───────────────────────────────────────────────────────────
  const meta: string[] = [];
  if (o.patientName) meta.push(`Paciente: ${o.patientName}`);
  if (o.age) meta.push(`${o.age} anos`);
  if (o.professionalName) meta.push(`Profissional: ${o.professionalName}`);
  meta.push(`Período: ${fmtDate(p.from)} a ${fmtDate(p.to)} (${p.weeks.length} semanas)`);
  meta.push(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`);
  font(8);
  const metaLines = wrap(meta.join(" · "), W - (o.logo ? 34 : 0)).slice(0, 3);
  const headerH = 22 + metaLines.length * 4;
  doc.setFillColor(...C.primaryLight);
  doc.setDrawColor(...C.border);
  doc.roundedRect(MARGIN, y - 6, CONTENT_WIDTH, headerH, 3, 3, "FD");
  font(14, "bold", C.primary);
  doc.text("Aliv.iA", X, y + 2);
  font(10, "bold");
  doc.text(tech ? "Relatório cardiovascular — versão técnica" : "Seu relatório do coração", X, y + 8);
  font(8, "normal", C.muted);
  doc.text(metaLines, X, y + 13, { lineHeightFactor: 1.3 });
  if (o.logo) {
    const maxW = 28, maxH = 14;
    const r = Math.min(maxW / Math.max(o.logo.natW, 1), maxH / Math.max(o.logo.natH, 1));
    const w = o.logo.natW * r, h = o.logo.natH * r;
    try { doc.addImage(o.logo.dataUrl, "PNG", X + W - w, y - 6 + (headerH - h) / 2, w, h, undefined, "FAST"); } catch { /* logo opcional */ }
  }
  y += headerH;

  if (summary.focus) {
    section(summary.focus.title, bulletsHeight(summary.focus.items));
    bullets(summary.focus.items);
    y += 3;
  }

  if (summary.performance) {
    section("Resposta ao esforço", bulletsHeight(summary.response));
    bullets(summary.response);
    y += 3;
  }

  if (summary.performance) {
    section("Recuperação", bulletsHeight(summary.recovery));
    bullets(summary.recovery);
    y += 3;
    section("Pontos a revisar", bulletsHeight(summary.review));
    bullets(summary.review);
    y += 3;
  }

  // ── Perfil e teto ──────────────────────────────────────────────────────
  const profileLines = tech
    ? [
        `Perfil cardiovascular: ${rule.label} (definido pelo fisioterapeuta).`,
        o.ceiling.ceiling
          ? `Teto de FC: ${o.ceiling.ceiling} bpm ${o.ceiling.source === "manual" ? "(manual)" : `(${Math.round(o.ceiling.pct * 100)}% de ${o.ceiling.maxHr} bpm, Gellish 207 − 0,7 × idade)`}.`
          : "Teto de FC: sem data de nascimento e sem teto manual.",
        ...(summary.performance ? ["Intensidade e volume individualizados por modalidade, objetivo e fase de treino."] : [`Meta do perfil: ${goal.intensity}. ${goal.weekly}. Fonte: ${goal.source}.`]),
        ...(o.betaBlocker ? ["Em uso de betabloqueador: intensidade avaliada pela PSE; FC apenas como apoio."] : []),
      ]
    : [
        o.ceiling.ceiling
          ? `Referência superior de batimentos nos treinos: ${o.ceiling.ceiling} batimentos por minuto ${o.ceiling.source === "manual" ? "(ajustada pelo profissional)" : "(estimativa pela idade)"}. ${summary.performance ? "É referência operacional, não limite universal de segurança; confirme a orientação individual com seu fisioterapeuta." : "Se o monitor mostrar mais que isso, diminua o ritmo e converse com seu fisioterapeuta."}`
          : "Seu limite de batimentos será definido pelo seu fisioterapeuta.",
        ...(summary.performance ? ["Seu treino deve ser ajustado ao objetivo, à modalidade e à recuperação, não apenas aos minutos semanais."] : [`Referência para construir com seu fisioterapeuta: ${goal.weekly.replace(/\(.*?\)/g, "").trim()}. Atividades abaixo dessa referência também contam; a progressão deve respeitar sua tolerância.`]),
        ...(o.betaBlocker ? ["Como você usa um remédio que deixa os batimentos mais baixos, guie-se principalmente pela sensação de esforço."] : []),
      ];
  font(8.5);
  const profH = profileLines.reduce((a, l) => a + wrap(l, W - 8).length * 4, 0) + 7;
  section(tech ? "Perfil, teto e metas" : "Seu limite e sua meta", profH);
  doc.setFillColor(...C.soft);
  doc.setDrawColor(...C.border);
  doc.roundedRect(X - 2, y - 1, W + 4, profH, 2, 2, "FD");
  let ly = y + 4;
  profileLines.forEach((l) => {
    font(8.5);
    const lines = wrap(l, W - 8);
    doc.text(lines, X + 2, ly, { lineHeightFactor: 1.3 });
    ly += lines.length * 4;
  });
  y += profH + 4;

  const education = profileEducation(o.profile, !tech);
  if (tech) education.push(CARDIO_EDUCATION[1].text, CARDIO_EDUCATION[3].text);
  if (!summary.performance) {
    section(tech ? "Prescrição individual e interpretação das intensidades" : "Entendendo seu treino", bulletsHeight(education));
    bullets(education);
    y += 3;
  }

  // Valorizar o trabalho realizado antes da comparação gráfica na versão do paciente.
  if (!tech && !summary.performance) {
    section("Seu esforço, suas conquistas e próximos passos", bulletsHeight(o.readings));
    bullets(o.readings);
    y += 3;
  }

  // ── Indicadores ────────────────────────────────────────────────────────
  const kpis: Array<[string, string, boolean?]> = summary.performance ? [
    ["Sessões com FC", `${p.monitoredSessions}/${p.sessions.length}`],
    ["Sessões com zonas", `${p.sessions.filter((s) => s.zones !== null).length}/${p.sessions.length}`],
    ["Acima da referência FC", `${p.counts.aboveCeiling}`],
    ["Queda FC em 1 min", p.avgRecovery !== null ? `${p.avgRecovery} bpm` : "—"],
  ] : [
    [tech ? "Meta OMS atingida" : "Semanas na meta", `${p.whoWeeksMet}/${p.weeks.length}`],
    [tech ? "Média semanal (min eq.)" : "Minutos por semana", `${p.avgEquivalent}`],
    [tech ? "Sessões acima do teto" : "Treinos acima do limite", `${p.counts.aboveCeiling}`, p.counts.aboveCeiling > 0],
    [tech ? "Recuperação 1º min" : "Recuperação do coração", p.avgRecovery !== null ? `${p.avgRecovery} bpm` : "—", p.avgRecovery !== null && p.avgRecovery <= 12],
  ];
  ensure(20);
  const kw = (W - 3 * 3) / 4;
  kpis.forEach(([label, value, warn], i) => {
    const kx = X + i * (kw + 3);
    doc.setFillColor(...(warn ? C.alertLight : C.primaryLight));
    doc.setDrawColor(...C.border);
    doc.roundedRect(kx, y, kw, 17, 2, 2, "FD");
    font(7, "normal", C.muted);
    doc.text(wrap(label, kw - 4).slice(0, 2), kx + 2, y + 4.5, { lineHeightFactor: 1.2 });
    font(12, "bold", warn ? C.alert : C.primary);
    doc.text(pdfSafe(value), kx + 2, y + 14);
  });
  y += 22;

  // ── Tempo por zona no período ───────────────────────────────────────────
  const zoneTot = [0, 0, 0, 0, 0];
  p.sessions.forEach((s) => s.zones?.forEach((m, i) => { zoneTot[i] += m; }));
  const zoneSum = zoneTot.reduce((a, b) => a + b, 0);
  if (zoneSum > 0) {
    section(tech ? "Tempo em cada zona de FC (% da FC máxima)" : "Em que intensidade você treinou", 34);
    const names = tech
      ? ["Z1 50–60%", "Z2 60–70%", "Z3 70–80%", "Z4 80–90%", "Z5 90–100%"]
      : ["Z1 muito leve", "Z2 leve", "Z3 moderado", "Z4 forte", "Z5 máximo"];
    const zmax = Math.max(...zoneTot);
    zoneTot.forEach((m, i) => {
      font(7.5, "normal", C.foreground);
      doc.text(names[i], X, y + 3.5);
      const bwz = ((W - 58) * m) / zmax;
      doc.setFillColor(...(i >= 3 ? C.primary : C.primarySoft));
      if (bwz > 0) doc.roundedRect(X + 30, y + 0.5, bwz, 4, 1, 1, "F");
      font(7.5, "normal", C.muted);
      doc.text(`${Math.round(m)} min (${Math.round((m / zoneSum) * 100)}%)`, X + W, y + 3.5, { align: "right" });
      y += 6;
    });
    y += 2;
  }

  // ── Tendências (técnica) ───────────────────────────────────────────────
  const series = [
    { title: "Queda da FC no 1º minuto (bpm)", pts: p.recoverySeries, ref: (summary.performance ? null : 12) as number | null },
    { title: "Relação distância/FC (metros por batimento)", pts: p.efficiencySeries, ref: null },
    { title: "Relação potência/FC (W por bpm)", pts: p.powerSeries, ref: null },
  ].filter((s) => s.pts.length >= 2);
  if ((tech || summary.performance) && series.length) {
    const sh = 30;
    section(summary.performance ? "Resposta e recuperação — registros ao longo do período" : "Tendências", sh + 6);
    series.forEach((s, si) => {
      if (si > 0) ensure(sh + 6);
      font(8, "bold");
      doc.text(pdfSafe(s.title), X, y + 3);
      const top = y + 6, bottom = y + sh, left = X + 10, width = W - 10;
      const vals = s.pts.map((pt) => pt.value).concat(s.ref !== null ? [s.ref] : []);
      const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.1 || 1;
      const py = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
      const px = (i: number) => left + (i / (s.pts.length - 1)) * width;
      doc.setDrawColor(...C.border);
      doc.line(left, bottom, left + width, bottom);
      font(6.5, "normal", C.muted);
      doc.text(fmtNum(Math.round(hi * 10) / 10), X, top + 2);
      doc.text(fmtNum(Math.round(lo * 10) / 10), X, bottom);
      if (s.ref !== null) {
        doc.setDrawColor(...C.alert);
        doc.setLineDashPattern([1.2, 1], 0);
        doc.line(left, py(s.ref), left + width, py(s.ref));
        doc.setLineDashPattern([], 0);
        font(6.5, "normal", C.alert);
        doc.text("atenção até 12", left + width, py(s.ref) - 1, { align: "right" });
      }
      doc.setDrawColor(...C.primary);
      doc.setLineWidth(0.6);
      s.pts.forEach((pt, i) => { if (i > 0) doc.line(px(i - 1), py(s.pts[i - 1].value), px(i), py(pt.value)); });
      doc.setLineWidth(0.3);
      doc.setFillColor(...C.primary);
      s.pts.forEach((pt, i) => doc.circle(px(i), py(pt.value), 0.8, "F"));
      font(6.5, "normal", C.muted);
      doc.text(shortDate(s.pts[0].date), left, bottom + 3.5);
      doc.text(shortDate(s.pts[s.pts.length - 1].date), left + width, bottom + 3.5, { align: "right" });
      y += sh + 7;
    });
  }

  // ── Leituras ───────────────────────────────────────────────────────────
  if (tech && !summary.performance) {
    section("Trabalho realizado e pontos a acompanhar", bulletsHeight(o.readings));
    bullets(o.readings);
    y += 3;
  }

  // ── Testes funcionais ─────────────────────────────────────────────────
  if (o.functionalTests?.length) {
    const items = o.functionalTests.map((t) => {
      const base = `${fmtDate(t.date)} · ${t.label}: ${t.result}${t.percent != null ? ` (${t.percent}% do previsto)` : ""}`;
      if (!tech) return `${base}. Compare sua evolução em condições semelhantes.${t.alerts.length ? ` Pontos de atenção: ${t.alerts.join(" ")}` : ""}`;
      const extra = [...t.patterns, ...t.alerts.map((a) => `Alerta: ${a}`)];
      return extra.length ? `${base}. ${extra.join(" ")}` : base;
    });
    section(tech ? "Testes funcionais cardiorrespiratórios" : "Seus testes de capacidade", bulletsHeight(items));
    bullets(items);
    y += 3;
  }

  // ── Sessões (técnica) ──────────────────────────────────────────────────
  if (tech && p.sessions.length) {
    const cols = [
      { h: "Data", w: 15 }, { h: "Frente", w: 25 }, { h: "Min", w: 10 }, { h: "PSE", w: 10 },
      { h: "FC méd/máx", w: 20 }, { h: "TRIMP", w: 13 }, { h: "sRPE", w: 13 }, { h: "Recup.", w: 13 }, { h: "Alertas", w: 39 },
    ];
    const rowH = 5.2;
    const head = () => {
      doc.setFillColor(...C.primaryLight);
      doc.rect(X, y, W, rowH, "F");
      font(7, "bold");
      let cx = X + 1;
      cols.forEach((c) => { doc.text(c.h, cx, y + 3.6); cx += c.w; });
      y += rowH;
    };
    section("Sessões do período", rowH * 3);
    head();
    [...p.sessions].reverse().forEach((s, idx) => {
      if (y + rowH > PAGE_BOTTOM) { doc.addPage(); y = MARGIN; head(); }
      if (idx % 2) { doc.setFillColor(...C.soft); doc.rect(X, y, W, rowH, "F"); }
      const alerts = [
        s.aboveCeiling ? "acima do teto" : "",
        s.spo2Low ? `SpO2 ${s.spo2Min}%` : "",
        s.recovery?.status === "low" ? "recup. baixa" : "",
        s.coherence?.status === "heart_higher" ? "FC > percepção" : "",
      ].filter(Boolean).join(", ");
      const cells = [
        shortDate(s.date), TRACK_LABEL[s.track] ?? s.track, String(s.durationMin), fmtNum(s.rpe),
        s.hrAvg || s.hrMax ? `${s.hrAvg ?? "—"}/${s.hrMax ?? "—"}` : "—",
        s.trimp !== null ? String(s.trimp) : "—", String(s.srpe), s.recovery ? `${s.recovery.drop}` : "—", alerts || "—",
      ];
      let cx = X + 1;
      cells.forEach((v, i) => {
        font(7, "normal", i === 8 && alerts ? C.alert : C.foreground);
        const t = doc.splitTextToSize(pdfSafe(v), cols[i].w - 1.5)[0] as string;
        doc.text(t, cx, y + 3.6);
        cx += cols[i].w;
      });
      y += rowH;
    });
    y += 4;
  }

  if (summary.performance) {
    section("Contexto de saúde geral", bulletsHeight(summary.who));
    bullets(summary.who);
    y += 3;
  }
  // ── Gráfico semanal: minutos moderados + vigorosos (×2) vs meta OMS ─────
  const chartH = 44;
  section(summary.performance ? "Saúde geral — referência semanal da OMS" : tech ? "Atividade aeróbia semanal × meta da OMS" : "Seus minutos de atividade por semana", chartH + 10);
  const chartX = X + 10, chartW = W - 10, baseY = y + chartH - 6;
  const maxV = Math.max(WHO_MODERATE_MIN * 1.25, ...p.weeks.map((w) => w.equivalent)) || 1;
  const yOf = (v: number) => baseY - (v / maxV) * (chartH - 10);
  font(6.5, "normal", C.muted);
  [0, WHO_MODERATE_MIN].forEach((v) => doc.text(String(v), X, yOf(v) + 1));
  doc.setDrawColor(...C.border);
  doc.line(chartX, baseY, chartX + chartW, baseY);
  const slot = chartW / p.weeks.length;
  const bw = Math.min(10, slot * 0.6);
  p.weeks.forEach((w, i) => {
    const bx = chartX + i * slot + (slot - bw) / 2;
    const mod = w.moderate, vig = w.vigorous * 2;
    if (mod > 0) { doc.setFillColor(...C.primarySoft); doc.rect(bx, yOf(mod), bw, baseY - yOf(mod), "F"); }
    if (vig > 0) { doc.setFillColor(...C.primary); doc.rect(bx, yOf(mod + vig), bw, yOf(mod) - yOf(mod + vig), "F"); }
    if (w.equivalent > 0) { font(6, "normal", C.muted); doc.text(String(w.equivalent), bx + bw / 2, yOf(w.equivalent) - 1, { align: "center" }); }
    font(6.5, "normal", C.muted);
    doc.text(w.label, bx + bw / 2, baseY + 4, { align: "center" });
  });
  doc.setDrawColor(...C.amber);
  doc.setLineDashPattern([1.2, 1], 0);
  doc.line(chartX, yOf(WHO_MODERATE_MIN), chartX + chartW, yOf(WHO_MODERATE_MIN));
  doc.setLineDashPattern([], 0);
  font(6.5, "normal", C.amber);
  doc.text(`meta ${WHO_MODERATE_MIN} min`, chartX + chartW, yOf(WHO_MODERATE_MIN) - 1.2, { align: "right" });
  y = baseY + 7;
  font(6.5, "normal", C.muted);
  doc.setFillColor(...C.primarySoft); doc.rect(X, y - 2.2, 3, 2.5, "F");
  doc.text("moderado", X + 4, y);
  doc.setFillColor(...C.primary); doc.rect(X + 20, y - 2.2, 3, 2.5, "F");
  doc.text(tech ? "vigoroso (×2, equivalência OMS)" : "intenso (vale em dobro)", X + 24, y);
  doc.text(tech ? "Semanas móveis de 7 dias até a data de emissão." : "Cada barra é uma semana.", X + W, y, { align: "right" });
  y += 6;

  if (summary.performance) {
    section(tech ? "Prescrição individual e limites da interpretação" : "Entendendo seu treino", bulletsHeight(education));
    bullets(education);
    y += 3;
  }

  // ── Orientações / ressalvas ────────────────────────────────────────────
  const guide = tech
    ? CARDIO_CAVEATS
    : [
        OXIMETER_GUIDE,
        "Some os minutos da semana: cada minuto de treino forte vale por dois de treino moderado.",
        "Pare e avise seu profissional se sentir dor no peito, falta de ar fora do normal, tontura ou palpitação.",
        "Este relatório acompanha seus treinos e não substitui a consulta médica.",
      ];
  section(tech ? "Ressalvas" : "Como usar no dia a dia", bulletsHeight(guide, 8));
  bullets(guide, 8, C.muted);
  y += 3;

  if (tech) {
    section("Referências", bulletsHeight(CARDIO_REFERENCES, 7));
    bullets(CARDIO_REFERENCES, 7, C.muted);
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(7, "normal", C.muted);
    doc.text("Aliv.iA · sugestão de acompanhamento, não diagnóstico", X, 290);
    doc.text(`${i}/${pages}`, X + W, 290, { align: "right" });
  }
  return doc.output("blob");
}

export function cardioReportFileName(o: Pick<CardioReportOptions, "variant" | "patientName" | "period">): string {
  const who = o.patientName ? `_${o.patientName.trim().replace(/\s+/g, "_")}` : "";
  return `${o.variant === "technical" ? "Relatorio_cardiovascular" : "Meu_coracao"}${who}_${o.period.to}.pdf`;
}
