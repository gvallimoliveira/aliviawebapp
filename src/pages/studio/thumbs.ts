import { toJpeg } from "html-to-image";

/**
 * Miniaturas dos favoritos.
 *
 * Guardadas como JPEG pequeno (dataURL) em localStorage, apenas para o painel de
 * galeria — a arte final continua sendo exportada em alta resolução na hora.
 * Há poda por quantidade e proteção de quota para nunca derrubar o Studio.
 */

const KEY = "studio:favorites:thumbs";
const EVENT = "studio:thumbs-changed";
const MAX_ENTRIES = 60;
const TARGET_WIDTH = 300;

type Store = Record<string, string>;

export const readThumbs = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

const write = (store: Store) => {
  const entries = Object.entries(store).slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota cheia: mantém apenas as 12 mais recentes.
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries.slice(-12))));
    } catch {
      /* desiste silenciosamente */
    }
  }
  window.dispatchEvent(new Event(EVENT));
};

export const removeThumb = (id: string) => {
  const store = readThumbs();
  if (!(id in store)) return;
  delete store[id];
  write(store);
};

/** Captura uma miniatura leve do bloco e associa ao id do favorito. */
export const captureThumb = async (node: HTMLElement, id: string) => {
  try {
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = Math.min(1, TARGET_WIDTH / rect.width);
    const dataUrl = await toJpeg(node, {
      pixelRatio,
      quality: 0.6,
      cacheBust: true,
      skipFonts: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      filter: (child) => !(child instanceof HTMLElement && child.dataset.studioNoExport === "1"),
    });
    if (!dataUrl || dataUrl.length < 500) return;
    const store = readThumbs();
    store[id] = dataUrl;
    write(store);
  } catch (error) {
    console.warn("[studio] thumb capture failed", error);
  }
};

export const THUMBS_EVENT = EVENT;
