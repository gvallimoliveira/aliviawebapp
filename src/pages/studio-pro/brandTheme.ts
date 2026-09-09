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
import { lighten, readableThemeTokens } from "./contrast";
import { findFont } from "./brandFonts";

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
  const background = invert ? kit.primary : kit.primary2;
  const primary = invert ? kit.primary2 : kit.primary;
  const tokens = readableThemeTokens({
    background,
    primary,
    accent: invert && accent === kit.primary ? kit.primary2 : accent,
    secondary: kit.useSecondary ? kit.secondary2 : background,
  });
  Object.entries(tokens).forEach(([token, hex]) => {
    const triplet = hexToHslTriplet(hex);
    if (triplet) style[token] = triplet;
  });
  const ring = hexToHslTriplet(primary);
  if (ring) style["--ring"] = ring;

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
  // Tipografia da marca: herdada por todos os blocos da versão.
  const brandFont = findFont(kit.font);
  if (brandFont.stack) style.fontFamily = brandFont.stack;
  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
};
