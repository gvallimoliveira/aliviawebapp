// Termos de busca canônicos para cada nicho do Agente.
// Usados para montar queries PubMed/Crossref/PEDro reprodutíveis,
// em vez de depender da memória do LLM.

export interface NicheSearchTerms {
  /** Termos MeSH oficiais — usados como `<termo>[MeSH]`. */
  mesh?: string[];
  /** Palavras/frases livres em EN — usadas como `"<termo>"[tiab]`. Aceitam pt quando relevante. */
  keywords: string[];
}

export const NICHE_SEARCH_TERMS: Record<string, NicheSearchTerms> = {
  // Núcleo original
  tendinopatias_geral: {
    mesh: ["Tendinopathy"],
    keywords: ["tendinopathy", "tendinitis", "tendinosis", "heavy slow resistance"],
  },
  tendinopatia_patelar: {
    keywords: ["patellar tendinopathy", "jumper's knee", "patellar tendinitis", "VISA-P"],
  },
  tendinopatia_manguito_rotador_epicondilopatia: {
    keywords: [
      "rotator cuff tendinopathy",
      "rotator cuff tendinitis",
      "lateral epicondylitis",
      "medial epicondylitis",
      "tennis elbow",
      "golfer's elbow",
    ],
  },
  carga_aguda_cronica: {
    keywords: ["acute chronic workload ratio", "training load", "workload monitoring", "injury prevention load"],
  },
  tendinopatia_aquiles_fascite_plantar: {
    keywords: [
      "achilles tendinopathy",
      "achilles tendinitis",
      "insertional achilles",
      "midportion achilles",
      "plantar fasciitis",
      "plantar fasciopathy",
      "plantar heel pain",
    ],
  },
  fotobiomodulacao_musculoesqueletico: {
    mesh: ["Low-Level Light Therapy"],
    keywords: ["photobiomodulation", "low level laser therapy", "LLLT", "low-level light therapy"],
  },
  diatermia_tecarterapia_musculoesqueletico: {
    keywords: ["tecar therapy", "diathermy", "capacitive resistive", "CRet", "radiofrequency physiotherapy"],
  },
  eletroestimulacao_tens_musculoesqueletico: {
    mesh: ["Transcutaneous Electric Nerve Stimulation"],
    keywords: ["TENS", "neuromuscular electrical stimulation", "NMES", "electroanalgesia"],
  },
  conflito_subacromial_testes_ombro: {
    mesh: ["Shoulder Impingement Syndrome"],
    keywords: [
      "subacromial impingement",
      "shoulder impingement",
      "Hawkins-Kennedy",
      "Neer test",
      "Jobe test",
      "shoulder orthopedic tests accuracy",
    ],
  },
  radiculopatia_lombar_cervical: {
    mesh: ["Radiculopathy"],
    keywords: ["lumbar radiculopathy", "cervical radiculopathy", "sciatica", "McKenzie method"],
  },

  // Ombro / cintura escapular
  capsulite_adesiva_ombro_congelado: {
    mesh: ["Bursitis"],
    keywords: [
      "adhesive capsulitis",
      "frozen shoulder",
      "shoulder stiffness",
      "hydrodilatation shoulder",
      "intra-articular corticosteroid shoulder",
    ],
  },
  exercicios_pendulares_codman_revisao: {
    keywords: ["Codman exercises", "pendulum exercises shoulder", "shoulder pendular"],
  },
  instabilidade_glenoumeral_pos_luxacao: {
    keywords: [
      "glenohumeral instability",
      "anterior shoulder dislocation rehabilitation",
      "shoulder instability rehabilitation",
      "return to sport shoulder",
    ],
  },
  pos_artroscopia_manguito_rotador: {
    keywords: [
      "rotator cuff repair rehabilitation",
      "post arthroscopic rotator cuff",
      "rotator cuff postoperative",
      "early mobilization rotator cuff",
    ],
  },

  // Coluna
  lombalgia_cronica_inespecifica: {
    mesh: ["Low Back Pain"],
    keywords: ["chronic low back pain", "non-specific low back pain", "motor control exercise", "Pilates low back"],
  },
  cervicalgia_mecanica_cefaleia_cervicogenica: {
    mesh: ["Neck Pain", "Post-Traumatic Headache"],
    keywords: ["mechanical neck pain", "cervicogenic headache", "deep neck flexor", "Mulligan mobilization"],
  },
  estenose_lombar_degenerativa: {
    mesh: ["Spinal Stenosis"],
    keywords: ["lumbar spinal stenosis", "neurogenic claudication", "conservative lumbar stenosis"],
  },
  espondilolistese_atletas_jovens: {
    mesh: ["Spondylolisthesis"],
    keywords: ["spondylolisthesis athletes", "spondylolysis rehabilitation", "young athletes low back pain"],
  },

  // Quadril / joelho
  sindrome_dolorosa_femoropatelar: {
    mesh: ["Patellofemoral Pain Syndrome"],
    keywords: ["patellofemoral pain", "anterior knee pain", "hip strengthening patellofemoral"],
  },
  osteoartrite_joelho_quadril_glad: {
    mesh: ["Osteoarthritis, Knee", "Osteoarthritis, Hip"],
    keywords: ["knee osteoarthritis exercise", "hip osteoarthritis exercise", "GLA:D program"],
  },
  lca_pre_pos_reconstrucao_retorno_esporte: {
    mesh: ["Anterior Cruciate Ligament Reconstruction"],
    keywords: ["ACL reconstruction rehabilitation", "ACL return to sport", "anterior cruciate ligament rehabilitation"],
  },
  lesoes_meniscais_conservador_vs_cirurgico: {
    mesh: ["Tibial Meniscus Injuries"],
    keywords: ["meniscal tear conservative", "meniscectomy versus exercise", "degenerative meniscal lesion"],
  },
  trato_iliotibial_dor_trocanterica_gtps: {
    keywords: [
      "iliotibial band syndrome",
      "greater trochanteric pain syndrome",
      "GTPS",
      "gluteal tendinopathy",
    ],
  },

  // Pé / tornozelo
  entorse_tornozelo_instabilidade_cronica: {
    mesh: ["Ankle Injuries"],
    keywords: ["lateral ankle sprain", "chronic ankle instability", "ankle proprioception", "balance training ankle"],
  },
  disfuncao_tibial_posterior_pe_plano: {
    keywords: ["posterior tibial tendon dysfunction", "adult acquired flatfoot", "tibialis posterior tendinopathy"],
  },

  // Mão / punho / cotovelo
  sindrome_tunel_carpo: {
    mesh: ["Carpal Tunnel Syndrome"],
    keywords: ["carpal tunnel syndrome conservative", "neural gliding carpal tunnel", "wrist splint carpal tunnel"],
  },
  pos_fratura_radio_distal: {
    keywords: ["distal radius fracture rehabilitation", "Colles fracture rehabilitation", "wrist fracture physiotherapy"],
  },

  // Cabeça / face
  dtm_disfuncao_temporomandibular: {
    mesh: ["Temporomandibular Joint Disorders"],
    keywords: ["temporomandibular disorder", "TMD physiotherapy", "TMJ manual therapy", "dry needling TMD"],
  },

  // Transversais / adjuvantes
  ondas_de_choque_eswt_tendinopatias: {
    keywords: ["extracorporeal shockwave therapy", "ESWT tendinopathy", "shockwave plantar fasciitis", "radial shockwave"],
  },
  dry_needling_vs_terapia_manual: {
    keywords: ["dry needling", "dry needling manual therapy", "trigger point dry needling"],
  },
  blood_flow_restriction_bfr: {
    keywords: ["blood flow restriction training", "BFR training", "occlusion training rehabilitation"],
  },
  educacao_neurociencia_da_dor_pne: {
    keywords: ["pain neuroscience education", "explain pain", "therapeutic neuroscience education"],
  },
  exercicio_climaterio_pos_menopausa_msk: {
    keywords: [
      "exercise menopause musculoskeletal pain",
      "postmenopausal exercise",
      "menopause resistance training",
    ],
  },
  lesoes_musculares_retorno_ao_esporte: {
    keywords: ["hamstring strain rehabilitation", "muscle strain return to sport", "muscle injury rehabilitation"],
  },
  bursite_trocanterica_tendinopatia_glutea: {
    keywords: ["trochanteric bursitis", "gluteal tendinopathy", "greater trochanteric pain syndrome exercise"],
  },
  epicondilopatias_isometricos_fisiologia: {
    keywords: [
      "lateral epicondylitis isometric",
      "tennis elbow exercise",
      "isometric exercise tendinopathy",
      "exercise induced analgesia tendon",
    ],
  },
};

/**
 * Constrói uma query PubMed para um conjunto de termos.
 * Aplica filtros de tipo de estudo (RCT/SR/MA), janela temporal e idiomas.
 */
export function buildPubmedQuery(opts: {
  terms: NicheSearchTerms;
  yearsBack?: number;
  studyTypes?: boolean;
}): string {
  const yearsBack = opts.yearsBack ?? 15;
  const minYear = new Date().getFullYear() - yearsBack;

  const tiab = (opts.terms.keywords || []).map((k) => `"${k}"[tiab]`);
  const mesh = (opts.terms.mesh || []).map((m) => `"${m}"[MeSH Terms]`);
  const themeClause = [...tiab, ...mesh].join(" OR ");
  if (!themeClause) return "";

  const studyClause = opts.studyTypes === false
    ? ""
    : `("Randomized Controlled Trial"[Publication Type] OR "Systematic Review"[Publication Type] OR "Meta-Analysis"[Publication Type] OR "Clinical Trial"[Publication Type])`;
  const dateClause = `("${minYear}"[Date - Publication] : "3000"[Date - Publication])`;
  const langClause = `(English[lang] OR Portuguese[lang] OR Spanish[lang])`;

  const parts = [
    `(${themeClause})`,
    studyClause,
    dateClause,
    langClause,
  ].filter(Boolean);

  return parts.join(" AND ");
}

/**
 * Gera termos de busca para um nicho. Se não houver entrada no mapa,
 * deriva keywords simples da descrição do nicho (fallback).
 */
export function getNicheSearchTerms(slug: string, fallbackDescription?: string | null): NicheSearchTerms {
  if (NICHE_SEARCH_TERMS[slug]) return NICHE_SEARCH_TERMS[slug];
  const desc = (fallbackDescription || slug.replace(/_/g, " ")).toLowerCase();
  // pega frases relevantes separadas por vírgula/hífen/—
  const tokens = desc.split(/[—,\-:;()]/).map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 4);
  return { keywords: tokens.length ? tokens : [slug.replace(/_/g, " ")] };
}
