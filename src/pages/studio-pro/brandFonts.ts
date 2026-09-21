/**
 * TIPOGRAFIA DA MARCA (Studio público)
 *
 * O kit de marca guarda uma fonte (chave curta) e o editor aplica a família
 * inteira nas artes — assim o material do cliente sai com a tipografia dele,
 * não com a fonte padrão do app. A lista é curada (Google Fonts) para garantir
 * que a fonte carregue no navegador e apareça no PNG exportado.
 */

export type StudioFont = {
  key: string;
  label: string;
  /** Família CSS completa, com fallbacks. */
  stack: string;
  /** Parâmetro `family` do Google Fonts (vazio = fonte do sistema/app). */
  google?: string;
  /** Sinônimos usados para casar o que a IA leu do manual da marca. */
  aliases?: string[];
};

export const STUDIO_FONTS: StudioFont[] = [
  { key: "default", label: "Padrão do Studio", stack: "" },
  { key: "outfit", label: "Outfit", stack: "'Outfit', system-ui, sans-serif", google: "Outfit:wght@400;500;600;700;800;900" },
  { key: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800;900" },

  { key: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800;900" },
  { key: "montserrat", label: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700;800;900" },
  { key: "dm-sans", label: "DM Sans", stack: "'DM Sans', system-ui, sans-serif", google: "DM+Sans:wght@400;500;700;900", aliases: ["dm sans"] },
  { key: "work-sans", label: "Work Sans", stack: "'Work Sans', system-ui, sans-serif", google: "Work+Sans:wght@400;500;600;700;800", aliases: ["work sans"] },
  { key: "manrope", label: "Manrope", stack: "'Manrope', system-ui, sans-serif", google: "Manrope:wght@400;500;600;700;800" },
  { key: "space-grotesk", label: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700", aliases: ["space grotesk", "grotesk"] },
  { key: "jakarta", label: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans', system-ui, sans-serif", google: "Plus+Jakarta+Sans:wght@400;500;600;700;800", aliases: ["plus jakarta sans", "jakarta sans"] },
  { key: "sora", label: "Sora", stack: "'Sora', system-ui, sans-serif", google: "Sora:wght@400;500;600;700;800" },
  { key: "raleway", label: "Raleway", stack: "'Raleway', system-ui, sans-serif", google: "Raleway:wght@400;500;600;700;800;900" },
  { key: "nunito", label: "Nunito", stack: "'Nunito', system-ui, sans-serif", google: "Nunito:wght@400;500;600;700;800;900", aliases: ["nunito sans"] },
  { key: "archivo", label: "Archivo", stack: "'Archivo', system-ui, sans-serif", google: "Archivo:wght@400;500;600;700;800;900" },
  { key: "oswald", label: "Oswald (condensada)", stack: "'Oswald', system-ui, sans-serif", google: "Oswald:wght@400;500;600;700" },
  { key: "bebas", label: "Bebas Neue (títulos)", stack: "'Bebas Neue', system-ui, sans-serif", google: "Bebas+Neue", aliases: ["bebas neue", "bebas"] },
  { key: "playfair", label: "Playfair Display (serifada)", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;500;600;700;800;900", aliases: ["playfair display", "playfair"] },
  { key: "figtree", label: "Figtree", stack: "'Figtree', system-ui, sans-serif", google: "Figtree:wght@400;500;600;700;800;900" },
  { key: "urbanist", label: "Urbanist", stack: "'Urbanist', system-ui, sans-serif", google: "Urbanist:wght@400;500;600;700;800;900" },
  { key: "rubik", label: "Rubik", stack: "'Rubik', system-ui, sans-serif", google: "Rubik:wght@400;500;600;700;800;900" },
  { key: "barlow", label: "Barlow", stack: "'Barlow', system-ui, sans-serif", google: "Barlow:wght@400;500;600;700;800;900" },
  { key: "karla", label: "Karla", stack: "'Karla', system-ui, sans-serif", google: "Karla:wght@400;500;600;700;800" },
  { key: "lora", label: "Lora (serifada)", stack: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700" },
  { key: "merriweather", label: "Merriweather (serifada)", stack: "'Merriweather', Georgia, serif", google: "Merriweather:wght@400;700;900" },
];

export const findFont = (key?: string | null): StudioFont =>
  STUDIO_FONTS.find((f) => f.key === (key ?? "default")) ?? STUDIO_FONTS[0];

const norm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Casa o nome de fonte lido do manual da marca (PDF/site) com a lista curada.
 * "Montserrat Bold", "família: DM Sans" etc. resolvem certo; sem match, mantém
 * o padrão em vez de arriscar uma fonte que não carrega.
 */
export const matchFontKey = (raw?: string | null): string | null => {
  const value = norm(String(raw ?? ""));
  if (!value) return null;
  for (const font of STUDIO_FONTS) {
    if (font.key === "default") continue;
    const names = [norm(font.label.replace(/\(.+\)/, "")), norm(font.key.replace(/-/g, " ")), ...(font.aliases ?? []).map(norm)];
    if (names.some((name) => name && value.includes(name))) return font.key;
  }
  return null;
};

/** Injeta (uma vez) o link do Google Fonts da fonte escolhida. */
export const ensureFontLoaded = (key?: string | null) => {
  const font = findFont(key);
  if (typeof document === "undefined") return;
  /** Serifadas de destaque sempre ganham uma sans de leitura no mesmo tema. */
  if (font.stack.includes("serif")) ensureFontLoaded("inter");
  if (!font.google) return;
  const id = `studio-font-${font.key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
};
