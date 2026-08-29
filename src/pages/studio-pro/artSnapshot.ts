/**
 * INSTANTÂNEO DA ARTE SALVA (edição fiel pela galeria)
 *
 * Por que existe: até aqui a edição pela galeria RECONSTRUÍA a arte a partir da
 * receita (público, objetivo, seed, blocos) e só depois tentava colar o texto
 * salvo por cima. Como o motor textual usa memória de frases da marca e perfil
 * de variação do lote, a reconstrução gerava OUTRA arte — na prática, editar
 * substituía o post salvo por um novo.
 *
 * A solução é guardar a arte pronta: no momento em que o usuário salva, o HTML
 * final da arte (texto exato, blocos, fundo, ornamentos, assinatura) é
 * serializado com as imagens embutidas e as variáveis de cor/fonte da marca.
 * A edição reabre esse instantâneo — pixel a pixel a arte salva —, sem gerar
 * nada e sem gastar crédito de IA.
 */
import { supabase } from "@/integrations/supabase/client";

export const SNAPSHOT_VERSION = 1;
const BUCKET = "studio-art";

/** Tokens de tema que a arte usa; guardados resolvidos para o instantâneo. */
const THEME_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--brand-extra-1",
  "--brand-extra-2",
  "--brand-extra-3",
  "--brand-extra-4",
  "--brand-extra-5",
  "--brand-extra-6",
];

export type ArtSnapshotSlide = {
  storage_path: string;
  width: number;
  height: number;
};

export type ArtSnapshot = {
  version: number;
  format: string;
  /** Tokens HSL resolvidos + fontFamily da marca. */
  theme: Record<string, string>;
  slides: ArtSnapshotSlide[];
};

export const isArtSnapshot = (value: unknown): value is ArtSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snap = value as Partial<ArtSnapshot>;
  return Array.isArray(snap.slides) && snap.slides.length > 0 && typeof snap.version === "number";
};

/** Lê as variáveis de tema já resolvidas no nó da arte. */
export const readTheme = (node: HTMLElement): Record<string, string> => {
  const computed = window.getComputedStyle(node);
  const theme: Record<string, string> = {};
  THEME_TOKENS.forEach((token) => {
    const value = computed.getPropertyValue(token).trim();
    if (value) theme[token] = value;
  });
  const font = computed.fontFamily;
  if (font) theme.fontFamily = font;
  return theme;
};

const dataUrlCache = new Map<string, string>();

const toDataUrl = async (url: string): Promise<string | null> => {
  const cached = dataUrlCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
};

/**
 * Embute imagens (tags <img> e background-image inline) no clone. Sem isso o
 * instantâneo dependeria de URL assinada, que expira em uma hora.
 */
const inlineAssets = async (clone: HTMLElement) => {
  const imgs = Array.from(clone.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      const dataUrl = await toDataUrl(src);
      if (dataUrl) img.setAttribute("src", dataUrl);
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
    }),
  );
  const withBg = Array.from(clone.querySelectorAll<HTMLElement>('[style*="url("]'));
  await Promise.all(
    withBg.map(async (el) => {
      const style = el.getAttribute("style") ?? "";
      const match = style.match(/url\((['"]?)(https?:[^'")]+)\1\)/);
      if (!match) return;
      const dataUrl = await toDataUrl(match[2]);
      if (dataUrl) el.setAttribute("style", style.replace(match[0], `url("${dataUrl}")`));
    }),
  );
};

/** Remove qualquer coisa executável antes de guardar/injetar o HTML. */
export const sanitizeSnapshotHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(`<div id="snap-root">${html}</div>`, "text/html");
  const root = doc.getElementById("snap-root");
  if (!root) return "";
  root.querySelectorAll("script, iframe, object, embed, link, meta").forEach((el) => el.remove());
  root.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if (name === "href" && attr.value.trim().toLowerCase().startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
      if (name === "contenteditable") el.removeAttribute(attr.name);
    });
  });
  return root.innerHTML;
};

/** HTML fiel de um nó de arte, com imagens embutidas e sem código executável. */
export const serializeArtNode = async (node: HTMLElement): Promise<string> => {
  const clone = node.cloneNode(true) as HTMLElement;
  await inlineAssets(clone);
  return sanitizeSnapshotHtml(clone.innerHTML);
};

type CaptureArgs = {
  userId: string;
  brandId: string;
  /** Chave estável do arquivo (seed + posição), sem extensão. */
  key: string;
  format: string;
  nodes: HTMLElement[];
};

/**
 * Serializa e guarda o instantâneo dos nós da arte no bucket privado.
 * Devolve `null` quando nada pôde ser guardado (a arte segue salva sem edição).
 */
export const captureArtSnapshot = async ({
  userId,
  brandId,
  key,
  format,
  nodes,
}: CaptureArgs): Promise<ArtSnapshot | null> => {
  if (nodes.length === 0) return null;
  const slides: ArtSnapshotSlide[] = [];
  const theme = readTheme(nodes[0]);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const rect = node.getBoundingClientRect();
    try {
      const html = await serializeArtNode(node);
      if (!html) continue;
      const path = `${userId}/${brandId}/snapshot/${key}-${String(i + 1).padStart(2, "0")}.html`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([html], { type: "text/html" }), {
          contentType: "text/html",
          upsert: true,
        });
      if (error) throw error;
      slides.push({
        storage_path: path,
        width: Math.round(rect.width) || 1080,
        height: Math.round(rect.height) || 1350,
      });
    } catch (error) {
      console.warn("[studio-pro] snapshot capture", error);
    }
  }
  if (slides.length === 0) return null;
  return { version: SNAPSHOT_VERSION, format, theme, slides };
};

/** Baixa e sanitiza o HTML de cada slide do instantâneo. */
export const loadArtSnapshot = async (snapshot: ArtSnapshot): Promise<string[]> => {
  const out: string[] = [];
  for (const slide of snapshot.slides) {
    const { data, error } = await supabase.storage.from(BUCKET).download(slide.storage_path);
    if (error || !data) {
      console.warn("[studio-pro] snapshot download", error);
      out.push("");
      continue;
    }
    out.push(sanitizeSnapshotHtml(await data.text()));
  }
  return out;
};

/** Tema do instantâneo aplicado como style inline (cores e fonte da marca). */
export const snapshotStyle = (snapshot: ArtSnapshot): React.CSSProperties => {
  const style: Record<string, string> = {};
  Object.entries(snapshot.theme ?? {}).forEach(([token, value]) => {
    if (token === "fontFamily") style.fontFamily = value;
    else if (token.startsWith("--")) style[token] = value;
  });
  return style as React.CSSProperties;
};

/**
 * Regrava o HTML do instantâneo (edição pela galeria) nos MESMOS arquivos, para
 * que a arte salva continue sendo a mesma linha da galeria — apenas com o texto
 * ajustado e/ou outro formato de saída.
 */
export const saveArtSnapshotHtml = async (
  snapshot: ArtSnapshot,
  htmlBySlide: string[],
  format: string,
): Promise<ArtSnapshot> => {
  for (let i = 0; i < snapshot.slides.length; i += 1) {
    const html = htmlBySlide[i];
    if (!html) continue;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(snapshot.slides[i].storage_path, new Blob([html], { type: "text/html" }), {
        contentType: "text/html",
        upsert: true,
      });
    if (error) throw error;
  }
  return { ...snapshot, format };
};
