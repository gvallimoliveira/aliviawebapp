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
/**
 * Largura mestre dos PNGs de publicação.
 *
 * 2160 px (2x o padrão das redes) deixa margem para a recompressão do WhatsApp
 * sem alterar o enquadramento aprovado. A altura continua vindo exclusivamente
 * da proporção real do quadro; nunca é recalculada por marca ou formato.
 */
export const PUBLICATION_WIDTH = 2160;

/**
 * O CSS embutido depende das famílias usadas pela arte. Um único cache global
 * fazia a primeira marca exportada "emprestar" suas fontes às seguintes; o SVG
 * então recalculava a quebra com fallback e o texto crescia ou saía do quadro.
 */
const fontCssCache = new Map<string, string | null>();
let exportSurfaceLeases = 0;
let appRootOriginalStyle: string | null | undefined;

const fontCacheKey = (node: HTMLElement) => {
  const families = new Set<string>();
  [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))].forEach((element) => {
    const style = getComputedStyle(element);
    if (style.display !== "none" && style.fontFamily) families.add(style.fontFamily);
  });
  return Array.from(families).sort().join("|") || "document";
};

const withTimeout = async <T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(label)), milliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};

/** Embute as fontes uma única vez; se falhar (CORS do Google Fonts), exporta sem elas. */
const resolveFontCss = async (node: HTMLElement) => {
  const key = fontCacheKey(node);
  if (fontCssCache.has(key)) return fontCssCache.get(key) ?? null;
  try {
    const css = await withTimeout(getFontEmbedCSS(node), 6_000, "font-embed-timeout");
    fontCssCache.set(key, css);
    return css;
  } catch {
    fontCssCache.set(key, null);
    return null;
  }
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
        const controller = new AbortController();
        const abort = window.setTimeout(() => controller.abort(), 6_000);
        try {
          const res = await fetch(original, { cache: "force-cache", signal: controller.signal });
          if (!res.ok) throw new Error(`image-http-${res.status}`);
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
        } finally {
          window.clearTimeout(abort);
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

  // <image> dentro de SVG (ex.: símbolo da marca no modelo das pedras): sem
  // data URL o canvas fica "contaminado" ou o WebKit aborta a captura.
  const svgImages = Array.from(node.querySelectorAll("svg image")) as SVGImageElement[];
  await Promise.all(
    svgImages.map(async (el) => {
      const original = el.getAttribute("href") ?? el.getAttribute("xlink:href");
      if (!original || original.startsWith("data:")) return;
      let dataUrl = dataUrlCache.get(original);
      if (!dataUrl) {
        const controller = new AbortController();
        const abort = window.setTimeout(() => controller.abort(), 6_000);
        try {
          const res = await fetch(original, { cache: "force-cache", signal: controller.signal });
          if (!res.ok) throw new Error(`image-http-${res.status}`);
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          dataUrlCache.set(original, dataUrl);
        } catch {
          // Sem como embutir: remove do clone para não derrubar o download.
          el.remove();
          return;
        } finally {
          window.clearTimeout(abort);
        }
      }
      el.setAttribute("href", dataUrl);
      el.removeAttribute("xlink:href");
      restores.push(() => el.setAttribute("href", original));
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

/** Escala que leva qualquer quadro à largura mestre, respeitando o limite do aparelho. */
export const publicationPixelRatio = (width: number, height: number) => {
  if (!width || !height) return 1;
  return safeRatio(width, height, PUBLICATION_WIDTH / width);
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

type CoverCrop = { sx: number; sy: number; sw: number; sh: number };

/** Recorte equivalente a object-fit: cover, respeitando o ponto focal. */
export const calculateCoverCrop = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  focusX = 50,
  focusY = 50,
): CoverCrop => {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) sw = sourceHeight * targetRatio;
  else sh = sourceWidth / targetRatio;
  const x = Math.max(0, Math.min(100, focusX)) / 100;
  const y = Math.max(0, Math.min(100, focusY)) / 100;
  return { sx: (sourceWidth - sw) * x, sy: (sourceHeight - sh) * y, sw, sh };
};

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

/** Mesma silhueta proporcional usada pelo palco com foto. */
const popoutPath = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  const px = (value: number) => x + (width * value) / 100;
  const py = (value: number) => y + (height * value) / 100;
  context.beginPath();
  context.moveTo(px(12), py(0));
  context.lineTo(px(88), py(0));
  context.quadraticCurveTo(px(100), py(0), px(94.6), py(11.3));
  context.lineTo(px(55.4), py(88.7));
  context.quadraticCurveTo(px(50), py(100), px(44.6), py(88.7));
  context.lineTo(px(5.4), py(11.3));
  context.quadraticCurveTo(px(0), py(0), px(12), py(0));
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
    /*
     * Fotos (acervo ou inseridas pelo usuário) carregam camada explícita.
     * Todo o resto — logos, símbolos, avatares — vive ACIMA das superfícies
     * opacas no DOM; pintado como fundo, o raster do cartão o cobriria no PNG
     * (foi o caso do avatar vazio no bloco de tweet).
     */
    const isPhoto =
      image.dataset.studioPhoto === "1" || !!image.closest('[data-studio-inserted-image="1"]');
    const isForeground =
      image.dataset.studioExportImageLayer === "foreground" ||
      (!isPhoto && image.dataset.studioExportImageLayer !== "backdrop");
    if ((layer === "foreground") !== isForeground) continue;
    const imageReady = image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;

    const photoFrame = image.dataset.studioPhoto === "1"
      ? image.closest<HTMLElement>('[data-studio-photo-frame="1"]')
      : null;
    const photoMask = image.closest<HTMLElement>('[data-studio-photo-mask]')?.dataset.studioPhotoMask;
    /* getBoundingClientRect() da imagem já contém zoom/rotação. Para fotos do
       acervo, a referência correta é a janela recortada pelo PhotoFrame. */
    const rect = photoFrame?.getBoundingClientRect() ?? image.getBoundingClientRect();
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
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (style.objectFit === "cover") {
      const position = style.objectPosition.match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
      const focusX = Number(image.dataset.studioPhotoFocusX ?? position?.[1] ?? 50);
      const focusY = Number(image.dataset.studioPhotoFocusY ?? position?.[2] ?? (style.objectPosition.includes("top") ? 0 : 50));
      ({ sx, sy, sw, sh } = calculateCoverCrop(sourceWidth, sourceHeight, width, height, focusX, focusY));
    }

    const frameStyle = photoFrame ? getComputedStyle(photoFrame) : style;
    const radius = (Number.parseFloat(frameStyle.borderTopLeftRadius) || 0) * Math.min(scaleX, scaleY);
    context.save();
    context.globalAlpha = Number.parseFloat(style.opacity) || 1;
    if (photoMask === "popout") popoutPath(context, x, y, width, height);
    else roundedRect(context, x, y, width, height, radius);
    context.clip();

    /*
     * Em iPhones, uma foto grande pode ultrapassar o tempo de decodificação do
     * WebKit. O foreignObject também pode omiti-la. Nesse caso, não deixamos o
     * quadro transparente: uma superfície opaca impede que tipografia e outros
     * elementos posicionados atrás da foto apareçam indevidamente no PNG.
     */
    if (!imageReady) {
      const frameBackground = photoFrame ? getComputedStyle(photoFrame).backgroundColor : "";
      const nodeBackground = getComputedStyle(node).backgroundColor;
      const bodyBackground = getComputedStyle(document.body).backgroundColor;
      context.fillStyle = isOpaqueColor(frameBackground)
        ? frameBackground
        : isOpaqueColor(nodeBackground)
          ? nodeBackground
          : isOpaqueColor(bodyBackground)
            ? bodyBackground
            : "rgb(255, 255, 255)";
      context.fillRect(x, y, width, height);
      context.restore();
      painted.push({ x, y, width, height });
      continue;
    }

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
    if (photoFrame) {
      const rotation = Number(image.dataset.studioPhotoRotation ?? 0);
      const photoScale = Number(image.dataset.studioPhotoScale ?? 1);
      const originX = x + width * (Number(image.dataset.studioPhotoFocusX ?? 50) / 100);
      const originY = y + height * (Number(image.dataset.studioPhotoFocusY ?? 50) / 100);
      context.translate(originX, originY);
      context.rotate((rotation * Math.PI) / 180);
      context.scale(photoScale, photoScale);
      context.translate(-originX, -originY);
    } else {
      const matrix = style.transform && style.transform !== "none" ? new DOMMatrixReadOnly(style.transform) : null;
      const flipX = !!matrix && matrix.a < 0;
      const flipY = !!matrix && matrix.d < 0;
      if (flipX || flipY) {
        context.translate(flipX ? x * 2 + width : 0, flipY ? y * 2 + height : 0);
        context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      }
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
    const frame = image.dataset.studioPhoto === "1"
      ? image.closest<HTMLElement>('[data-studio-photo-frame="1"]')
      : null;
    const imageRect = frame?.getBoundingClientRect() ?? image.getBoundingClientRect();
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

      /* Só fundos que a foto realmente preenche: um logo pequeno dentro de uma
         tela de aparelho não pode apagar o fundo da tela no PNG. */
      const fills =
        imageRect.width * imageRect.height >= rect.width * rect.height * 0.6;
      if (covers && fills && isOpaqueColor(style.backgroundColor) && !seen.has(ancestor)) {
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
    const lines: Array<{ top: number; left: number; right: number; text: string }> = [];

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
      if (line) {
        line.text += character;
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
      } else {
        lines.push({ top: rect.top, left: rect.left, right: rect.right, text: character });
      }
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
        span.dataset.studioExportLineWidth = String(Math.max(1, line.right - line.left));
        span.style.display = "block";
        span.style.setProperty("white-space", "pre", "important");
        span.style.setProperty("width", "max-content", "important");
        if (style.textAlign === "center") {
          span.style.marginLeft = "auto";
          span.style.marginRight = "auto";
        } else if (["right", "end"].includes(style.textAlign)) {
          span.style.marginLeft = "auto";
        }
        /* Não limite a linha a 100%: se a métrica da fonte variar uma fração no
           foreignObject, max-width corta justamente a palavra final ("Com" no
           caso reportado). A largura visual é estabilizada abaixo. */
        span.style.setProperty("max-width", "none", "important");
        span.textContent = line.text.trim();
        return span;
      }),
    );
  });
};

/**
 * Compara a linha recriada no clone com a largura efetivamente vista na arte.
 * Se o navegador substituiu a fonte e a deixou maior, comprime somente no eixo
 * horizontal pela diferença mínima necessária, preservando posição e altura.
 */
export const stabilizeLockedTextMetrics = (clone: HTMLElement) => {
  clone.querySelectorAll<HTMLElement>('[data-studio-export-line="1"]').forEach((line) => {
    const expected = Number(line.dataset.studioExportLineWidth ?? 0);
    const actual = line.getBoundingClientRect().width;
    if (!expected || !actual || actual <= expected + 0.5) return;
    const scale = Math.max(0.75, Math.min(1, expected / actual));
    line.style.setProperty("transform-origin", "left top", "important");
    line.style.setProperty("transform", `scaleX(${scale})`, "important");
  });
};

/** WebKit offsets CSS box shadows inside SVG foreignObject. Bake only the
 * shadow into pixels in the static clone, at its original stacking position. */
export const rasterizeExportShadows = (node: HTMLElement) => {
  const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))];
  for (const element of elements) {
    const style = getComputedStyle(element);
    if (!style.boxShadow || style.boxShadow === "none") continue;
    const shadows = style.boxShadow.split(/,(?![^()]*\))/).map((value) => {
      const color = value.match(/rgba?\([^)]*\)/)?.[0];
      const lengths = value.replace(/rgba?\([^)]*\)/g, "").match(/-?[\d.]+px/g)?.map(Number.parseFloat);
      if (!color || !lengths || lengths.length < 3 || value.includes("inset")) return null;
      return { color, x: lengths[0], y: lengths[1], blur: lengths[2], spread: lengths[3] ?? 0 };
    });
    // Leave unsupported/inset shadows intact rather than silently dropping them.
    if (shadows.some((shadow) => !shadow)) continue;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    if (!width || !height) continue;
    const pad = Math.ceil(Math.max(...shadows.map((s) => s ? Math.abs(s.x) + Math.abs(s.y) + s.blur * 2 + Math.abs(s.spread) : 0)) + 2);
    const canvas = document.createElement("canvas");
    const ratio = safeRatio(width + pad * 2, height + pad * 2, 3);
    canvas.width = Math.ceil((width + pad * 2) * ratio);
    canvas.height = Math.ceil((height + pad * 2) * ratio);
    const context = canvas.getContext("2d");
    if (!context) continue;
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    for (const shadow of [...shadows].reverse()) {
      if (!shadow) continue;
      context.save();
      // Move the source shape outside the canvas; only its shadow lands inside.
      const shift = canvas.width * 2;
      context.shadowColor = shadow.color;
      context.shadowBlur = shadow.blur * ratio;
      context.shadowOffsetX = shadow.x * ratio + shift;
      context.shadowOffsetY = shadow.y * ratio;
      roundedRect(context, (pad - shadow.spread) * ratio - shift, (pad - shadow.spread) * ratio,
        Math.max(0, width + shadow.spread * 2) * ratio, Math.max(0, height + shadow.spread * 2) * ratio,
        Math.max(0, radius + shadow.spread) * ratio);
      context.fill();
      context.restore();
    }
    // Outset shadows never paint the box interior (including translucent boxes).
    context.globalCompositeOperation = "destination-out";
    roundedRect(context, pad * ratio, pad * ratio, width * ratio, height * ratio, radius * ratio);
    context.fill();
    const layer = document.createElement("div");
    layer.dataset.studioExportShadow = "1";
    Object.assign(layer.style, {
      position: "absolute", left: `${-pad - (Number.parseFloat(style.borderLeftWidth) || 0)}px`,
      top: `${-pad - (Number.parseFloat(style.borderTopWidth) || 0)}px`,
      width: `${width + pad * 2}px`, height: `${height + pad * 2}px`,
      backgroundImage: `url(${canvas.toDataURL()})`, backgroundSize: "100% 100%",
      pointerEvents: "none", zIndex: "-1",
    });
    if (style.position === "static") element.style.position = "relative";
    element.style.isolation = "isolate";
    element.style.setProperty("box-shadow", "none", "important");
    element.prepend(layer);
  }
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
  const appRoot = document.getElementById("root");
  host.dataset.studioExportSurface = "1";
  Object.assign(host.style, {
    position: "fixed",
    /*
     * Não envie a superfície para coordenadas extremas. O WebKit/iOS pode
     * descartar a pintura de texto de uma árvore tão distante da viewport; o
     * html-to-image recebe então apenas o fundo, enquanto logos/fotos ainda
     * reaparecem porque são repintados manualmente no canvas. Isso acontecia
     * sobretudo depois de contentEditable/movimentação de texto.
     *
     * Atrás da página, mas em coordenadas reais, o clone continua participando
     * da pintura e não interfere visualmente nem no toque.
     */
    left: "0",
    top: "0",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: "hidden",
    contain: "strict",
    pointerEvents: "none",
    /* Um z-index negativo pode fazer o WebKit podar os glifos. A camada fica em
       zero e a aplicação sobe temporariamente para 1: o clone continua pintável
       para o rasterizador, mas nunca pisca por cima da tela do usuário. */
    zIndex: "0",
    isolation: "isolate",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.maxWidth = "none";
  // O card na tela corta o excedente; a cópia precisa cortar igual para o PNG
  // sair no mesmo formato mostrado na geração.
  clone.style.overflow = "hidden";

  /* O PNG representa a arte concluída, mesmo se o usuário tocar em baixar com
     Ajustar/Mover texto ainda ativo. Removemos apenas estado transitório do
     editor no clone; conteúdo, tamanho e transformações aprovadas permanecem. */
  const editableExportNodes = [
    ...(clone.matches('[contenteditable], [data-studio-text-slot="1"]') ? [clone] : []),
    ...Array.from(clone.querySelectorAll<HTMLElement>('[contenteditable], [data-studio-text-slot="1"]')),
  ];
  editableExportNodes.forEach((element) => {
    /* Remover é mais seguro que contenteditable="false": o foreignObject do
       WebKit ainda pode tratar a mera presença do atributo como superfície de
       edição e omitir sua pintura. */
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.style.outline = "";
    element.style.outlineOffset = "";
    element.style.cursor = "";
    element.style.setProperty("caret-color", "transparent", "important");
    element.style.setProperty("user-select", "none", "important");
    element.style.setProperty("-webkit-user-select", "none", "important");
  });

  /* Contorno e sombras pertencem somente à edição da imagem livre. Mesmo com
     os botões filtrados, o WebKit podia rasterizar o outline do contêiner como
     uma faixa sombreada ao lado direito do PNG. */
  clone.querySelectorAll<HTMLElement>('[data-studio-inserted-image="1"]').forEach((layer) => {
    layer.dataset.studioImageSelected = "0";
    layer.style.setProperty("outline", "none", "important");
    layer.style.setProperty("outline-offset", "0", "important");
    layer.style.setProperty("box-shadow", "none", "important");
    layer.querySelectorAll<HTMLElement>("*").forEach((child) => {
      child.style.setProperty("box-shadow", "none", "important");
    });
  });

  // Tokens da marca são herdados de wrappers da tela; materialize-os na cópia.
  const computed = getComputedStyle(source);
  // These are inherited from the preview wrapper, absent on the detached clone.
  ["text-align", "font-family", "font-size", "font-weight", "line-height", "color", "direction"].forEach((property) => {
    clone.style.setProperty(property, computed.getPropertyValue(property));
  });
  for (let i = 0; i < computed.length; i += 1) {
    const property = computed.item(i);
    if (property.startsWith("--")) clone.style.setProperty(property, computed.getPropertyValue(property));
  }

  host.appendChild(clone);
  if (appRoot) {
    if (exportSurfaceLeases === 0) appRootOriginalStyle = appRoot.getAttribute("style");
    exportSurfaceLeases += 1;
    appRoot.style.position = appRoot.style.position || "relative";
    appRoot.style.zIndex = "1";
  }
  document.body.insertBefore(host, document.body.firstChild);
  freezeMotion(clone);
  await waitForAssets(clone);
  await settleLayout();
  lockRenderedTextLines(source, clone);
  await settleLayout();
  stabilizeLockedTextMetrics(clone);
  await settleLayout();
  rasterizeExportShadows(clone);

  return {
    node: clone,
    dispose: () => {
      host.remove();
      if (appRoot) {
        exportSurfaceLeases = Math.max(0, exportSurfaceLeases - 1);
        if (exportSurfaceLeases === 0) {
          if (appRootOriginalStyle == null) appRoot.removeAttribute("style");
          else appRoot.setAttribute("style", appRootOriginalStyle);
          appRootOriginalStyle = undefined;
        }
      }
    },
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
  const insertedImages = Array.from(
    node.querySelectorAll<HTMLImageElement>('[data-studio-inserted-image="1"] img[data-studio-photo="1"]'),
  );
  const insertedVisibility = insertedImages.map((image) => image.style.visibility);

  /*
   * UMA única medida para tudo. O quadro exportado é exatamente o quadro
   * mostrado na geração (o excedente já é cortado na tela pelo próprio card),
   * e os repintes usam a mesma escala do raster — sem foto esticada, deslocada
   * ou PNG em proporção diferente da prévia.
   */
  const rect = node.getBoundingClientRect();
  const layout: LayoutSize = {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  };

  let output: HTMLCanvasElement;
  try {
    /* A imagem inserida é repintada diretamente no canvas. Retirá-la apenas do
       raster evita a duplicação/subpixel que o WebKit mostrava como uma faixa
       sombreada à direita da composição. */
    insertedImages.forEach((image) => { image.style.visibility = "hidden"; });
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
    insertedImages.forEach((image, index) => { image.style.visibility = insertedVisibility[index] ?? ""; });

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
    insertedImages.forEach((image, index) => { image.style.visibility = insertedVisibility[index] ?? ""; });
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
export const renderNodeToPngBlob = async (node: HTMLElement, desiredRatio?: number) => {
  await waitForAssets(node);

  const rect = node.getBoundingClientRect();
  const attempts: number[] = [];
  let ratio = desiredRatio === undefined
    ? publicationPixelRatio(rect.width, rect.height)
    : safeRatio(rect.width, rect.height, desiredRatio);
  while (ratio >= 1) {
    attempts.push(Number(ratio.toFixed(2)));
    if (ratio <= 1) break;
    ratio = Math.max(1, ratio / 1.5);
  }

  let lastError: unknown;
  for (const pixelRatio of attempts) {
    try {
      /* A conversão de imagens acontece somente na superfície estática. Antes,
         ela também alterava temporariamente os `src` da arte viva; depois de
         contentEditable isso podia prender o WebKit no estado de edição e o
         botão PNG ficava carregando indefinidamente. */
      const blob = await withTimeout(renderNodeToBlob(node, pixelRatio), 20_000, "png-render-timeout");
      if (blob.size < 1024) throw new Error("empty-canvas");
      return { blob, ratio: pixelRatio };
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message === "png-render-timeout") break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("export-failed");
};

/**
 * Exporta um elemento em PNG de alta resolução e entrega o arquivo ao usuário.
 * Usa Web Share no mobile, onde `<a download>` costuma ser ignorado.
 */
export const exportNodeAsPng = async (node: HTMLElement, fileName: string, desiredRatio?: number): Promise<ExportResult> => {
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
  desiredRatio?: number,
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
        const ratio = desiredRatio === undefined
          ? publicationPixelRatio(rect.width, rect.height)
          : safeRatio(rect.width, rect.height, desiredRatio);
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
