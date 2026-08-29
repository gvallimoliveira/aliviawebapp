/**
 * EDIÇÃO DE TEXTO DA ARTE (ajuste fino antes de aprovar)
 *
 * O filtro de nexo (`rationale.ts`) aponta o que falta para a arte se explicar.
 * Quando o que falta é a MENSAGEM, o dono da marca precisa poder corrigir a
 * frase ali mesmo, no card, e reenviar para aprovação — sem gerar uma nova
 * versão e sem gastar crédito de IA.
 *
 * A edição acontece no próprio nó renderizado (contentEditable nos elementos de
 * texto), então o que o usuário lê é exatamente o que sai no PNG exportado e no
 * arquivo salvo na marca. Os textos editados ficam guardados por posição e são
 * reaplicados depois de cada re-render.
 */

/** Tags que carregam texto de arte. */
const TEXT_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "figcaption", "strong", "em"];

const SELECTOR = TEXT_TAGS.join(",");

/** Texto editado de uma arte: posição do elemento -> texto novo. */
export type ArtTextEdits = Record<number, string>;

/**
 * Elementos de texto "folha": os que não contêm outro elemento de texto dentro.
 * Editar a folha evita que o mesmo conteúdo apareça duplicado (ex.: `<h1><span>`).
 */
export const collectEditableNodes = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
    if (el.querySelector(SELECTOR)) return false;
    return (el.textContent ?? "").trim().length > 0;
  });

/** Lê os textos atuais da arte, na ordem em que aparecem. */
export const readArtText = (root: HTMLElement): ArtTextEdits => {
  const out: ArtTextEdits = {};
  collectEditableNodes(root).forEach((el, i) => {
    out[i] = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  });
  return out;
};

/** Reaplica os textos editados sobre a arte recém-renderizada. */
export const applyArtText = (root: HTMLElement, edits?: ArtTextEdits) => {
  if (!edits) return;
  collectEditableNodes(root).forEach((el, i) => {
    const next = edits[i];
    if (typeof next !== "string") return;
    if ((el.textContent ?? "").replace(/\s+/g, " ").trim() === next) return;
    el.textContent = next;
  });
};

/** Liga/desliga a edição direta na arte, com contorno de foco visível. */
export const setArtEditing = (root: HTMLElement, on: boolean) => {
  collectEditableNodes(root).forEach((el) => {
    el.contentEditable = on ? "true" : "false";
    el.spellcheck = false;
    el.style.outline = on ? "1px dashed currentColor" : "";
    el.style.outlineOffset = on ? "2px" : "";
    el.style.borderRadius = on ? "6px" : "";
    el.style.cursor = on ? "text" : "";
  });
  if (!on) return;
  const first = collectEditableNodes(root)[0];
  first?.focus();
};

/** Alguma coisa foi realmente alterada nesta arte? */
export const hasArtEdits = (edits?: ArtTextEdits) => !!edits && Object.keys(edits).length > 0;
