/**
 * CADÊNCIA E ESTILO DA MARCA (aprendido, local, sem IA)
 *
 * Lê frases que a própria marca escreveu ou aprovou (edições manuais, manual,
 * descrição) e extrai o "jeito de escrever": tamanho médio de frase, uso de
 * "você", perguntas, travessões e aberturas com dois-pontos. A reescrita usa
 * esse perfil como trilho: construção que foge da cadência da marca é descartada.
 */

export type BrandStyle = {
  samples: number;
  avgWords: number;
  youRate: number;
  questionRate: number;
  dashRate: number;
  colonOpenRate: number;
};

const sentencesOf = (text: string) =>
  (text.match(/[^.!?\n]+[.!?]?/g) ?? []).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);

export const learnStyle = (texts: (string | null | undefined)[]): BrandStyle | null => {
  const sentences = texts.filter(Boolean).flatMap((t) => sentencesOf(String(t)));
  if (sentences.length < 5) return null;
  const n = sentences.length;
  const rate = (re: RegExp) => sentences.filter((s) => re.test(s)).length / n;
  return {
    samples: n,
    avgWords: sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / n,
    youRate: rate(/\b(você|voce|seu|sua|te)\b/i),
    questionRate: rate(/\?$/),
    dashRate: rate(/[—–]/),
    colonOpenRate: rate(/^[^:]{2,22}:\s/),
  };
};

const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** A reescrita respeita a cadência aprendida? */
export const fitsStyle = (out: string, original: string, style?: BrandStyle | null): boolean => {
  if (!style || out === original) return true;
  if (style.questionRate < 0.03 && /\?/.test(out) && !/\?/.test(original)) return false;
  if (style.dashRate < 0.03 && /[—–]/.test(out) && !/[—–]/.test(original)) return false;
  if (style.colonOpenRate < 0.03 && /^[^:]{2,22}:\s/.test(out) && !/^[^:]{2,22}:\s/.test(original)) return false;
  // Marca de frases curtas não ganha frase inflada; marca de frase longa não vira telegrama.
  const per = wordsOf(out) / Math.max(1, (out.match(/[.!?]+/g) ?? ["."]).length);
  if (style.avgWords <= 11 && per > style.avgWords * 1.6 && wordsOf(out) > wordsOf(original)) return false;
  if (style.avgWords >= 16 && per < style.avgWords * 0.4) return false;
  // Marca que conversa com "você" não perde o "você" na reescrita.
  if (style.youRate >= 0.35 && /\b(você|seu|sua)\b/i.test(original) && !/\b(você|seu|sua)\b/i.test(out)) return false;
  return true;
};
