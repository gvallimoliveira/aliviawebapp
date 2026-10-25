// Extract clinical content from an attachment (PDF laudo or image) using Gemini
// multimodal. The extracted text is returned to the client so it can be inlined
// into the user's next chat message — that way the agent naturally considers it
// in the current turn AND in every subsequent turn via the thread history.
//
// No storage bucket: the raw file is discarded after extraction. Only the
// interpreted text lives on, inside agent_messages.parts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB (base64 payload roughly 11MB)
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_base64, mime_type, file_name } = await req.json();
    if (!file_base64 || typeof file_base64 !== "string") {
      return new Response(JSON.stringify({ error: "file_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_MIME.has(mime_type)) {
      return new Response(JSON.stringify({ error: "Formato não suportado. Aceita PDF ou imagem." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Approx byte size from base64 length (each 4 chars = 3 bytes).
    const approxBytes = Math.floor((file_base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Arquivo muito grande (máx 8MB)." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditDecision = await canaryCredits(req, "agent-analyze-attachment", {
      function_name: "agent-analyze-attachment",
      user_id: user.id,
      metadata: { mime_type, approx_bytes: approxBytes },
    });
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;

    const isPdf = mime_type === "application/pdf";
    const userContent: any[] = [
      {
        type: "text",
        text:
          `Você recebeu um anexo clínico enviado por um fisioterapeuta durante uma discussão de caso: "${file_name || "arquivo"}".\n\n` +
          `Extraia e organize o conteúdo clínico relevante em pt-BR, no formato:\n\n` +
          `**Tipo de documento:** (laudo de RM/TC/RX/US, receituário, prescrição, exame, foto clínica, etc.)\n` +
          `**Data / autor:** (se visível)\n` +
          `**Achados principais:** bullets curtos com os achados anatômicos/clínicos relevantes (edemas, tendinopatias, hérnias, roturas, degeneração, etc.), preservando terminologia técnica.\n` +
          `**Impressão / conclusão:** (o que o laudo conclui)\n` +
          `**Implicações para fisioterapia:** 2-4 bullets — o que esses achados sugerem para prognóstico, cuidados, contraindicações ou foco de tratamento.\n\n` +
          `Regras: seja fiel ao documento; não invente; se algum campo não estiver visível, escreva "(não informado)". ` +
          `Anonimize dados pessoais (nome do paciente, CPF, telefone, endereço, e-mail — substitua por [removido]). ` +
          `Se o arquivo não for legível ou não tiver conteúdo clínico, diga isso claramente.`,
      },
    ];

    if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: file_name || "documento.pdf",
          file_data: `data:${mime_type};base64,${file_base64}`,
        },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mime_type};base64,${file_base64}` },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente clínico que interpreta laudos e imagens médicas para fisioterapeutas. " +
              "Foco em traduzir achados em linguagem clínica objetiva e útil para raciocínio fisioterapêutico. " +
              "Nunca dê diagnóstico definitivo — apenas descreva o que o documento traz.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[agent-analyze-attachment] gateway error", aiResp.status, t.slice(0, 300));
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
      return new Response(JSON.stringify({ error: "Não consegui analisar o anexo agora." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await aiResp.json();
    const extracted = j.choices?.[0]?.message?.content?.trim() || "";
    if (!extracted) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair conteúdo do arquivo." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ extracted, file_name, mime_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[agent-analyze-attachment] fatal", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
