import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NICHE_DESCRIPTIONS: Record<string, string> = {
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
    if (!(await isVip(adminClient, user.email))) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action;

    // ---------- LIST ----------
    if (action === "list") {
      const status = body.status === "approved" ? true : body.status === "pending" ? false : null;
      let q = adminClient.from("knowledge_articles")
        .select("id, title, authors, year, journal, pedro_score, study_type, niche_tags, abstract, key_findings, doi, source_url, approved, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== null) q = q.eq("approved", status);
      if (body.niche) q = q.contains("niche_tags", [body.niche]);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ articles: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- APPROVE ----------
    if (action === "approve") {
      const { error } = await adminClient.from("knowledge_articles")
        .update({ approved: true, updated_at: new Date().toISOString() })
        .eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
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
      for (const k of ["title","authors","year","journal","pedro_score","study_type","abstract","key_findings","doi","source_url","niche_tags"]) {
        if (k in body) patch[k] = body[k];
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

    // ---------- INGEST ----------
    if (action === "ingest") {
      const niche: string = body.niche;
      const count = Math.min(Math.max(Number(body.count) || 6, 1), 10);
      if (!niche || !NICHE_DESCRIPTIONS[niche]) {
        return new Response(JSON.stringify({ error: "Nicho inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prompt = `Você é um curador de evidências em fisioterapia.

Liste ${count} estudos REAIS, de alta qualidade, da base PEDro (https://pedro.org.au) para o nicho:
"${NICHE_DESCRIPTIONS[niche]}"

CRITÉRIOS OBRIGATÓRIOS:
- PEDro score ≥ 7/10 (se RCT). Para revisões sistemáticas/meta-análises, pode listar mesmo sem PEDro (usar 8 como padrão).
- Priorize meta-análises, revisões sistemáticas e RCTs recentes (últimos 15 anos).
- NÃO invente estudos. Se não tiver certeza do estudo, NÃO inclua.
- Para cada estudo: title, authors (Sobrenome A, Sobrenome B), year (int), journal, pedro_score (int 0-10), study_type ("RCT" | "Systematic Review" | "Meta-analysis"), abstract (3-5 frases em pt-BR resumindo objetivo/método/resultado), key_findings (1-2 frases em pt-BR com o achado clínico mais aplicável), doi (se souber), source_url (URL da PEDro/PubMed se souber, senão null).

Responda APENAS um JSON array. Sem texto adicional.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: "Você é um bibliotecário científico rigoroso. Responde apenas JSON válido." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("[ingest] AI error", aiResp.status, t);
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "ai_rate_limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiJson = await aiResp.json();
      const raw = aiJson.choices?.[0]?.message?.content || "";
      const parsed = safeParseJson(raw);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.articles) ? parsed.articles : [];

      let inserted = 0;
      for (const it of items) {
        try {
          const pedro = Number(it.pedro_score);
          if (!it.title || isNaN(pedro) || pedro < 7) continue;
          const text = [it.title, it.abstract, it.key_findings].filter(Boolean).join("\n\n");
          const vec = await embed(LOVABLE_API_KEY, text);
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
            doi: it.doi || null,
            source_url: it.source_url || null,
            approved: false,
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

      return new Response(JSON.stringify({ ok: true, inserted, candidates: items.length }), {
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
