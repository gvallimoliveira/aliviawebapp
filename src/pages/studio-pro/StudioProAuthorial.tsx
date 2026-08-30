import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Contrast, Download, FileText, Loader2, PencilLine, RefreshCw, RotateCcw, Save, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  deliver,
  exportNodeAsPng,
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
  applyArtText,
  hasArtEdits,
  readArtText,
  setArtEditing,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
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
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, ArtTextEdits>>({});
  const [resetTick, setResetTick] = useState(0);
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

  useEffect(() => {
    Object.entries(edits).forEach(([key, value]) => {
      const separator = key.lastIndexOf(":");
      const node = nodeOf(key.slice(0, separator), Number(key.slice(separator + 1)));
      if (node) applyArtText(node, value);
    });
  }, [edits, arts, format, seed]);

  const startEdit = (artKey: string, slide: number) => {
    const key = slideKey(artKey, slide);
    const node = nodeOf(artKey, slide);
    if (!node) return;
    setArtEditing(node, true);
    setEditing(key);
  };

  const cancelEdit = (artKey: string, slide: number) => {
    const key = slideKey(artKey, slide);
    const node = nodeOf(artKey, slide);
    if (node) {
      setArtEditing(node, false);
      applyArtText(node, edits[key]);
    }
    setEditing(null);
  };

  const finishEdit = (artKey: string, slide: number) => {
    const key = slideKey(artKey, slide);
    const node = nodeOf(artKey, slide);
    if (!node) return;
    const next = readArtText(node);
    if (Object.values(next).some((text) => !text)) {
      toast.error("Há um texto vazio na arte. Preencha ou cancele o ajuste.");
      return;
    }
    setArtEditing(node, false);
    setEdits((prev) => ({ ...prev, [key]: next }));
    setEditing(null);
    setSaved((prev) => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    });
    toast.success("Texto ajustado nesta arte.");
  };

  const resetEdit = (artKey: string, slide: number) => {
    const key = slideKey(artKey, slide);
    setEdits((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSaved((prev) => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    });
    setEditing(null);
    setResetTick((current) => current + 1);
  };

  const slideKey = (artKey: string, slide: number) => `${artKey}:${slide}`;

  const toggleFlip = (artKey: string, slide: number) => {
    const key = slideKey(artKey, slide);
    setFlipped((prev) => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
    setSaved((prev) => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    });
  };

  const fileBase = `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}`;

  const download = async (art: AuthorialArt, slideIndex: number) => {
    const key = slideKey(art.key, slideIndex);
    setBusy(`png-${key}`);
    try {
      const node = nodeOf(art.key, slideIndex);
      if (!node) throw new Error("no-node");
      await exportNodeAsPng(node, `${fileBase}-${art.key}-${String(slideIndex + 1).padStart(2, "0")}.png`);
      toast.success("Arte exportada");
    } catch (error) {
      console.error("[studio-pro] export autoral", error);
      toast.error("Não foi possível exportar esta arte.");
    } finally {
      setBusy(null);
    }
  };


  const save = async (art: AuthorialArt, slideIndex: number, caption: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    const key = slideKey(art.key, slideIndex);
    setBusy(`save-${key}`);
    const side = flipped.has(key) ? "-b" : "";
    const node = nodeOf(art.key, slideIndex);
    const nodes = node ? [node] : [];

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
        // Não terminar em "-NN.png": a galeria usa esse padrão apenas para
        // reconhecer carrosséis legados agrupados e baixar seus arquivos irmãos.
        const path = `${auth.user.id}/${brand.id}/${seed}-${art.key}-slide-${String(slideIndex + 1).padStart(2, "0")}${side}-art.png`;
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
             key: `${seed}-${art.key}-${String(slideIndex + 1).padStart(2, "0")}${side}`,
            format,
            nodes,
          })
        : null;

    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}${side}:${art.key}:${slideIndex}`,
      block_kind: art.kind === "carousel" ? "carousel" : "quote",
      format,
      headline: art.slides[slideIndex]?.lines[0]?.slice(0, 140) ?? null,
      caption,
      thumb,
      png_path: pngPath,
      composition: JSON.parse(JSON.stringify({ ...art, slides: [art.slides[slideIndex]], slideIndex, slideTotal: art.slides.length })),
      snapshot,
      text_edits: { 0: node ? readArtText(node) : {} },
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
    setSaved((prev) => new Set(prev).add(key));
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
          const frame = (slideIndex: number) => {
            const key = slideKey(art.key, slideIndex);
            const slideSaved = saved.has(key);
            return (
              <div key={slideIndex} className={isCarousel ? "w-[min(480px,88vw)] shrink-0 snap-center" : "w-full"}>
                <div
                  className={`overflow-hidden rounded-2xl border border-border bg-background ${isCarousel ? "" : "mx-auto"}`}
                  style={{ ...FRAME_STYLE[format], ...themeStyle }}
                >
                  <div
                    id={nodeId(art.key, slideIndex)}
                    className="h-full w-full bg-background"
                    style={flipped.has(key) ? invertedStyle : undefined}
                  >
                    <AutoFit resetKey={`${brand.id}:${seed}:${format}:${art.key}:${slideIndex}:${resetTick}`}>
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
                <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full text-xs"
                    disabled={busy === `png-${key}`}
                    onClick={() => void download(art, slideIndex)}
                  >
                    {busy === `png-${key}` ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    PNG
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => void copyCaption(caption)}>
                    <Type className="mr-1.5 h-3.5 w-3.5" />
                    Legenda
                  </Button>
                  <Button
                    size="sm"
                    variant={flipped.has(key) ? "secondary" : "outline"}
                    className="h-8 rounded-full text-xs"
                    onClick={() => toggleFlip(art.key, slideIndex)}
                  >
                    <Contrast className="mr-1.5 h-3.5 w-3.5" />
                    {flipped.has(key) ? "Lado B" : "Inverter cores"}
                  </Button>
                  {editing === key ? (
                    <>
                      <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => finishEdit(art.key, slideIndex)}>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Concluir
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => cancelEdit(art.key, slideIndex)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => startEdit(art.key, slideIndex)}>
                      <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                      Ajustar texto
                    </Button>
                  )}
                  {hasArtEdits(edits[key]) && (
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => resetEdit(art.key, slideIndex)}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Desfazer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    disabled={busy === `save-${key}` || slideSaved}
                    onClick={() => void save(art, slideIndex, caption)}
                  >
                    {busy === `save-${key}` ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : slideSaved ? (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {slideSaved ? "Salva" : "Salvar na marca"}
                  </Button>
                </div>
              </div>
            );
          };

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
