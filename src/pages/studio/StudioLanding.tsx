import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollProgress from "@/components/scroll/ScrollProgress";
import { useAuth } from "@/contexts/AuthContext";
import { isFallbackVip } from "@/lib/vipEmails";
import { createRng, randomSeed } from "./rng";
import { composePage } from "./composePage";
import { WORLDS, isWorldId, type WorldId } from "./content";
import StudioControls from "./StudioControls";
import HeroBlock from "./blocks/HeroBlock";
import MarqueeBlock from "./blocks/MarqueeBlock";
import MetricsBlock from "./blocks/MetricsBlock";
import CompareBlock from "./blocks/CompareBlock";
import JourneyBlock from "./blocks/JourneyBlock";
import FeatureBlock from "./blocks/FeatureBlock";
import KineticBlock from "./blocks/KineticBlock";
import QuoteBlock from "./blocks/QuoteBlock";
import ClosingBlock from "./blocks/ClosingBlock";
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

  const world: WorldId = isWorldId(params.get("world")) ? (params.get("world") as WorldId) : "pro";
  const formatParam = params.get("format");
  const format: StudioFormat =
    formatParam === "9x16" || formatParam === "1x1" || formatParam === "free" ? formatParam : "free";
  const seed = params.get("seed") ?? "a1";

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

  const blocks = useMemo(() => composePage(createRng(`${world}:${seed}:layout`)), [world, seed]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: false });
  };

  const previewOnly = isPreviewEnvironment();
  const allowed = previewOnly && (isFallbackVip(user?.email) || isLocalDev());

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">Aliv.iA Studio</h1>
          <p className="text-sm text-muted-foreground">
            Este ambiente é interno e existe apenas no preview do projeto, acessível com a conta de administração.
          </p>
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
            {blocks.map(({ kind, treatment }, i) => {
              const Block = BLOCKS[kind];
              const rng = createRng(`${world}:${seed}:${kind}:${i}`);
              return (
                <Block key={`${kind}-${i}`} content={content} rng={rng} treatment={treatment} format={format} />
              );
            })}
          </div>
        </main>
      </div>

      {!hidden && (
        <StudioControls
          world={world}
          format={format}
          seed={seed}
          onWorld={(w) => update("world", w)}
          onFormat={(f) => update("format", f)}
          onNewVersion={() => update("seed", randomSeed())}
          onHide={() => setHidden(true)}
        />
      )}
    </>
  );
};

export default StudioLanding;
