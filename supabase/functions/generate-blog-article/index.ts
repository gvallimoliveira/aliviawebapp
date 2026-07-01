import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, keywords } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const keywordsList = (keywords as string[])?.length ? keywords.join(", ") : "";
    const keywordsInstruction = keywordsList
      ? `Palavras-chave SEO obrigatórias (distribua naturalmente no texto, título e subtítulos): ${keywordsList}.`
      : "";

    const systemPrompt = `Você é um redator especialista em conteúdo de saúde e fisioterapia para o blog da Aliv.iA — uma plataforma de raciocínio clínico com inteligência artificial.

REGRAS OBRIGATÓRIAS (não pode violar):
- URL DO APP: TODO link embutido para a Aliv.iA deve usar EXATAMENTE https://aliviawebapp.com.br (ou paths sob esse domínio, como https://aliviawebapp.com.br/profissional, /clinica, /academico). NUNCA use alivia.app, alivia.com.br, alivia.io, nem qualquer outra variante. Nas duas versões (PT e EN) o domínio é o mesmo.
- PÚBLICO PROFISSIONAL (fisioterapeutas, clínicas, acadêmicos): NÃO existe "avaliação gratuita" para eles. É PROIBIDO prometer "avaliação gratuita", "free assessment", "free evaluation" ou "evaluación gratuita" a esse público. Para profissionais, ofereça: "teste grátis de 14 dias do plano PRO (sem cartão de crédito)", "conheça o plano Profissional" ou "explore a Aliv.iA Clínica" — sempre linkando para https://aliviawebapp.com.br/profissional ou /clinica.
- PÚBLICO PACIENTE: aí sim pode prometer "avaliação gratuita" da Aliv.iA, linkando para https://aliviawebapp.com.br/.
- Antes de decidir o CTA, identifique o público do tema recebido e escolha a promessa correta.

Diretrizes editoriais:
1. LINGUAGEM: Simples, acessível, empática. Fale diretamente com o leitor usando "você". Evite jargão técnico excessivo.
2. GATILHOS MENTAIS: urgência, autoridade, prova social, curiosidade nos subtítulos — sem promessas falsas.
3. SEO: Título com palavra-chave principal. Subtítulos H2/H3 com variações. Parágrafos curtos (2-3 frases). Meta description persuasiva.
4. CONVERSÃO: Inclua 2-3 CTAs ao longo do texto, sempre respeitando as regras acima sobre público e URL.
5. ESTRUTURA: Introdução gancho → Problema/dor do leitor → Informação educativa → Solução → CTA final forte.
6. FORMATO: Conteúdo em HTML com tags <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. NÃO use <h1>.
7. TAMANHO: Artigo completo com 800-1200 palavras.
8. BILÍNGUE: Gere versões em português (BR) e inglês, ambas seguindo as REGRAS OBRIGATÓRIAS.

${keywordsInstruction}`;

    const userPrompt = `Gere um artigo completo sobre o tema: "${topic}"`;

    const response = await callAiWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "publish_article",
            description: "Return the generated blog article with all fields.",
            parameters: {
              type: "object",
              properties: {
                title_pt: { type: "string", description: "Título do artigo em português (BR), otimizado para SEO" },
                title_en: { type: "string", description: "Article title in English, SEO optimized" },
                content_pt: { type: "string", description: "Conteúdo completo do artigo em HTML (português BR)" },
                content_en: { type: "string", description: "Full article content in HTML (English)" },
                excerpt_pt: { type: "string", description: "Meta description em português (max 160 chars)" },
                excerpt_en: { type: "string", description: "Meta description in English (max 160 chars)" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "5-8 tags relevantes para o artigo",
                },
              },
              required: ["title_pt", "title_en", "content_pt", "content_en", "excerpt_pt", "excerpt_en", "tags"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "publish_article" } },
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text();
      console.error("AI gateway error:", status, body);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const article = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-article error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
