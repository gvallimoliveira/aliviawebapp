/**
 * KIT DE CORES DA MARCA (Studio público)
 *
 * Toda marca tem DUAS cores principais (ex.: Aliv.iA usa verde + branco) e,
 * opcionalmente, DUAS secundárias. Marcas que não têm secundárias desativam o
 * par e o estúdio trabalha só com as principais.
 *
 * A coluna `studio_brands.colors` é um mapa de strings, então o flag booleano
 * é persistido como "true"/"false".
 */

export type BrandColorKit = {
  primary: string;
  primary2: string;
  secondary: string;
  secondary2: string;
  useSecondary: boolean;
  /** Chave da tipografia da marca (ver `brandFonts.ts`). */
  font: string;
};

export const DEFAULT_COLOR_KIT: BrandColorKit = {
  primary: "#0F766E",
  primary2: "#FFFFFF",
  secondary: "#0B3B36",
  secondary2: "#E7F5F1",
  useSecondary: false,
  font: "default",
};

const hex = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;

export const readColorKit = (colors?: Record<string, string> | null): BrandColorKit => ({
  primary: hex(colors?.primary, DEFAULT_COLOR_KIT.primary),
  primary2: hex(colors?.primary2, DEFAULT_COLOR_KIT.primary2),
  secondary: hex(colors?.secondary, DEFAULT_COLOR_KIT.secondary),
  secondary2: hex(colors?.secondary2, DEFAULT_COLOR_KIT.secondary2),
  useSecondary: colors?.useSecondary === "true",
  font: typeof colors?.font === "string" && colors.font.trim() ? colors.font.trim() : "default",
});

export const writeColorKit = (kit: BrandColorKit): Record<string, string> => ({
  primary: kit.primary,
  primary2: kit.primary2,
  secondary: kit.secondary,
  secondary2: kit.secondary2,
  useSecondary: kit.useSecondary ? "true" : "false",
  font: kit.font || "default",
});

