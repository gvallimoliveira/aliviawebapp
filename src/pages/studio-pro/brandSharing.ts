/**
 * COMPARTILHAMENTO DE MARCA NO STUDIO
 *
 * Uma marca pode ser acessada por mais de uma conta: quem criou convida por
 * e-mail e o convidado trabalha dentro da marca (gerar, editar, baixar, fotos,
 * textos). Regras que valem para qualquer marca:
 *
 * - Marca recebida não consome o limite de marcas do plano do convidado.
 * - Só o criador convida, remove acesso e exclui a marca.
 */

export type BrandOwnership = { id: string; user_id?: string | null };

/** Normaliza o e-mail do convite (minúsculas, sem espaços). Inválido → null. */
export const normalizeInviteEmail = (raw: string): string | null => {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
};

/** A marca foi criada por esta conta? */
export const isOwnBrand = (brand: BrandOwnership | null | undefined, userId?: string | null): boolean =>
  !!brand && !!userId && brand.user_id === userId;

/** Marca recebida de outra conta (só aparece por compartilhamento). */
export const isSharedBrand = (brand: BrandOwnership | null | undefined, userId?: string | null): boolean =>
  !!brand && !isOwnBrand(brand, userId);

/** Limite do plano conta apenas as marcas próprias. */
export const countOwnBrands = (brands: BrandOwnership[], userId?: string | null): number =>
  brands.filter((b) => isOwnBrand(b, userId)).length;
