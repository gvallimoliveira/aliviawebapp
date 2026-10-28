/**
 * LEITURA DE IA DE UM PRINT/FOTO DO STUDIO (uso exclusivo do dono).
 *
 * Recebe a imagem + a legenda atual e devolve os temas da plataforma que a
 * imagem mostra, escolhidos de uma lista fechada. O cliente grava esses temas
 * na legenda ("Temas: …"), que é o que o motor local lê — a IA só enriquece a
 * legenda uma vez por foto, nunca roda na geração das artes.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER_EMAILS = ["gvallimoliveira@gmail.com", "gvallim.fisio@gmail.com"];

const THEMES = [
  "avaliação manual", "anamnese", "mapa de dor", "red flags", "testes funcionais", "questionários",
  "FABQ", "hipótese diagnóstica", "prontuário", "relatório PDF", "STEPS", "periodização", "controle de carga",
  "D.I.F.I", "HEP exercícios", "diário de dor", "agente clínico", "evidência", "gravação de voz",
  "dinamometria", "reavaliação", "link de avaliação", "agenda", "NPS", "mensagens", "saúde geral",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "IA indisponível" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email?.toLowerCase();
    if (!email || !OWNER_EMAILS.includes(email)) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const image = typeof body?.image === "string" ? body.image : "";
    const caption = typeof body?.caption === "string" ? body.caption.slice(0, 600) : "";
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(image) || image.length > 12_000_000) {
      return json({ error: "Imagem inválida" }, 400);
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Esta imagem é um print ou foto usada nas artes de marketing do Aliv.iA (software de fisioterapia).",
                "Diga quais temas da lista ela mostra de fato (máximo 3, o principal primeiro) e descreva em uma frase curta o que aparece.",
                "Use a legenda do usuário como contexto, mas só marque tema visível ou declarado nela.",
                `Legenda do usuário: ${caption || "(vazia)"}`,
              ].join("\n"),
            },
            { type: "input_image", image_url: image },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "photo_read",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["themes", "summary"],
              properties: {
                themes: { type: "array", items: { type: "string", enum: THEMES } },
                summary: { type: "string" },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: res.status === 402 ? "Créditos de IA esgotados" : "Leitura falhou", detail: detail.slice(0, 300) }, res.status);
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
        if (evt.type === "response.completed" && !text && typeof evt.response?.output_text === "string") text = evt.response.output_text;
      } catch { /* parcial */ }
    }
    let out: { themes?: string[]; summary?: string } = {};
    try { out = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { out = JSON.parse(m[0]); } catch { out = {}; }
    }
    const themes = (out.themes ?? []).filter((t) => THEMES.includes(t)).slice(0, 3);
    if (!themes.length && !out.summary) return json({ error: "Sem leitura útil" }, 422);
    return json({ themes, summary: (out.summary ?? "").slice(0, 200) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});
