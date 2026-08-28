/**
 * KIT DE CORES DA MARCA (Studio público)
 *
 * Toda marca tem DUAS cores principais (ex.: Aliv.iA usa verde + branco) e,
 * opcionalmente, DUAS secundárias. Marcas que não têm secundárias desativam o
 * par e o estúdio trabalha só com as principais.
 *
 * Além desse núcleo, o usuário pode adicionar QUANTAS cores extras quiser em
 * cada categoria (principal ou secundária) — marcas reais raramente cabem em
 * quatro cores. As extras entram na rotação de acento das artes.
 *
 * A coluna `studio_brands.colors` é um mapa de strings, então o flag booleano
 * é persistido como "true"/"false" e as extras como `primary3`, `primary4`,
 * `secondary3`, ... (mantendo compatibilidade com o que já está salvo).
 */

export type BrandColorKit = {
  primary: string;
  primary2: string;
  secondary: string;
  secondary2: string;
  useSecondary: boolean;
  /** Cores adicionais da categoria principal (além das duas fixas). */
  extraPrimary: string[];
  /** Cores adicionais da categoria secundária (além das duas fixas). */
  extraSecondary: string[];
  /** Chave da tipografia da marca (ver `brandFonts.ts`). */
  font: string;
};

export const MAX_EXTRA_COLORS = 8;

export const DEFAULT_COLOR_KIT: BrandColorKit = {
  primary: "#0F766E",
  primary2: "#FFFFFF",
  secondary: "#0B3B36",
  secondary2: "#E7F5F1",
  useSecondary: false,
  extraPrimary: [],
  extraSecondary: [],
  font: "default",
};

const isHex = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());

const hex = (value: unknown, fallback: string) => (isHex(value) ? value.trim() : fallback);

/** Lê `primary3`, `primary4`, ... na ordem, parando no primeiro furo grande. */
const readExtras = (colors: Record<string, string> | null | undefined, prefix: "primary" | "secondary") => {
  const out: string[] = [];
  for (let i = 3; i < 3 + MAX_EXTRA_COLORS; i += 1) {
    const value = colors?.[`${prefix}${i}`];
    if (isHex(value)) out.push(value.trim());
  }
  return out;
};

export const readColorKit = (colors?: Record<string, string> | null): BrandColorKit => ({
  primary: hex(colors?.primary, DEFAULT_COLOR_KIT.primary),
  primary2: hex(colors?.primary2, DEFAULT_COLOR_KIT.primary2),
  secondary: hex(colors?.secondary, DEFAULT_COLOR_KIT.secondary),
  secondary2: hex(colors?.secondary2, DEFAULT_COLOR_KIT.secondary2),
  // Tolera o flag salvo como booleano (jsonb) ou como string.
  useSecondary: String(colors?.useSecondary ?? "") === "true",
  extraPrimary: readExtras(colors, "primary"),
  extraSecondary: readExtras(colors, "secondary"),
  font: typeof colors?.font === "string" && colors.font.trim() ? colors.font.trim() : "default",
});

export const writeColorKit = (kit: BrandColorKit): Record<string, string> => {
  const out: Record<string, string> = {
    primary: kit.primary,
    primary2: kit.primary2,
    secondary: kit.secondary,
    secondary2: kit.secondary2,
    useSecondary: kit.useSecondary ? "true" : "false",
    font: kit.font || "default",
  };
  kit.extraPrimary.filter(isHex).slice(0, MAX_EXTRA_COLORS).forEach((color, i) => {
    out[`primary${i + 3}`] = color;
  });
  kit.extraSecondary.filter(isHex).slice(0, MAX_EXTRA_COLORS).forEach((color, i) => {
    out[`secondary${i + 3}`] = color;
  });
  return out;
};

/** Paleta completa da marca, na ordem em que o motor criativo pode usar. */
export const paletteOf = (kit: BrandColorKit): string[] => [
  kit.primary,
  kit.primary2,
  ...kit.extraPrimary,
  ...(kit.useSecondary ? [kit.secondary, kit.secondary2, ...kit.extraSecondary] : []),
];
