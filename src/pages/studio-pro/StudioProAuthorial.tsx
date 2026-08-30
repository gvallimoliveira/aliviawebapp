import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Contrast, Download, FileText, Images, Loader2, RefreshCw, Save, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  deliver,
  exportNodeAsPng,
  exportNodesAsPng,
  lockUniformHeight,
  exportTextFile,
  randomSeed,
  renderNodeToBlob,
  type StudioFormat,
} from "@/studio-core";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";
import StudioPhotos from "@/pages/studio/StudioPhotos";
import { countPhotos } from "@/pages/studio/photos";
import AutoFit from "@/pages/studio/AutoFit";
import { readColorKit } from "./brandColors";
import { buildBrandThemeStyle } from "./brandTheme";
import { ensureFontLoaded } from "./brandFonts";
import StudioProSignature from "./StudioProSignature";
import { captureArtSnapshot } from "./artSnapshot";
import { STUDIO_GENERATION_COST, useStudioQuota } from "./useStudioQuota";
import AuthorialArtBlock from "./AuthorialArtBlock";
import {
  authorialCaption,
  composeAuthorial,
  fragmentsOf,
  listAuthorialTexts,
  splitSlogans,

  type AuthorialArt,
  type AuthorialText,
} from "./authorial";

/**
 * EDITOR "CRIAR" DAS MARCAS AUTORAIS
 *
 * Nenhum texto é escrito aqui pelo Studio: as artes diagramam os textos do
 * autor (`studio_texts`) e os slogans do kit, respeitando as regras de
 * coerência do módulo `authorial.ts` (nunca mistura obras, nunca fragmentos
 * fora de ordem). Tudo o mais — formatos, PNG em alta, legenda, galeria da
 * marca, assinatura, lado A/B — funciona igual às outras marcas.
 */

type BrandInput = {
  id: string;
  name: string;
  logo_url: string | null;
  colors: Record<string, string> | null;
  slogan?: string | null;
  niche?: string | null;
  description?: string | null;
  instagram_handle?: string | null;
  source_url?: string | null;
  signature_enabled?: boolean | null;
};

type Props = {
  brand: BrandInput;
  folder: string;
  watermark: boolean;
  unlimited?: boolean;
  photoLimit?: number;
  onSaved?: () => void;
  /** Abre os ajustes da marca (onde o acervo de textos é cadastrado). */
  onOpenBrandSettings?: () => void;
};

const FRAME_STYLE: Record<StudioFormat, React.CSSProperties> = {
  "9x16": { width: "min(400px, 100%)", aspectRatio: "9/16" },
  "4x5": { width: "min(480px, 100%)", aspectRatio: "4/5" },
  "1x1": { width: "min(560px, 100%)", aspectRatio: "1/1" },
  free: { width: "100%" },
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "Story 9:16" },
  { id: "4x5", label: "Post 4:5" },
  { id: "1x1", label: "Post 1:1" },
  { id: "free", label: "Livre" },
];

const ART_COUNT = 8;

const stateKey = (brandId: string) => `studio-pro:authorial:${brandId}`;

const StudioProAuthorial = ({
  brand,
  folder,
  watermark,
  unlimited: unlimitedAccess = false,
  photoLimit = 0,
  onSaved,
  onOpenBrandSettings,
}: Props) => {
  const restored = useRef<{
    seed?: string;
    format?: StudioFormat;
    textId?: string | null;
    pinnedPhotos?: string[];
  }>(
    (() => {
      try {
        return JSON.parse(sessionStorage.getItem(stateKey(brand.id)) ?? "{}");
      } catch {
        return {};
      }
    })(),
  );
  const [format, setFormat] = useState<StudioFormat>(restored.current.format ?? "free");
  const [seed, setSeed] = useState(() => restored.current.seed ?? randomSeed());
  const [textId, setTextId] = useState<string | null>(restored.current.textId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [texts, setTexts] = useState<AuthorialText[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photosTotal, setPhotosTotal] = useState(0);
  /** Fotos fixadas: quando há alguma, só elas entram nas artes desta marca. */
  const [pinnedPhotos, setPinnedPhotos] = useState<string[]>(restored.current.pinnedPhotos ?? []);
  const togglePin = (id: string) =>
    setPinnedPhotos((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));


  const signatureOn = brand.signature_enabled !== false;
  const { quota, error: quotaError, consume } = useStudioQuota();
  const unlimited = unlimitedAccess || !!quota?.unlimited;
  const blocked = !unlimited && !!quota && !quotaError && quota.remaining < STUDIO_GENERATION_COST;

  const {
    photos,
    loading: photosLoading,
    add: addPhoto,
    edit: editPhoto,
    remove: removePhoto,
  } = useStudioPhotos(true, brand.id);

  useEffect(() => {
    let alive = true;
    countPhotos()
      .then((n) => { if (alive) setPhotosTotal(n); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [photos.length]);

  useEffect(() => {
    try {
      sessionStorage.setItem(stateKey(brand.id), JSON.stringify({ seed, format, textId, pinnedPhotos }));
    } catch {
      /* modo privado — ignora */
    }
  }, [brand.id, seed, format, textId, pinnedPhotos]);


  useEffect(() => {
    let alive = true;
    setLoading(true);
    listAuthorialTexts(brand.id)
      .then((rows) => { if (alive) setTexts(rows); })
      .catch((error) => {
        console.error("[studio-pro] textos autorais", error);
        toast.error("Não foi possível carregar seus textos.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brand.id]);

  /** Lockup da marca (nome/slogan/logo) aplicado às artes. */
  useEffect(() => {
    applyStudioBrandTheme({
      name: brand.name,
      slogan: splitSlogans(brand.slogan)[0] ?? "",
      logo: brand.logo_url,
      handle: brand.instagram_handle ?? null,
      site: brand.source_url ?? null,
    });
  }, [brand.name, brand.slogan, brand.logo_url, brand.instagram_handle, brand.source_url]);

  const kit = readColorKit(brand.colors);
  useEffect(() => {
    ensureFontLoaded(kit.font);
  }, [kit.font]);

  const themeStyle = useMemo(
    () => buildBrandThemeStyle({ kit, seed }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(kit), seed],
  );
  const invertedStyle = useMemo(
    () => buildBrandThemeStyle({ kit, seed, invert: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(kit), seed],
  );

  /** Fixação: com fotos fixadas, só elas alimentam as artes desta geração. */
  const activePhotos = useMemo(() => {
    if (pinnedPhotos.length === 0) return photos;
    const only = photos.filter((p) => pinnedPhotos.includes(p.id));
    return only.length > 0 ? only : photos;
  }, [photos, pinnedPhotos]);

  const arts = useMemo(
    () =>
      composeAuthorial({
        texts,
        slogans: splitSlogans(brand.slogan),
        seed: `${brand.id}:${seed}`,
        photoIds: activePhotos.map((p) => p.id),
        count: ART_COUNT,
        onlyTextId: textId,
        forcePhoto: pinnedPhotos.length > 0,
      }),
    [texts, brand.slogan, brand.id, seed, activePhotos, textId, pinnedPhotos.length],
  );

  const photoOf = (art: AuthorialArt) => photos.find((p) => p.id === art.photoId) ?? null;


  const newVersion = async () => {
    if (unlimited) {
      setSeed(randomSeed());
      setSaved(new Set());
      return;
    }
    setBusy("quota");
    const result = await consume(STUDIO_GENERATION_COST);
    setBusy(null);
    if (result === "exhausted") {
      toast.error("Suas gerações deste período acabaram. Faça upgrade para gerar mais.");
      return;
    }
    if (result === "error") toast.warning("Não conseguimos confirmar sua cota agora — gerando de qualquer forma.");
    setSeed(randomSeed());
    setSaved(new Set());
  };

  const nodeId = (artKey: string, slide: number) => `studio-pro-authorial-${artKey}-${slide}`;
  const nodeOf = (artKey: string, slide: number) =>
    document.getElementById(nodeId(artKey, slide)) as HTMLElement | null;

  const toggleFlip = (artKey: string) => {
    setFlipped((prev) => {
      const copy = new Set(prev);
      if (copy.has(artKey)) copy.delete(artKey);
      else copy.add(artKey);
      return copy;
    });
    setSaved((prev) => {
      const copy = new Set(prev);
      copy.delete(artKey);
      return copy;
    });
  };

  const fileBase = `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}`;

  /** No formato Livre os slides do carrossel saem todos com a maior altura. */
  const lockCarouselHeight = (nodes: HTMLElement[]) =>
    format === "free" ? lockUniformHeight(nodes) : () => {};

  const download = async (art: AuthorialArt) => {
    setBusy(`png-${art.key}`);
    let unlock = () => {};
    try {
      if (art.slides.length === 1) {
        const node = nodeOf(art.key, 0);
        if (!node) throw new Error("no-node");
        await exportNodeAsPng(node, `${fileBase}-${art.key}.png`);
      } else {
        const items = art.slides
          .map((_, i) => {
            const node = nodeOf(art.key, i);
            return node
              ? { node, fileName: `${fileBase}-${art.key}-${String(i + 1).padStart(2, "0")}.png` }
              : null;
          })
          .filter((item): item is { node: HTMLElement; fileName: string } => !!item);
        if (!items.length) throw new Error("no-nodes");
        unlock = lockCarouselHeight(items.map((item) => item.node));
        await exportNodesAsPng(items);
      }
      toast.success(art.slides.length > 1 ? `Carrossel exportado (${art.slides.length} slides)` : "Arte exportada");
    } catch (error) {
      console.error("[studio-pro] export autoral", error);
      toast.error("Não foi possível exportar esta arte.");
    } finally {
      unlock();
      setBusy(null);
    }
  };


  const save = async (art: AuthorialArt, caption: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(`save-${art.key}`);
    const side = flipped.has(art.key) ? "-b" : "";
    const nodes = art.slides
      .map((_, i) => nodeOf(art.key, i))
      .filter((n): n is HTMLElement => !!n);

    let thumb: string | null = null;
    let pngPath: string | null = null;
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const rect = node.getBoundingClientRect();
      if (i === 0) {
        try {
          const thumbRatio = Math.max(1, Math.min(3, 900 / (rect.width || 900)));
          const blob = await renderNodeToBlob(node, thumbRatio, "image/jpeg", 0.9);
          thumb = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn("[studio-pro] thumb autoral", error);
        }
      }
      try {
        const ratio = Math.max(1, Math.min(4, 1440 / (rect.width || 1440)));
        const png = await renderNodeToBlob(node, ratio, "image/png");
        const path = `${auth.user.id}/${brand.id}/${seed}-${art.key}${side}-${String(i + 1).padStart(2, "0")}.png`;
        const { error: upErr } = await supabase.storage
          .from("studio-art")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        if (i === 0) pngPath = path;
      } catch (error) {
        console.warn("[studio-pro] png autoral", error);
      }
    }

    const snapshot =
      nodes.length > 0
        ? await captureArtSnapshot({
            userId: auth.user.id,
            brandId: brand.id,
            key: `${seed}-${art.key}${side}`,
            format,
            nodes,
          })
        : null;

    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}${side}:${art.key}`,
      block_kind: art.kind === "carousel" ? "carousel" : "quote",
      format,
      headline: art.slides[0]?.lines[0]?.slice(0, 140) ?? null,
      caption,
      thumb,
      png_path: pngPath,
      composition: JSON.parse(JSON.stringify(art)),
      snapshot,
      segment: art.textId ?? "autoral",
      angle: "informar",
      folder: folder === "Todas" ? "Geral" : folder,
      watermarked: watermark,
    });
    setBusy(null);
    if (error) {
      console.error("[studio-pro] save autoral", error);
      toast.error("Não foi possível salvar na marca.");
      return;
    }
    setSaved((prev) => new Set(prev).add(art.key));
    toast.success(`Arte salva em ${folder === "Todas" ? "Geral" : folder}`);
    onSaved?.();
  };

  const copyCaption = async (caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar a legenda.");
    }
  };

  const downloadCaptions = () => {
    const body = arts
      .map((art, i) => `--- ${String(i + 1).padStart(2, "0")} · ${art.kind} ---\n${authorialCaption(art, splitSlogans(brand.slogan)[0] ?? null)}`)
      .join("\n\n");
    exportTextFile(`${fileBase}-legendas.txt`, body);
  };

  const downloadAll = async () => {
    setBusy("all-png");
    try {
      const items: Array<{ node: HTMLElement; fileName: string }> = [];
      for (const art of arts) {
        for (let i = 0; i < art.slides.length; i += 1) {
          const node = nodeOf(art.key, i);
          if (!node) continue;
          items.push({ node, fileName: `${fileBase}-${art.key}-${String(i + 1).padStart(2, "0")}.png` });
        }
      }
      if (!items.length) throw new Error("no-nodes");
      const { delivered } = await exportNodesAsPng(items);
      toast.success(`Artes exportadas (${delivered})`);
    } catch (error) {
      console.error("[studio-pro] export lote autoral", error);
      toast.error("Não foi possível exportar todas as artes.");
    } finally {
      setBusy(null);
    }
  };


  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando seus textos…
      </div>
    );
  }

  if (texts.length === 0 && !brand.slogan) {
    return (
      <div className="mt-5 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Esta marca escreve com os seus textos</h2>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Aqui o Studio não escreve nada: ele diagrama os seus textos autorais. Cadastre um texto nos
          ajustes da marca e as artes passam a nascer dele — inteiro em carrossel ou em trechos, sempre
          na sua ordem, sem nunca misturar textos diferentes.
        </p>
        <Button className="mt-4 rounded-full" onClick={onOpenBrandSettings}>
          <FileText className="mr-1.5 h-4 w-4" />
          Cadastrar meus textos
        </Button>
      </div>
    );
  }

  return (
    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Modo autoral · {texts.length} {texts.length === 1 ? "texto" : "textos"} no acervo
          </p>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            Nenhuma palavra é inventada pelo Studio. Cada arte usa um trecho contínuo de um único texto
            (ou o slogan da marca) — carrossel entrega o texto em ordem cronológica.
          </p>
          {!unlimited && quota && !quotaError && (
            <p className="mt-1 text-xs font-semibold text-foreground">
              {quota.generationsLeft > 0
                ? `${quota.generationsLeft} de ${quota.allowance} ${quota.allowance === 1 ? "geração" : "gerações"} restantes neste período`
                : "Gerações do período encerradas — faça upgrade para continuar gerando."}
            </p>
          )}

          {/* Filtro por texto: gera só a partir da obra escolhida. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={textId === null ? "secondary" : "ghost"}
              className="h-7 rounded-full text-[11px]"
              onClick={() => setTextId(null)}
            >
              Todos os textos
            </Button>
            {texts.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={textId === t.id ? "secondary" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                title={`${fragmentsOf(t.body).length} trechos`}
                onClick={() => setTextId(t.id)}
              >
                {t.title || "Sem título"}
              </Button>
            ))}
          </div>

          <div className="mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-xs"
              onClick={() => setPhotosOpen(true)}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Adicionar / gerenciar fotos
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {photos.length === 0
                ? "Nenhuma imagem nesta marca — clique para enviar as suas."
                : `${photos.length} imagem(ns) nesta marca${photoLimit > 0 ? ` · ${photosTotal} de ${photoLimit} no plano` : ""}${
                    pinnedPhotos.length > 0
                      ? ` · ${pinnedPhotos.length} fixada(s): só elas entram na próxima geração`
                      : " · fixe uma imagem ali para usá-la obrigatoriamente"
                  }.`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              As imagens do acervo entram como fundo esmaecido — presença, nunca competindo com o texto.
            </p>
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FORMATS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={format === f.id ? "secondary" : "ghost"}
              className="h-8 rounded-full text-xs"
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full text-xs"
            disabled={busy === "all-png"}
            onClick={() => void downloadAll()}
          >
            {busy === "all-png" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Images className="mr-1.5 h-3.5 w-3.5" />
            )}
            Todas em PNG
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={downloadCaptions}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Legendas (.txt)
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            disabled={busy === "quota" || blocked}
            onClick={() => void newVersion()}
          >
            {busy === "quota" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Nova versão
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6">
        {arts.map((art) => {
          const caption = authorialCaption(art, splitSlogans(brand.slogan)[0] ?? null);
          const photo = photoOf(art);
          const isCarousel = art.slides.length > 1;
          const frame = (slideIndex: number) => (
            <div
              key={slideIndex}
              className={`overflow-hidden rounded-2xl border border-border bg-background ${
                isCarousel ? "shrink-0 snap-center" : "mx-auto"
              }`}
              style={{ ...FRAME_STYLE[format], ...themeStyle }}
            >
              <div
                id={nodeId(art.key, slideIndex)}
                className="h-full w-full bg-background"
                style={flipped.has(art.key) ? invertedStyle : undefined}
              >
                <AutoFit resetKey={`${brand.id}:${seed}:${format}:${art.key}:${slideIndex}`}>
                  <StudioProSignature
                    artKey={`${brand.id}:${seed}:${art.key}:${slideIndex}`}
                    enabled={signatureOn}
                    brandName={brand.name}
                  >
                    <AuthorialArtBlock
                      art={art}
                      slide={art.slides[slideIndex]}
                      slideIndex={slideIndex}
                      format={format}
                      photo={photo}
                    />
                  </StudioProSignature>
                </AutoFit>
              </div>
            </div>
          );

          return (
            <div key={art.key} className="w-full">
              {isCarousel ? (
                <>
                  <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Carrossel · {art.slides.length} slides em ordem
                  </p>
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                    {art.slides.map((_, i) => frame(i))}
                  </div>
                </>
              ) : (
                frame(0)
              )}

              <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${art.key}`}
                  onClick={() => void download(art)}
                >
                  {busy === `png-${art.key}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isCarousel ? `PNG (${art.slides.length})` : "PNG"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  onClick={() => void copyCaption(caption)}
                >
                  <Type className="mr-1.5 h-3.5 w-3.5" />
                  Legenda
                </Button>
                <Button
                  size="sm"
                  variant={flipped.has(art.key) ? "secondary" : "outline"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => toggleFlip(art.key)}
                >
                  <Contrast className="mr-1.5 h-3.5 w-3.5" />
                  {flipped.has(art.key) ? "Lado B" : "Inverter cores"}
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `save-${art.key}` || saved.has(art.key)}
                  onClick={() => void save(art, caption)}
                >
                  {busy === `save-${art.key}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : saved.has(art.key) ? (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {saved.has(art.key) ? "Salva" : "Salvar na marca"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {photosOpen && (
        <StudioPhotos
          photos={photos}
          loading={photosLoading}
          onUpload={addPhoto}
          onEdit={editPhoto}
          onRemove={removePhoto}
          limit={photoLimit}
          usedTotal={photosTotal}
          pinnedIds={pinnedPhotos}
          onTogglePin={togglePin}
          onClose={() => setPhotosOpen(false)}
        />
      )}

    </section>
  );
};

export default StudioProAuthorial;
