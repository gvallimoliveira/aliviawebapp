/**
 * MODO AUTORAL DO STUDIO
 *
 * Marcas com `content_source = "authorial"` NÃO têm texto escrito pelo motor.
 * O Studio vira mesa de diagramação: as artes usam exclusivamente
 *
 *  - os textos autorais cadastrados na marca (`studio_texts`), e
 *  - os slogans declarados no kit da marca.
 *
 * REGRAS DE COERÊNCIA (inegociáveis)
 *
 * 1. Um texto pode ser desmembrado em fragmentos (parágrafos e, quando muito
 *    longos, frases): A → a1, a2, a3...
 * 2. Uma arte pode usar 1 fragmento (a1) ou fragmentos CONTÍGUOS (b1 + b2).
 * 3. Uma arte NUNCA mistura fragmentos de textos diferentes (a1 + b1) nem
 *    fragmentos não contíguos do mesmo texto (a2 + a5) — isso quebra a leitura.
 * 4. Carrossel = o texto inteiro repartido em ordem cronológica.
 * 5. Slogan é peça própria: nunca entra junto de fragmento de texto.
 *
 * Tudo é determinístico: a mesma seed devolve o mesmo lote (nenhum crédito de
 * IA é consumido — não há geração de texto, só arranjo do que o autor escreveu).
 */
import { supabase } from "@/integrations/supabase/client";
import { createRng } from "@/pages/studio/rng";

export type AuthorialText = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
};

/** Fatia contígua de UM texto (ou um slogan isolado). */
export type AuthorialSlide = {
  /** Linhas exibidas, na ordem original do autor. */
  lines: string[];
  /** Posição do primeiro/último fragmento usado (para a legenda e a auditoria). */
  from: number;
  to: number;
};

export type AuthorialArt = {
  key: string;
  kind: "single" | "carousel" | "slogan";
  /** Texto de origem (null só no formato slogan). */
  textId: string | null;
  title: string;
  layout: number;
  /** Foto do acervo usada como plano de fundo esmaecido (id) — opcional. */
  photoId: string | null;
  /** Fundo parcial (faixa) em vez de ocupar a arte inteira. */
  photoPartial: boolean;
  slides: AuthorialSlide[];
  /** Total de fragmentos do texto de origem — usado no rótulo "trecho 2 de 7". */
  totalFragments: number;
};

const CHAR_LIMIT = 260;

/** Divide uma frase longa em sentenças, preservando a pontuação. */
const sentences = (paragraph: string): string[] => {
  const parts = paragraph.match(/[^.!?…]+[.!?…]*\s*/g);
  if (!parts) return [paragraph];
  const out: string[] = [];
  parts.forEach((raw) => {
    const piece = raw.trim();
    if (!piece) return;
    const last = out[out.length - 1];
    // Junta sentenças muito curtas com a anterior: o autor escreveu em bloco.
    if (last && (last.length < 90 || piece.length < 40)) out[out.length - 1] = `${last} ${piece}`;
    else out.push(piece);
  });
  return out.length > 0 ? out : [paragraph];
};

/**
 * Fragmentação determinística: parágrafos primeiro (a quebra escolhida pelo
 * autor), e só parágrafos longos demais para um quadro são abertos em frases.
 */
export const fragmentsOf = (body: string): string[] => {
  const paragraphs = body
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const out: string[] = [];
  paragraphs.forEach((p) => {
    if (p.length <= CHAR_LIMIT) out.push(p);
    else sentences(p).forEach((s) => out.push(s));
  });
  return out;
};

/** Quantidade de layouts disponíveis (ver AuthorialArtBlock). */
export const AUTHORIAL_LAYOUTS = 6;
/** Layouts que exigem foto no acervo. */
const PHOTO_LAYOUTS = [4, 5];

type ComposeArgs = {
  texts: AuthorialText[];
  /** Slogans do kit da marca (slogan declarado + variações do manual). */
  slogans: string[];
  seed: string;
  /** Ids das fotos disponíveis (acervo da marca). */
  photoIds: string[];
  count: number;
  /** Restringe o lote a um único texto (seletor do editor). */
  onlyTextId?: string | null;
};

/**
 * Monta o lote de artes. Cada arte nasce de UM texto (ou de um slogan) e nunca
 * atravessa a fronteira entre obras.
 */
export const composeAuthorial = ({
  texts,
  slogans,
  seed,
  photoIds,
  count,
  onlyTextId,
}: ComposeArgs): AuthorialArt[] => {
  const pool = (onlyTextId ? texts.filter((t) => t.id === onlyTextId) : texts).filter(
    (t) => fragmentsOf(t.body).length > 0,
  );
  const cleanSlogans = slogans.map((s) => s.trim()).filter(Boolean);
  if (pool.length === 0 && cleanSlogans.length === 0) return [];

  const arts: AuthorialArt[] = [];
  for (let i = 0; i < count; i += 1) {
    const rng = createRng(`${seed}:authorial:${i}`);
    const wantSlogan = cleanSlogans.length > 0 && (pool.length === 0 || (i > 0 && i % 5 === 4));

    const photoId = photoIds.length > 0 && rng.chance(0.45) ? rng.pick(photoIds) : null;
    const photoPartial = !!photoId && rng.chance(0.5);
    const layout = photoId
      ? PHOTO_LAYOUTS[rng.int(PHOTO_LAYOUTS.length)]
      : rng.int(AUTHORIAL_LAYOUTS - PHOTO_LAYOUTS.length);

    if (wantSlogan) {
      arts.push({
        key: `slogan-${i}`,
        kind: "slogan",
        textId: null,
        title: "Slogan",
        layout,
        photoId,
        photoPartial,
        slides: [{ lines: [rng.pick(cleanSlogans)], from: 0, to: 0 }],
        totalFragments: 1,
      });
      continue;
    }

    const text = pool[rng.int(pool.length)];
    const fragments = fragmentsOf(text.body);
    const total = fragments.length;

    // Carrossel: o texto INTEIRO, em ordem, sem cortar o final.
    // O Instagram aceita até 20 quadros: se o texto tiver mais fragmentos,
    // agrupamos fragmentos contíguos por slide até o texto caber inteiro.
    const carousel = total >= 3 && rng.chance(0.34);
    if (carousel) {
      const MAX_SLIDES = 20;
      const perSlide = Math.ceil(total / MAX_SLIDES);
      const slides: AuthorialSlide[] = [];
      for (let k = 0; k < total; k += perSlide) {
        const lines = fragments.slice(k, k + perSlide);
        slides.push({ lines, from: k, to: k + lines.length - 1 });
      }
      arts.push({
        key: `carousel-${i}`,
        kind: "carousel",
        textId: text.id,
        title: text.title,
        layout,
        photoId,
        photoPartial,
        slides,
        totalFragments: total,
      });
      continue;
    }


    // Post simples: 1 a 3 fragmentos CONTÍGUOS do mesmo texto.
    const maxSpan = Math.min(3, total);
    const span = 1 + rng.int(maxSpan);
    const start = rng.int(Math.max(1, total - span + 1));
    const lines = fragments.slice(start, start + span);
    arts.push({
      key: `single-${i}`,
      kind: "single",
      textId: text.id,
      title: text.title,
      layout,
      photoId,
      photoPartial,
      slides: [{ lines, from: start, to: start + lines.length - 1 }],
      totalFragments: total,
    });
  }
  return arts;
};

/** Legenda pronta para o Instagram: o próprio trecho, na ordem do autor. */
export const authorialCaption = (art: AuthorialArt, slogan?: string | null) => {
  const body = art.slides.flatMap((s) => s.lines).join("\n\n");
  const head = art.kind === "slogan" ? "" : art.title ? `${art.title}\n\n` : "";
  const tail = art.kind === "slogan" || !slogan ? "" : `\n\n—\n${slogan}`;
  return `${head}${body}${tail}`;
};

/* ------------------------------- persistência ------------------------------ */

export const listAuthorialTexts = async (brandId: string): Promise<AuthorialText[]> => {
  const { data, error } = await supabase
    .from("studio_texts")
    .select("id, title, body, sort_order")
    .eq("brand_id", brandId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) ?? "",
    body: (row.body as string) ?? "",
    sortOrder: Number(row.sort_order ?? 0),
  }));
};

export const createAuthorialText = async (
  brandId: string,
  input: { title: string; body: string; sortOrder: number },
) => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("sem sessão");
  const { data, error } = await supabase
    .from("studio_texts")
    .insert({
      user_id: auth.user.id,
      brand_id: brandId,
      title: input.title,
      body: input.body,
      sort_order: input.sortOrder,
    })
    .select("id, title, body, sort_order")
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    title: (data.title as string) ?? "",
    body: (data.body as string) ?? "",
    sortOrder: Number(data.sort_order ?? 0),
  } satisfies AuthorialText;
};

export const updateAuthorialText = async (
  id: string,
  patch: Partial<{ title: string; body: string; sortOrder: number }>,
) => {
  const { error } = await supabase
    .from("studio_texts")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
};

export const deleteAuthorialText = async (id: string) => {
  const { error } = await supabase.from("studio_texts").delete().eq("id", id);
  if (error) throw error;
};
