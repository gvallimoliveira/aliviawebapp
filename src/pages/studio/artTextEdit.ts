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

/** Escala tipográfica por texto: 1 mantém o tamanho original. */
export type ArtTextSize = Record<number, number>;

const sizeRegistry = new Map<string, number>();
const BASE_SIZE_ATTR = "studioTextBaseSize";
const ORIGINAL_SIZE_ATTR = "studioTextOriginalSize";
const EDIT_LAYER_ATTR = "data-studio-text-size-layer";
const MIN_TEXT_SCALE = 0.55;
const MAX_TEXT_SCALE = 1.8;
const TEXT_SCALE_STEP = 0.1;

const artIdOf = (root: HTMLElement) => root.dataset.studioArtKey || root.id || "art";
const sizeKey = (root: HTMLElement, index: number) => `${artIdOf(root)}#${index}`;

const paintTextSize = (root: HTMLElement, el: HTMLElement, index: number, scale?: number) => {
  if (!el.dataset[BASE_SIZE_ATTR]) {
    el.dataset[ORIGINAL_SIZE_ATTR] = el.style.fontSize || "";
    el.dataset[BASE_SIZE_ATTR] = getComputedStyle(el).fontSize || "16px";
  }
  const base = Number.parseFloat(el.dataset[BASE_SIZE_ATTR] || "16") || 16;
  el.style.fontSize = scale && scale !== 1
    ? `${Number((base * scale).toFixed(2))}px`
    : (el.dataset[ORIGINAL_SIZE_ATTR] || "");
  if (scale && scale !== 1) sizeRegistry.set(sizeKey(root, index), scale);
  else sizeRegistry.delete(sizeKey(root, index));
};

/** Reaplica os tamanhos depois de uma remontagem da arte. */
export const applyArtTextSizes = (root: HTMLElement) => {
  collectEditableNodes(root).forEach((el, index) => {
    const scale = sizeRegistry.get(sizeKey(root, index));
    if (scale) paintTextSize(root, el, index, scale);
  });
};

/** Restaura todos os textos ao tamanho original do modelo. */
export const clearArtTextSizes = (root: HTMLElement) => {
  collectEditableNodes(root).forEach((el, index) => {
    sizeRegistry.delete(sizeKey(root, index));
    el.style.fontSize = el.dataset[ORIGINAL_SIZE_ATTR] || "";
    delete el.dataset[BASE_SIZE_ATTR];
    delete el.dataset[ORIGINAL_SIZE_ATTR];
  });
};

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
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/** Liga/desliga a edição direta na arte, com contorno de foco visível. */
export const setArtEditing = (root: HTMLElement, on: boolean) => {
  root.querySelectorAll(`[${EDIT_LAYER_ATTR}]`).forEach((el) => el.remove());
  collectEditableNodes(root).forEach((el) => {
    el.contentEditable = on ? "true" : "false";
    el.spellcheck = false;
    el.style.outline = on ? "1px dashed currentColor" : "";
    el.style.outlineOffset = on ? "2px" : "";
    el.style.borderRadius = on ? "6px" : "";
    el.style.cursor = on ? "text" : "";
  });
  if (!on) {
    root.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (getComputedStyle(root).position === "static") root.style.position = "relative";
  const nodes = collectEditableNodes(root);
  const layer = document.createElement("div");
  layer.setAttribute(EDIT_LAYER_ATTR, "1");
  layer.dataset.studioNoExport = "1";
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "45",
  });
  root.appendChild(layer);

  const toolbar = document.createElement("div");
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Tamanho do texto selecionado");
  Object.assign(toolbar.style, {
    position: "absolute",
    display: "flex",
    gap: "4px",
    padding: "4px",
    borderRadius: "999px",
    background: "rgba(17,17,17,0.9)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    pointerEvents: "auto",
  });
  layer.appendChild(toolbar);

  let selected = 0;
  const place = () => {
    const el = nodes[selected];
    if (!el) return;
    const rootRect = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const width = 76;
    toolbar.style.left = `${Math.max(4, Math.min(rootRect.width - width - 4, rect.left - rootRect.left))}px`;
    toolbar.style.top = `${Math.max(4, Math.min(rootRect.height - 34, rect.top - rootRect.top - 36))}px`;
  };

  const resize = (delta: number) => {
    const el = nodes[selected];
    if (!el) return;
    const current = sizeRegistry.get(sizeKey(root, selected)) ?? 1;
    const next = Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, Number((current + delta).toFixed(2))));
    paintTextSize(root, el, selected, next);
    place();
  };

  const control = (label: string, text: string, delta: number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = text;
    Object.assign(button.style, {
      width: "30px",
      height: "26px",
      border: "0",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.14)",
      color: "#fff",
      fontSize: "18px",
      lineHeight: "1",
      cursor: "pointer",
    });
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => resize(delta));
    toolbar.appendChild(button);
  };
  control("Diminuir texto", "−", -TEXT_SCALE_STEP);
  control("Aumentar texto", "+", TEXT_SCALE_STEP);

  nodes.forEach((el, index) => {
    el.addEventListener("focus", () => {
      selected = index;
      place();
    });
    el.addEventListener("click", () => {
      selected = index;
      place();
    });
  });
  place();

  const first = nodes[0];
  first?.focus();
};

/** Alguma coisa foi realmente alterada nesta arte? */
export const hasArtEdits = (edits?: ArtTextEdits) => !!edits && Object.keys(edits).length > 0;
