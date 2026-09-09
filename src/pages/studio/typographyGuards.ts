/**
 * GUARDAS TIPOGRÁFICAS GLOBAIS DAS ARTES
 *
 * Regras de acabamento que valem para TODAS as marcas e todos os modelos de
 * arte. Ficam num único módulo para não voltarem a se repetir bloco a bloco:
 *
 * 1. CHAMADA DE PÚBLICO CURTA (`shortKicker`): a linha espaçada do topo chama
 *    UM público por vez, sem parênteses, sem enumeração e sem virar parágrafo.
 * 2. TÍTULO EM CAIXA CORRETA (`sentenceLead`): trecho vindo de rótulo em caixa
 *    alta ("COMO EU TRABALHO") nunca entra numa frase como "cOMO EU TRABALHO".
 * 3. PALAVRA-CARTAZ INTEIRA (`displayWordStyle`): tipo gigante nunca corta
 *    letra nem sílaba — o corpo da letra cai conforme o comprimento da palavra
 *    e a linha é indivisível.
 * 4. TEXTO SOBRE FOTO LEGÍVEL (`onPhotoTextStyle`): tinta clara com sombra de
 *    leitura, para a frase não se perder numa área clara da imagem.
 */
import type { CSSProperties } from "react";
import { condensePhrase } from "@/pages/studio-pro/textFit";

/* -------------------------------------------------------------------------- */
/* 1. Chamada de público                                                      */
/* -------------------------------------------------------------------------- */

/** Fronteiras que indicam "começou outro público / outra ideia". */
const AUDIENCE_BREAK = /\s*(?:[;•·|]|\/|\be\s+perfil\b|\bou\s+perfil\b)\s*/i;

/**
 * Rótulo curto para a linha de chamada (kicker/tag).
 * "Adulto do Rio de Janeiro (Zona Sul, Barra e Recreio) com dor persistente,
 *  pós-operatório ou meta esportiva; e perfil 60+..." → "ADULTO COM DOR PERSISTENTE".
 */
export const shortKicker = (raw: string | null | undefined, max = 30): string => {
  const base = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!base) return "";
  const noParens = base.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const single = noParens.split(AUDIENCE_BREAK)[0]?.trim() ?? noParens;
  if (single.length <= max) return single.toUpperCase();
  const clause = single.split(/,\s*/)[0]?.trim() ?? single;
  const source = clause.length >= 12 ? clause : single;
  const fitted = condensePhrase(source, max);
  if (fitted) return fitted.toUpperCase();
  /* Última saída: palavras inteiras até o limite (nunca corta palavra). */
  const words = source.split(" ");
  let acc = "";
  for (const w of words) {
    const next = acc ? `${acc} ${w}` : w;
    if (next.length > max) break;
    acc = next;
  }
  return (acc || words[0] || "").toUpperCase();
};

/* -------------------------------------------------------------------------- */
/* 2. Caixa correta                                                           */
/* -------------------------------------------------------------------------- */

const letters = (text: string) => text.replace(/[^\p{L}]/gu, "");

/** É rótulo em caixa alta ("COMO EU TRABALHO", "VISÃO 360°")? */
export const isAllCaps = (text: string) => {
  const l = letters(text);
  return l.length > 3 && l === l.toUpperCase();
};

/** Devolve o texto em caixa de frase, mesmo quando vem todo em maiúsculas. */
export const sentenceLead = (raw: string | null | undefined): string => {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const body = isAllCaps(text) ? text.toLowerCase() : text;
  return body.charAt(0).toUpperCase() + body.slice(1);
};

/* -------------------------------------------------------------------------- */
/* 3. Palavra-cartaz                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Palavra protagonista de cartaz: a mais longa que ainda cabe inteira numa
 * linha. Palavra comprida (> `max`) não é cortada — é trocada pela melhor
 * candidata curta da frase.
 */
export const displayWord = (phrase: string, max = 12): string => {
  const words = (phrase ?? "")
    .replace(/[.!?,;:()"“”]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => letters(w).length >= 3);
  if (!words.length) return "";
  const fits = words.filter((w) => w.length <= max);
  const pool = fits.length ? fits : [...words].sort((a, b) => a.length - b.length).slice(0, 1);
  return pool.sort((a, b) => b.length - a.length)[0].toUpperCase();
};

/**
 * Estilo do tipo gigante: uma linha só, corpo calculado pelo comprimento da
 * palavra e pela largura útil do quadro (unidade de contêiner, então vale para
 * qualquer formato e também na exportação em PNG).
 *
 * O elemento pai precisa declarar `containerType: "inline-size"` — use
 * `displayWordContainer`.
 */
export const displayWordStyle = (
  word: string,
  opts?: { widthPct?: number; maxRem?: number; ratio?: number },
): CSSProperties => {
  const widthPct = opts?.widthPct ?? 84;
  const maxRem = opts?.maxRem ?? 5.6;
  /* Largura média de glifo em caixa alta pesada, em fração do corpo da letra. */
  const ratio = opts?.ratio ?? 0.64;
  const len = Math.max(3, word.length);
  const cqw = Math.max(4, widthPct / (len * ratio));
  return {
    fontSize: `min(${cqw.toFixed(2)}cqw, ${maxRem}rem)`,
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    wordBreak: "keep-all",
    hyphens: "none",
  };
};

export const displayWordContainer: CSSProperties = { containerType: "inline-size", width: "100%" };

/* -------------------------------------------------------------------------- */
/* 4. Texto sobre foto                                                        */
/* -------------------------------------------------------------------------- */

/** Tinta clara com sombra de leitura — vale para qualquer texto sobre imagem. */
export const onPhotoTextStyle = (color = "#f8f6f1"): CSSProperties => ({
  color,
  textShadow: "0 1px 2px rgba(6,6,10,0.55), 0 6px 26px rgba(6,6,10,0.6)",
});

/** Chapa suave atrás do texto, para o bloco de leitura nunca cair em área clara. */
export const photoTextPlate = (anchor: "bottom" | "top" | "center" = "bottom"): CSSProperties => ({
  background:
    anchor === "top"
      ? "linear-gradient(to bottom, rgba(6,6,10,0.9) 0%, rgba(6,6,10,0.72) 45%, rgba(6,6,10,0.28) 78%, rgba(6,6,10,0.42) 100%)"
      : anchor === "center"
        ? "radial-gradient(78% 62% at 50% 50%, rgba(6,6,10,0.86) 0%, rgba(6,6,10,0.6) 60%, rgba(6,6,10,0.4) 100%)"
        : "linear-gradient(to top, rgba(6,6,10,0.93) 0%, rgba(6,6,10,0.74) 34%, rgba(6,6,10,0.3) 70%, rgba(6,6,10,0.42) 100%)",
});
