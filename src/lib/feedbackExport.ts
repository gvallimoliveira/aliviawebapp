import {
  FEEDBACK_ITEMS, answerOf, areaScores, npsSummary, responseDetails, type FeedbackRow,
} from "./feedbackMetrics";
import { answerLabel, areaLabel, commentAreaLabel, itemLabel, sentimentLabel, serviceLabel, type FbLang } from "./feedbackLabels";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

/** Every question and all four comments, one line per anonymous response. */
export const feedbackCsv = (rows: FeedbackRow[], l: FbLang): string => {
  const headers = [
    l === "pt" ? "Data" : l === "es" ? "Fecha" : "Date",
    l === "pt" ? "Serviço" : l === "es" ? "Servicio" : "Service",
    l === "pt" ? "Profissional avaliado" : l === "es" ? "Profesional evaluado" : "Professional being rated",
    l === "pt" ? "Recomendaria" : l === "es" ? "Recomendaría" : "Would recommend",
    ...FEEDBACK_ITEMS.map((i) => itemLabel(i.key, l)),
    commentAreaLabel("service", l), commentAreaLabel("professional", l), commentAreaLabel("clinic", l), commentAreaLabel("general", l),
  ];
  const lines = rows.map((r) => {
    const obs = (o: unknown) => (o && typeof o === "object" ? String((o as Record<string, unknown>).observations ?? "") : "");
    const rec = String((r.service_answers as Record<string, unknown> | null)?.recommend ?? "");
    return [
      new Date(r.created_at).toLocaleDateString("pt-BR"),
      serviceLabel(r.service_type, l),
      r.clinician_name || "",
      rec ? answerLabel(rec, l) : "",
      ...FEEDBACK_ITEMS.map((i) => { const a = answerOf(r, i); return a ? answerLabel(a, l) : ""; }),
      obs(r.service_answers), obs(r.professional_answers), obs(r.clinic_answers), r.general_observations || "",
    ].map((v) => {
      const cell = String(v);
      const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",");
  });
  return [headers.map((h) => `"${h}"`).join(","), ...lines].join("\n");
};

export const downloadFeedbackCsv = (rows: FeedbackRow[], l: FbLang) => {
  const blob = new Blob(["\uFEFF" + feedbackCsv(rows, l)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pesquisa_satisfacao_${new Date().toLocaleDateString("sv-SE")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Printable report: score, the three dimensions and every comment in full. */
export const printFeedbackReport = (rows: FeedbackRow[], l: FbLang, scopeLabel: string) => {
  const nps = npsSummary(rows);
  const areas = areaScores(rows);
  const t = (pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);
  const dims = areas.map((a) => `
    <h3>${esc(areaLabel(a.area, l))}${a.positivePct === null ? "" : ` · ${a.positivePct}% ${esc(t("favorável", "favourable", "favorable"))}`}</h3>
    <table><thead><tr><th>${esc(t("Pergunta", "Question", "Pregunta"))}</th><th>${esc(t("Favorável", "Favourable", "Favorable"))}</th><th>${esc(t("Respostas", "Answers", "Respuestas"))}</th><th>${esc(t("Distribuição", "Breakdown", "Distribución"))}</th></tr></thead><tbody>
    ${a.items.map((i) => `<tr><td>${esc(itemLabel(i.item.key, l))}</td><td>${i.positivePct === null ? "—" : `${i.positivePct}%`}</td><td>${i.answered}</td><td>${esc(i.counts.filter((c) => c.count).map((c) => `${answerLabel(c.value, l)}: ${c.count}`).join(" · ") || "—")}</td></tr>`).join("")}
    </tbody></table>`).join("");
  const voices = responseDetails(rows).filter((d) => d.comments.length).map((d) => `
    <div class="voice"><p class="meta">${esc(new Date(d.created_at).toLocaleDateString("pt-BR"))} · ${esc(serviceLabel(d.service, l))} · ${esc(sentimentLabel(d.sentiment, l))}${d.clinician_name ? ` · ${esc(d.clinician_name)}` : ""}</p>
    ${d.comments.map((c) => `<p><b>${esc(commentAreaLabel(c.area, l))}:</b> ${esc(c.text)}</p>`).join("")}</div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(t("Pesquisa de satisfação", "Satisfaction survey", "Encuesta de satisfacción"))}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;font-size:12px;color:#222}
      h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 6px} h3{font-size:12px;margin:14px 0 4px}
      .sub{color:#666;font-size:11px;margin:0}
      .summary{display:flex;gap:32px;margin:14px 0}
      .metric .val{font-size:26px;font-weight:bold} .metric .lbl{font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;font-size:11px} th{background:#f5f5f5}
      .voice{border:1px solid #ddd;border-radius:6px;padding:8px 10px;margin-bottom:8px;page-break-inside:avoid}
      .voice p{margin:2px 0} .meta{color:#666;font-size:10px}
    </style></head><body>
    <h1>${esc(t("Pesquisa de satisfação da clínica", "Clinic satisfaction survey", "Encuesta de satisfacción de la clínica"))}</h1>
    <p class="sub">${esc(scopeLabel)} · ${rows.length} ${esc(t("respostas anônimas", "anonymous responses", "respuestas anónimas"))} · ${esc(new Date().toLocaleDateString("pt-BR"))}</p>
    <div class="summary">
      <div class="metric"><div class="val">${nps.nps === null ? "—" : nps.nps}</div><div class="lbl">NPS</div></div>
      <div class="metric"><div class="val">${nps.promoters}</div><div class="lbl">${esc(t("Recomendariam", "Would recommend", "Recomendarían"))}</div></div>
      <div class="metric"><div class="val">${nps.passives}</div><div class="lbl">${esc(t("Talvez", "Maybe", "Tal vez"))}</div></div>
      <div class="metric"><div class="val">${nps.detractors}</div><div class="lbl">${esc(t("Não recomendariam", "Would not", "No recomendarían"))}</div></div>
    </div>
    <h2>${esc(t("Avaliação por dimensão", "Scores by dimension", "Evaluación por dimensión"))}</h2>${dims}
    <h2>${esc(t("Comentários dos pacientes", "Patient comments", "Comentarios de los pacientes"))}</h2>
    ${voices || `<p class="sub">${esc(t("Nenhum comentário escrito no período.", "No written comments in the period.", "Ningún comentario escrito en el período."))}</p>`}
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
  return true;
};
