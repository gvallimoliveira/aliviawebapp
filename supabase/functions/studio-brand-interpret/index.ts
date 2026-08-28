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

const HEX = /^#[0-9a-fA-F]{6}$/;

const normalizeUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

/** Resolve caminho relativo do HTML para URL absoluta. */
const absolutize = (candidate: string, base: string): string | null => {
  const value = candidate.trim().replace(/^['"]|['"]$/g, "");
  if (!value || value.startsWith("data:")) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
};

const IMG_EXT = /\.(png|jpe?g|svg|webp|avif|gif)(\?|#|$)/i;

/**
 * LOGO DA MARCA A PARTIR DO SITE.
 *
 * Antes o cliente colava o site e o campo de logo ficava vazio (ou com a URL do
 * próprio site, que não é imagem). Aqui procuramos, em ordem de confiança:
 * 1. <img> cujo src/alt/class fale "logo" (a marca de verdade no header);
 * 2. og:image / twitter:image (arte social, quase sempre com a marca);
 * 3. apple-touch-icon / link rel icon (fallback quadrado).
 */
const findLogo = (html: string, base: string): string | null => {
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of imgs) {
    const src = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const haystack = `${src} ${tag.match(/\salt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""} ${
      tag.match(/\sclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""
    }`.toLowerCase();
    if (!/logo|brand|marca|wordmark/.test(haystack)) continue;
    const url = absolutize(src, base);
    if (url) return url;
  }

  const metas = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const re of metas) {
    const hit = html.match(re)?.[1];
    const url = hit ? absolutize(hit, base) : null;
    if (url && (IMG_EXT.test(url) || url.includes("image"))) return url;
  }
  return null;
};

/**
 * Leitura da landing page do cliente: texto visível (para a IA entender a
 * proposta), as cores mais frequentes e o logo da marca.
 * Falha silenciosa — site fora do ar não pode travar a interpretação.
 */
const readSite = async (
  rawUrl: string,
): Promise<{ text: string; colors: string[]; logo: string | null }> => {
  const url = normalizeUrl(rawUrl);
  const empty = { text: "", colors: [], logo: null };
  if (!url) return empty;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AliviaStudioBot/1.0)" },
    });
    clearTimeout(timer);
    if (!resp.ok) return empty;
    const html = (await resp.text()).slice(0, 400_000);

    const counts = new Map<string, number>();
    for (const match of html.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const hex = match[0].toLowerCase();
      // Ignora branco/preto puros: quase sempre são texto e fundo padrão.
      if (hex === "#ffffff" || hex === "#000000") continue;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    const colors = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hex]) => hex);

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 9000);

    return { text, colors, logo: findLogo(html, url) };
  } catch (err) {
    console.error("[studio-brand-interpret] site fetch", String(err).slice(0, 200));
    return empty;
  }
};

/* ---------- Contraste: nenhuma arte pode sair ilegível ---------- */

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const chan = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map(chan);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
};
const toHex = (c: [number, number, number]) =>
  `#${c.map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const darken = (hex: string, amount: number) => {
  const c = rgb(hex);
  return toHex([c[0] * (1 - amount), c[1] * (1 - amount), c[2] * (1 - amount)]);
};
/** Cor de marca escura o suficiente para receber texto branco. */
const brandSurface = (hex: string) => {
  let out = hex;
  for (let i = 0; i < 12 && ratio(out, "#FFFFFF") < 4.5; i += 1) out = darken(out, 0.12);
  return out;
};
const readableOn = (hex: string) => (lum(hex) > 0.45 ? "#111111" : "#FFFFFF");



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
      .select(
        "id, user_id, name, niche, tone, description, source_url, instagram_handle, topics, audiences, colors, logo_url",
      )
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

    // Lê a landing page do cliente (texto + cores + logo) quando há site cadastrado.
    const site = brand.source_url
      ? await readSite(String(brand.source_url))
      : { text: "", colors: [], logo: null };

    /**
     * Logo: só grava quando a marca não tem um logo de imagem válido. Um valor
     * como "https://minhamarca.com.br" (o próprio site) não é logo e era usado
     * como imagem, deixando a assinatura das artes quebrada.
     */
    const currentLogo = String(brand.logo_url ?? "").trim();
    const currentLogoIsImage =
      !!currentLogo && (IMG_EXT.test(currentLogo) || currentLogo.startsWith("data:image"));
    const logoUrl = currentLogoIsImage ? currentLogo : site.logo;


    const brief = [
      `Nome da marca: ${brand.name}`,
      brand.niche ? `Nicho/setor: ${brand.niche}` : null,
      brand.description ? `Descrição do produto: ${brand.description}` : null,
      brand.tone
        ? `Tom de voz (DIRETRIZ de escrita, nunca copiar para dentro das artes): ${String(brand.tone).slice(0, 1500)}`
        : null,
      brand.source_url ? `Site: ${brand.source_url}` : null,
      brand.instagram_handle ? `Instagram: ${brand.instagram_handle}` : null,
      Array.isArray(brand.topics) && brand.topics.length ? `Palavras-chave atuais: ${brand.topics.join(", ")}` : null,
      existingLabels.length ? `Públicos já cadastrados (manter todos): ${existingLabels.join(", ")}` : null,
      typeof body?.extra === "string" && body.extra.trim() ? `Contexto extra do cliente: ${body.extra.trim()}` : null,
      site.colors.length ? `Cores mais usadas no site (ordem de frequência): ${site.colors.join(", ")}` : null,
      site.text ? `\nTexto extraído da landing page (fonte primária da proposta):\n"""\n${site.text}\n"""` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é estrategista de conteúdo. A partir do briefing de uma marca, você produz o mapa editorial que alimentará um gerador de artes para redes sociais.

Regras:
- Escreva em português do Brasil, linguagem concreta, sem jargão de marketing e sem clichê ("soluções inovadoras", "excelência", "transformar vidas").
- Se houver texto da landing page no briefing, ele é a fonte primária: a proposta, os produtos e os públicos devem sair de lá, não de suposições.
- O "tom de voz" do briefing é diretriz de ESTILO: guia como escrever, mas o texto dele nunca é reaproveitado como frase da marca.
- Segmente o produto em 2 a 5 públicos (nichos) REAIS e distintos, cada um com dores, desejos e provas próprias.
- IMPORTANTE: se o produto também é usado pelo consumidor final (paciente, cliente, aluno, usuário leigo), esse público NUNCA pode ficar de fora — inclua-o junto dos públicos profissionais/B2B.
- Se a marca já tem públicos cadastrados no briefing, mantenha-os (pode refinar o texto), não os substitua por outros.
- Além dos nichos, escreva um posicionamento global 360° que interpola todos eles: o que o produto é como um todo.
- Escreva também um "tagline": UMA frase curta (até 80 caracteres) que resume a marca e pode aparecer dentro das artes.
- Cores (papéis, não decoração): "primary" é a cor de MARCA usada em fundos e formas; "primary2" é a cor de TEXTO que fica sobre ela e precisa de contraste alto (≥ 4.5:1); "secondary" é o destaque e "secondary2" um neutro claro de fundo. Escolha entre as cores do site quando houver; nunca devolva um par de baixo contraste (ex.: verde neon com branco). Sem cores no briefing, omita o campo.

- Nunca invente números, prêmios, certificações ou depoimentos.
- Se a marca lida com saúde, nunca prometa cura nem diagnóstico definitivo.

Responda SOMENTE com JSON válido neste formato:
{
  "positioning": "2 a 3 frases sobre o produto inteiro, servindo de base do conteúdo 360°",
  "tagline": "uma frase curta (até 80 caracteres) que pode aparecer na arte",

  "keywords": ["6 a 10 palavras-chave curtas"],
  "strategy_notes": "3 a 5 linhas sobre como informar, gerar desejo e vender para esta marca",
  "colors": { "primary": "#RRGGBB", "primary2": "#RRGGBB", "secondary": "#RRGGBB", "secondary2": "#RRGGBB" },
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

    /**
     * Cores do site: só aplicadas quando o cliente pediu (`applyColors`) e a IA
     * devolveu hex válidos. O kit manual do usuário nunca é sobrescrito à força.
     */
    const rawColors = (parsed.colors ?? {}) as Record<string, unknown>;
    const pickHex = (value: unknown) => {
      const hex = String(value ?? "").trim();
      return HEX.test(hex) ? hex.toUpperCase() : null;
    };
    const primary = pickHex(rawColors.primary);
    const primary2 = pickHex(rawColors.primary2);
    const secondary = pickHex(rawColors.secondary);
    const secondary2 = pickHex(rawColors.secondary2);
    const applyColors = body?.applyColors === true && !!primary;
    /**
     * Papéis + contraste garantido: a cor de marca é escurecida até suportar
     * texto claro e a cor de texto é recalculada quando o par ficaria ilegível
     * (era daí que vinham posts com verde neon e branco por cima).
     */
    let colorKit: Record<string, string> | null = null;
    if (applyColors) {
      const surface = ratio(primary!, "#FFFFFF") >= 4.5 ? primary! : brandSurface(primary!);
      const onSurface =
        primary2 && ratio(surface, primary2) >= 4.5 ? primary2 : readableOn(surface);
      const accent = secondary ?? surface;
      const neutral =
        secondary2 && lum(secondary2) > 0.75 ? secondary2 : "#F5F7F6";
      colorKit = {
        primary: surface,
        primary2: onSurface,
        secondary: accent,
        secondary2: neutral,
        useSecondary: secondary ? "true" : "false",
      };
    }

    const tagline = String(parsed.tagline ?? "").trim().replace(/\s+/g, " ").slice(0, 90);

    const result = {
      positioning: String(parsed.positioning ?? "").trim().slice(0, 800),
      tagline,
      keywords: strList(parsed.keywords, 10),
      strategy_notes: String(parsed.strategy_notes ?? "").trim().slice(0, 900),
      audiences: mergedAudiences,
      colors: colorKit,
      logo_url: logoUrl,
      site_read: !!site.text,
    };

    // Persiste como briefing da marca — o usuário revisa e edita depois.
    const { error: updateError } = await supabase
      .from("studio_brands")
      .update({
        positioning: result.positioning || null,
        strategy_notes: result.strategy_notes || null,
        audiences: result.audiences,
        ...(result.keywords.length ? { topics: result.keywords } : {}),
        ...(colorKit ? { colors: colorKit } : {}),
        ...(logoUrl && !currentLogoIsImage ? { logo_url: logoUrl } : {}),
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
