import { toCanvas, getFontEmbedCSS } from "html-to-image";

/** iOS/Safari abortam canvas muito grandes. Mantemos folga sobre os limites reais. */
const MAX_DIMENSION = 4096;
const MAX_AREA = 12_000_000;

let cachedFontCss: string | null | undefined;

/** Embute as fontes uma única vez; se falhar (CORS do Google Fonts), exporta sem elas. */
const resolveFontCss = async (node: HTMLElement) => {
  if (cachedFontCss !== undefined) return cachedFontCss;
  try {
    cachedFontCss = await getFontEmbedCSS(node);
  } catch {
    cachedFontCss = null;
  }
  return cachedFontCss;
};

const dataUrlCache = new Map<string, string>();

/**
 * Converte cada <img> para data URL ANTES da captura. O html-to-image refaz o
 * fetch das imagens durante a serialização e, no mobile, esse refetch falha ou
 * estoura o tempo — resultado: arte exportada sem as ilustrações.
 * Retorna a função que restaura os `src` originais.
 */
const inlineImages = async (node: HTMLElement) => {
  const images = Array.from(node.querySelectorAll("img"));
  const restores: Array<() => void> = [];

  await Promise.all(
    images.map(async (img) => {
      const original = img.getAttribute("src");
      if (!original || original.startsWith("data:")) return;

      let dataUrl = dataUrlCache.get(original);
      if (!dataUrl) {
        try {
          const res = await fetch(original, { cache: "force-cache" });
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          dataUrlCache.set(original, dataUrl);
        } catch {
          return;
        }
      }

      const loading = img.getAttribute("loading");
      img.setAttribute("src", dataUrl);
      img.removeAttribute("loading");
      restores.push(() => {
        img.setAttribute("src", original);
        if (loading) img.setAttribute("loading", loading);
      });

      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(resolve, 3000);
        });
      }

      try {
        await img.decode();
      } catch {
        /* A imagem já pode estar decodificada; naturalWidth é validado abaixo. */
      }
    }),
  );

  // Safari precisa de um ciclo de pintura depois da troca do src. Sem isso, o
  // DOM exibe a imagem, mas o foreignObject usado pelo html-to-image a omite.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  return () => restores.forEach((fn) => fn());
};

/** Espera fontes e imagens para a arte não sair com texto/foto faltando. */
const waitForAssets = async (node: HTMLElement) => {
  try {
    await document.fonts?.ready;
  } catch {
    /* noop */
  }
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            window.setTimeout(done, 4000);
          }),
    ),
  );
};

/** Escala máxima segura para o tamanho real do elemento. */
const safeRatio = (width: number, height: number, desired: number) => {
  if (!width || !height) return 1;
  const byDimension = MAX_DIMENSION / Math.max(width, height);
  const byArea = Math.sqrt(MAX_AREA / (width * height));
  return Math.max(1, Math.min(desired, byDimension, byArea));
};

export type ExportResult = { blob: Blob; ratio: number; shared: boolean };

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

/**
 * Recoloca as imagens diretamente no canvas final.
 *
 * WebKit/iOS pode ignorar <img> dentro do SVG foreignObject produzido pelo
 * html-to-image, inclusive quando o src já é data URL. Texto e moldura saem,
 * mas a área da foto fica branca. Desenhar os pixels após a rasterização evita
 * definitivamente esse caminho frágil do navegador.
 */
const paintImagesOnCanvas = (canvas: HTMLCanvasElement, node: HTMLElement) => {
  const context = canvas.getContext("2d");
  if (!context) return;

  const rootRect = node.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return;
  const scaleX = canvas.width / rootRect.width;
  const scaleY = canvas.height / rootRect.height;

  for (const image of Array.from(node.querySelectorAll("img"))) {
    if (image.closest('[data-studio-no-export="1"]')) continue;
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) continue;

    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    if (!rect.width || !rect.height || style.display === "none" || style.visibility === "hidden") continue;

    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const x = (rect.left - rootRect.left + borderLeft) * scaleX;
    const y = (rect.top - rootRect.top + borderTop) * scaleY;
    const width = Math.max(0, (rect.width - borderLeft - borderRight) * scaleX);
    const height = Math.max(0, (rect.height - borderTop - borderBottom) * scaleY);
    if (!width || !height) continue;

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (style.objectFit === "cover") {
      if (sourceRatio > targetRatio) {
        sw = sourceHeight * targetRatio;
        sx = (sourceWidth - sw) / 2;
      } else {
        sh = sourceWidth / targetRatio;
        sy = style.objectPosition.includes("top") ? 0 : (sourceHeight - sh) / 2;
      }
    }

    const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * Math.min(scaleX, scaleY);
    context.save();
    context.globalAlpha = Number.parseFloat(style.opacity) || 1;
    roundedRect(context, x, y, width, height, radius);
    context.clip();

    if (style.objectFit === "contain") {
      const fit = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * fit;
      const drawHeight = sourceHeight * fit;
      context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    } else {
      context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    }
    context.restore();
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, type = "image/png", quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("empty-canvas"))),
      type,
      quality,
    );
  });

export const renderNodeToBlob = async (
  node: HTMLElement,
  pixelRatio: number,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
) => {
  const fontEmbedCSS = await resolveFontCss(node);
  const backgroundColor = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const canvas = await toCanvas(node, {
    pixelRatio,
    backgroundColor,
    skipFonts: fontEmbedCSS === null,
    fontEmbedCSS: fontEmbedCSS ?? undefined,
    filter: (child) => !(child instanceof HTMLElement && child.dataset.studioNoExport === "1"),
  });
  paintImagesOnCanvas(canvas, node);
  return canvasToBlob(canvas, type, quality);
};

/**
 * Exporta um elemento em PNG de alta resolução e entrega o arquivo ao usuário.
 * Faz downscale progressivo quando o canvas estoura (comum no iPhone) e usa
 * Web Share no mobile, onde `<a download>` costuma ser ignorado.
 */
export const exportNodeAsPng = async (node: HTMLElement, fileName: string, desiredRatio = 3): Promise<ExportResult> => {
  await waitForAssets(node);
  const restoreImages = await inlineImages(node);

  const rect = node.getBoundingClientRect();
  const attempts: number[] = [];
  let ratio = safeRatio(rect.width, rect.height, desiredRatio);
  while (ratio >= 1) {
    attempts.push(Number(ratio.toFixed(2)));
    if (ratio <= 1) break;
    ratio = Math.max(1, ratio / 1.5);
  }

  let lastError: unknown;
  try {
    for (const pixelRatio of attempts) {
      try {
        const blob = await renderNodeToBlob(node, pixelRatio);
        if (blob.size < 1024) throw new Error("empty-canvas");
        const shared = await deliver(blob, fileName);
        return { blob, ratio: pixelRatio, shared };
      } catch (error) {
        lastError = error;
      }
    }
  } finally {
    restoreImages();
  }

  throw lastError instanceof Error ? lastError : new Error("export-failed");
};


/** Compartilha no mobile, baixa no desktop, abre em nova aba como último recurso. */
export const deliver = async (blob: Blob, fileName: string, mime = "image/png"): Promise<boolean> => {
  const file = new File([blob], fileName, { type: mime });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return true;
    } catch (error) {
      // Usuário cancelou: não tentar baixar por cima.
      if (error instanceof DOMException && error.name === "AbortError") return true;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 20_000);
  return false;
};
