/**
 * AZULEJO DA MARCA (padrão de fundo com o símbolo)
 *
 * Transforma o símbolo da marca (mão da Aliv.iA, raio do PerformaPro, ...) em um
 * ladrilho monocromático em data URL, para virar padrão de fundo repetido no
 * mesmo tom pastel das tramas geométricas.
 *
 * Por que data URL: a exportação PNG recria o DOM dentro de um `foreignObject`.
 * Background-image remoto pode falhar por CORS; um data URL sempre atravessa.
 * Se a imagem for remota e "sujar" o canvas, devolvemos null e o bloco cai na
 * trama geométrica normal.
 */

const cache = new Map<string, Promise<string | null>>();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("mark load failed"));
    img.src = src;
  });

/** Ladrilho quadrado com o símbolo centralizado e pintado de uma cor só. */
const buildTile = async (src: string, color: string, size: number): Promise<string | null> => {
  try {
    const img = await loadImage(src);
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // O símbolo ocupa ~62% do ladrilho: o resto é respiro do padrão.
    const box = size * 0.62;
    const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    // Silhueta: mantém só o alfa do símbolo e repinta com a tinta do padrão.
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
};

export const brandMarkTile = (src: string, color: string, size = 96): Promise<string | null> => {
  if (!src || typeof document === "undefined") return Promise.resolve(null);
  const key = `${src}|${color}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const task = buildTile(src, color, size);
  cache.set(key, task);
  return task;
};
