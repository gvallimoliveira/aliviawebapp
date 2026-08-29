/**
 * LEITURA DE COR NO PIXEL (manual da marca / logo)
 *
 * A IA lê o manual e transcreve os hexadecimais escritos nele. Quando o manual
 * NÃO traz o código (ou traz só amostras impressas), o tom exato tem que sair da
 * imagem. Este módulo faz isso no navegador, sem crédito de IA:
 *
 * 1. desenha a imagem num canvas (até 480px de lado) e lê pixel por pixel;
 * 2. agrupa pixels vizinhos em cor (distância perceptual pequena);
 * 3. devolve, para cada grupo, o hexadecimal do pixel MAIS FREQUENTE do grupo —
 *    o tom real da marca, não uma média esmaecida pela mistura.
 *
 * Pixels transparentes e a névoa de antialiasing (grupos minúsculos) são
 * descartados para o tom não sair "sujo".
 */

export type PaletteSwatch = {
  hex: string;
  /** Participação na área da imagem (0–1). */
  share: number;
  /** Cor quase branca/preta: serve como fundo/texto, não como cor de marca. */
  neutral: boolean;
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = src;
  });

/** Distância suficiente para separar tons que o olho lê como cores diferentes. */
const near = (a: [number, number, number], b: [number, number, number]) => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  // Ponderação perceptual leve (verde pesa mais que azul).
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) < 40;
};

const isNeutral = ([r, g, b]: [number, number, number]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat < 0.12 || max > 244 || max < 18;
};

/**
 * Paleta da imagem, ordenada por presença. `limit` é o número de tons devolvidos.
 */
export const extractPalette = async (src: string, limit = 8): Promise<PaletteSwatch[]> => {
  const img = await loadImage(src);
  const side = 480;
  const scale = Math.min(1, side / Math.max(img.width || 1, img.height || 1));
  const w = Math.max(1, Math.round((img.width || side) * scale));
  const h = Math.max(1, Math.round((img.height || side) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Contagem EXATA por pixel: preserva o tom original da marca.
  const exact = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    exact.set(key, (exact.get(key) ?? 0) + 1);
    total += 1;
  }
  if (!total) return [];

  const sorted = [...exact.entries()]
    .map(([key, count]) => ({ rgb: key.split(",").map(Number) as [number, number, number], count }))
    .sort((a, b) => b.count - a.count);

  // Agrupa por vizinhança e mantém o pixel dominante de cada grupo.
  const groups: { rgb: [number, number, number]; count: number }[] = [];
  sorted.forEach((entry) => {
    const hit = groups.find((g) => near(g.rgb, entry.rgb));
    if (hit) hit.count += entry.count;
    else groups.push({ rgb: entry.rgb, count: entry.count });
  });

  return groups
    .filter((g) => g.count / total > 0.004)
    .slice(0, limit)
    .map((g) => ({
      hex: toHex(g.rgb[0], g.rgb[1], g.rgb[2]),
      share: g.count / total,
      neutral: isNeutral(g.rgb),
    }));
};

/** Cor exata do pixel clicado numa imagem já renderizada (refino manual). */
export const pickPixelHex = async (
  src: string,
  ratioX: number,
  ratioY: number,
): Promise<string | null> => {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width || 1;
  canvas.height = img.height || 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const x = Math.max(0, Math.min(canvas.width - 1, Math.round(ratioX * canvas.width)));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.round(ratioY * canvas.height)));
  const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
  if (a < 20) return null;
  return toHex(r, g, b);
};

/** Conta-gotas nativo do navegador (Chrome/Edge): pega cor de qualquer ponto da tela. */
export const supportsEyeDropper = () => typeof window !== "undefined" && "EyeDropper" in window;

export const pickWithEyeDropper = async (): Promise<string | null> => {
  if (!supportsEyeDropper()) return null;
  try {
    const Ctor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper;
    const result = await new Ctor().open();
    const hex = result?.sRGBHex ?? "";
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : null;
  } catch {
    return null;
  }
};
