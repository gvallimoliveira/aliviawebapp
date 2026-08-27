import logoAlivia from "@/assets/logo-alivia.png";

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
export const ALIVIA_SLOGAN = "Sistema de raciocínio clínico com alma de fisioterapeuta.";

export let BRAND_LOGO: string = ALIVIA_LOGO;
export let BRAND_NAME: string = ALIVIA_NAME;
export let BRAND_SLOGAN: string = ALIVIA_SLOGAN;

export type StudioBrandTheme = {
  name: string;
  slogan: string;
  /** Sem logo o lockup usa apenas o wordmark. */
  logo?: string | null;
};

/** Troca a marca das artes (Studio público, multimarca). */
export const applyStudioBrandTheme = (theme: StudioBrandTheme) => {
  BRAND_NAME = theme.name || ALIVIA_NAME;
  BRAND_SLOGAN = theme.slogan || "";
  BRAND_LOGO = theme.logo || "";
};

/** Volta para a marca Aliv.iA (Studio interno). */
export const resetStudioBrandTheme = () => {
  BRAND_NAME = ALIVIA_NAME;
  BRAND_SLOGAN = ALIVIA_SLOGAN;
  BRAND_LOGO = ALIVIA_LOGO;
};
