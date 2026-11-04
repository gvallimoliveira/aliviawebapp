/**
 * LEITURA DE IA DO KIT DA MARCA (diretor criativo do Studio).
 *
 * Uma chamada por marca/versão do kit — o cliente guarda o resultado em cache e
 * só chama de novo se o kit mudar. Uso restrito às contas admin; para todos os
 * outros usuários o diretor criativo funciona 100% local, sem crédito de IA.
 *
 * A IA NÃO escreve as artes: ela devolve apenas vocabulário, ângulos e frases-
 * semente que o motor local usa como matéria-prima.
 */

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/caller-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI indisponível" }, 500);

    // Server-side admin role check (never trust the account e-mail alone).
    const auth = await requireAdmin(req, corsHeaders);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => ({}));
    const kit = body?.kit ?? {};

    const prompt = [
      "Você é diretor criativo de uma marca. Leia o kit abaixo e devolve matéria-prima textual,",
      "não artes prontas. Português do Brasil, sem jargão de marketing, sem promessa de cura.",
      "",
      JSON.stringify(kit).slice(0, 6000),
    ].join("\n");

    /**
     * Responses API + streaming (exigência do gateway para modelos OpenAI):
     * consumimos o stream aqui dentro e devolvemos só o resultado final.
     */
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "brand_brief",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["angles", "vocabulary", "seeds", "avoid"],
              properties: {
                angles: { type: "array", items: { type: "string" } },
                vocabulary: { type: "array", items: { type: "string" } },
                seeds: { type: "array", items: { type: "string" } },
                avoid: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "AI falhou", status: res.status, detail: detail.slice(0, 400) }, res.status);
    }

    const raw = await res.text();
    let text = "";
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
        if (evt.type === "response.completed" && typeof evt.response?.output_text === "string" && !text) {
          text = evt.response.output_text;
        }
      } catch {
        /* linha parcial: ignora */
      }
    }

    let brief: unknown = null;
    try {
      brief = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          brief = JSON.parse(match[0]);
        } catch {
          brief = null;
        }
      }
    }
    if (!brief) return json({ error: "Resposta sem formato esperado" }, 502);

    return json({ brief });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
