import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isPriorityJournal, journalImpactFactor, priorityJournalListForPrompt } from "../_shared/priority-journals.ts";
import { buildPubmedQuery, getNicheSearchTerms, type NicheSearchTerms } from "../_shared/niche-search-terms.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { logAiTokenUsage } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NICHE_DESCRIPTIONS: Record<string, string> = {
  // Núcleo original
  tendinopatias_geral: "Tendinopatias em geral — fisiopatologia, exercício terapêutico, HSR/HIMA, carga.",
  tendinopatia_patelar: "Tendinopatia patelar (jumper's knee) — diagnóstico, VISA-P, HSR, exercício isométrico/excêntrico.",
  tendinopatia_manguito_rotador_epicondilopatia: "Tendinopatia do manguito rotador e epicondilopatias laterais/mediais — exercício, carga progressiva, testes clínicos.",
  carga_aguda_cronica: "Razão carga aguda × carga crônica (ACWR), monitoramento de carga, prevenção de lesão.",
  tendinopatia_aquiles_fascite_plantar: "Tendinopatia de Aquiles (insercional/midportion) e fascite plantar — exercício excêntrico, HSR, ondas de choque.",
  fotobiomodulacao_musculoesqueletico: "Fotobiomodulação (LLLT/PBM) em condições musculoesqueléticas — dose, comprimento de onda, evidências.",
  diatermia_tecarterapia_musculoesqueletico: "Diatermia / tecarterapia (CRet/CRMW) — efeitos, parâmetros, evidência clínica.",
  eletroestimulacao_tens_musculoesqueletico: "TENS, NMES, eletroanalgesia em dor musculoesquelética — parâmetros, evidências, indicações.",
  conflito_subacromial_testes_ombro: "Síndrome do impacto / conflito subacromial — cluster de testes ortopédicos (Hawkins, Neer, Jobe, Lift-off etc.), acurácia, testes funcionais.",
  radiculopatia_lombar_cervical: "Radiculopatias lombar e cervical — exame clínico, McKenzie, tração, exercício, manejo conservador.",

  // Ombro / cintura escapular
  capsulite_adesiva_ombro_congelado: "Capsulite adesiva (ombro congelado) — estágios, mobilização, hidrodilatação, exercícios ativos vs. passivos, corticoide intra-articular.",
  exercicios_pendulares_codman_revisao: "Exercícios pendulares de Codman — evidência atual de eficácia, comparações com mobilização ativa/HSR/exercícios escapulares e questionamento de relevância clínica contemporânea.",
  instabilidade_glenoumeral_pos_luxacao: "Instabilidade glenoumeral anterior/posterior e reabilitação pós-luxação — protocolos conservadores vs. cirúrgicos, retorno ao esporte.",
  pos_artroscopia_manguito_rotador: "Reabilitação pós-artroscopia de manguito rotador — fases, timing de carga, mobilização precoce vs. tardia.",

  // Coluna
  lombalgia_cronica_inespecifica: "Lombalgia crônica inespecífica — McKenzie, exercícios de controle motor, Pilates clínico, terapia cognitivo-funcional.",
  cervicalgia_mecanica_cefaleia_cervicogenica: "Cervicalgia mecânica e cefaleia cervicogênica — DNF, mobilização Mulligan, terapia manual, exercício.",
  estenose_lombar_degenerativa: "Estenose lombar degenerativa — tratamento conservador, exercício em flexão, marcha, programas multimodais.",
  espondilolistese_atletas_jovens: "Espondilolistese ístmica/degenerativa e dor lombar em atletas jovens — estabilização, retorno ao esporte.",

  // Quadril / joelho
  sindrome_dolorosa_femoropatelar: "Síndrome dolorosa femoropatelar (SDFP) — fortalecimento de quadril vs. quadríceps, exercício, taping, palmilhas.",
  osteoartrite_joelho_quadril_glad: "Osteoartrite de joelho e quadril — exercício terapêutico, programa GLA:D, educação, controle de peso.",
  lca_pre_pos_reconstrucao_retorno_esporte: "Lesão do LCA — reabilitação pré e pós-reconstrução, critérios de retorno ao esporte, prevenção de re-lesão.",
  lesoes_meniscais_conservador_vs_cirurgico: "Lesões meniscais degenerativas e traumáticas — tratamento conservador vs. meniscectomia/reparo.",
  trato_iliotibial_dor_trocanterica_gtps: "Síndrome do trato iliotibial e síndrome dolorosa do trocânter maior (GTPS) — exercício, carga, terapia manual.",

  // Pé / tornozelo
  entorse_tornozelo_instabilidade_cronica: "Entorse lateral de tornozelo e instabilidade crônica — propriocepção, controle neuromuscular, balance training.",
  disfuncao_tibial_posterior_pe_plano: "Disfunção do tendão tibial posterior e pé plano adquirido do adulto — exercício excêntrico, órteses.",

  // Mão / punho / cotovelo
  sindrome_tunel_carpo: "Síndrome do túnel do carpo — tratamento conservador (deslizamento neural, splinting) vs. cirúrgico.",
  pos_fratura_radio_distal: "Reabilitação pós-fratura de rádio distal — mobilização precoce, ganho de ADM, força preensão.",

  // Cabeça / face
  dtm_disfuncao_temporomandibular: "Disfunção temporomandibular (DTM) — terapia manual, exercícios, educação, dry needling.",

  // Transversais / adjuvantes
  ondas_de_choque_eswt_tendinopatias: "Terapia por ondas de choque extracorpóreas (ESWT) — focal vs. radial, parâmetros, evidência em tendinopatias.",
  dry_needling_vs_terapia_manual: "Dry needling vs. terapia manual em pontos-gatilho e dor musculoesquelética — eficácia comparativa.",
  blood_flow_restriction_bfr: "Blood Flow Restriction (BFR) training — parâmetros de pressão, ganhos de força/hipertrofia em reabilitação MSK.",
  educacao_neurociencia_da_dor_pne: "Educação em neurociência da dor (PNE/Explain Pain) — efeitos em dor crônica musculoesquelética.",
  exercicio_climaterio_pos_menopausa_msk: "Exercício terapêutico no climatério e pós-menopausa — dor musculoesquelética, osteopenia, treino de força e impacto.",
  lesoes_musculares_retorno_ao_esporte: "Lesões musculares (estiramentos) — classificação, protocolos de reabilitação, critérios de retorno ao esporte.",
  bursite_trocanterica_tendinopatia_glutea: "Bursite trocantérica e tendinopatia glútea — exercício de carga progressiva, terapia manual, ondas de choque.",
  epicondilopatias_isometricos_fisiologia: "Epicondilopatias lateral e medial (tennis elbow e golfer's elbow) cruzadas com exercício isométrico, analgesia induzida por exercício, fisiologia tendínea, inibição cortical/motora, adaptação de colágeno e progressão de carga.",
};

async function isVip(adminClient: any, email?: string): Promise<boolean> {
  if (!email) return false;
  const { data } = await adminClient.from("vip_users").select("id")
    .eq("email", email.toLowerCase().trim()).maybeSingle();
  return !!data;
}

async function embed(lovableKey: string, text: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: text }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data?.[0]?.embedding || null;
  } catch { return null; }
}

function safeParseJson(s: string): any {
  // strip code fences
  const cleaned = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function getNicheDescription(body: any): string | null {
  const slug = typeof body?.niche === "string" ? body.niche.trim() : "";
  const savedDescription = slug ? NICHE_DESCRIPTIONS[slug] : "";
  const incomingDescription = typeof body?.nicheDescription === "string" ? body.nicheDescription.trim() : "";
  const incomingLabel = typeof body?.nicheLabel === "string" ? body.nicheLabel.trim() : "";
  return savedDescription || incomingDescription || incomingLabel || null;
}

// ---------- VERIFICATION (PubMed / Crossref) ----------
function normalizeTitle(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeTitle(a).split(" ").filter((w) => w.length > 3));
  const tb = new Set(normalizeTitle(b).split(" ").filter((w) => w.length > 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
const TITLE_STOPWORDS = new Set(["does", "work", "with", "from", "into", "over", "under", "after", "before", "systematic", "review", "meta", "analysis", "trial", "study", "effect", "effects", "treatment", "therapy"]);
function titleSearchTokens(title: string): string[] {
  return Array.from(new Set(normalizeTitle(title).split(" ")
    .filter((w) => w.length > 3 && !TITLE_STOPWORDS.has(w))))
    .slice(0, 8);
}
function cleanDoiStr(doi: any): string | null {
  if (typeof doi !== "string") return null;
  const s = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
  return /^10\.\d{3,9}\/\S+$/i.test(s) ? s : null;
}
function cleanPmidStr(pmid: any): string | null {
  if (pmid == null) return null;
  const s = String(pmid).replace(/[^0-9]/g, "");
  return s.length >= 4 ? s : null;
}

function isReviewType(studyType?: string | null): boolean {
  return /systematic|review|meta/i.test(studyType || "");
}

function htmlToText(html: string): string {
  return (html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPedroTitle(title: string): string {
  return htmlToText(title).replace(/\s*\[with consumer summary\]\s*$/i, "").trim();
}

interface VerifyResult {
  verified: boolean;
  pmid?: string;
  doi?: string;
  sourceUrl?: string;
  source?: "pubmed_doi" | "pubmed_pmid" | "pubmed_title" | "crossref_doi";
  matchedTitle?: string;
  similarity?: number;
  /** Reason verification failed or fell back (helps debugging revalidation). */
  reason?: string;
  /** True when the supplied DOI was discarded because its title didn't match. */
  doiMismatch?: boolean;
}

async function fetchJsonSafe(url: string, timeoutMs = 9000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "AliviA-Agent/1.0 (mailto:contato@aliviaweb.com.br)" } });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fetchTextSafe(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "AliviA-Agent/1.0 (mailto:contato@aliviaweb.com.br)" } });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

async function pubmedTitleFor(pmid: string): Promise<string | null> {
  const j = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`);
  return j?.result?.[pmid]?.title || null;
}

function verificationPatch(v: VerifyResult, status?: "verified" | "invalid" | "needs_review") {
  return {
    verification_status: status || (v.verified ? "verified" : "invalid"),
    verification_checked_at: new Date().toISOString(),
    verification_source: v.source || null,
    verification_matched_title: v.matchedTitle || null,
    verification_similarity: typeof v.similarity === "number" ? Number(v.similarity.toFixed(3)) : null,
    verification_reason: v.reason || (v.verified ? "title_identifier_match" : "not_found"),
  };
}

type PedroScoreStatus = "verified" | "not_applicable" | "unscored" | "mismatch" | "not_found" | "needs_review";

interface PedroVerifyResult {
  status: PedroScoreStatus;
  score: number | null;
  source: "pedro" | null;
  recordId?: string | null;
  sourceUrl?: string | null;
  matchedTitle?: string | null;
  method?: string | null;
  similarity?: number | null;
  reason: string;
}

function pedroPatch(v: PedroVerifyResult) {
  return {
    pedro_score: v.score,
    pedro_score_status: v.status,
    pedro_score_verified_at: new Date().toISOString(),
    pedro_score_source: v.source,
    pedro_record_id: v.recordId || null,
    pedro_score_reason: v.reason,
  };
}

function isAcceptablePedro(v: PedroVerifyResult): boolean {
  return v.status === "verified" || v.status === "not_applicable";
}

function parsePedroRows(html: string): Array<{ id: string; title: string; method: string; scoreText: string; url: string }> {
  const rows: Array<{ id: string; title: string; method: string; scoreText: string; url: string }> = [];
  const re = /<tr[^>]*>\s*<td[^>]*><a\s+href="([^"]*record-detail\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    rows.push({
      url: m[1].replace(/&amp;/g, "&"),
      id: m[2],
      title: cleanPedroTitle(m[3]),
      method: htmlToText(m[4]),
      scoreText: htmlToText(m[5]),
    });
  }
  return rows;
}

/**
 * PEDro score is never trusted from the AI. We query search.pedro.org.au,
 * match the PEDro result title against our title, and only keep numeric scores
 * when PEDro itself shows them. Systematic reviews/meta-analyses commonly show
 * N/A in PEDro; in that case the article may stay, but pedro_score is nulled.
 */
async function verifyPedroScore(item: { title?: string; study_type?: string | null; pedro_score?: number | null }): Promise<PedroVerifyResult> {
  const title = (item.title || "").trim();
  if (!title || title.length < 8) {
    return { status: "not_found", score: null, source: null, reason: "Título insuficiente para buscar na PEDro." };
  }

  const tokens = titleSearchTokens(title);
  const queries = Array.from(new Set([
    tokens.slice(0, 6).join(" "),
    tokens.slice(0, 5).join(" "),
    tokens.slice(0, 4).join(" "),
  ].filter((q) => q.length > 3)));

  let best: { id: string; title: string; method: string; scoreText: string; url: string; sim: number } | null = null;
  for (const q of queries) {
    const html = await fetchTextSafe(`https://search.pedro.org.au/search-results?calc_text=${encodeURIComponent(q)}`);
    if (!html) continue;
    for (const row of parsePedroRows(html)) {
      const sim = titleSimilarity(title, row.title);
      if (!best || sim > best.sim) best = { ...row, sim };
    }
    if (best && best.sim >= SIM_TITLE) break;
  }

  if (!best) {
    return { status: "not_found", score: null, source: null, reason: "Artigo não encontrado na busca pública da PEDro." };
  }

  const common = {
    source: "pedro" as const,
    recordId: best.id,
    sourceUrl: `https://search.pedro.org.au/search-results/record-detail/${best.id}`,
    matchedTitle: best.title,
    method: best.method,
    similarity: Number(best.sim.toFixed(3)),
  };

  if (best.sim < SIM_TITLE) {
    return {
      ...common,
      status: "not_found",
      score: null,
      reason: `PEDro encontrou apenas resultado parecido (${Math.round(best.sim * 100)}%): “${best.title}”.`,
    };
  }

  const scoreMatch = best.scoreText.match(/\b(10|[0-9])\b/);
  const pedroScore = scoreMatch ? Number(scoreMatch[1]) : null;
  const review = isReviewType(best.method) || isReviewType(item.study_type);

  if (pedroScore == null) {
    return {
      ...common,
      status: review ? "not_applicable" : "unscored",
      score: null,
      reason: review
        ? "Registro PEDro é revisão/meta-análise com Score N/A; nota numérica removida para evitar alucinação."
        : "Registro PEDro encontrado, mas está sem nota definida.",
    };
  }

  if (pedroScore < 7) {
    return {
      ...common,
      status: "mismatch",
      score: pedroScore,
      reason: `Nota PEDro oficial é ${pedroScore}/10, abaixo do corte mínimo 7/10.`,
    };
  }

  return {
    ...common,
    status: "verified",
    score: pedroScore,
    reason: `Nota PEDro confirmada na base PEDro: ${pedroScore}/10.`,
  };
}

// Title-match thresholds:
//   ≥0.6 when we already have a strong external identifier (DOI/PMID).
//   ≥0.85 when we only have free-text title lookup (prevents replacing a bad DOI
//   with a merely related paper — e.g. tennis elbow review → unrelated knee paper).
const SIM_ID = 0.6;
const SIM_TITLE = 0.85;

/**
 * Verifies an article against PubMed/Crossref AND cross-checks the resolved
 * title against the supplied title. A DOI that resolves to a *different* paper
 * is rejected (the historical bug — laser DOI pointing to an ultrasound paper).
 */
async function verifyArticle(item: { title?: string; doi?: string | null; pmid?: string | null }): Promise<VerifyResult> {
  const doi = cleanDoiStr(item.doi);
  const pmid = cleanPmidStr(item.pmid);
  const title = (item.title || "").trim();
  let doiMismatch = false;
  let bestRejected: { matchedTitle?: string; similarity?: number; reason: string } | null = null;
  const rememberRejected = (matchedTitle: string | null, similarity: number, reason: string) => {
    if (!bestRejected || similarity > (bestRejected.similarity ?? -1)) {
      bestRejected = { matchedTitle: matchedTitle || undefined, similarity, reason };
    }
  };

  // 1) DOI → PubMed (esearch by [doi], then esummary to compare titles)
  if (doi) {
    const j = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(doi)}%5Bdoi%5D`);
    const id = j?.esearchresult?.idlist?.[0];
    if (id) {
      const pmTitle = await pubmedTitleFor(id);
      const sim = title && pmTitle ? titleSimilarity(title, pmTitle) : 0;
      if (!title || sim >= SIM_ID) {
        return { verified: true, pmid: id, doi, sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, source: "pubmed_doi", matchedTitle: pmTitle || undefined, similarity: sim, reason: "title_identifier_match" };
      }
      // DOI resolves but to a different paper — discard DOI and try title route.
      doiMismatch = true;
      rememberRejected(pmTitle, sim, "doi_title_mismatch");
      console.warn(`[verify] DOI ${doi} resolves to PMID ${id} ("${pmTitle}") but title "${title}" sim=${sim.toFixed(2)}`);
    } else {
      // Crossref fallback — also requires title match.
      const cr = await fetchJsonSafe(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (cr?.message?.DOI) {
        const crTitle = Array.isArray(cr.message.title) ? cr.message.title[0] : "";
        const sim = title && crTitle ? titleSimilarity(title, crTitle) : 0;
        if (!title || sim >= SIM_ID) {
          return { verified: true, doi, sourceUrl: `https://doi.org/${doi}`, source: "crossref_doi", matchedTitle: crTitle, similarity: sim, reason: "title_identifier_match" };
        }
        doiMismatch = true;
        rememberRejected(crTitle, sim, "doi_title_mismatch");
        console.warn(`[verify] Crossref DOI ${doi} title "${crTitle}" vs "${title}" sim=${sim.toFixed(2)}`);
      }
    }
  }

  // 2) PMID direto (cross-check title)
  if (pmid) {
    const pmTitle = await pubmedTitleFor(pmid);
    if (pmTitle) {
      const sim = title ? titleSimilarity(title, pmTitle) : 1;
      if (sim >= SIM_ID || !title) {
        return { verified: true, pmid, sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, source: "pubmed_pmid", matchedTitle: pmTitle, similarity: sim, reason: "title_identifier_match", doiMismatch };
      }
      rememberRejected(pmTitle, sim, "pmid_title_mismatch");
    }
  }

  // 3) Busca por título: only accept near-exact matches. Related papers are NOT enough.
  if (title && title.length > 12) {
    const searches = [
      `"${title.replace(/"/g, "")}"[Title]`,
      titleSearchTokens(title).map((t) => `${t}[Title]`).join(" AND "),
    ].filter(Boolean);
    const ids = new Set<string>();
    for (const term of searches) {
      const j = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(term)}`);
      for (const id of (j?.esearchresult?.idlist || [])) ids.add(id);
      if (ids.size >= 5) break;
    }
    if (ids.size) {
      const idList = Array.from(ids).slice(0, 5);
      const sj = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${idList.join(",")}`);
      let best: { id: string; sim: number; title: string } | null = null;
      for (const id of idList) {
        const rec = sj?.result?.[id];
        if (!rec?.title) continue;
        const sim = titleSimilarity(title, rec.title);
        if (!best || sim > best.sim) best = { id, sim, title: rec.title };
      }
      if (best && best.sim >= SIM_TITLE) {
        // Try to discover the correct DOI for this PMID.
        let resolvedDoi: string | undefined;
        const ej = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${best.id}`);
        const aids = ej?.result?.[best.id]?.articleids || [];
        for (const a of aids) {
          if (a?.idtype === "doi" && typeof a.value === "string") { resolvedDoi = cleanDoiStr(a.value) || undefined; break; }
        }
        return {
          verified: true,
          pmid: best.id,
          doi: resolvedDoi,
          sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${best.id}/`,
          source: "pubmed_title",
          matchedTitle: best.title,
          similarity: best.sim,
          doiMismatch,
          reason: doiMismatch ? "doi_mismatch_recovered_by_title" : undefined,
        };
      }
    }
  }

  return {
    verified: false,
    doiMismatch,
    matchedTitle: bestRejected?.matchedTitle,
    similarity: bestRejected?.similarity,
    reason: bestRejected?.reason || (doiMismatch ? "doi_mismatch_no_title_match" : "not_found"),
  };
}

// ---------- SEARCH (PubMed-first, Crossref complementar) ----------

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchTextWithRetry(url: string, timeoutMs = 12000, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    const r = await fetchTextSafe(url, timeoutMs);
    if (r) return r;
    await SLEEP(400 + i * 400);
  }
  return null;
}

interface CandidateArticle {
  title: string;
  authors?: string | null;
  year?: number | null;
  journal?: string | null;
  doi?: string | null;
  pmid?: string | null;
  abstract?: string | null;
  studyType?: string | null;
  source: "pubmed" | "crossref" | "pedro" | "cochrane";
}

function parsePubmedPubType(pubtypes: any[]): string | null {
  const t = (pubtypes || []).map((x: string) => String(x).toLowerCase());
  if (t.some((x) => x.includes("meta-analysis"))) return "Meta-analysis";
  if (t.some((x) => x.includes("systematic review"))) return "Systematic Review";
  if (t.some((x) => x.includes("randomized controlled trial"))) return "RCT";
  if (t.some((x) => x.includes("clinical trial"))) return "Clinical Trial";
  if (t.some((x) => x.includes("review"))) return "Review";
  return null;
}

/**
 * Splits the efetch payload into per-article blocks and returns the abstract
 * of the article whose own PMID (first <PMID> inside <MedlineCitation>) matches.
 * Avoids the previous bug where a reference PMID could match the wrong block.
 */
function extractAbstractFromXml(xml: string, pmid: string): string | null {
  if (!xml) return null;
  const blocks = xml.split(/<PubmedArticle>/i).slice(1).map((b) => b.split(/<\/PubmedArticle>/i)[0] || "");
  for (const block of blocks) {
    const ownPmidMatch = block.match(/<MedlineCitation[^>]*>[\s\S]*?<PMID[^>]*>(\d+)<\/PMID>/i);
    const ownPmid = ownPmidMatch?.[1];
    if (ownPmid !== pmid) continue;
    const parts: string[] = [];
    const re = /<AbstractText(?:\s+[^>]*Label="([^"]*)"[^>]*)?[^>]*>([\s\S]*?)<\/AbstractText>/gi;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(block)) !== null) {
      const label = mm[1] ? `${mm[1]}: ` : "";
      parts.push(label + htmlToText(mm[2]));
    }
    const out = parts.join(" ").trim();
    return out || null;
  }
  return null;
}

async function searchPubmedForNiche(terms: NicheSearchTerms, retmax: number, yearsBack: number): Promise<{ items: CandidateArticle[]; query: string }> {
  const query = buildPubmedQuery({ terms, yearsBack });
  if (!query) return { items: [], query: "" };

  const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${retmax}&term=${encodeURIComponent(query)}`;
  const es = await fetchJsonSafe(esearchUrl);
  const ids: string[] = es?.esearchresult?.idlist || [];
  if (!ids.length) return { items: [], query };

  await SLEEP(350);
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
  const sj = await fetchJsonSafe(summaryUrl);

  await SLEEP(350);
  const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(",")}`;
  const xml = await fetchTextWithRetry(efetchUrl, 15000) || "";

  const items: CandidateArticle[] = [];
  for (const id of ids) {
    const rec = sj?.result?.[id];
    if (!rec?.title) continue;
    const pubtypes = rec.pubtype || [];
    const studyType = parsePubmedPubType(pubtypes);
    // skip plain editorials/letters/case reports
    if (!studyType) continue;
    // skip retractions
    if ((pubtypes as string[]).some((p) => /retracted|retraction/i.test(p))) continue;

    let doi: string | null = null;
    for (const a of rec.articleids || []) {
      if (a?.idtype === "doi" && typeof a.value === "string") {
        doi = cleanDoiStr(a.value);
        if (doi) break;
      }
    }
    const year = Number(String(rec.pubdate || "").match(/(\d{4})/)?.[1]) || null;
    const authors = Array.isArray(rec.authors)
      ? rec.authors.slice(0, 6).map((a: any) => a.name).filter(Boolean).join(", ")
      : null;

    items.push({
      title: htmlToText(rec.title),
      authors,
      year,
      journal: rec.fulljournalname || rec.source || null,
      doi,
      pmid: id,
      abstract: extractAbstractFromXml(xml, id),
      studyType,
      source: "pubmed",
    });
  }
  return { items, query };
}

/**
 * Busca focada na Cochrane Database of Systematic Reviews via PubMed.
 * Cochrane é tratada como fonte prioritária para revisões sistemáticas
 * de alta qualidade — sem ela, nichos como capsulite adesiva perdem cobertura.
 */
async function searchCochraneForNiche(terms: NicheSearchTerms, retmax: number, yearsBack: number): Promise<{ items: CandidateArticle[]; query: string }> {
  const themeTerms: NicheSearchTerms = { keywords: terms.keywords, mesh: terms.mesh };
  const baseQuery = buildPubmedQuery({ terms: themeTerms, yearsBack, studyTypes: false });
  if (!baseQuery) return { items: [], query: "" };
  const query = `${baseQuery} AND ("Cochrane Database Syst Rev"[Journal])`;
  const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${retmax}&term=${encodeURIComponent(query)}`;
  const es = await fetchJsonSafe(esearchUrl);
  const ids: string[] = es?.esearchresult?.idlist || [];
  if (!ids.length) return { items: [], query };

  await SLEEP(350);
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
  const sj = await fetchJsonSafe(summaryUrl);

  await SLEEP(350);
  const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(",")}`;
  const xml = await fetchTextWithRetry(efetchUrl, 15000) || "";

  const items: CandidateArticle[] = [];
  for (const id of ids) {
    const rec = sj?.result?.[id];
    if (!rec?.title) continue;
    const pubtypes = rec.pubtype || [];
    if ((pubtypes as string[]).some((p) => /retracted|retraction|withdrawn/i.test(p))) continue;
    let doi: string | null = null;
    for (const a of rec.articleids || []) {
      if (a?.idtype === "doi" && typeof a.value === "string") {
        doi = cleanDoiStr(a.value);
        if (doi) break;
      }
    }
    const year = Number(String(rec.pubdate || "").match(/(\d{4})/)?.[1]) || null;
    const authors = Array.isArray(rec.authors)
      ? rec.authors.slice(0, 6).map((a: any) => a.name).filter(Boolean).join(", ")
      : null;
    items.push({
      title: htmlToText(rec.title),
      authors,
      year,
      journal: rec.fulljournalname || rec.source || "Cochrane Database of Systematic Reviews",
      doi,
      pmid: id,
      abstract: extractAbstractFromXml(xml, id),
      studyType: "Systematic Review",
      source: "cochrane",
    });
  }
  return { items, query };
}

async function searchCrossrefForNiche(terms: NicheSearchTerms, rows: number, yearsBack: number): Promise<CandidateArticle[]> {
  const minYear = new Date().getFullYear() - yearsBack;
  const q = (terms.keywords || []).slice(0, 4).join(" OR ");
  if (!q) return [];
  const url = `https://api.crossref.org/works?rows=${rows}&query.bibliographic=${encodeURIComponent(q)}&filter=type:journal-article,from-pub-date:${minYear}`;
  const j = await fetchJsonSafe(url, 12000);
  const items: CandidateArticle[] = [];
  for (const it of j?.message?.items || []) {
    const journal = Array.isArray(it["container-title"]) ? it["container-title"][0] : null;
    if (!isPriorityJournal(journal)) continue; // só priorizamos IF ≥ 3
    const title = Array.isArray(it.title) ? htmlToText(it.title[0]) : null;
    if (!title) continue;
    const year = it.issued?.["date-parts"]?.[0]?.[0] || null;
    const authors = Array.isArray(it.author)
      ? it.author.slice(0, 6).map((a: any) => [a.family, a.given?.[0]].filter(Boolean).join(" ")).filter(Boolean).join(", ")
      : null;
    const type = String(it.type || "").toLowerCase();
    const subtype = String(it.subtype || "").toLowerCase();
    let studyType: string | null = null;
    if (/meta-analysis/i.test(title)) studyType = "Meta-analysis";
    else if (/systematic review/i.test(title)) studyType = "Systematic Review";
    else if (/randomi[sz]ed/i.test(title) || /trial/i.test(title) || type === "proceedings-article") studyType = "RCT";
    else studyType = "Journal Article";
    items.push({
      title,
      authors,
      year,
      journal,
      doi: cleanDoiStr(it.DOI),
      pmid: null,
      abstract: htmlToText(it.abstract || "") || null,
      studyType,
      source: "crossref",
    });
  }
  return items;
}

function dedupeCandidates(list: CandidateArticle[]): CandidateArticle[] {
  const seen = new Set<string>();
  const out: CandidateArticle[] = [];
  for (const c of list) {
    const key = c.pmid ? `pmid:${c.pmid}` : c.doi ? `doi:${c.doi.toLowerCase()}` : `t:${normalizeTitle(c.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

async function filterAlreadyStored(adminClient: any, candidates: CandidateArticle[]): Promise<CandidateArticle[]> {
  if (!candidates.length) return [];
  const pmids = candidates.map((c) => c.pmid).filter(Boolean) as string[];
  const dois = candidates.map((c) => c.doi).filter(Boolean) as string[];
  const titles = candidates.map((c) => normalizeTitle(c.title));

  const existingPmids = new Set<string>();
  const existingDois = new Set<string>();
  const existingTitles = new Set<string>();

  if (pmids.length) {
    const { data } = await adminClient.from("knowledge_articles").select("pmid").in("pmid", pmids);
    for (const r of data || []) if (r.pmid) existingPmids.add(String(r.pmid));
  }
  if (dois.length) {
    const { data } = await adminClient.from("knowledge_articles").select("doi").in("doi", dois);
    for (const r of data || []) if (r.doi) existingDois.add(String(r.doi).toLowerCase());
  }
  // Title check (mais caro): só para os que não casaram acima
  if (titles.length) {
    const { data } = await adminClient.from("knowledge_articles").select("title");
    for (const r of data || []) if (r.title) existingTitles.add(normalizeTitle(r.title));
  }

  return candidates.filter((c) => {
    if (c.pmid && existingPmids.has(c.pmid)) return false;
    if (c.doi && existingDois.has(c.doi.toLowerCase())) return false;
    if (existingTitles.has(normalizeTitle(c.title))) return false;
    return true;
  });
}

async function enrichOneWithAi(
  lovableKey: string,
  c: CandidateArticle,
): Promise<{ abstract_pt: string | null; key_findings_pt: string | null; study_type: string | null; pedro_score: number | null }> {
  const hasAbstract = !!(c.abstract && c.abstract.trim().length > 50);
  if (!hasAbstract) {
    // Sem abstract real: não inventar nada a partir do título.
    return { abstract_pt: null, key_findings_pt: null, study_type: c.studyType ?? null, pedro_score: null };
  }

  // Cache por identidade do artigo (PMID > DOI > título). Enriquecimento é determinístico
  // por abstract — mesmo artigo aparece em múltiplos nichos sem precisar re-rodar a IA.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
  const cacheId = c.pmid || c.doi || c.title;
  const cachePayload = { id: cacheId, abstractHash: (c.abstract || "").slice(0, 4000) };
  if (admin) {
    const cached = await getCachedAiResponse<{ abstract_pt: string | null; key_findings_pt: string | null; study_type: string | null; pedro_score: number | null }>(
      admin, "agent-knowledge-enrich", cachePayload,
    );
    if (cached) return cached;
  }

  const prompt = `Você receberá UM ÚNICO artigo científico com seu abstract original.
Sua tarefa é traduzir/resumir ESTRITAMENTE com base nesse abstract específico.
PROIBIDO usar conhecimento externo, memória de outros estudos, ou inferências além do texto fornecido.
Se o abstract não menciona um número, intervenção ou desfecho — não invente.

Responda APENAS um JSON objeto com as chaves:
- abstract: 3 a 5 frases em pt-BR resumindo objetivo, método e resultado DESTE abstract.
- key_findings: 1 a 2 frases em pt-BR com o achado clínico mais aplicável EXTRAÍDO LITERALMENTE deste abstract (cite intervenção/comparador/desfecho específicos quando o abstract trouxer). Se o abstract não traz achado claro, retorne null.
- study_type: um de "RCT" | "Systematic Review" | "Meta-analysis" | "Review" | "Clinical Trial".
- pedro_score: número 0-10 SOMENTE se tiver certeza pela base PEDro; senão null.

Artigo:
${JSON.stringify({
    title: c.title,
    journal: c.journal,
    year: c.year,
    study_type_hint: c.studyType,
    abstract: (c.abstract || "").slice(0, 4000),
  }, null, 2)}`;

  // Cost control: Pro removed — per-article enrichment is a short structured task.
  const modelChain = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
  for (const model of modelChain) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Você é um bibliotecário científico rigoroso. Responde apenas JSON válido. NUNCA mistura informação de outros estudos nem usa memória externa." },
            { role: "user", content: prompt },
          ],
          max_tokens: 900,
        }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      logAiTokenUsage({ functionName: "agent-knowledge", model, usage: j?.usage, fallbackIndex: modelChain.indexOf(model) });
      const raw = j.choices?.[0]?.message?.content || "";
      const parsed = safeParseJson(raw);
      const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as any : null;
      if (!obj) continue;
      const ps = Number(obj.pedro_score);
      const enriched = {
        abstract_pt: typeof obj.abstract === "string" ? obj.abstract : null,
        key_findings_pt: typeof obj.key_findings === "string" ? obj.key_findings : null,
        study_type: typeof obj.study_type === "string" ? obj.study_type : (c.studyType ?? null),
        pedro_score: Number.isFinite(ps) ? ps : null,
      };
      if (admin && (enriched.abstract_pt || enriched.key_findings_pt)) {
        // TTL 30 dias — abstract do artigo não muda.
        await setCachedAiResponse(admin, "agent-knowledge-enrich", cachePayload, enriched, 30 * 24 * 3600);
      }
      return enriched;
    } catch (_e) {
      // tenta próximo modelo
    }
  }
  return { abstract_pt: null, key_findings_pt: null, study_type: c.studyType ?? null, pedro_score: null };
}

async function enrichCandidatesWithAi(
  lovableKey: string,
  candidates: CandidateArticle[],
): Promise<Array<{ abstract_pt: string | null; key_findings_pt: string | null; study_type: string | null; pedro_score: number | null }>> {
  if (!candidates.length) return [];
  // Enriquecimento POR ARTIGO (não em batch) para evitar contaminação cruzada
  // entre abstracts semelhantes — causa raiz dos "achados repetidos".
  const CONCURRENCY = 3;
  const results: Array<{ abstract_pt: string | null; key_findings_pt: string | null; study_type: string | null; pedro_score: number | null }> = new Array(candidates.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= candidates.length) return;
      results[i] = await enrichOneWithAi(lovableKey, candidates[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => worker()));
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const creditDecision = await canaryCredits(req, "agent-knowledge");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action;

    // ---------- PUBLIC LIST (read-only, approved articles) ----------
    // Available to any authenticated user — UI gates access by plan (PRO/clinic/academic).
    if (action === "list_public") {
      // Public-facing list: requer ID verificado, mas PEDro vira sinal opcional
      // (admin pode aprovar artigos sem nota PEDro confirmada — ex.: paper em
      // periódico exigente que não consta na base PEDro).
      let q = adminClient.from("knowledge_articles")
        .select("id, title, authors, year, journal, pedro_score, pedro_score_status, pedro_score_reason, pedro_score_source, pedro_record_id, pedro_score_verified_at, study_type, niche_tags, abstract, key_findings, doi, pmid, source_url, verification_status, created_at")
        .eq("approved", true)
        .eq("verification_status", "verified")
        .order("year", { ascending: false, nullsFirst: false })
        .order("pedro_score", { ascending: false, nullsFirst: false })
        .limit(500);
      if (body.niche) q = q.contains("niche_tags", [body.niche]);
      const yearMin = Number(body.yearMin); if (!Number.isNaN(yearMin) && yearMin > 0) q = q.gte("year", yearMin);
      const yearMax = Number(body.yearMax); if (!Number.isNaN(yearMax) && yearMax > 0) q = q.lte("year", yearMax);
      const pedroMin = Number(body.pedroMin); if (!Number.isNaN(pedroMin) && pedroMin > 0) q = q.eq("pedro_score_status", "verified").gte("pedro_score", pedroMin);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ articles: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await isVip(adminClient, user.email))) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- COUNTS BY NICHE ----------
    if (action === "counts") {
      const { data, error } = await adminClient
        .from("knowledge_articles")
        .select("niche_tags, approved")
        .limit(5000);
      if (error) throw error;
      const byNiche: Record<string, { pending: number; approved: number; total: number }> = {};
      for (const row of (data || []) as any[]) {
        const tags: string[] = Array.isArray(row.niche_tags) ? row.niche_tags : [];
        for (const t of tags) {
          if (!byNiche[t]) byNiche[t] = { pending: 0, approved: 0, total: 0 };
          byNiche[t].total++;
          if (row.approved) byNiche[t].approved++;
          else byNiche[t].pending++;
        }
      }
      return new Response(JSON.stringify({ counts: byNiche }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- LIST ----------
    if (action === "list") {
      const status = body.status === "approved" ? true : body.status === "pending" ? false : null;
      let q = adminClient.from("knowledge_articles")
        .select("id, title, authors, year, journal, pedro_score, pedro_score_status, pedro_score_reason, pedro_score_source, pedro_record_id, pedro_score_verified_at, study_type, niche_tags, abstract, key_findings, doi, pmid, source_url, approved, is_favorite, verification_status, verification_checked_at, verification_source, verification_matched_title, verification_similarity, verification_reason, created_at")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== null) q = q.eq("approved", status);
      if (body.niche) q = q.contains("niche_tags", [body.niche]);
      if (body.favoritesOnly) q = q.eq("is_favorite", true);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ articles: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- FAVORITE ----------
    if (action === "favorite") {
      const { error } = await adminClient.from("knowledge_articles")
        .update({ is_favorite: !!body.value, updated_at: new Date().toISOString() })
        .eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- APPROVE ----------
    if (action === "approve") {
      // Backfill embedding if missing so the article is actually usable by RAG
      const { data: cur } = await adminClient.from("knowledge_articles")
        .select("title, doi, pmid, source_url, abstract, key_findings, embedding, pedro_score, study_type").eq("id", body.id).maybeSingle();
      if (!cur) {
        return new Response(JSON.stringify({ error: "Artigo não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pmidFromUrl = typeof cur.source_url === "string"
        ? cur.source_url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{4,})/i)?.[1] || null
        : null;
      const v = await verifyArticle({ title: cur.title, doi: cur.doi, pmid: cleanPmidStr(cur.pmid) || pmidFromUrl });
      if (!v.verified) {
        await adminClient.from("knowledge_articles")
          .update({
            approved: false,
            ...verificationPatch(v, "invalid"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.id);
        return new Response(JSON.stringify({
          error: "Artigo não aprovado: DOI/PMID não confirmou o título no PubMed/Crossref.",
          reason: v.reason || "not_found",
          matchedTitle: v.matchedTitle || null,
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const finalDoi = v.doi ?? (v.doiMismatch ? null : cleanDoiStr(cur.doi));
      const finalPmid = v.pmid || cleanPmidStr(cur.pmid) || pmidFromUrl;
      const finalUrl = v.sourceUrl || (finalPmid ? `https://pubmed.ncbi.nlm.nih.gov/${finalPmid}/` : finalDoi ? `https://doi.org/${finalDoi}` : null);
      const pedroV = await verifyPedroScore({ title: cur.title, study_type: cur.study_type, pedro_score: cur.pedro_score });
      // PEDro é apenas um sinal amarelo: registramos o resultado mas NÃO bloqueamos
      // a aprovação. Um bom artigo pode estar no PubMed sem constar na PEDro
      // (especialmente em periódicos exigentes como JOSPT, BJPT, etc.).
      const patch: any = {
        approved: true,
        doi: finalDoi,
        pmid: finalPmid,
        source_url: finalUrl,
        ...verificationPatch(v, "verified"),
        ...pedroPatch(pedroV),
        updated_at: new Date().toISOString(),
      };
      let embeddingBackfilled = false;
      if (!cur.embedding) {
        const text = [cur.title, cur.abstract, cur.key_findings].filter(Boolean).join("\n\n");
        const vec = text ? await embed(LOVABLE_API_KEY, text) : null;
        if (vec) { patch.embedding = vec; embeddingBackfilled = true; }
      }
      const { error } = await adminClient.from("knowledge_articles")
        .update(patch).eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, embeddingBackfilled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- REJECT (delete) ----------
    if (action === "reject") {
      const { error } = await adminClient.from("knowledge_articles").delete().eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- UPDATE ----------
    if (action === "update") {
      const patch: any = {};
      for (const k of ["title","authors","year","journal","pedro_score","study_type","abstract","key_findings","doi","pmid","source_url","niche_tags"]) {
        if (k in body) patch[k] = body[k];
      }
      if ("pmid" in patch) patch.pmid = cleanPmidStr(patch.pmid);
      if ("doi" in patch || "pmid" in patch || "source_url" in patch || "title" in patch) {
        patch.approved = false;
        patch.verification_status = "needs_review";
        patch.verification_checked_at = null;
        patch.verification_source = null;
        patch.verification_matched_title = null;
        patch.verification_similarity = null;
        patch.verification_reason = "manual_edit_requires_revalidation";
      }
      if ("title" in patch || "study_type" in patch || "pedro_score" in patch) {
        patch.approved = false;
        patch.pedro_score_status = "needs_review";
        patch.pedro_score_verified_at = null;
        patch.pedro_score_source = null;
        patch.pedro_record_id = null;
        patch.pedro_score_reason = "manual_edit_requires_pedro_revalidation";
      }
      patch.updated_at = new Date().toISOString();
      // If text fields changed, re-embed
      if (patch.title || patch.abstract || patch.key_findings) {
        const { data: cur } = await adminClient.from("knowledge_articles")
          .select("title, abstract, key_findings").eq("id", body.id).maybeSingle();
        const text = [
          patch.title ?? cur?.title,
          patch.abstract ?? cur?.abstract,
          patch.key_findings ?? cur?.key_findings,
        ].filter(Boolean).join("\n\n");
        const vec = await embed(LOVABLE_API_KEY, text);
        if (vec) patch.embedding = vec;
      }
      const { error } = await adminClient.from("knowledge_articles").update(patch).eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- VERIFY ONE (manual edit flow) ----------
    // Admin edits DOI/PMID manually and we revalidate that single article against PubMed/Crossref.
    // If verified, persist normalized doi/pmid/source_url and (optionally) approve.
    if (action === "verify_one") {
      const id: string = body.id;
      if (!id) {
        return new Response(JSON.stringify({ error: "id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: row, error: rowErr } = await adminClient
        .from("knowledge_articles")
        .select("id, title, doi, pmid, source_url, approved, pedro_score, study_type")
        .eq("id", id)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) {
        return new Response(JSON.stringify({ error: "Artigo não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const overrideDoi = typeof body.doi === "string" ? body.doi.trim() || null : row.doi;
      const overridePmid = typeof body.pmid === "string" ? cleanPmidStr(body.pmid) : cleanPmidStr(row.pmid);
      const approveIfVerified = body.approveIfVerified === true;

      const v = await verifyArticle({ title: row.title, doi: overrideDoi, pmid: overridePmid });

      if (!v.verified) {
        // Persist what the admin typed (so they don't lose their edit), but do NOT approve.
        await adminClient.from("knowledge_articles")
          .update({
            doi: overrideDoi,
            pmid: overridePmid,
            source_url: null,
            approved: false,
            ...verificationPatch(v, "invalid"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        return new Response(JSON.stringify({
          ok: true, verified: false, reason: v.reason || "not_found",
          similarity: v.similarity ?? null,
          matchedTitle: v.matchedTitle || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const newDoi = v.doi ?? (v.doiMismatch ? null : overrideDoi);
      const newPmid = v.pmid || overridePmid;
      const newUrl = v.sourceUrl || (newPmid ? `https://pubmed.ncbi.nlm.nih.gov/${newPmid}/` : row.source_url);
      const pedroV = approveIfVerified
        ? await verifyPedroScore({ title: row.title, study_type: row.study_type, pedro_score: row.pedro_score })
        : null;
      const patch: any = {
        doi: newDoi,
        pmid: newPmid,
        source_url: newUrl,
        ...verificationPatch(v, "verified"),
        updated_at: new Date().toISOString(),
      };
      if (pedroV) Object.assign(patch, pedroPatch(pedroV));
      // PEDro é sinal opcional (amarelo). Não bloqueia aprovação manual do admin.
      if (approveIfVerified) patch.approved = true;
      await adminClient.from("knowledge_articles").update(patch).eq("id", id);

      return new Response(JSON.stringify({
        ok: true, verified: true, doi: newDoi, pmid: newPmid,
        sourceUrl: newUrl, matchedTitle: v.matchedTitle || null,
        similarity: v.similarity ?? null,
        pedroStatus: pedroV?.status || null,
        pedroReason: pedroV?.reason || null,
        pedroWarning: pedroV ? !isAcceptablePedro(pedroV) : false,
        approved: approveIfVerified ? true : row.approved,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- INGEST ----------
    if (action === "ingest") {
      const niche: string = body.niche;
      const nicheDescription = getNicheDescription(body);
      const count = Math.min(Math.max(Number(body.count) || 6, 1), 10);
      const yearsBack = Math.min(Math.max(Number(body.yearsBack) || 15, 3), 25);
      if (!niche) {
        return new Response(JSON.stringify({ error: "Nicho inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Termos de busca canônicos por nicho (PubMed-first, reprodutível)
      const terms = getNicheSearchTerms(niche, nicheDescription);

      // 2) Busca em paralelo: PubMed (motor principal) + Cochrane (RS prioritárias) + Crossref (complemento p/ IF≥3)
      const [pubmedRes, cochraneRes, crossrefRes] = await Promise.all([
        searchPubmedForNiche(terms, count * 4, yearsBack),
        searchCochraneForNiche(terms, Math.max(count, 3), yearsBack),
        searchCrossrefForNiche(terms, count * 3, yearsBack),
      ]);

      // Cochrane primeiro no merge — dedup mantém a primeira ocorrência (revisão Cochrane prevalece sobre o mesmo PMID indexado em PubMed genérico).
      const merged = dedupeCandidates([...cochraneRes.items, ...pubmedRes.items, ...crossrefRes]);
      const bySourceFound = {
        pubmed: pubmedRes.items.length,
        cochrane: cochraneRes.items.length,
        crossref: crossrefRes.length,
      };
      console.log(`[ingest] niche=${niche} pubmed=${bySourceFound.pubmed} cochrane=${bySourceFound.cochrane} crossref=${bySourceFound.crossref} merged=${merged.length}`);

      // 3) Remove duplicados já existentes na base
      const fresh = await filterAlreadyStored(adminClient, merged);
      // 4) Limita a `count*2` para enriquecer / inserir até `count`
      const toEnrich = fresh.slice(0, Math.max(count, 1) * 2);

      // 5) Enriquecimento via IA (apenas resumo/study_type — não inventa metadados)
      const enriched = await enrichCandidatesWithAi(LOVABLE_API_KEY, toEnrich);

      let inserted = 0;
      let rejectedUnverified = 0;
      let pedroWarning = 0;
      let priorityJournalCount = 0;
      const bySourceInserted: Record<string, number> = { pubmed: 0, cochrane: 0, crossref: 0 };

      for (let i = 0; i < toEnrich.length && inserted < count; i++) {
        const c = toEnrich[i];
        const enr = enriched[i] || { abstract_pt: null, key_findings_pt: null, study_type: null, pedro_score: null };
        try {
          // Verificação cruzada — pubmed candidates já têm PMID, então passa quase sempre
          const verification = await verifyArticle({ title: c.title, doi: c.doi, pmid: c.pmid });
          if (!verification.verified) {
            rejectedUnverified++;
            console.warn(`[ingest] unverified, skipping: ${c.title}`);
            continue;
          }

          // PEDro = aviso amarelo opcional
          const pedroV = await verifyPedroScore({ title: c.title, study_type: enr.study_type || c.studyType, pedro_score: enr.pedro_score });
          if (!isAcceptablePedro(pedroV)) pedroWarning++;

          const abstractFinal = enr.abstract_pt || c.abstract || null;
          const keyFindings = enr.key_findings_pt || null;
          const studyType = enr.study_type || c.studyType || null;

          const text = [c.title, abstractFinal, keyFindings].filter(Boolean).join("\n\n");
          const vec = await embed(LOVABLE_API_KEY, text);

          const finalDoi = verification.doi || c.doi || null;
          const finalPmid = verification.pmid || c.pmid || null;
          const sourceUrl = verification.sourceUrl
            || (finalPmid ? `https://pubmed.ncbi.nlm.nih.gov/${finalPmid}/`
              : finalDoi ? `https://doi.org/${finalDoi}` : null);
          if (!sourceUrl) { rejectedUnverified++; continue; }

          if (isPriorityJournal(c.journal)) priorityJournalCount++;

          const row: any = {
            title: String(c.title).slice(0, 500),
            authors: c.authors || null,
            year: c.year || null,
            journal: c.journal || null,
            pedro_score: pedroV.score,
            study_type: studyType,
            niche_tags: [niche],
            abstract: abstractFinal,
            key_findings: keyFindings,
            doi: finalDoi,
            pmid: finalPmid,
            source_url: sourceUrl,
            approved: false,
            ...verificationPatch(verification, "verified"),
            ...pedroPatch(pedroV),
            added_by: user.id,
          };
          if (vec) row.embedding = vec;
          const { error: insErr } = await adminClient.from("knowledge_articles").insert(row);
          if (!insErr) {
            inserted++;
            bySourceInserted[c.source] = (bySourceInserted[c.source] || 0) + 1;
          } else {
            console.warn("[ingest] insert error", insErr);
          }
          await SLEEP(300);
        } catch (e) {
          console.warn("[ingest] item error", e);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        inserted,
        candidates: merged.length,
        afterDedup: fresh.length,
        rejectedUnverified,
        pedroWarning,
        priorityJournalCount,
        bySourceFound,
        bySourceInserted,
        queryUsed: pubmedRes.query,
        cochraneQuery: cochraneRes.query,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // ---------- VERIFY / REVALIDATE ----------
    // Both actions use the SAME strict verifyArticle (title cross-check obrigatório).
    // Diferença: "verify" (legacy) DELETA não-confirmáveis.
    //            "revalidate" (novo, preferido) DESAPROVA (approved=false) para revisão humana,
    //                          sem perder o registro.
    if (action === "verify" || action === "revalidate") {
      const isRevalidate = action === "revalidate";
      const scope = body.scope === "approved" ? "approved" : body.scope === "pending" ? "pending" : "all";
      const nicheFilter: string | undefined = body.niche;
      const dryRun = body.dryRun === true;

      let q = adminClient.from("knowledge_articles")
        .select("id, title, doi, pmid, source_url, approved, niche_tags, pedro_score, study_type")
        .limit(1000);
      if (scope === "approved") q = q.eq("approved", true);
      if (scope === "pending") q = q.eq("approved", false);
      if (nicheFilter) q = q.contains("niche_tags", [nicheFilter]);
      const { data: rows, error } = await q;
      if (error) throw error;

      let checked = 0, verified = 0, removed = 0, updated = 0, mismatchFixed = 0, demoted = 0, pedroRejected = 0;
      const removedItems: any[] = [];
      const demotedItems: any[] = [];
      const mismatchFixedItems: any[] = [];
      const pedroRejectedItems: any[] = [];

      for (const r of rows || []) {
        checked++;
        // Prefer stored pmid; fall back to extracting from source_url for legacy rows.
        const pmidStored = cleanPmidStr((r as any).pmid);
        const pmidFromUrl = typeof r.source_url === "string"
          ? r.source_url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{4,})/i)?.[1] || null
          : null;
        const pmidHint = pmidStored || pmidFromUrl;

        const v = await verifyArticle({ title: r.title, doi: r.doi, pmid: pmidHint });

        if (v.verified) {
          const newUrl = v.sourceUrl || (v.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${v.pmid}/` : r.source_url);
          // Trust the verifier's DOI (may be null if the original was wrong & PubMed has no DOI).
          const newDoi = v.doi ?? (v.doiMismatch ? null : r.doi);
          const newPmid = v.pmid || pmidStored;
          const pedroV = await verifyPedroScore({ title: r.title, study_type: (r as any).study_type, pedro_score: (r as any).pedro_score });
          // PEDro vira aviso amarelo: registramos o status mas NÃO desaprovamos
          // automaticamente. Admin decide manualmente.
          if (!isAcceptablePedro(pedroV)) {
            pedroRejected++;
            pedroRejectedItems.push({ id: r.id, title: r.title, pedroStatus: pedroV.status, pedroScore: pedroV.score, pedroMatchedTitle: pedroV.matchedTitle || null, reason: pedroV.reason });
          }


          verified++;
          const wasMismatch = !!v.doiMismatch;
          if (wasMismatch) {
            mismatchFixed++;
            mismatchFixedItems.push({ id: r.id, title: r.title, oldDoi: r.doi, newDoi, newPmid, matchedTitle: v.matchedTitle });
          }
          const changed = newUrl !== r.source_url || newDoi !== r.doi || newPmid !== pmidStored;
          if (changed) {
            if (!dryRun) {
              await adminClient.from("knowledge_articles")
                .update({ source_url: newUrl, doi: newDoi, pmid: newPmid, ...pedroPatch(pedroV), updated_at: new Date().toISOString() })
                .eq("id", r.id);
            }
            updated++;
          }
          if (!dryRun) {
            await adminClient.from("knowledge_articles")
              .update({ ...verificationPatch(v, "verified"), ...pedroPatch(pedroV), updated_at: new Date().toISOString() })
              .eq("id", r.id);
          }
        } else {
          if (isRevalidate) {
            // Soft: demote to pending for manual review instead of deleting.
            demoted++;
            demotedItems.push({ id: r.id, title: r.title, doi: r.doi, pmid: pmidStored, matchedTitle: v.matchedTitle || null, similarity: v.similarity ?? null, reason: v.reason || "not_found" });
            if (!dryRun) {
              await adminClient.from("knowledge_articles")
                .update({
                  approved: false,
                  source_url: null,
                  ...verificationPatch(v, "invalid"),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", r.id);
            }
          } else {
            // Legacy hard delete path.
            removed++;
            removedItems.push({ id: r.id, title: r.title, doi: r.doi });
            if (!dryRun) {
              await adminClient.from("knowledge_articles").delete().eq("id", r.id);
            }
          }
        }
        // throttle leve para respeitar NCBI (~3 req/s sem API key)
        await new Promise((res) => setTimeout(res, 350));
      }

      return new Response(JSON.stringify({
        ok: true, action, scope, niche: nicheFilter || null,
        checked, verified, updated, mismatchFixed, removed, demoted, pedroRejected,
        dryRun, removedItems, demotedItems, mismatchFixedItems, pedroRejectedItems,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[agent-knowledge] fatal", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
