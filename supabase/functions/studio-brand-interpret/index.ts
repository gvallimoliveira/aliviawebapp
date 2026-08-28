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

/**
 * Reconstrói um JSON cortado no meio (resposta truncada pelo limite de tokens):
 * fecha string aberta, descarta o último par incompleto e balanceia chaves.
 */
const repairTruncatedJson = (input: string): string | null => {
  const start = input.indexOf("{");
  if (start < 0) return null;
  let text = input.slice(start);
  // Remove cerca de código final, se houver.
  text = text.replace(/```[\s\S]*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastSafe = -1; // índice após o último valor completo em nível de objeto/array
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') {
        inString = false;
        lastSafe = i;
      }
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      lastSafe = i;
    } else if (ch === "," ) lastSafe = i - 1 >= 0 ? i - 1 : lastSafe;
    else if (/[0-9truefalsn]/.test(ch)) lastSafe = i;
  }

  let body = inString || lastSafe < 0 ? text : text.slice(0, lastSafe + 1);
  if (inString) {
    // corta a string incompleta inteira: volta até a última vírgula segura
    const cut = body.lastIndexOf(",");
    body = cut > 0 ? body.slice(0, cut) : body;
  }
  body = body.replace(/[,:]\s*$/, "");
  // Recalcula o fechamento necessário para o corpo final.
  const closers: string[] = [];
  let s = false, esc = false;
  for (const ch of body) {
    if (s) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') s = false;
      continue;
    }
    if (ch === '"') s = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  if (s) body += '"';
  return body + closers.reverse().join("");
};

/** Extração tolerante: JSON puro, cercado por ```json, embutido ou truncado. */
const extractJson = (raw: string): Record<string, unknown> | null => {
  const attempts: string[] = [raw.trim()];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) attempts.push(fence[1].trim());
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(raw.slice(first, last + 1));
  attempts.push(raw.replace(/,\s*([}\]])/g, "$1"));
  const repaired = repairTruncatedJson(raw);
  if (repaired) {
    attempts.push(repaired);
    attempts.push(repaired.replace(/,\s*([}\]])/g, "$1"));
  }
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

/** Imagens que nunca são logo (banner, foto de capa, avatar de depoimento…). */
const NOT_LOGO = /banner|hero|slide|carousel|cover|capa|foto|photo|avatar|depoiment|testimonial|thumb|sprite|placeholder|pixel|tracking/i;

/** Pega o primeiro src útil de um <img>, considerando lazy-load e srcset. */
const imgSource = (tag: string): string | null => {
  const direct =
    tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1] ??
    tag.match(/\sdata-src\s*=\s*["']([^"']+)["']/i)?.[1] ??
    tag.match(/\sdata-lazy-src\s*=\s*["']([^"']+)["']/i)?.[1];
  if (direct && !direct.startsWith("data:")) return direct;
  const srcset = tag.match(/\s(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
  if (srcset) {
    const first = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]).find(Boolean);
    if (first && !first.startsWith("data:")) return first;
  }
  return null;
};

/**
 * LOGO DA MARCA A PARTIR DO SITE.
 *
 * Ordem de confiança (a falha recorrente era voltar sem logo, ou voltar com um
 * banner/ícone genérico):
 * 1. <img> dentro do header/nav cujo src/alt/class fale "logo";
 * 2. o mesmo <img> em qualquer lugar da página;
 * 3. <img> cujo alt contenha o nome da marca;
 * 4. link rel="apple-touch-icon" / "mask-icon" / "icon" de tamanho grande;
 * 5. og:image / twitter:image (arte social, quase sempre com a marca).
 */
const findLogo = (html: string, base: string, brandName = ""): string | null => {
  const headerZone = [...html.matchAll(/<(header|nav)\b[\s\S]{0,20000}?<\/\1>/gi)]
    .map((m) => m[0])
    .join(" ");

  const scan = (scope: string, test: (haystack: string) => boolean): string | null => {
    for (const [tag] of scope.matchAll(/<img\b[^>]*>/gi)) {
      const src = imgSource(tag);
      if (!src) continue;
      const haystack = `${src} ${tag.match(/\salt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""} ${
        tag.match(/\sclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""
      } ${tag.match(/\sid\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""}`.toLowerCase();
      if (NOT_LOGO.test(haystack)) continue;
      if (!test(haystack)) continue;
      const url = absolutize(src, base);
      if (url) return url;
    }
    return null;
  };

  const byKeyword = (h: string) => /logo|brand|marca|wordmark|logotipo|símbolo|simbolo/.test(h);
  const nameTokens = brandName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  const byName = (h: string) => nameTokens.length > 0 && nameTokens.some((t) => h.includes(t));

  const found =
    (headerZone ? scan(headerZone, byKeyword) : null) ??
    scan(html, byKeyword) ??
    (nameTokens.length ? scan(headerZone || html, byName) : null);
  if (found) return found;

  const links = [
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi,
    /<link[^>]+rel=["'][^"']*mask-icon[^"']*["'][^>]*>/gi,
    /<link[^>]+rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/gi,
  ];
  for (const re of links) {
    for (const [tag] of html.matchAll(re)) {
      const href = tag.match(/\shref\s*=\s*["']([^"']+)["']/i)?.[1];
      const url = href ? absolutize(href, base) : null;
      if (url && IMG_EXT.test(url) && !/favicon\.ico/i.test(url)) return url;
    }
  }

  const metas = [
    /<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of metas) {
    const hit = html.match(re)?.[1];
    const url = hit ? absolutize(hit, base) : null;
    if (url && (IMG_EXT.test(url) || url.includes("image"))) return url;
  }
  return null;
};

/** Tipografia declarada no HTML/CSS inline ou via Google Fonts. */
const findFonts = (html: string): string[] => {
  const out: string[] = [];
  for (const [, families] of html.matchAll(
    /fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/gi,
  )) {
    for (const [, fam] of families.matchAll(/family=([^&:]+)/gi)) {
      out.push(decodeURIComponent(fam).replace(/\+/g, " "));
    }
  }
  const counts = new Map<string, number>();
  for (const [, decl] of html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)) {
    const first = decl.split(",")[0].replace(/["']/g, "").trim();
    if (!first || /^(inherit|initial|unset|var\(|sans-serif|serif|monospace|system-ui|-apple-system)/i.test(first)) continue;
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  out.push(
    ...Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([f]) => f),
  );
  return [...new Set(out)].slice(0, 6);
};

const stripToText = (html: string, limit: number) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

const fetchHtml = async (url: string, timeoutMs = 12000): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AliviaStudioBot/1.1",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const type = resp.headers.get("content-type") ?? "";
    if (type && !/html|text/i.test(type)) return null;
    return (await resp.text()).slice(0, 500_000);
  } catch (err) {
    console.error("[studio-brand-interpret] fetch", url, String(err).slice(0, 160));
    return null;
  }
};

/** Páginas internas que costumam guardar a proposta real da marca. */
const INNER_PAGE = /(sobre|about|quem-somos|empresa|servic|service|solucao|solucoes|solution|produto|product|planos|precos|pricing|para-quem|clientes|portfolio|metodo|como-funciona)/i;

/**
 * ESCOPO DE CAMINHO. Quando o usuário informa um sub-site
 * (ex.: dominio.com/studio-pro), a leitura NÃO pode vazar para o resto do
 * domínio — era assim que o kit de uma marca vinha preenchido com o conteúdo
 * do produto principal hospedado na raiz.
 */
const pathScope = (url: string): string => {
  const { pathname } = new URL(url);
  const clean = pathname.replace(/\/+$/, "");
  if (!clean || clean === "") return "";
  // Sub-site = primeiro segmento do caminho.
  return `/${clean.split("/").filter(Boolean)[0]}`;
};

const collectInnerLinks = (html: string, base: string, max: number): string[] => {
  const origin = new URL(base).origin;
  const scope = pathScope(base);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [, href] of html.matchAll(/<a\b[^>]*\shref\s*=\s*["']([^"'#]+)["']/gi)) {
    if (!INNER_PAGE.test(href)) continue;
    const url = absolutize(href, base);
    if (!url || !url.startsWith(origin)) continue;
    // Sub-site: só páginas dentro do mesmo caminho.
    if (scope && !new URL(url).pathname.startsWith(scope)) continue;
    const clean = url.split("#")[0].replace(/\/$/, "");
    if (clean === base.replace(/\/$/, "") || seen.has(clean)) continue;
    if (/\.(pdf|jpg|jpeg|png|zip|docx?)$/i.test(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
};

/**
 * SPA (React/Vite) devolve sempre o mesmo index.html: título, descrição e texto
 * são os do app inteiro, não da rota pedida. Detectamos essa casca para não
 * confiar nos metadados do shell e para buscar o conteúdo já renderizado.
 */
const isAppShell = (html: string, text: string): boolean => {
  if (/<div[^>]+id=["'](root|app|__next)["']/i.test(html) && text.length < 1200) return true;
  return text.length < 600;
};

/** Renderiza a rota com JS executado (leitor público) e devolve texto/markdown. */
const renderPage = async (url: string, timeoutMs = 20000): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const text = (await resp.text()).slice(0, 30000);
    return text.trim().length > 300 ? text : null;
  } catch (err) {
    console.error("[studio-brand-interpret] render", url, String(err).slice(0, 160));
    return null;
  }
};

type SiteRead = {
  text: string;
  colors: string[];
  logo: string | null;
  fonts: string[];
  meta: string;
  headings: string[];
  pages: string[];
};

/**
 * LEITURA RICA DO SITE DO CLIENTE.
 *
 * Metadados (title/description/og), títulos (h1-h3), cores (hex + rgb + vars),
 * tipografia declarada, logo com heurística de header e até 3 páginas internas
 * — sempre dentro do caminho informado. Se o HTML for casca de SPA, o conteúdo
 * real vem do render com JS. Falha silenciosa: site fora do ar não trava a
 * interpretação.
 */
const readSite = async (rawUrl: string, brandName = ""): Promise<SiteRead> => {
  const url = normalizeUrl(rawUrl);
  const empty: SiteRead = { text: "", colors: [], logo: null, fonts: [], meta: "", headings: [], pages: [] };
  if (!url) return empty;

  const html = await fetchHtml(url);
  if (!html) {
    // Sem HTML (bloqueio/JS puro): tenta o render mesmo assim.
    const rendered = await renderPage(url);
    if (!rendered) return empty;
    return { ...empty, text: rendered.slice(0, 26000), pages: [url] };
  }

  /* Cores: hex, rgb() e variáveis CSS — sites modernos quase não usam hex cru. */
  const counts = new Map<string, number>();
  const bump = (hex: string) => {
    const h = hex.toLowerCase();
    if (h === "#ffffff" || h === "#000000") return;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  };
  for (const [full] of html.matchAll(/#[0-9a-fA-F]{6}\b/g)) bump(full);
  for (const [, hx] of html.matchAll(/#([0-9a-fA-F]{3})\b/g)) {
    bump(`#${hx[0]}${hx[0]}${hx[1]}${hx[1]}${hx[2]}${hx[2]}`);
  }
  for (const [, r, g, b] of html.matchAll(/rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/gi)) {
    bump(
      `#${[r, g, b]
        .map((v) => Math.min(255, parseInt(v, 10)).toString(16).padStart(2, "0"))
        .join("")}`,
    );
  }
  const colors = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex]) => hex.toUpperCase());

  const metaBits = [
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1],
  ]
    .filter(Boolean)
    .map((s) => stripToText(String(s), 300));
  const shellMeta = [...new Set(metaBits)].join(" · ").slice(0, 900);

  const headings = [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => stripToText(m[2], 160))
    .filter((t) => t.length > 2);
  let uniqueHeadings = [...new Set(headings)].slice(0, 40);

  const homeText = stripToText(html, 12000);
  const shell = isAppShell(html, homeText);
  const scope = pathScope(url);

  let meta = shellMeta;
  let mainText = homeText;
  let renderedPages: string[] = [];

  if (shell) {
    const rendered = await renderPage(url);
    if (rendered) {
      mainText = rendered;
      renderedPages = [url];
      // Títulos reais saem do markdown renderizado.
      const mdHeads = [...rendered.matchAll(/^#{1,3}\s+(.+)$/gm)]
        .map((m) => m[1].trim().slice(0, 160))
        .filter((t) => t.length > 2);
      if (mdHeads.length) uniqueHeadings = [...new Set(mdHeads)].slice(0, 40);
      // Em sub-site, os metadados do shell descrevem outro produto: descartar.
      if (scope) meta = "";
    } else if (scope) {
      // Não conseguimos ler a rota: melhor nada do que o conteúdo da raiz.
      meta = "";
      mainText = "";
      uniqueHeadings = [];
    }
  }

  const pages = shell ? renderedPages : collectInnerLinks(html, url, 3);
  const innerTexts: string[] = [];
  if (!shell) {
    for (const page of pages) {
      const inner = await fetchHtml(page, 9000);
      if (!inner) continue;
      const t = stripToText(inner, 5000);
      if (t.length > 200) innerTexts.push(`[${page}]\n${t}`);
    }
  }

  return {
    text: [mainText, ...innerTexts].filter(Boolean).join("\n\n").slice(0, 26000),
    colors,
    logo: findLogo(html, url, brandName),
    fonts: findFonts(html),
    meta,
    headings: uniqueHeadings,
    pages: pages.length ? pages : [url],
  };
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

    // Lê o site do cliente (metadados + títulos + texto de páginas internas +
    // cores + tipografia + logo) quando há site cadastrado.
    const site: SiteRead = brand.source_url
      ? await readSite(String(brand.source_url), String(brand.name ?? ""))
      : { text: "", colors: [], logo: null, fonts: [], meta: "", headings: [], pages: [] };


    /**
     * Logo: só grava quando a marca não tem um logo de imagem válido. Um valor
     * como "https://minhamarca.com.br" (o próprio site) não é logo e era usado
     * como imagem, deixando a assinatura das artes quebrada.
     */
    const currentLogo = String(brand.logo_url ?? "").trim();
    const currentLogoIsImage =
      !!currentLogo && (IMG_EXT.test(currentLogo) || currentLogo.startsWith("data:image"));
    const logoUrl = currentLogoIsImage ? currentLogo : site.logo;


    /**
     * MANUAL DA MARCA (PDF/imagem) — fonte principal quando enviado.
     * O arquivo não é guardado: vai como anexo multimodal nesta chamada e só o
     * briefing interpretado fica salvo na marca.
     */
    const doc = (body?.doc ?? null) as { name?: string; mime?: string; base64?: string } | null;
    const docMime = String(doc?.mime ?? "");
    const docBase64 = String(doc?.base64 ?? "");
    const docOk =
      !!docBase64 &&
      (docMime === "application/pdf" || docMime.startsWith("image/")) &&
      docBase64.length < 9_000_000;
    if (doc && !docOk) return json({ error: "Documento inválido ou grande demais (máx. 6MB)." }, 400);

    const brief = [
      `Nome da marca: ${brand.name}`,
      brand.niche ? `Nicho/setor: ${brand.niche}` : null,
      brand.description ? `Descrição do produto: ${brand.description}` : null,
      brand.tone
        ? `Tom de voz (DIRETRIZ de escrita, nunca copiar para dentro das artes): ${String(brand.tone).slice(0, 1500)}`
        : null,
      brand.source_url
        ? `Site informado (ESCOPO EXCLUSIVO da análise — se este endereço tiver um caminho, ex. /studio-pro, interprete APENAS esse produto/sub-site e NUNCA o produto principal hospedado na raiz do domínio): ${brand.source_url}`
        : null,
      brand.instagram_handle ? `Instagram: ${brand.instagram_handle}` : null,
      Array.isArray(brand.topics) && brand.topics.length ? `Palavras-chave atuais: ${brand.topics.join(", ")}` : null,
      existingLabels.length ? `Públicos já cadastrados (manter todos): ${existingLabels.join(", ")}` : null,
      typeof body?.extra === "string" && body.extra.trim() ? `Contexto extra do cliente: ${body.extra.trim()}` : null,
      site.meta ? `Metadados do site (title/description/og): ${site.meta}` : null,
      site.headings.length
        ? `Títulos e chamadas do site (h1-h3, ordem de leitura):\n- ${site.headings.join("\n- ")}`
        : null,
      site.colors.length ? `Cores mais usadas no site (ordem de frequência): ${site.colors.join(", ")}` : null,
      site.fonts.length ? `Tipografia declarada no site (ordem de confiança): ${site.fonts.join(", ")}` : null,
      site.pages.length ? `Páginas internas lidas além da home: ${site.pages.join(", ")}` : null,
      site.text ? `\nTexto extraído do site (fonte primária da proposta):\n"""\n${site.text}\n"""` : null,
      docOk
        ? `\nO cliente anexou o MANUAL DA MARCA (${doc?.name ?? "documento"}). Ele é a FONTE PRINCIPAL: cores, tipografia, posicionamento, públicos e tom saem dele e prevalecem sobre o site e sobre os campos atuais.`
        : null,
    ].filter(Boolean).join("\n");


    const systemPrompt = `Você é estrategista de conteúdo sênior. A partir do briefing de uma marca, você produz o mapa editorial que alimentará um gerador de artes para redes sociais. O resultado precisa ter densidade de kit de agência: específico, concreto, com vocabulário da própria marca.

Regras:
- Escreva em português do Brasil, linguagem concreta, sem jargão de marketing e sem clichê ("soluções inovadoras", "excelência", "transformar vidas", "referência no mercado").
- Se houver texto, títulos ou metadados do site no briefing, eles são a fonte primária: proposta, produtos, preços, nomes de serviços e públicos saem de lá, não de suposições. Use as palavras que a própria marca usa.
- O "tom de voz" do briefing é diretriz de ESTILO: guia como escrever, mas o texto dele nunca é reaproveitado como frase da marca.
- Segmente o produto em 4 a 8 públicos (nichos) REAIS e distintos — pessoas diferentes, em momentos diferentes, não variações do mesmo perfil. Cada um com dores, desejos e soluções próprias, sem repetir frases entre públicos.
- Cada público precisa de 5 a 8 dores, 5 a 8 desejos e 5 a 8 soluções/diferenciais. Frases curtas (até ~70 caracteres), concretas, uma ideia por linha.
- IMPORTANTE: se o produto também é usado pelo consumidor final (paciente, cliente, aluno, usuário leigo), esse público NUNCA pode ficar de fora — inclua-o junto dos públicos profissionais/B2B.
- Se a marca já tem públicos cadastrados no briefing, mantenha-os (pode refinar o texto), não os substitua por outros.
- Além dos nichos, escreva um posicionamento global 360° que interpola todos eles: o problema estrutural do mercado, a tese da marca, a amplitude de uso e o que a separa das alternativas.
- "description": 2 a 3 frases densas — o que é, para quem, o que entrega de concreto.
- Escreva também um "tagline": UMA frase curta (até 80 caracteres) que resume a marca e pode aparecer dentro das artes.
- "voice": diretriz de tom em 4 a 8 linhas — como falar, o que nunca dizer, como tratar preço, prova e objeção. É diretriz interna, nunca vai impressa na arte.
- "keywords": vocabulário de marca utilizável como palavra em destaque na arte (não termos de SEO genéricos).
- Cores (papéis, não decoração): "primary" é a cor de MARCA usada em fundos e formas; "primary2" é a cor de TEXTO que fica sobre ela e precisa de contraste alto (≥ 4.5:1); "secondary" é o destaque e "secondary2" um neutro claro de fundo. Em "extra" devolva até 4 outras cores reais da marca (paleta ampliada), sem repetir as quatro anteriores. Escolha entre as cores do site quando houver; nunca devolva um par de baixo contraste (ex.: verde neon com branco). Sem cores no briefing, omita o campo.
- Nunca invente números, prêmios, certificações ou depoimentos.
- Se a marca lida com saúde, nunca prometa cura nem diagnóstico definitivo.

Tipografia: se o briefing (manual anexado ou tipografia declarada no site) indicar a fonte da marca, devolva o nome dela em "font_family" (ex.: "Montserrat", "DM Sans", "Playfair Display"). Se não houver indicação, devolva "".

Responda SOMENTE com JSON válido neste formato:
{
  "description": "2 a 3 frases densas sobre o que é, para quem e o que entrega",
  "positioning": "3 a 5 frases sobre o produto inteiro, servindo de base do conteúdo 360°",
  "tagline": "uma frase curta (até 80 caracteres) que pode aparecer na arte",
  "voice": "diretriz de tom em 4 a 8 linhas",
  "keywords": ["8 a 12 palavras-chave curtas do vocabulário da marca"],
  "strategy_notes": "5 a 8 linhas sobre como girar informar / dor / desejo / venda nesta marca, incluindo temas a evitar",
  "colors": { "primary": "#RRGGBB", "primary2": "#RRGGBB", "secondary": "#RRGGBB", "secondary2": "#RRGGBB", "extra": ["#RRGGBB"] },
  "font_family": "nome da fonte da marca, ou vazio",
  "audiences": [
    {
      "label": "Nome curto do público",
      "description": "Quem é e em que momento chega",
      "pains": ["5 a 8 dores concretas"],
      "desires": ["5 a 8 desejos"],
      "proof": ["5 a 8 soluções/diferenciais que convencem esse público"],
      "cta": "Chamada para ação curta"

    }
  ]
}`;

    /** Com manual anexado, a mensagem vira multimodal (texto + arquivo). */
    const userContent = docOk
      ? [
          { type: "text", text: brief },
          docMime === "application/pdf"
            ? {
                type: "file",
                file: {
                  filename: doc?.name || "manual-da-marca.pdf",
                  file_data: `data:${docMime};base64,${docBase64}`,
                },
              }
            : { type: "image_url", image_url: { url: `data:${docMime};base64,${docBase64}` } },
        ]
      : brief;

    const resp = await callAiWithFallback(
      LOVABLE_API_KEY,
      {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      },
      ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
      {
        functionName: "studio-brand-interpret",
        maxTokens: 2600,
        metadata: { brand_id: brandId, has_doc: docOk },
      },
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
          pains: strList(row.pains, 8),
          desires: strList(row.desires, 8),
          proof: strList(row.proof, 8),
          cta: String(row.cta ?? "").trim().slice(0, 60) || undefined,
        };
      })
      .filter(Boolean)
      .slice(0, 10) as Array<Record<string, unknown>>;


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
    const mergedAudiences = Array.from(byId.values()).slice(0, 12);

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
      /**
       * Paleta ampliada: marcas raramente cabem em 4 cores. As demais cores
       * lidas do site (ou devolvidas pela IA em `extra`) entram como cores
       * adicionais da categoria principal — o usuário edita/remove no kit.
       */
      const used = new Set([surface, onSurface, accent, neutral].map((c) => c.toUpperCase()));
      const extras = [
        ...(Array.isArray(rawColors.extra) ? (rawColors.extra as unknown[]) : []),
        ...site.colors,
      ]
        .map(pickHex)
        .filter((c): c is string => !!c)
        .filter((c) => !used.has(c) && (used.add(c) || true))
        .slice(0, 4);
      extras.forEach((color, i) => {
        colorKit![`primary${i + 3}`] = color;
      });
    }


    /**
     * TIPOGRAFIA: casa o nome lido no manual com a lista curada do editor
     * (mesmas chaves de `src/pages/studio-pro/brandFonts.ts`). Sem match, a
     * fonte atual da marca é preservada.
     */
    const FONT_KEYS: Array<[string, string[]]> = [
      ["outfit", ["outfit"]],
      ["inter", ["inter"]],
      ["poppins", ["poppins"]],
      ["montserrat", ["montserrat"]],
      ["dm-sans", ["dm sans"]],
      ["work-sans", ["work sans"]],
      ["manrope", ["manrope"]],
      ["space-grotesk", ["space grotesk", "grotesk"]],
      ["jakarta", ["plus jakarta", "jakarta"]],
      ["sora", ["sora"]],
      ["raleway", ["raleway"]],
      ["nunito", ["nunito"]],
      ["archivo", ["archivo"]],
      ["oswald", ["oswald"]],
      ["bebas", ["bebas"]],
      ["playfair", ["playfair"]],
      ["lora", ["lora"]],
      ["merriweather", ["merriweather"]],
    ];
    const normalizeFont = (value: string) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matchFont = (value: string) =>
      FONT_KEYS.find(([, names]) => names.some((n) => normalizeFont(value).includes(n)))?.[0] ?? null;
    /** Fonte da IA primeiro; se ela não souber, a tipografia declarada no site. */
    const fontKey =
      matchFont(String(parsed.font_family ?? "")) ??
      site.fonts.map(matchFont).find(Boolean) ??
      null;


    const currentColors = (brand.colors ?? {}) as Record<string, string>;
    const currentFont = typeof currentColors.font === "string" ? currentColors.font : "default";
    // Cores e fonte convivem no mesmo mapa `colors`: nada é perdido no update.
    if (colorKit || fontKey) {
      colorKit = {
        ...currentColors,
        ...(colorKit ?? {}),
        font: fontKey ?? currentFont ?? "default",
      };
    }

    const tagline = String(parsed.tagline ?? "").trim().replace(/\s+/g, " ").slice(0, 90);

    /**
     * Descrição e tom só são gravados quando o campo do cliente está vazio (ou
     * raso, < 60 caracteres): texto escrito à mão nunca é sobrescrito pela IA.
     */
    const aiDescription = String(parsed.description ?? "").trim().slice(0, 700);
    const aiVoice = String(parsed.voice ?? "").trim().slice(0, 2500);
    const currentDescription = String(brand.description ?? "").trim();
    const currentTone = String(brand.tone ?? "").trim();
    const fillDescription = aiDescription.length > 40 && currentDescription.length < 60;
    const fillTone = aiVoice.length > 60 && currentTone.length < 60;

    const result = {
      description: aiDescription,
      positioning: String(parsed.positioning ?? "").trim().slice(0, 1400),
      tagline,
      voice: aiVoice,
      keywords: strList(parsed.keywords, 12),
      strategy_notes: String(parsed.strategy_notes ?? "").trim().slice(0, 1600),
      audiences: mergedAudiences,
      colors: colorKit,
      font: fontKey,
      logo_url: logoUrl,
      site_read: !!site.text,
      site_pages: site.pages,
      site_fonts: site.fonts,
      doc_read: docOk,
    };


    // Persiste como briefing da marca — o usuário revisa e edita depois.
    const { error: updateError } = await supabase
      .from("studio_brands")
      .update({
        positioning: result.positioning || null,
        strategy_notes: result.strategy_notes || null,
        audiences: result.audiences,
        ...(fillDescription ? { description: aiDescription } : {}),
        ...(fillTone ? { tone: aiVoice } : {}),
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
