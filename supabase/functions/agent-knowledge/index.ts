import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

async function pubmedTitleFor(pmid: string): Promise<string | null> {
  const j = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`);
  return j?.result?.[pmid]?.title || null;
}

async function pubmedSummaryFor(pmid: string): Promise<any | null> {
  const j = await fetchJsonSafe(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`);
  return j?.result?.[pmid] || null;
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
      let q = adminClient.from("knowledge_articles")
        .select("id, title, authors, year, journal, pedro_score, study_type, niche_tags, abstract, key_findings, doi, pmid, source_url, verification_status, created_at")
        .eq("approved", true)
        .eq("verification_status", "verified")
        .order("year", { ascending: false, nullsFirst: false })
        .order("pedro_score", { ascending: false, nullsFirst: false })
        .limit(500);
      if (body.niche) q = q.contains("niche_tags", [body.niche]);
      const yearMin = Number(body.yearMin); if (!Number.isNaN(yearMin) && yearMin > 0) q = q.gte("year", yearMin);
      const yearMax = Number(body.yearMax); if (!Number.isNaN(yearMax) && yearMax > 0) q = q.lte("year", yearMax);
      const pedroMin = Number(body.pedroMin); if (!Number.isNaN(pedroMin) && pedroMin > 0) q = q.gte("pedro_score", pedroMin);
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

    // ---------- LIST ----------
    if (action === "list") {
      const status = body.status === "approved" ? true : body.status === "pending" ? false : null;
      let q = adminClient.from("knowledge_articles")
        .select("id, title, authors, year, journal, pedro_score, study_type, niche_tags, abstract, key_findings, doi, pmid, source_url, approved, is_favorite, verification_status, verification_checked_at, verification_source, verification_matched_title, verification_similarity, verification_reason, created_at")
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
        .select("title, doi, pmid, source_url, abstract, key_findings, embedding").eq("id", body.id).maybeSingle();
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
      const patch: any = {
        approved: true,
        doi: finalDoi,
        pmid: finalPmid,
        source_url: finalUrl,
        ...verificationPatch(v, "verified"),
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
        .select("id, title, doi, pmid, source_url, approved")
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
      const patch: any = {
        doi: newDoi,
        pmid: newPmid,
        source_url: newUrl,
        ...verificationPatch(v, "verified"),
        updated_at: new Date().toISOString(),
      };
      if (approveIfVerified) patch.approved = true;
      await adminClient.from("knowledge_articles").update(patch).eq("id", id);

      return new Response(JSON.stringify({
        ok: true, verified: true, doi: newDoi, pmid: newPmid,
        sourceUrl: newUrl, matchedTitle: v.matchedTitle || null,
        similarity: v.similarity ?? null,
        approved: approveIfVerified || row.approved,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- INGEST ----------
    if (action === "ingest") {
      const niche: string = body.niche;
      const nicheDescription = getNicheDescription(body);
      const count = Math.min(Math.max(Number(body.count) || 6, 1), 10);
      if (!niche || !nicheDescription) {
        return new Response(JSON.stringify({ error: "Nicho inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prompt = `Você é um curador de evidências em fisioterapia.

Liste ${count} estudos REAIS, de alta qualidade (preferencialmente indexados na base PEDro) para o nicho:
"${nicheDescription}"

CRITÉRIOS OBRIGATÓRIOS:
- PEDro score ≥ 7/10 (se RCT). Para revisões sistemáticas/meta-análises, pode listar mesmo sem PEDro (usar 8 como padrão).
- Priorize meta-análises, revisões sistemáticas e RCTs recentes (últimos 15 anos).
- NÃO invente estudos. Se não tiver certeza absoluta da existência do estudo, NÃO o inclua.
- IDENTIFICADORES: **prefira fornecer o PMID** (mais estável que DOI). Se não souber o DOI com 100% de certeza, deixe DOI=null e forneça apenas PMID. NUNCA chute um DOI — todo par título↔DOI é checado contra o PubMed por similaridade de título e pares inconsistentes são descartados.
- NÃO gere URLs para PEDro (search.pedro.org.au, pedro.org.au/...) — os IDs internos da PEDro não são previsíveis e qualquer link fabricado retorna 404. Use SOMENTE DOI e/ou PMID verificáveis.
- Campos por estudo:
  • title (string)
  • authors (string "Sobrenome A, Sobrenome B")
  • year (int)
  • journal (string)
  • pedro_score (int 0-10)
  • study_type ("RCT" | "Systematic Review" | "Meta-analysis")
  • abstract (3-5 frases em pt-BR resumindo objetivo/método/resultado)
  • key_findings (1-2 frases em pt-BR com o achado clínico mais aplicável)
  • doi (string, formato "10.xxxx/yyyy" — sem "https://doi.org/". Null se não souber com certeza.)
  • pmid (string apenas numérica, ex: "31234567". Preferencial.)
- NÃO inclua o campo "url" / "source_url".

Responda APENAS um JSON array. Sem texto adicional.`;


      const callAi = async (model: string) => {
        return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Você é um bibliotecário científico rigoroso. Responde apenas JSON válido." },
              { role: "user", content: prompt },
            ],
          }),
        });
      };

      const modelChain = ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
      let aiResp: Response | null = null;
      let usedModel = "";
      let lastStatus = 0;
      let lastBody = "";
      for (const m of modelChain) {
        const r = await callAi(m);
        if (r.ok) { aiResp = r; usedModel = m; break; }
        lastStatus = r.status;
        lastBody = await r.text();
        console.warn(`[ingest] ${m} returned ${r.status}: ${lastBody.slice(0, 200)}`);
        // Only fall back on credit/rate issues; other errors are fatal
        if (r.status !== 402 && r.status !== 429) break;
      }

      if (!aiResp) {
        console.error("[ingest] all models failed", lastStatus, lastBody);
        if (lastStatus === 429) return new Response(JSON.stringify({ error: "ai_rate_limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (lastStatus === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.log(`[ingest] using model ${usedModel} for niche ${niche}`);

      const aiJson = await aiResp.json();
      const raw = aiJson.choices?.[0]?.message?.content || "";
      const parsed = safeParseJson(raw);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.articles) ? parsed.articles : [];

      let inserted = 0;
      let rejectedUnverified = 0;
      for (const it of items) {
        try {
          const pedro = Number(it.pedro_score);
          if (!it.title || isNaN(pedro) || pedro < 7) continue;

          // *** Verificação obrigatória contra PubMed/Crossref ***
          const verification = await verifyArticle({ title: it.title, doi: it.doi, pmid: it.pmid });
          if (!verification.verified) {
            rejectedUnverified++;
            console.warn(`[ingest] unverified, skipping: ${it.title}`);
            continue;
          }

          const text = [it.title, it.abstract, it.key_findings].filter(Boolean).join("\n\n");
          const vec = await embed(LOVABLE_API_KEY, text);

          const finalDoi = verification.doi || cleanDoiStr(it.doi);
          const finalPmid = verification.pmid || cleanPmidStr(it.pmid);
          const sourceUrl = verification.sourceUrl
            || (finalPmid ? `https://pubmed.ncbi.nlm.nih.gov/${finalPmid}/`
              : finalDoi ? `https://doi.org/${finalDoi}` : null);

          if (!sourceUrl) { rejectedUnverified++; continue; }

          const row: any = {
            title: String(it.title).slice(0, 500),
            authors: it.authors || null,
            year: it.year ? Number(it.year) : null,
            journal: it.journal || null,
            pedro_score: pedro,
            study_type: it.study_type || null,
            niche_tags: [niche],
            abstract: it.abstract || null,
            key_findings: it.key_findings || null,
            doi: finalDoi,
            pmid: finalPmid,
            source_url: sourceUrl,
            approved: false,
            ...verificationPatch(verification, "verified"),
            added_by: user.id,
          };
          if (vec) row.embedding = vec;
          const { error: insErr } = await adminClient.from("knowledge_articles").insert(row);
          if (!insErr) inserted++;
          else console.warn("[ingest] insert error", insErr);
        } catch (e) {
          console.warn("[ingest] item error", e);
        }
      }

      return new Response(JSON.stringify({ ok: true, inserted, candidates: items.length, rejectedUnverified }), {
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
        .select("id, title, doi, pmid, source_url, approved, niche_tags")
        .limit(1000);
      if (scope === "approved") q = q.eq("approved", true);
      if (scope === "pending") q = q.eq("approved", false);
      if (nicheFilter) q = q.contains("niche_tags", [nicheFilter]);
      const { data: rows, error } = await q;
      if (error) throw error;

      let checked = 0, verified = 0, removed = 0, updated = 0, mismatchFixed = 0, demoted = 0;
      const removedItems: any[] = [];
      const demotedItems: any[] = [];
      const mismatchFixedItems: any[] = [];

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
          verified++;
          const newUrl = v.sourceUrl || (v.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${v.pmid}/` : r.source_url);
          // Trust the verifier's DOI (may be null if the original was wrong & PubMed has no DOI).
          const newDoi = v.doi ?? (v.doiMismatch ? null : r.doi);
          const newPmid = v.pmid || pmidStored;
          const wasMismatch = !!v.doiMismatch;
          if (wasMismatch) {
            mismatchFixed++;
            mismatchFixedItems.push({ id: r.id, title: r.title, oldDoi: r.doi, newDoi, newPmid, matchedTitle: v.matchedTitle });
          }
          const changed = newUrl !== r.source_url || newDoi !== r.doi || newPmid !== pmidStored;
          if (changed) {
            if (!dryRun) {
              await adminClient.from("knowledge_articles")
                .update({ source_url: newUrl, doi: newDoi, pmid: newPmid, updated_at: new Date().toISOString() })
                .eq("id", r.id);
            }
            updated++;
          }
          if (!dryRun) {
            await adminClient.from("knowledge_articles")
              .update({ ...verificationPatch(v, "verified"), updated_at: new Date().toISOString() })
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
        checked, verified, updated, mismatchFixed, removed, demoted,
        dryRun, removedItems, demotedItems, mismatchFixedItems,
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
