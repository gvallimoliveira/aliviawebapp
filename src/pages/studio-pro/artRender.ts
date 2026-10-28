/**
 * RECONSTRUÇÃO DE ARTE SALVA (edição pela galeria)
 *
 * A galeria guarda a receita da arte (`composition`), a seed, o público e o
 * objetivo. Para editar uma arte já salva o motor precisa remontar o MESMO
 * ambiente de renderização do editor "Criar": acervo textual do público,
 * persona, picker, tema de cores e fonte da marca.
 *
 * Este módulo isola essa remontagem — é local e determinístico (zero crédito de
 * IA). O texto exato da arte salva é reaplicado por cima a partir de
 * `text_edits`, então o que o usuário edita é o que ele viu quando salvou.
 */
import { useEffect, useMemo } from "react";
import {
  buildCoverage,
  createPicker,
  createRng,
  personaForSeed,
} from "@/studio-core";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { voiceRegister } from "@/pages/studio/lexicon";
import { varyContent } from "@/pages/studio/vary";
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from "@/pages/studio/content";
import { buildSegmentContent, brandSlogan, enforceEditorialFocus } from "./brandContent";
import { readColorKit } from "./brandColors";
import { readableThemeTokens } from "./contrast";
import { ensureFontLoaded, findFont } from "./brandFonts";
import { ALIVIA_AUDIENCES, GLOBAL_SEGMENT, audienceAncestors, readAudiences, resolveAudience, type ContentAngle } from "./audiences";
import { DEFAULT_VARIATION_PROFILE, type VariationProfile } from "@/pages/studio/variation";
import { usePhraseMemory } from "./usePhraseMemory";

export type ArtRenderBrand = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  mark_url?: string | null;
  colors: Record<string, string> | null;
  description?: string | null;
  topics?: string[] | null;
  content_source?: string | null;
  instagram_handle?: string | null;
  source_url?: string | null;
  audiences?: unknown;
  positioning?: string | null;
  signature_enabled?: boolean | null;
  brief_answers?: unknown;
  keyword_matrix?: unknown;
  reasoning_matrix?: unknown;
};

/** #RRGGBB → "H S% L%" para alimentar os tokens HSL do tema. */
export const hexToHslTriplet = (hex: string): string | null => {
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

type Args = {
  brand: ArtRenderBrand;
  /** Seed base da geração (sem o sufixo de índice guardado na galeria). */
  seed: string;
  segment: string;
  angle: ContentAngle;
  variation?: VariationProfile;
};

export const useArtRender = ({ brand, seed, segment, angle, variation }: Args) => {
  const isAlivia = brand.content_source === "alivia";
  const audiences = useMemo(
    () => (isAlivia ? ALIVIA_AUDIENCES : readAudiences(brand.audiences)),
    [brand.audiences, isAlivia],
  );
  const profile = variation ?? DEFAULT_VARIATION_PROFILE;

  const contentKit = useMemo(
    () => ({
      name: brand.name,
      niche: brand.niche,
      tone: brand.tone,
      description: brand.description,
      keywords: brand.topics,
      positioning: brand.positioning,
      briefAnswers: brand.brief_answers,
      keywordMatrix: brand.keyword_matrix,
      reasoningMatrix: brand.reasoning_matrix,
    }),
    [brand.name, brand.niche, brand.tone, brand.description, brand.topics, brand.positioning, brand.brief_answers, brand.keyword_matrix, brand.reasoning_matrix],
  );

  const subWorld = useMemo<WorldId | undefined>(() => {
    if (segment === GLOBAL_SEGMENT || isWorldId(segment)) return undefined;
    const parent = audienceAncestors(audiences, segment).find((a) => isWorldId(a.id));
    return parent ? (parent.id as WorldId) : undefined;
  }, [audiences, segment]);

  const aliviaWorld: WorldId | null = !isAlivia
    ? null
    : segment !== GLOBAL_SEGMENT && isWorldId(segment)
      ? segment
      : subWorld
        ? subWorld
        : WORLD_IDS[createRng(`${brand.id}:${seed}:world`).int(WORLD_IDS.length)];

  const register = useMemo(() => voiceRegister(brand.tone, brand.name), [brand.tone, brand.name]);

  const content = useMemo(() => {
    const built = buildSegmentContent({
      kit: contentKit,
      base: aliviaWorld ? WORLDS[aliviaWorld] : undefined,
      audiences,
      segment,
      angle,
      positioning: aliviaWorld ? null : brand.positioning,
      variationSeed: `${brand.id}:${seed}:${segment}:${angle}`,
      variationProfile: profile,
    });
    const varied = varyContent(built, {
      register,
      seed: `${brand.id}:${seed}:${segment}:${angle}`,
      forbidden: isAlivia ? [] : ["aliv.ia", "alivia", "fisioterap"],
      profile,
    });
    return enforceEditorialFocus(varied, resolveAudience(audiences, segment) ?? undefined);
  }, [contentKit, aliviaWorld, audiences, segment, angle, brand.positioning, brand.id, seed, register, isAlivia, profile]);

  const persona = useMemo(() => personaForSeed(`${brand.id}:${seed}`), [brand.id, seed]);
  const phraseMemory = usePhraseMemory(brand.id);
  const picker = useMemo(
    () => createPicker(buildCoverage(aliviaWorld ?? "pro", content, {}), () => {}, undefined, phraseMemory),
    [content, aliviaWorld, phraseMemory],
  );

  /** Lockup da marca aplicado antes de renderizar/exportar. */
  useEffect(() => {
    applyStudioBrandTheme({
      name: brand.name,
      slogan: brandSlogan({ name: brand.name, niche: brand.niche, description: brand.description }),
      logo: brand.logo_url,
      mark: brand.mark_url ?? null,
      handle: brand.instagram_handle ?? null,
      site: brand.source_url ?? null,
    });
  }, [brand.name, brand.niche, brand.description, brand.logo_url, brand.mark_url, brand.instagram_handle, brand.source_url]);

  const kit = readColorKit(brand.colors);
  useEffect(() => {
    ensureFontLoaded(kit.font);
  }, [kit.font]);

  const themeStyle = useMemo(() => {
    const style: Record<string, string> = {};
    const accents = [
      ...(kit.useSecondary ? [kit.secondary] : []),
      ...kit.extraPrimary,
      ...(kit.useSecondary ? kit.extraSecondary : []),
    ].filter(Boolean);
    let accent = kit.useSecondary ? kit.secondary : kit.primary;
    if (accents.length > 1) {
      const pick = [...String(seed)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % accents.length;
      accent = accents[pick];
    }
    const tokens = readableThemeTokens({
      background: kit.primary2,
      primary: kit.primary,
      accent,
      secondary: kit.useSecondary ? kit.secondary2 : kit.primary2,
    });
    Object.entries(tokens).forEach(([token, hex]) => {
      const triplet = hexToHslTriplet(hex);
      if (triplet) style[token] = triplet;
    });
    const ring = hexToHslTriplet(kit.primary);
    if (ring) style["--ring"] = ring;
    accents.forEach((color, i) => {
      const triplet = hexToHslTriplet(color);
      if (triplet) style[`--brand-extra-${i + 1}`] = triplet;
    });
    const brandFont = findFont(kit.font);
    if (brandFont.stack) style.fontFamily = brandFont.stack;
    return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(brand.colors), seed]);

  return { content, persona, picker, themeStyle, isAlivia };
};
