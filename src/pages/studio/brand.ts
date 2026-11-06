import logoAlivia from "@/assets/logo-alivia.png";
import physiotechIcon from "@/assets/physiotech-icon.png";

/** Official asset mirrors: external sites can display an image yet deny export fetches (CORS). */
export const resolveStudioBrandAsset = (source: string): string => {
  try {
    const url = new URL(source);
    if (url.origin === "https://physiotechapp.lovable.app" && url.pathname === "/apple-touch-icon.png") {
      return physiotechIcon;
    }
  } catch {
    // Relative and data URLs already belong to the application's asset flow.
  }
  return source;
};

/**
 * MÓDULO ÚNICO DE MARCA DO STUDIO
 *
 * Todo lockup (logo, nome, slogan) passa por aqui — nenhum bloco importa o
 * asset diretamente. No Studio interno os valores são fixos (Aliv.iA). No
 * Studio público, `applyStudioBrandTheme` troca o tema em runtime antes de
 * renderizar as artes de uma marca do cliente: como os blocos importam estes
 * bindings (live bindings de ES module), a troca aparece na próxima renderização.
 */

export const ALIVIA_LOGO = logoAlivia;
export const ALIVIA_NAME = "Aliv.iA";
export const ALIVIA_HANDLE = "@aliviafisioapp";
export const ALIVIA_SITE = "aliviawebapp.com.br";

export const ALIVIA_SLOGAN = "Sistema de raciocínio clínico com alma de fisioterapeuta.";

export let BRAND_LOGO: string = ALIVIA_LOGO;
/**
 * Símbolo da marca (só o ícone, sem wordmark) usado como PADRÃO DE FUNDO
 * repetido — a mão da Aliv.iA, o raio do PerformaPro, etc. Sem símbolo próprio,
 * cai no logo; sem logo, o padrão simplesmente não aparece.
 */
export let BRAND_MARK: string = ALIVIA_LOGO;
export let BRAND_NAME: string = ALIVIA_NAME;
export let BRAND_SLOGAN: string = ALIVIA_SLOGAN;
/** Perfil social e site da marca — usados pelos blocos de mockup/palco. */
export let BRAND_HANDLE: string = ALIVIA_HANDLE;
export let BRAND_SITE: string = ALIVIA_SITE;

export type StudioBrandTheme = {
  name: string;
  slogan: string;
  /** Sem logo o lockup usa apenas o wordmark. */
  logo?: string | null;
  /** Símbolo isolado da marca para o padrão de fundo; sem ele, usa o logo. */
  mark?: string | null;
  /** Perfil social (ex.: @marca) e site — opcionais. */
  handle?: string | null;
  site?: string | null;
};

/** Nome neutro de fallback: nenhuma conta de cliente pode herdar a marca dona. */
export const NEUTRAL_NAME = "Sua marca";

/**
 * Wordmark em duas partes para os lockups tipográficos: nomes com ponto
 * ("Aliv.iA") mantêm o sufixo na cor de destaque; nomes simples ("PerformaPro")
 * saem inteiros, sem quebra artificial.
 */
export const brandWordmarkParts = (): [string, string] => {
  const dot = BRAND_NAME.indexOf(".");
  if (dot > 0 && dot < BRAND_NAME.length - 1) {
    return [BRAND_NAME.slice(0, dot + 1), BRAND_NAME.slice(dot + 1)];
  }
  return [BRAND_NAME, ""];
};

/** Placeholder transparente: marca sem logo mantém o layout do lockup intacto. */
const BLANK_LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Troca a marca das artes (Studio público, multimarca). */
export const applyStudioBrandTheme = (theme: StudioBrandTheme) => {
  BRAND_NAME = theme.name || NEUTRAL_NAME;
  BRAND_SLOGAN = theme.slogan || "";
  BRAND_LOGO = resolveStudioBrandAsset(theme.logo || BLANK_LOGO);
  BRAND_MARK = resolveStudioBrandAsset(theme.mark || theme.logo || "");
  BRAND_HANDLE = theme.handle?.trim()
    ? (theme.handle.trim().startsWith("@") ? theme.handle.trim() : `@${theme.handle.trim()}`)
    : theme.name || NEUTRAL_NAME;
  BRAND_SITE = (theme.site || "").replace(/^https?:\/\//, "").replace(/\/$/, "") || theme.name || NEUTRAL_NAME;
};

/** Volta para a marca Aliv.iA (Studio interno). */
export const resetStudioBrandTheme = () => {
  BRAND_NAME = ALIVIA_NAME;
  BRAND_SLOGAN = ALIVIA_SLOGAN;
  BRAND_LOGO = ALIVIA_LOGO;
  BRAND_MARK = ALIVIA_LOGO;
  BRAND_HANDLE = ALIVIA_HANDLE;
  BRAND_SITE = ALIVIA_SITE;
};
