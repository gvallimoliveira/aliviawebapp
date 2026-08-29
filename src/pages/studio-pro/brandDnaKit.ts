/**
 * DNA DA MARCA (fonte única do motor textual)
 *
 * Normaliza o que o cliente declarou — manual de marca interpretado + as
 * respostas do questionário (`studio_brands.brief_answers`) + posicionamento e
 * nicho — em um objeto pequeno e literal.
 *
 * REGRA: nada aqui é inventado. Se o campo está vazio, ele fica vazio, e o
 * motor sabe que não pode falar daquele eixo. Isso é o que impede o motor de
 * cair no acervo genérico (o "bypass" do manual).
 */

import { readBriefAnswers, type BriefAnswers } from "./brandQuestionnaire";

export type BrandDna = {
  /** Como a marca se apresenta em uma frase (quem sou). */
  presentation?: string;
  /** O que entrega na prática (como trabalho). */
  offer?: string;
  /** Diferencial real (no que acredito / por que eu). */
  belief?: string;
  /** Assinatura desejada nas artes. */
  signature?: string;
  /** Público primário declarado no briefing. */
  primaryAudience?: string;
  /** Perfil do cliente ideal. */
  profile?: string;
  /** Maior dor declarada no briefing. */
  pain?: string;
  /** Maior desejo (e objeção) declarado no briefing. */
  desire?: string;
  /** CTA preferido da marca. */
  cta?: string;
  /** Tom declarado (diretriz, nunca renderizado). */
  tone?: string;
  /** Nível técnico declarado (diretriz). */
  technicalLevel?: string;
  /** Posicionamento livre (manual/IA). */
  positioning?: string;
  /** Descrição livre da marca. */
  description?: string;
  /** Nicho. */
  niche?: string;
  /** Termos proibidos: palavras vetadas + promessas vetadas + público a evitar. */
  forbidden: string[];
};

const clean = (value?: string | null) => (value ?? "").trim().replace(/\s+/g, " ");

/** Quebra "cura, milagre; garantia de resultado" em termos individuais. */
const splitTerms = (value?: string | null): string[] =>
  clean(value)
    .split(/[,;/\n•·|]+| e (?=[a-zà-ú])/i)
    .map((t) =>
      t
        .trim()
        .replace(/^(nunca|não|nada de|evitar|proibido)\s+/i, "")
        .replace(/[.!?]+$/, "")
        .trim(),
    )
    .filter((t) => t.length >= 3 && t.length <= 40);

export type BrandDnaInput = {
  niche?: string | null;
  tone?: string | null;
  description?: string | null;
  positioning?: string | null;
  briefAnswers?: unknown;
};

export const buildBrandDna = (input: BrandDnaInput): BrandDna => {
  const brief: BriefAnswers = readBriefAnswers(input.briefAnswers);
  const pick = (id: string) => clean(brief[id]) || undefined;

  return {
    presentation: pick("apresentacao"),
    offer: pick("oferta"),
    belief: pick("diferencial"),
    signature: pick("assinatura"),
    primaryAudience: pick("publico_primario"),
    profile: pick("perfil"),
    pain: pick("dor"),
    desire: pick("desejo"),
    cta: pick("cta"),
    tone: pick("tom") || clean(input.tone) || undefined,
    technicalLevel: pick("nivel_tecnico"),
    positioning: clean(input.positioning) || undefined,
    description: clean(input.description) || undefined,
    niche: clean(input.niche) || undefined,
    forbidden: [
      ...splitTerms(brief.proibidas),
      ...splitTerms(brief.nunca_prometer),
      ...splitTerms(brief.nao_atrair),
    ],
  };
};

/** DNA vazio (marca sem manual e sem briefing) — libera o acervo de emergência. */
export const isDnaEmpty = (dna: BrandDna): boolean =>
  !dna.presentation &&
  !dna.offer &&
  !dna.belief &&
  !dna.pain &&
  !dna.desire &&
  !dna.positioning &&
  !dna.description;

/** Quantos eixos do DNA estão preenchidos (usado no filtro de nexo e na UI). */
export const dnaDepth = (dna: BrandDna): number =>
  [
    dna.presentation,
    dna.offer,
    dna.belief,
    dna.primaryAudience,
    dna.profile,
    dna.pain,
    dna.desire,
    dna.cta,
    dna.positioning,
    dna.description,
  ].filter(Boolean).length;

/** Vocabulário real da marca — usado para checar se a arte fala dela mesma. */
export const dnaVocabulary = (dna: BrandDna): string[] => {
  const text = [
    dna.presentation,
    dna.offer,
    dna.belief,
    dna.primaryAudience,
    dna.profile,
    dna.pain,
    dna.desire,
    dna.positioning,
    dna.description,
    dna.niche,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [...new Set(text.split(/[^a-zà-ú0-9]+/i).filter((w) => w.length >= 5))];
};
