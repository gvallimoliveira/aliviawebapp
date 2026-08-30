/**
 * APRENDIZADO DE POSIÇÃO DE TEXTO (o motor aprende com o arraste do dono)
 *
 * Quando o dono da marca liga "Mover texto", arrasta uma frase e clica em
 * "Fixar posição", o Studio não guarda só aquele ajuste na arte da tela: ele
 * MEDE o quanto a frase andou em relação ao desenho de referência do modelo
 * (na arte da pinça, a própria caixa da foto da mão) e guarda essa correção
 * como aprendizado. Nas próximas gerações a frase já nasce no lugar certo.
 *
 * Como a medida é feita:
 * - o desenho de referência marca-se com `data-studio-learn-frame="<chave>"`
 *   (ex.: a caixa da foto da mão);
 * - o texto aprendido marca-se com `data-studio-learn="<chave>"`;
 * - o arraste vem em fração da ARTE; convertemos para fração do QUADRO DE
 *   REFERÊNCIA e somamos à correção que já existia. Fração (e não pixel) é o
 *   que faz o aprendizado valer em qualquer formato (Livre, 1:1, 4:5, 9:16).
 *
 * Guardamos as últimas amostras e aplicamos a MEDIANA: um arraste exagerado num
 * dia não estraga o que já estava certo. O aprendizado é por MARCA — o ajuste
 * de uma marca não muda a arte de outra.
 */

import { BRAND_HANDLE, BRAND_NAME } from "./brand";
import { clearMoveForNode, moveForNode } from "./artTextMove";

/** Correção aprendida: deslocamento em fração do quadro de referência. */
export type LearnedSpot = { x: number; y: number };

type Store = Record<string, LearnedSpot[]>;

const STORAGE_KEY = "studio-text-position-learning-v1";
const MAX_SAMPLES = 7;
/** Limite de segurança: o aprendizado nunca joga o texto fora do desenho. */
const MAX_SHIFT = 0.45;

const brandKey = () =>
  (BRAND_HANDLE || BRAND_NAME || "marca").toString().trim().toLowerCase() || "marca";

const read = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

const write = (store: Store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* memória cheia ou navegação privada: o aprendizado apenas não persiste */
  }
};

const slotKey = (learnKey: string) => `${brandKey()}::${learnKey}`;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const clampShift = (n: number) => Math.min(MAX_SHIFT, Math.max(-MAX_SHIFT, n));

/** Correção já aprendida para este slot (ou nada, se o dono nunca ajustou). */
export const learnedSpot = (learnKey: string): LearnedSpot | null => {
  let samples: LearnedSpot[] | undefined;
  try {
    samples = read()[slotKey(learnKey)];
  } catch {
    return null;
  }
  if (!samples?.length) return null;
  return {
    x: clampShift(median(samples.map((s) => s.x))),
    y: clampShift(median(samples.map((s) => s.y))),
  };
};

/** Esquece o aprendizado do slot (usado no "Posição original"). */
export const forgetLearnedSpot = (learnKey: string) => {
  const store = read();
  delete store[slotKey(learnKey)];
  write(store);
};

/** Esquece tudo que foi aprendido nesta arte (varre os slots presentes nela). */
export const forgetArtLearning = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>("[data-studio-learn]").forEach((el) => {
    if (el.dataset.studioLearn) forgetLearnedSpot(el.dataset.studioLearn);
  });
};

/**
 * Lê a tela e aprende: para cada texto marcado com `data-studio-learn`,
 * converte o arraste feito pelo dono em correção do modelo e guarda a amostra.
 * Chamado quando o dono confirma o reposicionamento ("Fixar posição").
 */
export const learnArtMoves = (root: HTMLElement): string[] => {
  const learned: string[] = [];
  const store = read();
  const artRect = root.getBoundingClientRect();
  if (!artRect.width || !artRect.height) return learned;

  root.querySelectorAll<HTMLElement>("[data-studio-learn]").forEach((textEl) => {
    const key = textEl.dataset.studioLearn;
    if (!key) return;
    const frame = root.querySelector<HTMLElement>(`[data-studio-learn-frame="${key}"]`);
    if (!frame) return;

    const drag = moveForNode(root, textEl);
    if (!drag || (!drag.x && !drag.y)) return;

    const frameRect = frame.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    /* O arraste vem em fração da arte: reescalamos para fração do desenho. */
    const mirrored = getComputedStyle(frame).direction === "rtl";
    const delta: LearnedSpot = {
      x: (drag.x * artRect.width) / frameRect.width * (mirrored ? -1 : 1),
      y: (drag.y * artRect.height) / frameRect.height,
    };

    const previous = learnedSpot(key) ?? { x: 0, y: 0 };
    const spot: LearnedSpot = {
      x: clampShift(previous.x + delta.x),
      y: clampShift(previous.y + delta.y),
    };

    const slot = slotKey(key);
    store[slot] = [...(store[slot] ?? []), spot].slice(-MAX_SAMPLES);
    learned.push(key);

    /*
     * O arraste já virou aprendizado do modelo: zeramos o deslocamento manual
     * para o texto não sair corrigido duas vezes no próximo render.
     */
    clearMoveForNode(root, textEl);
  });

  if (learned.length) write(store);
  return learned;
};
