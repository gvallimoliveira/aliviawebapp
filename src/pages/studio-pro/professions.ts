/**
 * PROFISSÕES CONCRETAS — identificação imediata nos públicos genéricos
 *
 * "Profissional autônomo" e "pequena empresa" são rótulos de planilha: ninguém
 * se reconhece neles. Quando o Aliv.iA Studio fala de si para esses públicos, a
 * arte passa a nomear uma profissão de verdade (dentista, advogada, nutricional
 * etc.), o que aumenta a identificação sem mudar a promessa.
 *
 * Exclusivo da marca do próprio Studio: em marca de cliente, nomear profissões
 * de terceiros não faz sentido.
 */

export type Profession = {
  /** Como a pessoa se apresenta ("dentista", "advogada"). */
  noun: string;
  /** Onde o trabalho acontece, para fechar a ponte lógica da frase. */
  place: string;
  /** O que ela entrega — usado no apoio. */
  work: string;
};

export const PROFESSIONS: Profession[] = [
  { noun: "dentista", place: "no consultório", work: "cuidar do sorriso de quem chega com medo" },
  { noun: "advogada", place: "no escritório", work: "resolver o que tira o sono do cliente" },
  { noun: "fisioterapeuta", place: "no atendimento", work: "devolver movimento a quem chegou travado" },
  { noun: "educador físico", place: "na sala de treino", work: "montar o treino que a pessoa consegue manter" },
  { noun: "nutricionista", place: "na consulta", work: "ajustar a rotina alimentar de quem já tentou de tudo" },
  { noun: "médico", place: "no consultório", work: "conduzir o caso com critério" },
  { noun: "psicóloga", place: "na sessão", work: "sustentar a escuta que a pessoa não tem em outro lugar" },
  { noun: "arquiteto", place: "no projeto", work: "transformar planta em casa que faz sentido" },
  { noun: "contadora", place: "no fechamento do mês", work: "manter a empresa do cliente em ordem" },
  { noun: "personal trainer", place: "na sessão", work: "ajustar carga e técnica aluno por aluno" },
  { noun: "cabeleireira", place: "na cadeira", work: "entregar o corte que a cliente pediu de verdade" },
  { noun: "comerciante", place: "atrás do balcão", work: "atender de nome quem entra na loja" },
  { noun: "veterinária", place: "no atendimento", work: "acalmar o tutor e cuidar do animal" },
  { noun: "fonoaudióloga", place: "na sessão", work: "devolver a fala e a confiança de quem travou" },
];

/** Hash estável: mesma seed ⇒ mesma profissão (arte determinística). */
const hash = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

export const professionFor = (seed: string): Profession =>
  PROFESSIONS[hash(seed) % PROFESSIONS.length];

/** Públicos do guia do Studio que ganham profissão concreta na copy. */
const GENERIC_AUDIENCES = new Set([
  "prestador-local",
  "b2b",
  "marca-pessoal",
  "comercio-bairro",
  "clinica-equipe",
  "saude-bem-estar",
]);

export const wantsProfession = (rowId?: string) => !!rowId && GENERIC_AUDIENCES.has(rowId);
