/**
 * Coerência da legenda (local, sem IA):
 *  1. Eixo temático — os argumentos ("provas") seguem o assunto do gancho,
 *     em vez de serem sorteados do acervo inteiro.
 *  2. Filtro anti-TI — specs frias (MB, LGPD, banco de dados…) viram benefício.
 */

export type CaptionAxis = "documentation" | "reasoning" | "management" | "patient" | "academic" | "load";

const AXIS_WORDS: Record<CaptionAxis, string[]> = {
  documentation: ["nota", "evolução", "prontuário", "relatório", "pdf", "formulário", "document", "registro", "laudo", "exame", "anexo"],
  reasoning: ["hipótese", "raciocínio", "conduta", "steps", "d.i.f.i", "difi", "teste", "avaliação", "diagnóstic", "dinamometr", "impressão clínica"],
  management: ["clínica", "equipe", "agenda", "faturamento", "receita", "nps", "satisfação", "gestão", "dono", "ocupação", "abandono", "retenção"],
  patient: ["dor", "sua dor", "você sente", "lombar", "ombro", "joelho", "exercício", "melhora", "piora", "consulta"],
  academic: ["estágio", "preceptor", "estudante", "recém-formado", "round", "faculdade", "caso clínico", "trilha"],
  load: ["carga", "prontidão", "check-in", "treino", "periodiza", "sessão", "recupera"],
};

const norm = (s: string) => s.toLowerCase();

export const detectAxes = (text: string): CaptionAxis[] => {
  const t = norm(text);
  return (Object.keys(AXIS_WORDS) as CaptionAxis[])
    .map((axis) => ({ axis, score: AXIS_WORDS[axis].filter((w) => t.includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.axis);
};

/** Ordena provas pela afinidade com o eixo do gancho; mantém todas (nunca esvazia). */
export const rankProofsByAxis = (hookText: string, proofs: string[]): string[] => {
  const axes = detectAxes(hookText);
  if (axes.length === 0) return proofs;
  const words = axes.flatMap((a, i) => AXIS_WORDS[a].map((w) => ({ w, weight: axes.length - i })));
  const scored = proofs.map((p, idx) => {
    const t = norm(p);
    return { p, idx, score: words.reduce((s, { w, weight }) => (t.includes(w) ? s + weight : s), 0) };
  });
  return scored.sort((a, b) => b.score - a.score || a.idx - b.idx).map((x) => x.p);
};

const COLD_TERMS: Array<[RegExp, string]> = [
  [/,?\s*até \d+\s?MB( por paciente)?/gi, ""],
  [/\bconforme a LGPD\b/gi, "com segurança"],
  [/\bgarantida por LGPD\b/gi, "garantida a pedido do paciente"],
  [/\bbanco de dados\b/gi, "prontuário digital seguro"],
  [/\bdashboard\b/gi, "painel"],
];

/** Remove specs técnicas frias da copy, preservando o sentido. Idempotente. */
export const stripColdSpecs = (text: string): string => {
  let out = text;
  for (const [re, rep] of COLD_TERMS) out = out.replace(re, rep);
  return out.replace(/\s+([.,;])/g, "$1").replace(/\s{2,}/g, " ").trim();
};
