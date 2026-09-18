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

/** Tags que podem carregar texto visível da arte. */
const TEXT_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "figcaption",
  "strong", "em", "span", "div", "button", "a", "dt", "dd",
];

const SELECTOR = TEXT_TAGS.join(",");
const SEMANTIC_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dt,dd";
const GENERIC_SELECTOR = "span,strong,em,div,button,a";

/** Texto editado de uma arte: posição do elemento -> texto novo. */
export type ArtTextEdits = Record<number, string>;

/** Escala tipográfica por texto: 1 mantém o tamanho original. */
export type ArtTextSize = Record<number, number>;

/** Estado completo no início de uma edição; cancelar restaura texto e tamanho juntos. */
export type ArtTextEditSnapshot = {
  text: ArtTextEdits;
  sizes: ArtTextSize;
};

const sizeRegistry = new Map<string, number>();
const markupRegistry = new Map<string, string>();
const accentTemplates = new WeakMap<HTMLElement, Record<number, AccentTemplate[]>>();
const editListeners = new WeakMap<HTMLElement, AbortController>();
const BASE_SIZE_ATTR = "studioTextBaseSize";
/**
 * CAMPO ESVAZIADO DE PROPÓSITO.
 *
 * Apagar todo o texto de um campo é uma decisão de layout: aquele trecho deve
 * sair da arte. Em vez de barrar o ajuste, marcamos o elemento e o deixamos
 * invisível (mantendo o espaço reservado do desenho). Durante a edição ele
 * reaparece apagado, para você poder escrever ali de novo.
 */
const HIDDEN_ATTR = "studioTextHidden";
/** Marca os campos já reconhecidos como editáveis, para não sairem da lista ao ficarem vazios. */
const SLOT_ATTR = "studioTextSlot";
const ORIGINAL_SIZE_ATTR = "studioTextOriginalSize";
const EDIT_LAYER_ATTR = "data-studio-text-size-layer";
/**
 * Faixa de tamanho ampla: a arte da pinça (e outras com muito espaço) precisa
 * de letra bem maior, e capas densas precisam reduzir mais do que 0,55.
 */
const MIN_TEXT_SCALE = 0.3;
const MAX_TEXT_SCALE = 4;
const TEXT_SCALE_STEP = 0.1;

const artIdOf = (root: HTMLElement) => root.dataset.studioArtKey || root.id || "art";
const sizeKey = (root: HTMLElement, index: number) => `${artIdOf(root)}#${index}`;

type AccentTemplate = { html: string; text: string };

const normalizedText = (value: string) => value.replace(/\s+/g, " ").trim();

/** Elementos que comunicam ênfase editorial, não apenas divisão estrutural. */
const isVisualAccent = (el: HTMLElement) => {
  const cls = el.className;
  const style = el.getAttribute("style") ?? "";
  return (
    el.hasAttribute("data-studio-stroke") ||
    /(?:^|\s)(?:text-primary|text-transparent|underline|bg-primary|bg-accent|bg-foreground)(?:\s|$)/.test(cls) ||
    /(?:^|;)\s*(?:color|background(?:-color)?|-webkit-text-stroke)\s*:/.test(style)
  );
};

const safeAccentHtml = (element: HTMLElement) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script, iframe, object, embed, link, meta").forEach((node) => node.remove());
  clone.querySelectorAll<HTMLElement>("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "contenteditable") node.removeAttribute(attr.name);
      if (name === "style" && /url\s*\(|expression\s*\(/i.test(attr.value)) node.removeAttribute(attr.name);
    });
  });
  clone.removeAttribute("contenteditable");
  return clone.outerHTML;
};

const readAccentTemplates = (el: HTMLElement): AccentTemplate[] =>
  Array.from(el.querySelectorAll<HTMLElement>("span, strong, em"))
    .filter(isVisualAccent)
    .map((candidate) => ({ html: safeAccentHtml(candidate), text: normalizedText(candidate.textContent ?? "") }))
    .filter((item) => item.text.length > 0);

const longestWordRange = (text: string) => {
  const matches = Array.from(text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}’'-]*/gu));
  if (!matches.length) return null;
  const winner = matches.reduce((best, item) => (item[0].length > best[0].length ? item : best));
  const start = winner.index ?? 0;
  return { start, end: start + winner[0].length };
};

/** Recompõe o destaque que o contentEditable do iPhone pode achatar. */
const restoreVisualAccents = (el: HTMLElement, templates: AccentTemplate[]) => {
  if (!templates.length || Array.from(el.querySelectorAll<HTMLElement>("span, strong, em")).some(isVisualAccent)) return;
  const text = normalizedText(el.textContent ?? "");
  if (!text) return;
  const ranges: Array<{ start: number; end: number; template: AccentTemplate }> = [];
  let cursor = 0;
  templates.forEach((template) => {
    const at = text.toLocaleLowerCase("pt-BR").indexOf(template.text.toLocaleLowerCase("pt-BR"), cursor);
    if (at >= 0) {
      ranges.push({ start: at, end: at + template.text.length, template });
      cursor = at + template.text.length;
    }
  });
  if (!ranges.length) {
    const fallback = longestWordRange(text);
    if (fallback) ranges.push({ ...fallback, template: templates[0] });
  }
  if (!ranges.length) return;

  const fragment = document.createDocumentFragment();
  let offset = 0;
  ranges.forEach(({ start, end, template }) => {
    if (start > offset) fragment.append(document.createTextNode(text.slice(offset, start)));
    const holder = document.createElement("template");
    holder.innerHTML = template.html;
    const accent = holder.content.firstElementChild as HTMLElement | null;
    if (accent) {
      accent.textContent = text.slice(start, end);
      fragment.append(accent);
    }
    offset = end;
  });
  if (offset < text.length) fragment.append(document.createTextNode(text.slice(offset)));
  el.replaceChildren(fragment);
};

const syncMarkupTree = (target: HTMLElement, html: string) => {
  const holder = document.createElement("template");
  holder.innerHTML = html;
  target.replaceChildren(...Array.from(holder.content.childNodes).map((node) => node.cloneNode(true)));
};

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

/** Lê inclusive a escala original (1), para permitir uma restauração exata. */
export const readArtTextSizes = (root: HTMLElement): ArtTextSize => {
  const out: ArtTextSize = {};
  collectEditableNodes(root).forEach((_, index) => {
    out[index] = sizeRegistry.get(sizeKey(root, index)) ?? 1;
  });
  return out;
};

/** Restaura uma fotografia de tamanhos sem preservar ajustes feitos depois dela. */
export const restoreArtTextSizes = (root: HTMLElement, sizes: ArtTextSize) => {
  collectEditableNodes(root).forEach((el, index) => {
    paintTextSize(root, el, index, sizes[index] ?? 1);
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
    if (el.closest('[data-studio-no-export="1"], [aria-hidden="true"]')) return false;
    const semantic = el.matches(SEMANTIC_SELECTOR);
    if (semantic && el.querySelector(SEMANTIC_SELECTOR)) return false;
    if (!semantic) {
      if (el.closest(SEMANTIC_SELECTOR)) return false;
      if (el.querySelector(SELECTOR)) return false;
    }
    // Texto que você esvaziou de propósito continua na lista: é ele que guarda a
    // posição e permite voltar a escrever ali depois.
    if (el.dataset[HIDDEN_ATTR] === "1" || el.dataset[SLOT_ATTR] === "1") return true;
    const text = normalizedText(el.textContent ?? "");
    if (!text || /^[+−–—•·|→←↑↓]+$/.test(text)) return false;
    return true;
  });

/** Lê os textos atuais da arte, na ordem em que aparecem. */
export const readArtText = (root: HTMLElement): ArtTextEdits => {
  const out: ArtTextEdits = {};
  collectEditableNodes(root).forEach((el, i) => {
    out[i] = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  });
  return out;
};

/** Deixa o campo esvaziado invisível na arte (e no PNG), sem quebrar o desenho. */
const paintHidden = (el: HTMLElement, hidden: boolean, editing = false) => {
  if (hidden) {
    el.dataset[HIDDEN_ATTR] = "1";
    el.style.visibility = editing ? "visible" : "hidden";
    el.style.opacity = editing ? "0.35" : "";
    el.style.minWidth = editing ? "48px" : "";
    el.style.minHeight = editing ? "1em" : "";
    return;
  }
  delete el.dataset[HIDDEN_ATTR];
  el.style.visibility = "";
  el.style.opacity = "";
  el.style.minWidth = "";
  el.style.minHeight = "";
};

/** Reaplica os textos editados sobre a arte recém-renderizada. */
export const applyArtText = (root: HTMLElement, edits?: ArtTextEdits) => {
  if (!edits) return;
  collectEditableNodes(root).forEach((el, i) => {
    const next = edits[i];
    if (typeof next !== "string") return;
    // Campo esvaziado de propósito: fica sem texto e invisível na arte final.
    if (!next.trim()) {
      const only = el.childNodes.length === 1 ? el.firstChild : null;
      if (only && only.nodeType === Node.TEXT_NODE) only.nodeValue = "";
      else el.textContent = "";
      paintHidden(el, true);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (el.dataset[HIDDEN_ATTR] === "1") paintHidden(el, false);
    if ((el.textContent ?? "").replace(/\s+/g, " ").trim() === next) return;
    const rich = markupRegistry.get(sizeKey(root, i));
    if (rich) {
      const holder = document.createElement("template");
      holder.innerHTML = rich;
      if (normalizedText(holder.content.textContent ?? "") === normalizedText(next)) {
        syncMarkupTree(el, rich);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    }
    /**
     * Quando existe um único nó de texto, alteramos o VALOR desse nó em vez de
     * recriar os filhos. Assim o React continua encontrando os mesmos nós na
     * próxima atualização — era isso que fazia o salvamento quebrar depois de
     * uma edição ("o objeto não pode ser encontrado aqui").
     */
    const only = el.childNodes.length === 1 ? el.firstChild : null;
    if (only && only.nodeType === Node.TEXT_NODE) only.nodeValue = next;
    else el.textContent = next;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/** Liga/desliga a edição direta na arte, com contorno de foco visível. */
export const setArtEditing = (root: HTMLElement, on: boolean, onChange?: (edits: ArtTextEdits) => void) => {
  editListeners.get(root)?.abort();
  editListeners.delete(root);
  root.querySelectorAll(`[${EDIT_LAYER_ATTR}]`).forEach((el) => el.remove());
  const editableNodes = collectEditableNodes(root);
  if (on) {
    const templates: Record<number, AccentTemplate[]> = {};
    editableNodes.forEach((el, index) => {
      const accents = readAccentTemplates(el);
      if (accents.length) templates[index] = accents;
    });
    accentTemplates.set(root, templates);
  } else {
    const templates = accentTemplates.get(root) ?? {};
    editableNodes.forEach((el, index) => {
      restoreVisualAccents(el, templates[index] ?? []);
      if (el.children.length > 0) markupRegistry.set(sizeKey(root, index), el.innerHTML);
    });
    accentTemplates.delete(root);
  }
  editableNodes.forEach((el) => {
    el.dataset[SLOT_ATTR] = "1";
    const empty = !normalizedText(el.textContent ?? "");
    // Ao editar, o campo esvaziado reaparece apagado (para poder reescrever);
    // ao concluir, ele simplesmente não aparece mais na arte.
    if (empty) paintHidden(el, true, on);
    else paintHidden(el, false);
    el.contentEditable = on ? "true" : "false";
    el.spellcheck = false;
    el.style.outline = on ? "1px dashed currentColor" : "";
    el.style.outlineOffset = on ? "2px" : "";
    el.style.borderRadius = on ? "6px" : "";
    el.style.cursor = on ? "text" : "";
  });
  if (!on) {
    root.dispatchEvent(new Event("studio-text-commit", { bubbles: true }));
    return;
  }

  if (getComputedStyle(root).position === "static") root.style.position = "relative";
  const nodes = collectEditableNodes(root);
  const listeners = new AbortController();
  editListeners.set(root, listeners);
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
    button.addEventListener("pointerdown", (event) => event.preventDefault(), { signal: listeners.signal });
    button.addEventListener("click", () => resize(delta), { signal: listeners.signal });
    toolbar.appendChild(button);
  };
  control("Diminuir texto", "−", -TEXT_SCALE_STEP);
  control("Aumentar texto", "+", TEXT_SCALE_STEP);

  nodes.forEach((el, index) => {
    el.addEventListener("focus", () => {
      selected = index;
      place();
    }, { signal: listeners.signal });
    el.addEventListener("click", () => {
      selected = index;
      place();
    }, { signal: listeners.signal });
    el.addEventListener("input", () => onChange?.(readArtText(root)), { signal: listeners.signal });
  });
  place();

  const first = nodes[0];
  first?.focus();
};

/** Fotografia atômica usada por Cancelar: palavras e tipografia são uma só alteração. */
export const captureArtTextEditSnapshot = (root: HTMLElement): ArtTextEditSnapshot => ({
  text: readArtText(root),
  sizes: readArtTextSizes(root),
});

export const restoreArtTextEditSnapshot = (root: HTMLElement, snapshot: ArtTextEditSnapshot) => {
  applyArtText(root, snapshot.text);
  restoreArtTextSizes(root, snapshot.sizes);
  root.dispatchEvent(new Event("studio-text-commit", { bubbles: true }));
};

/** Alguma coisa foi realmente alterada nesta arte? */
export const hasArtEdits = (edits?: ArtTextEdits) => !!edits && Object.keys(edits).length > 0;
