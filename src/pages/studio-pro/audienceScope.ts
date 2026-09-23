/**
 * ============================================================================
 * ESCOPO DO PÚBLICO ATIVO (filtro de pertencimento)
 * ============================================================================
 *
 * Uma arte dirigida a UM público não pode citar o assunto de outro. Dois erros
 * reais motivaram este arquivo:
 *
 * 1. arte de tontura/VPPB com lista dos outros públicos da marca
 *    (dor crônica, pós-operatório, performance esportiva…);
 * 2. selo de topo "TENDINITE …" numa arte cujo texto falava de labirintite.
 *
 * A regra é dura e local: antes de a arte existir, todo texto que carrega
 * vocabulário de OUTRO público ou de OUTRO tema clínico sai do acervo. Sem
 * público ativo (leitura institucional da marca), nada é removido.
 */

import type { BrandAudience } from "./audiences";
import { GLOBAL_SEGMENT, resolveAudience } from "./audiences";
import { MSK_TOPICS, mskContextsFor } from "./mskLexicon";
import { VESTIBULAR_MATCH, matchesVestibular } from "./vestibularLexicon";

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Palavras comuns a qualquer público clínico: nunca identificam um recorte. */
const GENERIC = new Set([
  "fisioterapia", "fisioterapeuta", "avaliacao", "reavaliacao", "tratamento", "paciente", "pacientes",
  "plano", "planos", "atendimento", "atendimentos", "clinica", "criterio", "criterios", "reabilitacao",
  "movimento", "movimentos", "exercicio", "exercicios", "domicilio", "consulta", "cuidado", "saude",
  "relatorio", "relatorios", "comparacao", "evolucao", "clinico", "clinica", "sistema", "painel", "dados",
  "carga", "programa", "inteligente", "inteligentes", "guiada", "video", "link", "links",
]);

const words = (text: string) =>
  norm(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !GENERIC.has(w));

/** Chaves estruturais: nunca são texto visível de arte. */
const SKIP_KEYS = new Set(["id", "label", "topic", "topics", "poster", "image", "hashtags", "value", "prefix", "suffix"]);

/** Temas clínicos incompatíveis com o público ativo (por exemplo tendão numa arte de tontura). */
export const foreignClinicalMatchers = (probe: string): RegExp[] => {
  const out: RegExp[] = [];
  const vestibular = matchesVestibular(probe);
  if (!vestibular) out.push(VESTIBULAR_MATCH);
  const contexts = mskContextsFor(probe);
  /**
   * Público de tontura: nenhum tema musculoesquelético entra. Público de
   * esporte/pós-operatório/dor crônica: só os temas do próprio contexto. Público
   * sem contexto clínico declarado: só o léxico vestibular é bloqueado, porque a
   * anatomia geral (ombro, quadril, joelho) pertence a qualquer recorte.
   */
  if (vestibular || contexts.length) {
    MSK_TOPICS.forEach((topic) => {
      const compatible = !vestibular && (topic.match.test(probe) || topic.contexts.some((c) => contexts.includes(c)));
      if (!compatible) out.push(topic.match);
    });
  }
  return out;
};

/** Palavras que pertencem só aos OUTROS públicos da marca. */
export const foreignAudienceWords = (audience: BrandAudience, all: BrandAudience[]): string[] => {
  const own = new Set([...words(audience.label ?? ""), ...words(audience.keyword ?? ""), ...words(audience.description ?? "")]);
  const foreign = new Set<string>();
  all
    .filter((item) => item.id !== audience.id)
    .forEach((item) => {
      [...words(item.label ?? ""), ...words(item.keyword ?? "")].forEach((w) => {
        if (!own.has(w)) foreign.add(w);
      });
    });
  return [...foreign];
};

/**
 * Palavras que identificam os temas IRMÃOS da mesma linha editorial e não
 * pertencem ao tema ativo. Ex.: numa arte de "Avaliação externa por IA", termos
 * como "periodização" ou "sRPE" (de outros temas) saem do acervo.
 */
export const foreignEditorialWords = (audience: BrandAudience, all: BrandAudience[]): string[] => {
  const group = audience.editorialGroup?.trim();
  if (!group) return [];
  const ownText = [audience.label, audience.keyword, audience.description, ...(audience.highlightTerms ?? [])]
    .filter(Boolean)
    .join(" ");
  const own = new Set(words(ownText));
  const foreign = new Set<string>();
  all
    .filter((item) => item.id !== audience.id && item.editorialGroup?.trim() === group)
    .forEach((item) => {
      [item.label, item.keyword, ...(item.highlightTerms ?? [])]
        .filter(Boolean)
        .flatMap((text) => words(String(text)))
        .forEach((w) => {
          if (!own.has(w)) foreign.add(w);
        });
    });
  return [...foreign];
};

export type AudienceScope = {
  /** Verdadeiro quando o texto pertence a outro público/tema. */
  foreign: (text: string) => boolean;
};

export const buildAudienceScope = (audience: BrandAudience, all: BrandAudience[]): AudienceScope => {
  const probe = [audience.label, audience.keyword, audience.description, audience.hook].filter(Boolean).join(" · ");
  const clinical = foreignClinicalMatchers(probe);
  const alien = foreignAudienceWords(audience, all);
  return {
    foreign: (text: string) => {
      if (!text || text.length < 3) return false;
      if (clinical.some((re) => re.test(text))) return true;
      const bag = new Set(words(text));
      return alien.some((w) => bag.has(w));
    },
  };
};

const flatten = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SKIP_KEYS.has(key))
      .map(([, child]) => flatten(child))
      .join(" ");
  }
  return "";
};

/**
 * Remove do acervo tudo que não é do público ativo. Pool que ficaria vazio é
 * preservado (arte sem texto é pior que arte genérica), exceto os selos de topo,
 * que caem para a palavra-chave do próprio público.
 */
export const enforceAudienceScope = <T,>(content: T, audience: BrandAudience, all: BrandAudience[]): T => {
  /**
   * TEMA EDITORIAL (diferencial de um SaaS, serviço de uma clínica, produto de
   * uma loja): o acervo já é fechado e os temas irmãos compartilham vocabulário
   * de produto. Aqui não se aplica o filtro clínico/de públicos — o que se
   * bloqueia é o vocabulário EXCLUSIVO dos temas irmãos do mesmo grupo, para a
   * arte de um assunto nunca citar o assunto vizinho.
   */
  const scope = audience.editorialGroup
    ? buildEditorialScope(audience, all)
    : buildAudienceScope(audience, all);
  const key = (audience.keyword || audience.label || "").trim();

  const walk = (value: unknown, path = ""): unknown => {
    if (Array.isArray(value)) {
      const kept = value.filter((item) => !scope.foreign(flatten(item)));
      const pool = kept.length ? kept : path === "kickers" && key ? [key.toUpperCase()] : value;
      return pool.map((item) => walk(item, path));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
          childKey,
          SKIP_KEYS.has(childKey) ? child : walk(child, childKey),
        ]),
      );
    }
    return value;
  };

  return walk(content) as T;
};

/**
 * Segunda barreira, usada depois de reescritas/aprendizados. O filtro original
 * roda ao construir o acervo; esta passagem impede que uma transformação
 * posterior reintroduza um tema estranho ao público já escolhido.
 */
export const enforceSegmentAudienceScope = <T,>(
  content: T,
  segment: string,
  audiences: BrandAudience[],
  globalAudience?: BrandAudience,
): T => {
  const audience = segment === GLOBAL_SEGMENT ? globalAudience : resolveAudience(audiences, segment) ?? undefined;
  return audience ? enforceAudienceScope(content, audience, audiences) : content;
};
