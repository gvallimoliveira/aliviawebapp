import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollProgress from "@/components/scroll/ScrollProgress";
import { useAuth } from "@/contexts/AuthContext";
import { isFallbackVip } from "@/lib/vipEmails";
import { createRng, randomSeed } from "./rng";
import { composePage } from "./composePage";
import { buildCaption } from "./caption";
import { buildFavoritesCaptions, buildPageCaptions } from "./captionFile";
import { exportTextFile } from "./exportText";
import { exportNodeAsPng } from "./exportImage";
import { buildSchedule, buildScheduleFile } from "./schedule";
import { removeThumb } from "./thumbs";
import { toast } from "sonner";
import { WORLDS, isWorldId, type WorldId } from "./content";
import { buildCoverage, readExposureLog, recordExposure, type ExposureLog } from "./coverage";
import { createPicker } from "./picker";
import { personaForSeed } from "./personas";
import { isTopicId, type TopicId } from "./topics";
import StudioControls from "./StudioControls";
import StudioFavorites from "./StudioFavorites";
import StudioCoveragePanel from "./StudioCoveragePanel";
import StudioCapture from "./StudioCapture";
import { useStudioFavorites } from "./useStudioFavorites";
import { useStudioPhotos } from "./useStudioPhotos";
import StudioPhotos from "./StudioPhotos";
import PhotoTypeBlock from "./blocks/PhotoTypeBlock";
import PhotoSplitBlock from "./blocks/PhotoSplitBlock";
import PhotoPortraitBlock from "./blocks/PhotoPortraitBlock";
import HeroBlock from "./blocks/HeroBlock";
import MarqueeBlock from "./blocks/MarqueeBlock";
import MetricsBlock from "./blocks/MetricsBlock";
import CompareBlock from "./blocks/CompareBlock";
import JourneyBlock from "./blocks/JourneyBlock";
import FeatureBlock from "./blocks/FeatureBlock";
import KineticBlock from "./blocks/KineticBlock";
import QuoteBlock from "./blocks/QuoteBlock";
import ClosingBlock from "./blocks/ClosingBlock";
import StatsBlock from "./blocks/StatsBlock";
import TriptychBlock from "./blocks/TriptychBlock";
import TypoBlock from "./blocks/TypoBlock";
import EchoBlock from "./blocks/EchoBlock";
import MonoBlock from "./blocks/MonoBlock";
import PinupBlock from "./blocks/PinupBlock";
import StoryBlock from "./blocks/StoryBlock";
import ListBlock from "./blocks/ListBlock";
import BrandBlock from "./blocks/BrandBlock";
import CarouselBlock from "./blocks/CarouselBlock";
import StudioMotion from "./blocks/StudioMotion";
import type { BlockProps, StudioFormat } from "./blocks/shared";



const BLOCKS = {
  hero: HeroBlock,
  marquee: MarqueeBlock,
  metrics: MetricsBlock,
  compare: CompareBlock,
  journey: JourneyBlock,
  feature: FeatureBlock,
  kinetic: KineticBlock,
  quote: QuoteBlock,
  closing: ClosingBlock,
  stats: StatsBlock,
  triptych: TriptychBlock,
  typo: TypoBlock,
  echo: EchoBlock,
  mono: MonoBlock,
  pinup: PinupBlock,
  story: StoryBlock,
  list: ListBlock,
  brand: BrandBlock,
  carousel: CarouselBlock,
  photoType: PhotoTypeBlock,
  photoSplit: PhotoSplitBlock,
  photoPortrait: PhotoPortraitBlock,
} satisfies Record<string, (props: BlockProps) => JSX.Element>;

const PREVIEW_MARKERS = ["id-preview--", "localhost", "127.0.0.1", ".lovableproject.com", "sandbox"];

/** Dev sandbox (vite em localhost) — nunca existe em domínio publicado. */
const isLocalDev = () =>
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const isPreviewEnvironment = () =>
  PREVIEW_MARKERS.some((marker) => window.location.origin.includes(marker));

const FRAME_WIDTH: Record<StudioFormat, string> = {
  "9x16": "min(430px, 100vw)",
  "1x1": "min(720px, 100vw)",
  free: "100%",
};

/**
 * Aliv.iA Studio — landing mutável, exclusiva de preview, para produção de
 * conteúdo de marketing. Cada "nova landing preview" gera uma composição
 * diferente a partir de uma seed determinística (o link pode ser reaberto).
 */
const StudioLanding = () => {
  const { user, ready } = useAuth();
  const [params, setParams] = useSearchParams();
  const [hidden, setHidden] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const { favorites, isFavorite, toggle, isBlockFavorite, toggleBlock, remove } = useStudioFavorites();
  /** Acervo privado de fotos da conta (persistido no backend). */
  const {
    photos,
    loading: photosLoading,
    add: addPhoto,
    edit: editPhoto,
    remove: removePhoto,
  } = useStudioPhotos(true);


  const world: WorldId = isWorldId(params.get("world")) ? (params.get("world") as WorldId) : "pro";
  const formatParam = params.get("format");
  const format: StudioFormat =
    formatParam === "9x16" || formatParam === "1x1" || formatParam === "free" ? formatParam : "free";
  const seed = params.get("seed") ?? "a1";

  /** Autor da versão: a persona criativa é derivada da seed (determinística). */
  const persona = personaForSeed(seed);

  useEffect(() => {
    if (!params.get("seed")) {
      const next = new URLSearchParams(params);
      next.set("seed", randomSeed());
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey) setHidden((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const content = WORLDS[world];

  /** Linhagem: `from=<mundo>:<seed>` faz a composição herdar parte de um favorito. */
  const from = params.get("from");

  /** `force=<topico>` prioriza uma funcionalidade específica nesta versão. */
  const forcedParam = params.get("force");
  const forced: TopicId | undefined = isTopicId(forcedParam) ? forcedParam : undefined;

  const versionKey = `${world}:${seed}:${from ?? ""}:${forced ?? ""}`;

  /**
   * ESTUDO DE COBERTURA ANTES DA DECISÃO CRIATIVA.
   *
   * O retrato de exposições é congelado por versão (guardado em ref, não em
   * state) para que registrar o que foi ao ar não re-renderize a página e troque
   * o conteúdo debaixo do usuário. Na versão seguinte o retrato já vem atualizado.
   */
  const exposureLogRef = useRef<ExposureLog>(readExposureLog());
  const coverage = useMemo(
    () => buildCoverage(world, content, exposureLogRef.current),
    [world, content, versionKey],
  );

  const exposedRef = useRef<{ key: string; topics: Set<TopicId> }>({ key: versionKey, topics: new Set() });
  if (exposedRef.current.key !== versionKey) exposedRef.current = { key: versionKey, topics: new Set() };

  const picker = useMemo(
    () =>
      createPicker(
        coverage,
        (topics) => topics.forEach((t) => exposedRef.current.topics.add(t)),
        forced,
      ),
    [coverage, forced],
  );

  /** Registra o que esta versão efetivamente colocou no ar. */
  useEffect(() => {
    const topics = [...exposedRef.current.topics];
    if (topics.length === 0) return;
    exposureLogRef.current = recordExposure(world, topics);
  }, [versionKey, world]);

  const blocks = useMemo(() => {
    const inspiration = (() => {
      if (!from) return undefined;
      const [fromWorld, fromSeed] = from.split(":");
      if (!isWorldId(fromWorld) || !fromSeed) return undefined;
      return composePage(createRng(`${fromWorld}:${fromSeed}:layout`), persona, undefined, WORLDS[fromWorld].carousels);
    })();
    return composePage(
      createRng(`${world}:${seed}:layout`),
      persona,
      inspiration,
      content.carousels,
      photos.length,
      undefined,
      // Studio interno = marca Aliv.iA: libera as artes autorais do método.
      true,
    );
  }, [world, seed, from, persona, content, photos.length]);


  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    setParams(next, { replace: false });
  };

  /** Gera uma seed nova (garantidamente diferente) e volta ao topo. */
  const newVersion = () => {
    let next = randomSeed();
    while (next === seed) next = randomSeed();
    update({ seed: next, from: null });
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const evolveFavorite = () => {
    if (favorites.length === 0) return;
    const pick = favorites[Math.floor(Math.random() * favorites.length)];
    update({ world: pick.world, format: pick.format, from: pick.id, seed: randomSeed() });
  };


  /** Exporta em sequência todas as artes visíveis (a barra é oculta durante o lote). */
  const exportAllPng = async () => {
    if (batchProgress) return;
    setHidden(true);
    await new Promise((r) => window.setTimeout(r, 250));
    let ok = 0;
    for (let i = 0; i < blocks.length; i++) {
      setBatchProgress(`${i + 1}/${blocks.length}`);
      const node = document.getElementById(`studio-block-${i}`);
      if (!node) continue;
      try {
        await exportNodeAsPng(
          node as HTMLElement,
          `alivia-studio-${world}-${seed}-${String(i + 1).padStart(2, "0")}-${blocks[i].kind}.png`,
        );
        ok++;
      } catch (error) {
        console.error("[studio] batch export failed", i, error);
      }
    }
    setBatchProgress(null);
    setHidden(false);
    toast[ok ? "success" : "error"](
      ok ? `${ok} de ${blocks.length} artes exportadas` : "Não foi possível exportar as artes",
    );
  };

  const exportAllCaptions = async () => {
    try {
      await exportTextFile(buildPageCaptions(world, seed, blocks), `alivia-studio-${world}-${seed}-legendas.txt`);
      toast.success("Legendas desta versão baixadas");
    } catch {
      toast.error("Não foi possível baixar as legendas.");
    }
  };

  const exportSchedule = async () => {
    try {
      await exportTextFile(
        buildScheduleFile(buildSchedule(favorites)),
        "alivia-studio-cronograma-postagens.txt",
      );
      toast.success("Cronograma de postagens baixado");
    } catch {
      toast.error("Não foi possível baixar o cronograma.");
    }
  };

  const exportFavoriteCaptions = async () => {
    try {
      await exportTextFile(buildFavoritesCaptions(favorites), "alivia-studio-favoritos-legendas.txt");
      toast.success("Legendas dos favoritos baixadas");
    } catch {
      toast.error("Não foi possível baixar as legendas dos favoritos.");
    }
  };

  const previewOnly = isPreviewEnvironment();
  const allowed = previewOnly && (isFallbackVip(user?.email) || isLocalDev());

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!allowed) {
    const needsLogin = !user;
    const notPreview = !previewOnly;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">Aliv.iA Studio</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            {notPreview
              ? "Este ambiente é interno e só abre no link de preview do projeto (id-preview--...lovable.app/studio)."
              : needsLogin
                ? "Você não está logado neste navegador. Entre com a sua conta de administração para abrir o Studio."
                : `A conta ${user?.email} não tem acesso ao Studio. Entre com a sua conta de administração.`}
          </p>
          {previewOnly && (
            <a
              href={`/auth?redirect=${encodeURIComponent("/studio")}`}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {needsLogin ? "Entrar" : "Trocar de conta"}
            </a>
          )}
        </div>
      </main>
    );
  }


  return (
    <>
      <ScrollProgress />
      <div className="flex min-h-screen justify-center bg-muted">
        <main
          className="w-full overflow-x-hidden bg-background"
          style={{ width: FRAME_WIDTH[format], maxWidth: "100vw" }}
        >
          {format === "1x1" && (
            <style>{`.studio-square section { min-height: min(720px, 100vw) !important; }`}</style>
          )}
          <div className={format === "1x1" ? "studio-square" : undefined}>
            {blocks.map(({ kind, treatment, motion, slide }, i) => {
              const Block = BLOCKS[kind];
              const rng = createRng(`${world}:${seed}:${kind}:${i}`);
              return (
                <StudioCapture
                  key={`${kind}-${i}`}
                  visible={!hidden}
                  anchorId={`studio-block-${i}`}
                  favoriteId={`${world}:${seed}:${i}`}
                  favorited={isBlockFavorite(world, seed, i)}
                  onToggleFavorite={() => toggleBlock(world, format, seed, i, kind)}
                  caption={buildCaption(content, kind, createRng(`${world}:${seed}:caption:${kind}:${i}`))}
                  fileName={`${world}-${seed}-${String(i + 1).padStart(2, "0")}-${kind}`}
                >
                  <StudioMotion kind={motion}>
                    <Block content={content} rng={rng} treatment={treatment} format={format} picker={picker} persona={persona} slide={slide} photos={photos} />
                  </StudioMotion>
                </StudioCapture>
              );
            })}


          </div>
        </main>
      </div>

      {hidden ? (
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="fixed bottom-3 right-3 z-50 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-opacity hover:opacity-100 md:opacity-30 print:hidden"
          title="Mostrar controles (tecla H)"
        >
          Studio
        </button>
      ) : (
        <StudioControls
          world={world}
          format={format}
          seed={seed}
          persona={persona}
          favorited={isFavorite(world, seed)}
          favoritesCount={favorites.length}
          canEvolve={favorites.length > 0}
          onWorld={(w) => update({ world: w })}
          onFormat={(f) => update({ format: f })}
          onNewVersion={newVersion}
          onEvolveFavorite={evolveFavorite}
          onToggleFavorite={() => toggle(world, format, seed)}
          onOpenFavorites={() => setFavoritesOpen(true)}
          onOpenCoverage={() => setCoverageOpen(true)}
          photosCount={photos.length}
          onOpenPhotos={() => setPhotosOpen(true)}
          forcedTopicLabel={forced ? coverage.byId[forced]?.label : undefined}
          onHide={() => setHidden(true)}
          onExportAllPng={exportAllPng}
          onExportAllCaptions={exportAllCaptions}
          batchProgress={batchProgress}

        />
      )}

      {favoritesOpen && !hidden && (
        <StudioFavorites
          favorites={favorites}
          onOpen={(fav) => {
            update({ world: fav.world, format: fav.format, seed: fav.seed, from: null });
            setFavoritesOpen(false);
            if (fav.blockIndex !== undefined) {
              window.setTimeout(() => {
                document
                  .getElementById(`studio-block-${fav.blockIndex}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 120);
            }
          }}

          onRemove={(id) => {
            remove(id);
            removeThumb(id);
          }}
          onExportCaptions={exportFavoriteCaptions}
          onExportSchedule={exportSchedule}
          onClose={() => setFavoritesOpen(false)}
        />
      )}

      {photosOpen && !hidden && (
        <StudioPhotos
          photos={photos}
          loading={photosLoading}
          onUpload={addPhoto}
          onEdit={editPhoto}
          onRemove={removePhoto}
          onClose={() => setPhotosOpen(false)}
        />
      )}

      {coverageOpen && !hidden && (
        <StudioCoveragePanel
          world={world}
          forced={forced}
          onForce={(topic) => {
            update({ force: topic, seed: randomSeed(), from: null });
            setCoverageOpen(false);
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
          onClearForce={() => update({ force: null })}
          onClose={() => setCoverageOpen(false)}
        />
      )}
    </>

  );
};

export default StudioLanding;
