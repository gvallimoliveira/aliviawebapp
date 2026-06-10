// Shared constants for the Clinical Agent niches
export const AGENT_NICHES: { slug: string; label: string }[] = [
  { slug: "tendinopatias_geral", label: "Tendinopatias (geral)" },
  { slug: "tendinopatia_patelar", label: "Tendinopatia patelar" },
  { slug: "tendinopatia_manguito_rotador_epicondilopatia", label: "Manguito rotador + epicondilopatias" },
  { slug: "carga_aguda_cronica", label: "Carga aguda × crônica (ACWR)" },
  { slug: "tendinopatia_aquiles_fascite_plantar", label: "Aquiles + fascite plantar" },
  { slug: "fotobiomodulacao_musculoesqueletico", label: "Fotobiomodulação (LLLT/PBM)" },
  { slug: "diatermia_tecarterapia_musculoesqueletico", label: "Diatermia / Tecarterapia" },
  { slug: "eletroestimulacao_tens_musculoesqueletico", label: "Eletroestimulação / TENS" },
  { slug: "conflito_subacromial_testes_ombro", label: "Conflito subacromial + testes de ombro" },
  { slug: "radiculopatia_lombar_cervical", label: "Radiculopatias lombar/cervical" },
];

export const AGENT_NICHE_LABEL: Record<string, string> = Object.fromEntries(
  AGENT_NICHES.map((n) => [n.slug, n.label]),
);
