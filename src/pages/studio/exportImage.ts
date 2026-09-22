import { toCanvas, getFontEmbedCSS } from "html-to-image";

/** iOS/Safari abortam canvas muito grandes. Mantemos folga sobre os limites reais. */
const MAX_DIMENSION = 4096;

/**
 * Iguala a altura de um conjunto de artes (slides de um carrossel) à maior do
 * grupo durante a exportação. No formato Livre cada slide tem altura própria e
 * o Instagram só aceita carrossel com proporção única.
 */
export const lockUniformHeight = (nodes: HTMLElement[]) => {
  if (nodes.length < 2) return () => {};
  const tallest = Math.max(
    ...nodes.map((node) => Math.max(node.scrollHeight, node.getBoundingClientRect().height)),
  );
  if (!Number.isFinite(tallest) || tallest <= 0) return () => {};
  const restores = nodes.map((node) => {
    const previousHeight = node.style.height;
    const previousMinHeight = node.style.minHeight;
    node.style.height = `${Math.ceil(tallest)}px`;
    node.style.minHeight = `${Math.ceil(tallest)}px`;
    return () => {
      node.style.height = previousHeight;
      node.style.minHeight = previousMinHeight;
    };
  });
  return () => restores.forEach((fn) => fn());
};
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

/**
 * Tamanho de layout usado para rasterizar a arte.
 *
 * O canvas final e TODOS os repintes (fotos, fundos, contornos) precisam usar a
 * mesma referência de medida. Quando o canvas era criado com uma altura
 * (scrollHeight) e os repintes calculavam a escala por outra (a altura visível),
 * a foto saía esticada/deslocada e o PNG fugia do formato mostrado na geração.
 */
type LayoutSize = { width: number; height: number };

const canvasScale = (canvas: HTMLCanvasElement, rootRect: DOMRect, layout?: LayoutSize) => ({
  scaleX: canvas.width / (layout?.width || rootRect.width),
  scaleY: canvas.height / (layout?.height || rootRect.height),
});

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
const paintImagesOnCanvas = (
  canvas: HTMLCanvasElement,
  node: HTMLElement,
  layer: "backdrop" | "foreground" = "backdrop",
  layout?: LayoutSize,
): PaintedRect[] => {
  const painted: PaintedRect[] = [];
  const context = canvas.getContext("2d");
  if (!context) return painted;

  const rootRect = node.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return painted;
  const { scaleX, scaleY } = canvasScale(canvas, rootRect, layout);

  for (const image of Array.from(node.querySelectorAll("img"))) {
    if (image.closest('[data-studio-no-export="1"]')) continue;
    const isForeground = image.dataset.studioExportImageLayer === "foreground";
    if ((layer === "foreground") !== isForeground) continue;
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

    /*
     * O repinte tem de reproduzir o MESMO tratamento visual da tela. Sem isso a
     * arte sai estragada: o modelo "Frase de impacto" espelha a mão
     * (scale-x-[-1]) e aplica grayscale/invert por CSS — o html-to-image já
     * rasteriza a versão tratada e este repinte colava a foto original em cima,
     * o que parecia uma segunda mão duplicada.
     */
    const cssFilter = style.filter && style.filter !== "none" ? style.filter : "";
    if (cssFilter && "filter" in context) {
      (context as CanvasRenderingContext2D & { filter: string }).filter = cssFilter;
    }
    const matrix = style.transform && style.transform !== "none" ? new DOMMatrixReadOnly(style.transform) : null;
    const flipX = !!matrix && matrix.a < 0;
    const flipY = !!matrix && matrix.d < 0;
    if (flipX || flipY) {
      context.translate(flipX ? x * 2 + width : 0, flipY ? y * 2 + height : 0);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    }

    if (style.objectFit === "contain") {
      const fit = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * fit;
      const drawHeight = sourceHeight * fit;
      context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    } else {
      context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    }
    context.restore();
    painted.push({ x, y, width, height });
  }

  return painted;
};

/**
 * COMPOSIÇÃO EM CAMADAS (fidelidade preview → PNG)
 *
 * Na tela a ordem é: foto → película escurecida → texto (brilho total). O
 * html-to-image rasteriza película e texto corretamente, mas o WebKit pode não
 * pintar <img> dentro do foreignObject — por isso as fotos são repintadas no
 * canvas. Repintá-las (e as películas) POR CIMA do raster escurecia o texto.
 *
 * Solução definitiva: as fotos são pintadas ATRÁS do raster. O raster entra por
 * cima com a película e o texto já no lugar, então a película nunca toca o
 * texto e a foto aparece por baixo dela.
 *
 * Como o raster pode trazer o fundo opaco do bloco (ex.: `#0c0c12` do bloco de
 * foto de fundo) cobrindo a foto que vem por baixo, esses fundos são
 * neutralizados durante a captura e repintados no canvas final antes das fotos
 * — preservando a cor de segurança caso a foto não carregue.
 */
type PaintedRect = { x: number; y: number; width: number; height: number };

type Backdrop = PaintedRect & { color: string; radius: number };

const isOpaqueColor = (value: string) => {
  const parsed = parseCssColor(value);
  return !!parsed && parsed[3] > 0.98;
};

/**
 * Torna transparentes, apenas durante a captura, os fundos opacos que ficam
 * ATRÁS de uma foto e devolve esses retângulos para repinte no canvas final.
 */
const openPhotoBackdrops = (node: HTMLElement) => {
  const backdrops: Backdrop[] = [];
  const restores: Array<() => void> = [];
  const seen = new Set<HTMLElement>();

  const rootRect = node.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return { backdrops, restore: () => undefined };

  for (const image of Array.from(node.querySelectorAll("img"))) {
    if (image.closest('[data-studio-no-export="1"]')) continue;
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) continue;
    const imageRect = image.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height) continue;

    let ancestor: HTMLElement | null = image.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      const rect = ancestor.getBoundingClientRect();
      const covers =
        rect.left <= imageRect.left + 1 &&
        rect.top <= imageRect.top + 1 &&
        rect.right >= imageRect.right - 1 &&
        rect.bottom >= imageRect.bottom - 1;

      if (covers && isOpaqueColor(style.backgroundColor) && !seen.has(ancestor)) {
        seen.add(ancestor);
        backdrops.push({
          x: rect.left - rootRect.left,
          y: rect.top - rootRect.top,
          width: rect.width,
          height: rect.height,
          color: style.backgroundColor,
          radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
        });
        const element = ancestor;
        const previous = element.style.cssText;
        restores.push(() => {
          element.style.cssText = previous;
        });
        element.style.setProperty("background-color", "transparent", "important");
      }

      if (ancestor === node) break;
      ancestor = ancestor.parentElement;
    }
  }

  /* Do fundo mais externo para o mais interno, como na tela. */
  backdrops.reverse();
  return { backdrops, restore: () => restores.forEach((fn) => fn()) };
};

const paintBackdropsOnCanvas = (
  canvas: HTMLCanvasElement,
  node: HTMLElement,
  backdrops: Backdrop[],
  layout?: LayoutSize,
) => {
  if (!backdrops.length) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const rootRect = node.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return;
  const { scaleX, scaleY } = canvasScale(canvas, rootRect, layout);

  for (const backdrop of backdrops) {
    context.save();
    roundedRect(
      context,
      backdrop.x * scaleX,
      backdrop.y * scaleY,
      backdrop.width * scaleX,
      backdrop.height * scaleY,
      backdrop.radius * Math.min(scaleX, scaleY),
    );
    context.clip();
    context.fillStyle = backdrop.color;
    context.fillRect(
      backdrop.x * scaleX,
      backdrop.y * scaleY,
      backdrop.width * scaleX,
      backdrop.height * scaleY,
    );
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

type StrokeSpec = { element: HTMLElement; color: string; width: number };

type StrokeTextRun = { text: string; rect: DOMRect };

/**
 * Lê cada palavra vazada na posição em que ela realmente aparece na tela.
 *
 * Um destaque pode quebrar em duas ou três linhas depois de uma edição. Usar
 * apenas o retângulo total e chamar `strokeText` uma vez redesenhava tudo em
 * uma linha: só o começo cabia no quadro e o restante desaparecia no PNG.
 */
export const readStrokeTextRuns = (element: HTMLElement): StrokeTextRun[] => {
  const runs: StrokeTextRun[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    const raw = textNode.textContent ?? "";
    for (const match of raw.matchAll(/\S+/g)) {
      const start = match.index ?? 0;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + match[0].length);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      if (rect.width > 0 && rect.height > 0) runs.push({ text: match[0], rect });
    }
    textNode = walker.nextNode();
  }

  return runs;
};

const parseCssColor = (value: string): [number, number, number, number] | null => {
  const match = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
};

/**
 * Neutraliza o `-webkit-text-stroke` dos destaques vazados DURANTE a captura.
 *
 * O html-to-image rasteriza o DOM via SVG foreignObject e o WebKit (iPhone)
 * simplesmente não pinta esse efeito lá dentro — a palavra destacada some do
 * PNG. Escondemos o contorno CSS e o repintamos no canvas depois, o que torna
 * o resultado idêntico em todos os navegadores.
 */
const hideCssStrokes = (node: HTMLElement) => {
  const specs: StrokeSpec[] = [];
  const restores: Array<() => void> = [];

  for (const el of Array.from(node.querySelectorAll<HTMLElement>("[data-studio-stroke]"))) {
    if (el.closest('[data-studio-no-export="1"]')) continue;
    const style = getComputedStyle(el);
    const width = Number.parseFloat(style.getPropertyValue("-webkit-text-stroke-width")) || 0;
    const color = style.getPropertyValue("-webkit-text-stroke-color");
    if (!width || !color || !parseCssColor(color)) continue;

    specs.push({ element: el, color, width });
    const previous = el.style.cssText;
    el.style.setProperty("-webkit-text-stroke-width", "0px");
    restores.push(() => {
      el.style.cssText = previous;
    });
  }

  return { specs, restore: () => restores.forEach((fn) => fn()) };
};

/**
 * Repinta no canvas as palavras em contorno vazado.
 *
 * O traço é desenhado e depois tem a metade INTERNA removida com uma máscara
 * no formato do glifo (destination-out). Sobra apenas o contorno externo — o
 * mesmo visual da tela, mas com os miolos das letras (e, a, o) sempre abertos,
 * sem os traços sobrepostos que o stroke centrado do CSS produz.
 */
export const paintStrokeTextOnCanvas = (
  canvas: HTMLCanvasElement,
  node: HTMLElement,
  specs: StrokeSpec[],
  layout?: LayoutSize,
) => {
  if (!specs.length) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const rootRect = node.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return;
  const { scaleX, scaleY } = canvasScale(canvas, rootRect, layout);

  for (const spec of specs) {
    const el = spec.element;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (!rect.width || !rect.height || style.display === "none" || style.visibility === "hidden") continue;

    /**
     * `getComputedStyle().fontSize` não inclui o `scale()` herdado do AutoFit.
     * A posição medida por Range já inclui esse scale; o tamanho da fonte
     * também precisa incluí-lo para o contorno ocupar exatamente o mesmo lugar.
     */
    const renderedScale = el.offsetHeight > 0 ? rect.height / el.offsetHeight : 1;
    const fontSize = (Number.parseFloat(style.fontSize) || 16) * renderedScale * scaleY;
    const font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    const transformText = (value: string) => {
      if (style.textTransform === "uppercase") return value.toUpperCase();
      if (style.textTransform === "capitalize") return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
      return value;
    };
    const text = transformText(el.textContent || "");
    if (!text.trim()) continue;

    const measuredRuns = readStrokeTextRuns(el);
    const runs = measuredRuns.length
      ? measuredRuns.map((run) => ({ text: transformText(run.text), rect: run.rect }))
      : [{ text, rect }];

    const strokeWidth = spec.width * Math.max(scaleX, scaleY);
    const pad = Math.ceil(strokeWidth + 8);

    for (const run of runs) {
      const off = document.createElement("canvas");
      off.width = Math.ceil(run.rect.width * scaleX) + pad * 2;
      off.height = Math.ceil(run.rect.height * scaleY) + pad * 2;
      const octx = off.getContext("2d");
      if (!octx) continue;

      octx.font = font;
      const spacing =
        style.letterSpacing === "normal"
          ? 0
          : (Number.parseFloat(style.letterSpacing) || 0) * renderedScale * scaleX;
      if ("letterSpacing" in octx) {
        (octx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
      }
      octx.textBaseline = "alphabetic";
      octx.lineJoin = "round";

      const metrics = octx.measureText(run.text);
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? fontSize * 0.22;
      const baselineY = pad + run.rect.height * scaleY - descent;

      octx.lineWidth = strokeWidth;
      octx.strokeStyle = spec.color;
      octx.strokeText(run.text, pad, baselineY);

      // Corta a metade interna do traço usando o glifo preenchido como máscara.
      octx.globalCompositeOperation = "destination-out";
      octx.fillStyle = "#000";
      octx.fillText(run.text, pad, baselineY);
      octx.globalCompositeOperation = "source-over";

      // Se algum dia o destaque tiver preenchimento visível, repinta o miolo.
      const fill = parseCssColor(style.color);
      if (fill && fill[3] > 0.02) {
        octx.fillStyle = style.color;
        octx.fillText(run.text, pad, baselineY);
      }

      context.drawImage(
        off,
        (run.rect.left - rootRect.left) * scaleX - pad,
        (run.rect.top - rootRect.top) * scaleY - pad,
      );
    }
  }
};

/**
 * Congela as camadas de movimento ANTES da captura.
 *
 * Metade dos modelos recebe efeito ligado ao scroll (`StudioMotion`), que só
 * fica neutro quando a arte está centralizada na tela. Ao exportar vários
 * slides de um carrossel de uma vez, os que não estavam centralizados eram
 * rasterizados no meio do efeito — a camada interna saía deslocada, com zoom ou
 * recortada, sobrando no PNG apenas a assinatura da marca. Aqui zeramos
 * transform/filter/clip-path/opacity dessas camadas e restauramos depois.
 */
export const freezeMotion = (node: HTMLElement) => {
  const restores: Array<() => void> = [];
  const layers = Array.from(node.querySelectorAll<HTMLElement>('[data-studio-motion="1"]'));
  if (node.dataset.studioMotion === "1") layers.push(node);

  for (const layer of layers) {
    const previous = layer.style.cssText;
    restores.push(() => {
      layer.style.cssText = previous;
    });
    layer.style.setProperty("transform", "none", "important");
    layer.style.setProperty("filter", "none", "important");
    layer.style.setProperty("clip-path", "none", "important");
    layer.style.setProperty("opacity", "1", "important");
  }

  return () => restores.forEach((fn) => fn());
};

/** Espera duas pinturas para que fontes, imagens e medidas CSS se estabilizem. */
const settleLayout = async () => {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  await fonts?.ready?.catch(() => undefined);
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

/**
 * Congela no clone as quebras de linha que o usuário realmente aprovou.
 *
 * `html-to-image` monta um segundo DOM dentro de um SVG. Uma diferença mínima
 * na métrica da fonte nesse passo pode empurrar só a última palavra para outra
 * linha — depois que o AutoFit já terminou — e fazê-la escapar de uma tarja.
 * Transformamos cada linha visual de textos-folha em uma linha explícita antes
 * da rasterização. O DOM vivo não é alterado.
 */
export const lockRenderedTextLines = (source: HTMLElement, clone: HTMLElement) => {
  const sources = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const clones = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  sources.forEach((element, index) => {
    const target = clones[index];
    if (!target || element.children.length > 0) return;
    if (element.closest('[data-studio-no-export="1"]')) return;

    const raw = element.textContent ?? "";
    if (!raw.trim()) return;
    const style = getComputedStyle(element);
    /**
     * Nunca congele isoladamente um destaque inline/inline-block. Ele participa
     * do fluxo contínuo do título com os spans irmãos; transformá-lo em blocos
     * separa a frase e muda justamente as quebras que queremos preservar.
     */
    if (!["block", "list-item", "flex"].includes(style.display)) return;
    if (style.display === "none" || style.visibility === "hidden") return;
    // JSDOM devolve vazio; no navegador o padrão computado é `normal`.
    if (style.whiteSpace && !["normal", "pre-line"].includes(style.whiteSpace)) return;

    const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode || element.childNodes.length !== 1) return;
    const probe = document.createRange();
    if (typeof probe.getBoundingClientRect !== "function") return;

    const characters = Array.from(raw);
    if (!characters.length) return;
    const lines: Array<{ top: number; text: string }> = [];

    let offset = 0;
    characters.forEach((character) => {
      const start = offset;
      offset += character.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, offset);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      if (!rect.width && !rect.height) return;
      const line = lines.find((item) => Math.abs(item.top - rect.top) < 2);
      if (line) line.text += character;
      else lines.push({ top: rect.top, text: character });
    });

    if (!lines.length) return;
    /**
     * O SVG interno do `html-to-image` pode avaliar novamente max-width e
     * breakpoints. Materializamos a largura de layout que produziu as linhas
     * aprovadas para que o título não volte a crescer e seja cortado à direita.
     * `offsetWidth` é anterior ao scale do AutoFit, exatamente a largura usada
     * pelo navegador para quebrar o texto vivo.
     */
    if (element.offsetWidth > 0) {
      target.style.setProperty("width", `${element.offsetWidth}px`, "important");
      target.style.setProperty("max-width", `${element.offsetWidth}px`, "important");
      target.style.setProperty("min-width", "0", "important");
      target.style.setProperty("box-sizing", "border-box", "important");
    }
    target.replaceChildren(
      ...lines.map((line) => {
        const span = document.createElement("span");
        span.dataset.studioExportLine = "1";
        span.style.display = "block";
        span.style.setProperty("white-space", "pre", "important");
        span.style.setProperty("width", "max-content", "important");
        span.style.setProperty("max-width", "100%", "important");
        span.textContent = line.text.trim();
        return span;
      }),
    );
  });
};

/**
 * Cria uma superfície estática fora da tela. A captura nunca usa o card vivo:
 * scroll, faixa horizontal e atualizações do Framer Motion não conseguem mais
 * alterar a geometria enquanto o PNG está sendo rasterizado.
 */
export const createStaticExportSurface = async (source: HTMLElement) => {
  // Mede somente depois que a mesma fonte/foto vista pelo usuário estabilizou.
  await waitForAssets(source);
  await settleLayout();
  const rect = source.getBoundingClientRect();
  const host = document.createElement("div");
  host.dataset.studioExportSurface = "1";
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${rect.width}px`,
    pointerEvents: "none",
    zIndex: "-2147483647",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.maxWidth = "none";
  // O card na tela corta o excedente; a cópia precisa cortar igual para o PNG
  // sair no mesmo formato mostrado na geração.
  clone.style.overflow = "hidden";

  // Tokens da marca são herdados de wrappers da tela; materialize-os na cópia.
  const computed = getComputedStyle(source);
  for (let i = 0; i < computed.length; i += 1) {
    const property = computed.item(i);
    if (property.startsWith("--")) clone.style.setProperty(property, computed.getPropertyValue(property));
  }

  host.appendChild(clone);
  document.body.appendChild(host);
  freezeMotion(clone);
  await waitForAssets(clone);
  await settleLayout();
  lockRenderedTextLines(source, clone);
  await settleLayout();

  return {
    node: clone,
    dispose: () => host.remove(),
  };
};

const renderStaticNodeToBlob = async (
  node: HTMLElement,
  pixelRatio: number,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
) => {
  const fontEmbedCSS = await resolveFontCss(node);
  const backgroundColor = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const { specs, restore } = hideCssStrokes(node);
  const { backdrops, restore: restoreBackdrops } = openPhotoBackdrops(node);

  /*
   * UMA única medida para tudo. O quadro exportado é exatamente o quadro
   * mostrado na geração (o excedente já é cortado na tela pelo próprio card),
   * e os repintes usam a mesma escala do raster — sem foto esticada, deslocada
   * ou PNG em proporção diferente da prévia.
   */
  const rect = node.getBoundingClientRect();
  const layout: LayoutSize = {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height || node.scrollHeight),
  };

  let output: HTMLCanvasElement;
  try {
    /* Raster SEM fundo opaco: ele precisa de transparência para que a foto
       possa ser composta por baixo da película já rasterizada. */
    const raster = await toCanvas(node, {
      width: layout.width,
      height: layout.height,
      pixelRatio,
      skipFonts: fontEmbedCSS === null,
      fontEmbedCSS: fontEmbedCSS ?? undefined,
      filter: (child) => !(child instanceof HTMLElement && child.dataset.studioNoExport === "1"),
    });

    /*
     * Montagem final, na MESMA ordem da tela:
     * 1) cor de fundo, 2) fundos opacos dos blocos de foto, 3) fotos,
     * 4) raster da arte (película + texto) por cima. Assim a película
     * escurece apenas a foto e o texto mantém brilho total.
     */
    output = document.createElement("canvas");
    output.width = raster.width;
    output.height = raster.height;
    const context = output.getContext("2d");
    if (!context) throw new Error("no-2d-context");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, output.width, output.height);
    paintBackdropsOnCanvas(output, node, backdrops, layout);
    paintImagesOnCanvas(output, node, "backdrop", layout);
    context.drawImage(raster, 0, 0);

    /*
     * Símbolos e logos que vivem dentro de uma superfície opaca precisam ficar
     * ACIMA do raster. Se fossem tratados como foto de fundo, o círculo/tarja
     * do próprio bloco os cobriria no PNG — exatamente o caso da mão no D.I.F.I.
     */
    paintImagesOnCanvas(output, node, "foreground", layout);

    paintStrokeTextOnCanvas(output, node, specs, layout);
  } finally {
    restoreBackdrops();
    restore();
  }
  return canvasToBlob(output, type, quality);
};


export const renderNodeToBlob = async (
  node: HTMLElement,
  pixelRatio: number,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
) => {
  const surface = await createStaticExportSurface(node);
  const restoreImages = await inlineImages(surface.node);
  try {
    await settleLayout();
    return await renderStaticNodeToBlob(surface.node, pixelRatio, type, quality);
  } finally {
    restoreImages();
    surface.dispose();
  }
};

/**
 * Rasteriza um nó em PNG com o MESMO cuidado da exportação individual:
 * espera fontes/imagens, embute as fotos e faz downscale progressivo quando o
 * canvas estoura (comum no iPhone).
 */
export const renderNodeToPngBlob = async (node: HTMLElement, desiredRatio = 3) => {
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
        return { blob, ratio: pixelRatio };
      } catch (error) {
        lastError = error;
      }
    }
  } finally {
    restoreImages();
  }

  throw lastError instanceof Error ? lastError : new Error("export-failed");
};

/**
 * Exporta um elemento em PNG de alta resolução e entrega o arquivo ao usuário.
 * Usa Web Share no mobile, onde `<a download>` costuma ser ignorado.
 */
export const exportNodeAsPng = async (node: HTMLElement, fileName: string, desiredRatio = 3): Promise<ExportResult> => {
  const { blob, ratio } = await renderNodeToPngBlob(node, desiredRatio);
  const shared = await deliver(blob, fileName);
  return { blob, ratio, shared };
};

/**
 * Exporta VÁRIAS artes (slides de um carrossel ou a leva inteira) com a mesma
 * qualidade da exportação individual.
 *
 * Por que não basta chamar `exportNodeAsPng` num laço: `navigator.share` só
 * aceita uma chamada por gesto do usuário — a partir do segundo slide o
 * navegador rejeita e o download "não funciona". Aqui rasterizamos todos os
 * slides primeiro e entregamos em UM único share com todos os arquivos; sem
 * share (desktop), baixamos um por um com folga entre os cliques.
 */
export const exportNodesAsPng = async (
  items: Array<{ node: HTMLElement; fileName: string }>,
  desiredRatio = 3,
): Promise<{ delivered: number; shared: boolean }> => {
  const files: File[] = [];
  const surfaces = await Promise.all(items.map((item) => createStaticExportSurface(item.node)));
  const imageRestores = await Promise.all(surfaces.map((surface) => inlineImages(surface.node)));
  const restoreHeight = lockUniformHeight(surfaces.map((surface) => surface.node));
  let lastError: unknown;

  try {
    await settleLayout();
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const surface = surfaces[index];
      try {
        const rect = surface.node.getBoundingClientRect();
        const ratio = safeRatio(rect.width, Math.max(rect.height, surface.node.scrollHeight), desiredRatio);
        const blob = await renderStaticNodeToBlob(surface.node, ratio);
        files.push(new File([blob], item.fileName, { type: "image/png" }));
      } catch (error) {
        lastError = error;
      }
    }
  } finally {
    restoreHeight();
    imageRestores.forEach((restore) => restore());
    surfaces.forEach((surface) => surface.dispose());
  }

  if (!files.length) throw lastError instanceof Error ? lastError : new Error("export-failed");

  const shared = await deliverMany(files);
  return { delivered: files.length, shared };
};

/**
 * Entrega um conjunto de arquivos: share único no mobile (com todos juntos) e,
 * como alternativa, um download por arquivo em sequência espaçada.
 */
export const deliverMany = async (files: File[], mime = "image/png"): Promise<boolean> => {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (files.length > 1 && typeof nav.share === "function" && nav.canShare?.({ files })) {
    try {
      await nav.share({ files });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return true;
      // Share múltiplo indisponível: cai para o download arquivo por arquivo.
    }
  }

  for (let i = 0; i < files.length; i += 1) {
    downloadBlob(files[i], files[i].name, mime);
    // Safari/Chrome descartam downloads disparados no mesmo instante.
    if (i < files.length - 1) await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
  }
  return false;
};

/** Dispara o download de um blob via link temporário. */
const downloadBlob = (blob: Blob, fileName: string, mime = "image/png") => {
  const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 20_000);
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

  downloadBlob(blob, fileName, mime);

  return false;
};
