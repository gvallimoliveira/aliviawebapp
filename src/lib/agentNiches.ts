// Shared constants for the Clinical Agent niches
export const AGENT_NICHES: { slug: string; label: string }[] = [
  // Núcleo original
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

  // Ombro / cintura escapular
  { slug: "capsulite_adesiva_ombro_congelado", label: "Capsulite adesiva (ombro congelado)" },
  { slug: "exercicios_pendulares_codman_revisao", label: "Pendulares de Codman — revisão de evidência" },
  { slug: "instabilidade_glenoumeral_pos_luxacao", label: "Instabilidade glenoumeral / pós-luxação" },
  { slug: "pos_artroscopia_manguito_rotador", label: "Pós-artroscopia de manguito rotador" },

  // Coluna
  { slug: "lombalgia_cronica_inespecifica", label: "Lombalgia crônica inespecífica" },
  { slug: "cervicalgia_mecanica_cefaleia_cervicogenica", label: "Cervicalgia mecânica + cefaleia cervicogênica" },
  { slug: "estenose_lombar_degenerativa", label: "Estenose lombar degenerativa" },
  { slug: "espondilolistese_atletas_jovens", label: "Espondilolistese e dor lombar em atletas jovens" },

  // Quadril / joelho
  { slug: "sindrome_dolorosa_femoropatelar", label: "Síndrome dolorosa femoropatelar (SDFP)" },
  { slug: "osteoartrite_joelho_quadril_glad", label: "Osteoartrite de joelho/quadril (GLA:D)" },
  { slug: "lca_pre_pos_reconstrucao_retorno_esporte", label: "LCA — pré/pós-reconstrução + retorno ao esporte" },
  { slug: "lesoes_meniscais_conservador_vs_cirurgico", label: "Lesões meniscais (conservador vs. cirúrgico)" },
  { slug: "trato_iliotibial_dor_trocanterica_gtps", label: "Trato iliotibial / dor trocantérica (GTPS)" },

  // Pé / tornozelo
  { slug: "entorse_tornozelo_instabilidade_cronica", label: "Entorse de tornozelo + instabilidade crônica" },
  { slug: "disfuncao_tibial_posterior_pe_plano", label: "Disfunção do tibial posterior / pé plano adquirido" },

  // Mão / punho / cotovelo
  { slug: "sindrome_tunel_carpo", label: "Síndrome do túnel do carpo" },
  { slug: "pos_fratura_radio_distal", label: "Pós-fratura de rádio distal" },

  // Cabeça / face
  { slug: "dtm_disfuncao_temporomandibular", label: "DTM (disfunção temporomandibular)" },

  // Transversais / adjuvantes
  { slug: "ondas_de_choque_eswt_tendinopatias", label: "Ondas de choque (ESWT) em tendinopatias" },
  { slug: "dry_needling_vs_terapia_manual", label: "Dry needling vs. terapia manual" },
  { slug: "blood_flow_restriction_bfr", label: "Blood Flow Restriction (BFR)" },
  { slug: "educacao_neurociencia_da_dor_pne", label: "Educação em neurociência da dor (PNE)" },
  { slug: "exercicio_climaterio_pos_menopausa_msk", label: "Exercício no climatério/pós-menopausa (MSK)" },
  { slug: "lesoes_musculares_retorno_ao_esporte", label: "Lesões musculares — retorno ao esporte" },
  { slug: "bursite_trocanterica_tendinopatia_glutea", label: "Bursite trocantérica / tendinopatia glútea" },

  // Cotovelo — epicondilopatias + isométricos
  { slug: "epicondilopatias_isometricos_fisiologia", label: "Epicondilopatias (tennis + golfer's elbow) × isométricos & fisiologia" },
];

export const AGENT_NICHE_LABEL: Record<string, string> = Object.fromEntries(
  AGENT_NICHES.map((n) => [n.slug, n.label]),
);
