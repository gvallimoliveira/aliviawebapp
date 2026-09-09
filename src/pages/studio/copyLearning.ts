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

/**
 * Reescreve o acervo textual com o que a marca já aprendeu.
 *
 * Percorre qualquer estrutura (objetos, listas, textos) e troca só os textos
 * que casam exatamente com uma frase corrigida. Nada mais é tocado, então o
 * layout e a estrutura do acervo continuam idênticos.
 */
export const applyLearnedCopy = <T>(content: T, rewrites: Map<string, string>): { content: T; applied: number } => {
  if (rewrites.size === 0) return { content, applied: 0 };
  let applied = 0;

  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const next = rewrites.get(learnedKey(value));
      if (next && next !== value) {
        applied += 1;
        return next;
      }
      return value;
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
