import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Images, Loader2, RefreshCw, Save, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  STUDIO_BLOCKS,
  StudioMotion,
  buildCaption,
  buildCoverage,
  composePage,
  createPicker,
  createRng,
  deliver,
  exportNodeAsPng,
  exportTextFile,
  personaForSeed,
  randomSeed,
  renderNodeToBlob,
  type ComposedBlock,
  type StudioFormat,
} from "@/studio-core";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { WORLDS, isWorldId, type WorldId } from "@/pages/studio/content";
import { buildSegmentContent, brandSlogan } from "./brandContent";
import { readColorKit } from "./brandColors";
import { ANGLES, GLOBAL_SEGMENT, buildSegments, readAudiences, type ContentAngle } from "./audiences";


/**
 * EDITOR "CRIAR" DO STUDIO PÚBLICO
 *
 * Usa o mesmo motor criativo do Studio interno, mas com dois trocas:
 * 1. o acervo de copy é gerado do kit da marca do cliente (`buildBrandContent`);
 * 2. o lockup (nome, slogan, logo) e a cor primária vêm da marca ativa.
 *
 * Cada arte pode ser baixada em PNG e salva na pasta da marca — nunca sai do
 * escopo da marca ativa (`brand_id`).
 */

type BrandInput = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
  description?: string | null;
  topics?: string[] | null;
  content_source?: string | null;
  /** Nichos da marca (jsonb) — cada um vira uma aba de segmento. */
  audiences?: unknown;
  /** Leitura global do produto, base do conteúdo 360°. */
  positioning?: string | null;
};

type Props = {
  brand: BrandInput;
  /** Pasta de destino ao salvar (a pasta selecionada na aba Artes). */
  folder: string;
  /** Downloads saem com assinatura discreta do plano gratuito. */
  watermark: boolean;
  onSaved?: () => void;
};

const FRAME_WIDTH: Record<StudioFormat, string> = {
  "9x16": "min(400px, 100%)",
  "1x1": "min(560px, 100%)",
  free: "100%",
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "Story 9:16" },
  { id: "1x1", label: "Post 1:1" },
  { id: "free", label: "Livre" },
];


/** #RRGGBB → "H S% L%" para alimentar os tokens HSL do tema. */
const hexToHslTriplet = (hex: string): string | null => {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const StudioProCreate = ({ brand, folder, watermark, onSaved }: Props) => {
  const [format, setFormat] = useState<StudioFormat>("1x1");
  const [seed, setSeed] = useState(() => randomSeed());
  const [busy, setBusy] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  /**
   * Marcas com `content_source = "alivia"` têm acervo editorial próprio por
   * mundo (o mesmo do Studio interno). Qualquer outra marca usa o acervo neutro
   * gerado do kit — a segmentação em si é idêntica para todo cliente.
   */
  const isAlivia = brand.content_source === "alivia";

  const audiences = useMemo(() => readAudiences(brand.audiences), [brand.audiences]);
  const segments = useMemo(() => buildSegments(audiences), [audiences]);
  const [segment, setSegment] = useState<string>(GLOBAL_SEGMENT);
  const [angle, setAngle] = useState<ContentAngle>("informar");

  // Se o público ativo deixa de existir (edição do kit), volta para o 360°.
  const activeSegment = segments.some((s) => s.id === segment) ? segment : GLOBAL_SEGMENT;

  const contentKit = useMemo(
    () => ({
      name: brand.name,
      niche: brand.niche,
      tone: brand.tone,
      description: brand.description,
      keywords: brand.topics,
    }),
    [brand.name, brand.niche, brand.tone, brand.description, brand.topics],
  );

  /** Mundo Aliv.iA correspondente ao público ativo, quando existir. */
  const aliviaWorld: WorldId | null =
    isAlivia && activeSegment !== GLOBAL_SEGMENT && isWorldId(activeSegment) ? activeSegment : null;

  const content = useMemo(
    () =>
      buildSegmentContent({
        kit: contentKit,
        base: aliviaWorld ? WORLDS[aliviaWorld] : undefined,
        audiences,
        // Com acervo oficial do mundo, o público já está embutido no base.
        segment: aliviaWorld ? GLOBAL_SEGMENT : activeSegment,
        angle,
        positioning: aliviaWorld ? null : brand.positioning,
      }),
    [contentKit, aliviaWorld, audiences, activeSegment, angle, brand.positioning],
  );

  const persona = useMemo(() => personaForSeed(`${brand.id}:${seed}`), [brand.id, seed]);

  /** Lockup da marca do cliente aplicado antes da renderização das artes. */
  const themeReady = useMemo(() => {
    applyStudioBrandTheme({
      name: brand.name,
      slogan: brandSlogan({ name: brand.name, niche: brand.niche, tone: brand.tone }),
      logo: brand.logo_url,
    });
    return `${brand.id}:${brand.name}:${brand.logo_url ?? ""}`;
  }, [brand.id, brand.name, brand.niche, brand.tone, brand.logo_url]);

  const picker = useMemo(
    () => createPicker(buildCoverage(aliviaWorld ?? "pro", content, {}), () => {}),
    [content, aliviaWorld],
  );

  const blocks = useMemo(
    () =>
      composePage(
        createRng(`${brand.id}:${seed}:${activeSegment}:${angle}:layout`),
        persona,
        undefined,
        content.carousels,
        0,
      ),
    [brand.id, seed, activeSegment, angle, persona, content],
  );


  useEffect(() => {
    // Reaplica o tema quando a marca muda de aba/rota.
    void themeReady;
  }, [themeReady]);

  /** Kit da marca aplicado como tokens: 2 principais + 2 secundárias opcionais. */
  const kit = readColorKit(brand.colors);
  const themeStyle = (() => {
    const style: Record<string, string> = {};
    const primary = hexToHslTriplet(kit.primary);
    const primary2 = hexToHslTriplet(kit.primary2);
    if (primary) {
      style["--primary"] = primary;
      style["--ring"] = primary;
    }
    if (primary2) style["--background"] = primary2;
    if (kit.useSecondary) {
      const secondary = hexToHslTriplet(kit.secondary);
      const secondary2 = hexToHslTriplet(kit.secondary2);
      if (secondary) style["--accent"] = secondary;
      if (secondary2) style["--secondary"] = secondary2;
    }
    return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
  })();

  const headlineOf = (index: number) =>
    (document.getElementById(`studio-pro-block-${index}`)?.querySelector("h1, h2, h3")?.textContent ?? "")
      .trim()
      .slice(0, 140);

  const download = async (index: number, kind: string) => {
    const node = document.getElementById(`studio-pro-block-${index}`);
    if (!node) return;
    setBusy(`png-${index}`);
    try {
      await exportNodeAsPng(
        node as HTMLElement,
        `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}-${String(index + 1).padStart(2, "0")}-${kind}.png`,
      );
      toast.success("Arte exportada em alta resolução");
    } catch (error) {
      console.error("[studio-pro] export", error);
      toast.error("Não foi possível exportar esta arte.");
    } finally {
      setBusy(null);
    }
  };

  const save = async (index: number, kind: string, caption: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(`save-${index}`);
    const node = document.getElementById(`studio-pro-block-${index}`) as HTMLElement | null;
    let thumb: string | null = null;
    if (node) {
      try {
        const rect = node.getBoundingClientRect();
        const blob = await renderNodeToBlob(node, Math.min(1, 300 / (rect.width || 300)), "image/jpeg", 0.6);
        thumb = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn("[studio-pro] thumb", error);
      }
    }
    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}:${index}`,
      block_kind: kind,
      format,
      headline: headlineOf(index) || null,
      caption,
      thumb,
      folder: folder === "Todas" ? "Geral" : folder,
      watermarked: watermark,
    });
    setBusy(null);
    if (error) {
      console.error("[studio-pro] save creation", error);
      toast.error("Não foi possível salvar na marca.");
      return;
    }
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

  return (
    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Criar artes de {brand.name}</h2>
          <p className="text-xs text-muted-foreground">
            Versão <span className="font-mono">{seed}</span> · direção criativa {persona.name} · destino:{" "}
            {folder === "Todas" ? "Geral" : folder}
          </p>
          {/* Nichos da marca + visão 360° que interpola todos eles. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {segments.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeSegment === s.id ? "secondary" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                onClick={() => setSegment(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {/* Ângulo estratégico: informar, dor, desejo ou venda. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ANGLES.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant={angle === a.id ? "outline" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                title={a.hint}
                onClick={() => setAngle(a.id)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          {segments.length === 1 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Cadastre os públicos da marca em Ajustes para gerar conteúdo por nicho.
            </p>
          )}

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
          <Button size="sm" className="rounded-full" onClick={() => setSeed(randomSeed())}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Nova versão
          </Button>
        </div>
      </div>

      <div ref={wrapper} className="mt-5 flex flex-col items-center gap-6" style={themeStyle}>
        {format === "1x1" && (
          <style>{`.studio-pro-square section { min-height: min(560px, 100%) !important; }`}</style>
        )}
        {blocks.map(({ kind, treatment, motion, slide }, i) => {
          const Block = STUDIO_BLOCKS[kind];
          const rng = createRng(`${brand.id}:${seed}:${kind}:${i}`);
          const caption = buildCaption(content, kind, createRng(`${brand.id}:${seed}:caption:${kind}:${i}`));
          return (
            <div key={`${kind}-${i}`} className="w-full">
              <div
                className={`mx-auto overflow-hidden rounded-2xl border border-border bg-background ${
                  format === "1x1" ? "studio-pro-square" : ""
                }`}
                style={{ width: FRAME_WIDTH[format] }}
              >
                <div id={`studio-pro-block-${i}`}>
                  <StudioMotion kind={motion}>
                    <Block
                      content={content}
                      rng={rng}
                      treatment={treatment}
                      format={format}
                      picker={picker}
                      persona={persona}
                      slide={slide}
                      photos={[]}
                    />
                  </StudioMotion>
                </div>
              </div>

              <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${i}`}
                  onClick={() => download(i, kind)}
                >
                  {busy === `png-${i}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  PNG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  onClick={() => copyCaption(caption)}
                >
                  <Type className="mr-1.5 h-3.5 w-3.5" />
                  Legenda
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `save-${i}`}
                  onClick={() => save(i, kind, caption)}
                >
                  {busy === `save-${i}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Salvar na marca
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StudioProCreate;
