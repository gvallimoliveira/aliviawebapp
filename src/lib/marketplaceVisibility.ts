/**
 * Situação de um profissional na vitrine (busca de profissionais).
 * Espelha as condições da função de banco `search_marketplace_professionals`;
 * ao mudar uma, mude a outra.
 */
export type MarketplaceStatus = "visible" | "hidden" | "ineligible";

export interface MarketplaceProfessional {
  active?: boolean | null;
  approved?: boolean | null;
  marketplace_hidden?: boolean | null;
  active_profile_mode?: string | null;
  subscription_status?: string | null;
  subscription_stripe_id?: string | null;
  pro_access_expires_at?: string | null;
  subscription_grace_until?: string | null;
  is_partner?: boolean | null;
}

const future = (v: string | null | undefined, now: number) =>
  !!v && new Date(v).getTime() > now;

/** Atende às regras da vitrine, ignorando a ocultação feita pelo admin. */
export const isMarketplaceEligible = (p: MarketplaceProfessional, now = Date.now()): boolean =>
  p.active === true &&
  p.approved === true &&
  p.active_profile_mode === "professional" &&
  ((p.subscription_status === "active" && !!p.subscription_stripe_id) ||
    future(p.pro_access_expires_at, now) ||
    future(p.subscription_grace_until, now) ||
    p.is_partner === true);

export const marketplaceStatus = (p: MarketplaceProfessional, now = Date.now()): MarketplaceStatus => {
  if (p.marketplace_hidden === true) return "hidden";
  return isMarketplaceEligible(p, now) ? "visible" : "ineligible";
};
