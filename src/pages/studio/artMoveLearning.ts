/**
 * APRENDIZADO DE POSIÇÃO DE TEXTO (o motor aprende com o arraste do dono)
 *
 * Quando o dono da marca liga "Mover texto", arrasta uma frase e clica em
 * "Fixar posição", o Studio não guarda só aquele ajuste na arte da tela: ele
 * MEDE onde a frase parou em relação ao desenho de referência (no caso da arte
 * da pinça, a própria foto da mão) e guarda esse ponto como aprendizado do
 * modelo. Nas próximas gerações a frase já nasce naquele lugar.
 *
 * Como a medida é feita:
 * - o desenho de referência marca-se com `data-studio-learn-frame="<chave>"`
 *   (ex.: a caixa da foto da mão);
 * - o texto que deve ser aprendido marca-se com `data-studio-learn="<chave>"`;
 * - guardamos o CENTRO do texto em FRAÇÃO da largura/altura do quadro de
 *   referência. Fração (e não pixel) é o que faz o aprendizado valer em
 *   qualquer formato (Livre, 1:1, 4:5, 9:16) e em qualquer tela.
 *
 * Guardamos as últimas amostras e aplicamos a MEDIANA: um arraste exagerado num
 * dia não estraga o que já estava certo. O aprendizado é por MARCA — a mão de
 * uma marca não interfere na arte de outra.
 */

import { BRAND_HANDLE, BRAND_NAME } from "./brand";
import { clearMoveForNode } from "./artTextMove";

/** Ponto aprendido: centro do texto em fração do quadro de referência. */
export type LearnedSpot = { x: number; y: number };

type Store = Record<string, LearnedSpot[]>;

const STORAGE_KEY = "studio-text-position-learning-v1";
const MAX_SAMPLES = 7;

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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Posição já aprendida para este slot (ou nada, se o dono nunca ajustou). */
export const learnedSpot = (learnKey: string): LearnedSpot | null => {
  const samples = read()[slotKey(learnKey)];
  if (!samples?.length) return null;
  return {
    x: clamp01(median(samples.map((s) => s.x))),
    y: clamp01(median(samples.map((s) => s.y))),
  };
};

/** Esquece o que foi aprendido para um slot (usado no "Posição original"). */
export const forgetLearnedSpot = (learnKey: string) => {
  const store = read();
  delete store[slotKey(learnKey)];
  write(store);
};

/**
 * Lê a tela e aprende: para cada texto marcado com `data-studio-learn`, mede o
 * centro dele dentro do quadro de referência de mesma chave e guarda a amostra.
 * Chamado quando o dono confirma o reposicionamento ("Fixar posição").
 */
export const learnArtMoves = (root: HTMLElement): string[] => {
  const learned: string[] = [];
  const store = read();

  root.querySelectorAll<HTMLElement>("[data-studio-learn]").forEach((textEl) => {
    const key = textEl.dataset.studioLearn;
    if (!key) return;
    const frame = root.querySelector<HTMLElement>(`[data-studio-learn-frame="${key}"]`);
    if (!frame) return;

    const frameRect = frame.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    const spot: LearnedSpot = {
      x: clamp01((textRect.left + textRect.width / 2 - frameRect.left) / frameRect.width),
      y: clamp01((textRect.top + textRect.height / 2 - frameRect.top) / frameRect.height),
    };

    const slot = slotKey(key);
    const samples = [...(store[slot] ?? []), spot].slice(-MAX_SAMPLES);
    store[slot] = samples;
    learned.push(key);

    /*
     * O deslocamento manual já virou aprendizado: zeramos o arraste para o
     * texto não sair deslocado duas vezes quando a arte renderizar de novo
     * partindo do ponto aprendido.
     */
    clearMoveForNode(root, textEl);
  });

  if (learned.length) write(store);
  return learned;
};
