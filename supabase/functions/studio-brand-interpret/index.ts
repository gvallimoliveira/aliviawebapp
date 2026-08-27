// Interpreta o produto/empresa de uma marca do Aliv.iA Studio e devolve o
// briefing que alimenta o motor criativo: posicionamento, palavras-chave,
// nichos (com dores, desejos, provas e CTA) e notas de estratégia.
//
// Reprodutível para qualquer cliente: nada aqui é específico de fisioterapia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { shadowLogAiUsage } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Extração tolerante: JSON puro, cercado por ```json, ou embutido em texto. */
const extractJson = (raw: string): Record<string, unknown> | null => {
  const attempts: string[] = [raw.trim()];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) attempts.push(fence[1].trim());
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(raw.slice(first, last + 1));
  attempts.push(raw.replace(/,\s*([}\]])/g, "$1"));
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // tenta a próxima camada
    }
  }
  return null;
};

const strList = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.map((v) => String(v ?? "").trim()).filter(Boolean).slice(0, max)
    : [];

const slugify = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32) || "publico";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    shadowLogAiUsage(req, { function_name: "studio-brand-interpret" });
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const brandId = String(body?.brandId ?? "").trim();
    if (!brandId) return json({ error: "brandId é obrigatório" }, 400);

    // A marca precisa ser do próprio usuário (RLS reforçada em código).
    const { data: brand, error: brandError } = await supabase
      .from("studio_brands")
      .select("id, user_id, name, niche, tone, description, source_url, instagram_handle, topics, audiences")
      .eq("id", brandId)
      .maybeSingle();
    if (brandError) return json({ error: "Não foi possível ler a marca" }, 500);
    if (!brand || brand.user_id !== user.id) return json({ error: "Marca não encontrada" }, 404);

    const existingAudiences = (Array.isArray(brand.audiences) ? brand.audiences : []) as Array<
      Record<string, unknown>
    >;
    const existingLabels = existingAudiences
      .map((a) => String(a?.label ?? "").trim())
      .filter(Boolean);

    const brief = [
      `Nome da marca: ${brand.name}`,
      brand.niche ? `Nicho/setor: ${brand.niche}` : null,
      brand.description ? `Descrição do produto: ${brand.description}` : null,
      brand.tone ? `Tom de voz: ${brand.tone}` : null,
      brand.source_url ? `Site: ${brand.source_url}` : null,
      brand.instagram_handle ? `Instagram: ${brand.instagram_handle}` : null,
      Array.isArray(brand.topics) && brand.topics.length ? `Palavras-chave atuais: ${brand.topics.join(", ")}` : null,
      existingLabels.length ? `Públicos já cadastrados (manter todos): ${existingLabels.join(", ")}` : null,
      typeof body?.extra === "string" && body.extra.trim() ? `Contexto extra do cliente: ${body.extra.trim()}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é estrategista de conteúdo. A partir do briefing de uma marca, você produz o mapa editorial que alimentará um gerador de artes para redes sociais.

Regras:
- Escreva em português do Brasil, linguagem concreta, sem jargão de marketing e sem clichê ("soluções inovadoras", "excelência", "transformar vidas").
- Segmente o produto em 2 a 5 públicos (nichos) REAIS e distintos, cada um com dores, desejos e provas próprias.
- IMPORTANTE: se o produto também é usado pelo consumidor final (paciente, cliente, aluno, usuário leigo), esse público NUNCA pode ficar de fora — inclua-o junto dos públicos profissionais/B2B.
- Se a marca já tem públicos cadastrados no briefing, mantenha-os (pode refinar o texto), não os substitua por outros.
- Além dos nichos, escreva um posicionamento global 360° que interpola todos eles: o que o produto é como um todo.
- Nunca invente números, prêmios, certificações ou depoimentos.
- Se a marca lida com saúde, nunca prometa cura nem diagnóstico definitivo.

Responda SOMENTE com JSON válido neste formato:
{
  "positioning": "2 a 3 frases sobre o produto inteiro, servindo de base do conteúdo 360°",
  "keywords": ["6 a 10 palavras-chave curtas"],
  "strategy_notes": "3 a 5 linhas sobre como informar, gerar desejo e vender para esta marca",
  "audiences": [
    {
      "label": "Nome curto do público",
      "description": "Quem é e em que momento chega",
      "pains": ["2 a 4 dores concretas"],
      "desires": ["2 a 3 desejos"],
      "proof": ["2 a 4 provas/diferenciais que convencem esse público"],
      "cta": "Chamada para ação curta"
    }
  ]
}`;

    const resp = await callAiWithFallback(
      LOVABLE_API_KEY,
      {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: brief },
        ],
      },
      ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
      { functionName: "studio-brand-interpret", maxTokens: 2200, metadata: { brand_id: brandId } },
    );

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      if (resp.status === 402) {
        return json({ error: "Créditos de IA esgotados. Adicione créditos para interpretar a marca." }, 402);
      }
      if (resp.status === 429) {
        return json({ error: "Muitas solicitações agora. Tente novamente em alguns instantes." }, 429);
      }
      console.error("[studio-brand-interpret] gateway", resp.status, detail.slice(0, 400));
      return json({ error: "A IA não respondeu. Tente novamente." }, 502);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(String(raw));
    if (!parsed) {
      console.error("[studio-brand-interpret] parse fail", String(raw).slice(0, 400));
      return json({ error: "Não foi possível interpretar a resposta da IA." }, 502);
    }

    const audiences = (Array.isArray(parsed.audiences) ? parsed.audiences : [])
      .map((item: unknown) => {
        const row = (item ?? {}) as Record<string, unknown>;
        const label = String(row.label ?? "").trim();
        if (!label) return null;
        return {
          id: slugify(label),
          label: label.slice(0, 40),
          description: String(row.description ?? "").trim().slice(0, 300) || undefined,
          pains: strList(row.pains, 4),
          desires: strList(row.desires, 3),
          proof: strList(row.proof, 4),
          cta: String(row.cta ?? "").trim().slice(0, 60) || undefined,
        };
      })
      .filter(Boolean)
      .slice(0, 6) as Array<Record<string, unknown>>;

    /**
     * Nunca perder um público já cadastrado (ex.: o mundo do paciente do
     * Aliv.iA). A IA pode refinar os existentes, mas não excluí-los.
     */
    const byId = new Map<string, Record<string, unknown>>();
    for (const a of existingAudiences) {
      const label = String(a?.label ?? "").trim();
      if (!label) continue;
      byId.set(String(a?.id ?? slugify(label)), a);
    }
    for (const a of audiences) {
      const id = String(a.id);
      const prev = byId.get(id);
      byId.set(id, prev ? { ...prev, ...a } : a);
    }
    const mergedAudiences = Array.from(byId.values()).slice(0, 8);

    const result = {
      positioning: String(parsed.positioning ?? "").trim().slice(0, 800),
      keywords: strList(parsed.keywords, 10),
      strategy_notes: String(parsed.strategy_notes ?? "").trim().slice(0, 900),
      audiences: mergedAudiences,
    };

    // Persiste como briefing da marca — o usuário revisa e edita depois.
    const { error: updateError } = await supabase
      .from("studio_brands")
      .update({
        positioning: result.positioning || null,
        strategy_notes: result.strategy_notes || null,
        audiences: result.audiences,
        ...(result.keywords.length ? { topics: result.keywords } : {}),
      })
      .eq("id", brandId);
    if (updateError) {
      console.error("[studio-brand-interpret] update", updateError);
      return json({ error: "Interpretação feita, mas não foi possível salvar." }, 500);
    }

    return json({ ok: true, ...result });
  } catch (error) {
    console.error("[studio-brand-interpret]", error);
    return json({ error: "Erro inesperado ao interpretar a marca." }, 500);
  }
});
