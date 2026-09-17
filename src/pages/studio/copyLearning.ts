/**
 * APRENDIZADO DE TEXTO DA MARCA (sem retrabalho)
 *
 * Quando o dono da marca reescreve uma frase na própria arte, essa correção
 * deixa de ser um ajuste solto: a frase original fica marcada e o texto novo
 * passa a ocupar o lugar dela em TODAS as gerações seguintes daquela marca.
 *
 * O aprendizado é aplicado no acervo textual ANTES do diretor criativo montar o
 * roteiro — então o motor nunca mais oferece a frase que o usuário já recusou,
 * e o vocabulário que ele escolheu passa a atrair as escolhas do diretor.
 *
 * Local, determinístico e sem custo de IA.
 */

export type LearnedRewrite = {
  /** Texto que o motor havia gerado. */
  original: string;
  /** Texto que o dono da marca escreveu no lugar. */
  edited: string;
};

/** Chave de comparação: ignora acento, caixa e espaços repetidos. */
export const learnedKey = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Índice pronto para o motor: chave do texto antigo → texto aprendido. */
export const buildRewrites = (rows: LearnedRewrite[]): Map<string, string> => {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const from = learnedKey(row.original);
    const to = row.edited.trim();
    if (from.length < 3 || to.length === 0 || learnedKey(to) === from) return;
    map.set(from, to);
  });
  return map;
};

export type LearnedVocabulary = { from: string; to: string };

/**
 * Extrai substituições pontuais das correções. Assim “libera prazo” → “libera
 * tempo” ensina prazo → tempo também para frases novas, não só para a frase
 * inteira que foi editada.
 */
export const buildVocabularyRewrites = (rows: LearnedRewrite[]): LearnedVocabulary[] => {
  const out = new Map<string, LearnedVocabulary>();
  rows.forEach(({ original, edited }) => {
    const before = original.trim().split(/\s+/);
    const after = edited.trim().split(/\s+/);
    const explicitPreference = before.length <= 3 && !/[.!?,;:]/.test(original);
    let start = 0;
    while (!explicitPreference && start < before.length && start < after.length && learnedKey(before[start]) === learnedKey(after[start])) start += 1;
    let beforeEnd = before.length - 1;
    let afterEnd = after.length - 1;
    while (!explicitPreference && beforeEnd >= start && afterEnd >= start && learnedKey(before[beforeEnd]) === learnedKey(after[afterEnd])) {
      beforeEnd -= 1;
      afterEnd -= 1;
    }
    const from = before.slice(start, beforeEnd + 1).join(" ").replace(/[.,;:!?]+$/, "").trim();
    const to = after.slice(start, afterEnd + 1).join(" ").replace(/[.,;:!?]+$/, "").trim();
    const key = learnedKey(from);
    if (!key || !to || key === learnedKey(to) || from.length > 60 || to.length > 90) return;
    out.set(key, { from, to });
  });
  return [...out.values()].sort((a, b) => b.from.length - a.from.length);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const applyLearnedVocabulary = (text: string, vocabulary: LearnedVocabulary[]): { text: string; applied: number } => {
  let next = text;
  let applied = 0;
  vocabulary.forEach(({ from, to }) => {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(from).replace(/\\\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, "giu");
    next = next.replace(pattern, () => {
      applied += 1;
      return to;
    });
  });
  return { text: next, applied };
};

/**
 * Reescreve o acervo textual com o que a marca já aprendeu.
 *
 * Percorre qualquer estrutura (objetos, listas, textos) e troca só os textos
 * que casam exatamente com uma frase corrigida. Nada mais é tocado, então o
 * layout e a estrutura do acervo continuam idênticos.
 */
export const applyLearnedCopy = <T>(
  content: T,
  rewrites: Map<string, string>,
  vocabulary: LearnedVocabulary[] = [],
): { content: T; applied: number } => {
  if (rewrites.size === 0 && vocabulary.length === 0) return { content, applied: 0 };
  let applied = 0;

  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const exact = rewrites.get(learnedKey(value));
      if (exact && exact !== value) {
        applied += 1;
        return exact;
      }
      const learned = applyLearnedVocabulary(value, vocabulary);
      applied += learned.applied;
      return learned.text;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
        out[key] = walk(item);
      });
      return out;
    }
    return value;
  };

  return { content: walk(content) as T, applied };
};

/**
 * Compara o texto da arte antes e depois da edição e devolve só o que mudou —
 * é isso que vira aprendizado da marca.
 */
export const diffArtText = (
  before: Record<number, string> | undefined,
  after: Record<number, string>,
): LearnedRewrite[] => {
  if (!before) return [];
  const out: LearnedRewrite[] = [];
  Object.entries(after).forEach(([key, edited]) => {
    const original = before[Number(key)];
    if (!original || !edited) return;
    if (learnedKey(original) === learnedKey(edited)) return;
    // Frase curta demais (uma palavra solta) não caracteriza correção de copy.
    if (original.trim().length < 8 || edited.trim().length < 3) return;
    out.push({ original: original.trim(), edited: edited.trim() });
  });
  return out;
};
