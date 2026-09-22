/**
 * TEMA DE CORES DA ARTE (Studio público)
 *
 * Um único lugar monta os tokens CSS a partir do kit da marca — usado pelo
 * editor "Criar", pela edição na galeria e pelo lado B (cores invertidas).
 *
 * LADO A x LADO B: a marca tem duas cores principais com papéis fixos
 * (`primary` = cor de marca, `primary2` = cor que fica por cima). Invertendo os
 * papéis, a MESMA arte vira uma segunda peça — fundo de marca em vez de fundo
 * claro — sem gastar geração nem crédito de IA.
 */
import type { BrandColorKit } from "./brandColors";
import { contrastRatio, deepen, isLight, lighten, mix, readableOn, readableThemeTokens } from "./contrast";
import { findFont, isSerifFont } from "./brandFonts";

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
  kit: BrandColorKit;
  /** Seed do lote: escolhe qual cor extra entra como acento. */
  seed: string;
  /** Lado B: troca os papéis das duas cores principais. */
  invert?: boolean;
};

export const buildBrandThemeStyle = ({ kit, seed, invert }: Args): React.CSSProperties | undefined => {
  const style: Record<string, string> = {};
  /**
   * Cores extras da marca entram na rotação: cada lote de artes (seed) escolhe
   * um acento diferente da paleta, sem sair do kit aprovado pelo cliente.
   */
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

  /**
   * CONTRASTE VERIFICADO ANTES DE APROVAR A ARTE: cada superfície do tema
   * recebe o texto calculado (WCAG 4,5:1). Se o par reprovar, o TEXTO muda —
   * a cor de marca do fundo é preservada.
   */
  /**
   * A identidade continua vindo do kit, mas a superfície editorial permanece
   * clara. Antes o lado B promovia a cor mais escura a fundo de toda a arte e
   * metade do lote virava uma sequência pesada. A inversão agora troca a nuance
   * do papel e o acento; chapas profundas ficam reservadas aos poucos modelos
   * que realmente pedem contraste dramático.
   */
  const lightPaper = isLight(kit.primary2) ? kit.primary2 : mix(kit.primary2, [255, 255, 255], 0.9);
  const warmPaper = mix(lightPaper, isLight(accent) ? [91, 22, 29] : undefined, 0.025);
  /**
   * O lado B precisa ser uma composição realmente inversa, não apenas uma
   * variação quase imperceptível do papel claro. A cor principal vira a
   * superfície e a antiga superfície clara assume o papel dos elementos.
   */
  const invertedSurface = isLight(kit.primary) ? deepen(kit.primary) : kit.primary;
  const background = invert ? invertedSurface : warmPaper;
  const primary = invert
    ? (contrastRatio(background, kit.primary2) >= 3 ? kit.primary2 : readableOn(background))
    : (isLight(kit.primary) ? deepen(kit.primary) : kit.primary);
  const themedAccent = invert
    ? (contrastRatio(background, accent) >= 3 ? accent : lighten(accent, 3))
    : accent;
  const tokens = readableThemeTokens({
    background,
    primary,
    accent: themedAccent,
    secondary: invert ? mix(background, [255, 255, 255], 0.14) : (kit.useSecondary ? kit.secondary2 : background),
  });
  Object.entries(tokens).forEach(([token, hex]) => {
    const triplet = hexToHslTriplet(hex);
    if (triplet) style[token] = triplet;
  });
  const ring = hexToHslTriplet(primary);
  if (ring) style["--ring"] = ring;
  const deepSurface = deepen(invert ? background : primary, 7);
  const deepTriplet = hexToHslTriplet(deepSurface);
  const deepInk = hexToHslTriplet(readableOn(deepSurface));
  if (deepTriplet) style["--studio-deep-surface"] = deepTriplet;
  if (deepInk) style["--studio-deep-foreground"] = deepInk;

  /**
   * TINTA DE DESTAQUE PARA FUNDO ESCURO / FOTO
   *
   * Acento do kit costuma ser um tom terroso ou médio: sobre foto escurecida
   * ele desaparece. Aqui a mesma cor é clareada até ter contraste de leitura,
   * então o destaque continua sendo a cor da marca — só legível.
   */
  const inkAccent = hexToHslTriplet(lighten(accent, 6));
  if (inkAccent) style["--studio-ink-accent"] = inkAccent;

  accents.forEach((color, i) => {
    const triplet = hexToHslTriplet(color);
    if (triplet) style[`--brand-extra-${i + 1}`] = triplet;
  });
  // Títulos preservam a fonte expressiva do kit; textos longos usam uma sans
  // de leitura. Isso impede uma serifada editorial de dominar selos e apoios.
  const brandFont = findFont(kit.font);
  if (brandFont.stack) {
    style["--studio-display-font"] = brandFont.stack;
    style["--studio-body-font"] = isSerifFont(brandFont)
      ? "'Inter', system-ui, sans-serif"
      : brandFont.stack;
    style.fontFamily = "var(--studio-body-font)";
  }
  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
};
