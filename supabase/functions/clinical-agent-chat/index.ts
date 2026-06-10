import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_QUOTA = 30;
const MODEL = "google/gemini-3-flash-preview";

// ---- VIP / access check ----
async function isVipEmail(adminClient: any, email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await adminClient
    .from("vip_users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return !!data;
}

async function agentEnabledGlobally(adminClient: any): Promise<boolean> {
  const { data } = await adminClient
    .from("app_config")
    .select("value")
    .eq("key", "clinical_agent_enabled")
    .maybeSingle();
  return data?.value === true;
}

// ---- Anonymization ----
function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 4);
}
function initials(name?: string | null): string {
  if (!name) return "Paciente";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase() + ".";
  return parts.map(p => p[0].toUpperCase()).join(".") + ".";
}
function scrub(t: any): any {
  if (typeof t !== "string") return t;
  return t
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
    .replace(/\b\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[telefone]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
}

// ---- Patient context loader ----
async function loadPatientContext(adminClient: any, patientId: string, userId: string) {
  const { data: patient } = await adminClient
    .from("patients")
    .select("id, full_name, birth_date, gender")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return null;

  const { data: assessments } = await adminClient
    .from("assessments")
    .select("id, created_at, pain_score, pain_regions, anamnesis_data, diagnosis, final_hypothesis_override, treatment_plan, questionnaire_results, clinical_impression")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: heps } = await adminClient
    .from("exercise_programs")
    .select("id, name, created_at, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(3);

  const diaryQuery = await adminClient
    .from("pain_diary_entries")
    .select("created_at, pain_score, notes")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(7);

  const label = `${initials(patient.full_name)} #${shortHash(patient.id)}`;
  const age = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 86400000))
    : null;

  return {
    label,
    age,
    gender: patient.gender,
    assessments: (assessments || []).map((a: any) => ({
      date: a.created_at?.slice(0, 10),
      pain_score: a.pain_score,
      pain_regions: a.pain_regions,
      hypothesis: a.final_hypothesis_override || a.diagnosis?.hypothesis,
      summary: scrub(a.clinical_impression?.overview || a.diagnosis?.summary || ""),
      questionnaires: a.questionnaire_results,
      chief_complaint: scrub(a.anamnesis_data?.chiefComplaint),
    })),
    active_heps: (heps || []).map((h: any) => ({ name: h.name, status: h.status, date: h.created_at?.slice(0,10) })),
    recent_pain_diary: (diaryQuery.data || []).map((d: any) => ({
      date: d.created_at?.slice(0, 10),
      pain: d.pain_score,
    })),
  };
}

// ---- Quota ----
async function checkAndIncrementQuota(adminClient: any, userId: string): Promise<{ ok: boolean; used: number; limit: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await adminClient
    .from("agent_usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();
  const used = existing?.message_count || 0;
  if (used >= DAILY_QUOTA) return { ok: false, used, limit: DAILY_QUOTA };
  await adminClient
    .from("agent_usage_daily")
    .upsert({ user_id: userId, usage_date: today, message_count: used + 1, updated_at: new Date().toISOString() });
  return { ok: true, used: used + 1, limit: DAILY_QUOTA };
}

// ---- Knowledge RAG (uses embeddings; safe to no-op if base empty) ----
async function searchEvidence(adminClient: any, lovableKey: string, query: string, niches?: string[]) {
  try {
    const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: query }),
    });
    if (!embResp.ok) return [];
    const emb = await embResp.json();
    const vector = emb.data?.[0]?.embedding;
    if (!vector) return [];
    const { data } = await adminClient.rpc("match_knowledge_articles", {
      query_embedding: vector,
      match_count: 5,
      niche_filter: niches && niches.length ? niches : null,
      min_pedro: 7,
    });
    return data || [];
  } catch (e) {
    console.warn("[agent] RAG search failed:", e);
    return [];
  }
}

// ---- System prompt ----
function buildSystemPrompt(patientCtx: any, evidence: any[]) {
  const ev = evidence.length
    ? `\n\nEVIDÊNCIAS RELEVANTES (use e cite no formato [Autor, ano, PEDro X]):\n${evidence
        .map((e: any) => `- ${e.title} (${e.authors || "—"}, ${e.year || "—"}, PEDro ${e.pedro_score ?? "—"}) — ${e.key_findings || e.journal || ""}`)
        .join("\n")}`
    : "\n\n(Base de evidências vazia neste nicho — responda com base em STEPS/D.I.F.I e diretrizes gerais, sinalize a ausência ao usuário.)";

  const pat = patientCtx
    ? `\n\nPACIENTE EM DISCUSSÃO (anonimizado):
- Identificador: ${patientCtx.label}
- Idade: ${patientCtx.age ?? "—"} | Gênero: ${patientCtx.gender ?? "—"}
- Últimas avaliações: ${JSON.stringify(patientCtx.assessments)}
- HEPs ativos: ${JSON.stringify(patientCtx.active_heps)}
- Diário de dor recente: ${JSON.stringify(patientCtx.recent_pain_diary)}`
    : "";

  return `Você é o Agente de Raciocínio Clínico da Aliv.iA, um assistente conversacional para fisioterapeutas.

ESTILO DE CONVERSA (MUITO IMPORTANTE):
- Este é um BATE-PAPO objetivo, não um relatório. Mensagens curtas, em tom acolhedor e direto, em pt-BR.
- Antes de entregar orientações, condutas, programas ou explanações longas, FAÇA 1 a 3 perguntas pertinentes para refinar o contexto clínico (mecanismo, tempo, irritabilidade, fatores de melhora/piora, objetivo do paciente, exames já feitos, achados de testes, etc.). Uma pergunta de cada vez sempre que possível.
- Só pule a fase de perguntas quando o usuário fizer uma demanda direta e específica (ex.: "gere um HEP para...", "me dê critérios de progressão para...", "qual a evidência sobre X?"). Nesses casos, responda objetivamente já.
- Quando já tiver contexto suficiente, entregue diretrizes claras e acionáveis (bullets curtos), e ofereça o próximo passo ("quer que eu sugira testes?", "quer um HEP?").
- Evite respostas-monólogo. Prefira trocas curtas, como um colega clínico raciocinando junto.

PRINCÍPIOS CLÍNICOS:
- Aplique a metodologia STEPS (6 fases) e D.I.F.I (Pain, Inhibition, Weakness, Disability) quando pertinente.
- Base-se em evidência: priorize meta-análises e revisões com PEDro ≥ 7. Cite entre colchetes quando disponíveis [Autor, ano, PEDro X].
- Sinalize red flags imediatamente com "⚠️ ALERTA:".
- Integre os dados do paciente quando fornecidos, lembrando que a anamnese presencial é insubstituível.
- HEP: NUNCA descreva exercícios no chat quando houver paciente vinculado. Em vez disso, oriente o profissional a clicar no botão "Gerar HEP" no cabeçalho — ele cria um programa real (com link compartilhável) baseado na última avaliação. Só descreva exercícios em texto quando NÃO houver paciente vinculado ou quando o usuário pedir explicitamente exemplos genéricos.

LIMITES:
- Versão BETA — base de evidências em construção. Se vazia neste nicho, sinalize e siga em STEPS/D.I.F.I.
- Nunca diagnostique de forma definitiva. Use "hipótese provável", "consistente com".
- Para dor severa (EVA ≥ 7) com sinais sistêmicos, sugira reavaliação médica.${pat}${ev}`;
}

// ---- Main handler ----
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Access gate
    const [vip, globalOn] = await Promise.all([
      isVipEmail(adminClient, user.email),
      agentEnabledGlobally(adminClient),
    ]);
    if (!vip && !globalOn) {
      return new Response(JSON.stringify({ error: "Agent not available yet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { thread_id, message } = body;
    if (!thread_id || !message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "thread_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate thread ownership + load context
    const { data: thread } = await adminClient
      .from("agent_threads")
      .select("id, user_id, patient_id, title")
      .eq("id", thread_id)
      .maybeSingle();
    if (!thread || thread.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota
    const quota = await checkAndIncrementQuota(adminClient, user.id);
    if (!quota.ok) {
      return new Response(JSON.stringify({ error: "quota_exceeded", limit: quota.limit }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load thread history (last 20 messages)
    const { data: history } = await adminClient
      .from("agent_messages")
      .select("role, parts")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persist user message
    const userMsg = scrub(message).slice(0, 4000);
    await adminClient.from("agent_messages").insert({
      thread_id, role: "user", parts: [{ type: "text", text: userMsg }],
    });

    // Patient context (if linked)
    let patientCtx = null;
    if (thread.patient_id) {
      patientCtx = await loadPatientContext(adminClient, thread.patient_id, user.id);
    }

    // Evidence RAG based on the current question
    const { data: settings } = await adminClient
      .from("agent_settings").select("preferred_niches").eq("user_id", user.id).maybeSingle();
    const evidence = await searchEvidence(adminClient, LOVABLE_API_KEY, userMsg, settings?.preferred_niches);

    const systemPrompt = buildSystemPrompt(patientCtx, evidence);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.parts)
          ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
          : String(m.parts || ""),
      })),
      { role: "user", content: userMsg },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[agent] AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "ai_rate_limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const assistantText = aiJson.choices?.[0]?.message?.content || "";

    const citations = evidence.map((e: any) => ({
      id: e.id, title: e.title, authors: e.authors, year: e.year,
      pedro_score: e.pedro_score, doi: e.doi, source_url: e.source_url,
    }));

    await adminClient.from("agent_messages").insert({
      thread_id, role: "assistant",
      parts: [{ type: "text", text: assistantText }],
      citations: citations.length ? citations : null,
      tokens_in: aiJson.usage?.prompt_tokens,
      tokens_out: aiJson.usage?.completion_tokens,
    });

    // Touch thread + auto-title after 2nd assistant turn
    await adminClient.from("agent_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread_id);

    if (thread.title === "Nova conversa" && (history?.length || 0) >= 2) {
      // generate title (cheap, non-blocking)
      try {
        const titleResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Gere um título curto (máx 6 palavras, pt-BR) para esta conversa clínica. Responda apenas o título." },
              { role: "user", content: `Mensagem: ${userMsg.slice(0, 300)}` },
            ],
          }),
        });
        if (titleResp.ok) {
          const tj = await titleResp.json();
          const title = (tj.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "").slice(0, 80);
          if (title) await adminClient.from("agent_threads").update({ title }).eq("id", thread_id);
        }
      } catch {}
    }

    return new Response(JSON.stringify({
      assistant: assistantText,
      citations,
      quota: { used: quota.used, limit: quota.limit },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[clinical-agent-chat] fatal", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
