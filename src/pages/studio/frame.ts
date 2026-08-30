/**
 * PROPORÇÃO DO QUADRO — FONTE ÚNICA DE VERDADE
 *
 * Antes cada tela definia sua própria moldura (criar, modo autoral, galeria,
 * landing pública), com larguras diferentes e — no formato "Livre" — SEM
 * proporção nenhuma. Sem altura definida, o `AutoFit` reduzia a arte por
 * transform mas a moldura mantinha a altura antiga: sobrava uma faixa vazia no
 * pé da arte e trocar o formato no menu não reorganizava nada.
 *
 * Aqui a proporção de cada formato é definida uma única vez. "Livre" deixa de
 * significar "sem altura": passa a significar "o motor escolhe a proporção",
 * sempre entre proporções publicáveis no Instagram, de forma determinística
 * pela chave da arte (mesma seed ⇒ mesma proporção).
 */
import type { CSSProperties } from "react";
import type { StudioFormat } from "./blocks/shared";

/** Proporção (largura / altura) dos formatos fixos. */
export const FORMAT_RATIO: Record<Exclude<StudioFormat, "free">, number> = {
  "9x16": 9 / 16,
  "4x5": 4 / 5,
  "1x1": 1,
};

/** Proporções que o formato "Livre" pode sortear — todas válidas no feed/stories. */
export const FREE_RATIOS = [4 / 5, 1, 9 / 16] as const;

/** Largura máxima do quadro na tela, por formato. */
const MAX_WIDTH: Record<StudioFormat, number> = {
  "9x16": 400,
  "4x5": 480,
  "1x1": 560,
  free: 480,
};

/** Hash estável: a mesma chave sempre cai na mesma proporção. */
const hash = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

/** Proporção sorteada para o formato "Livre". */
export const freeRatioFor = (key: string) => FREE_RATIOS[hash(key) % FREE_RATIOS.length];

/**
 * Proporção final do quadro. `key` só é usada no formato "Livre" e deve ser a
 * mesma para todos os slides de um carrossel (o Instagram exige proporção única).
 */
export const frameRatio = (format: StudioFormat, key = "studio") =>
  format === "free" ? freeRatioFor(key) : FORMAT_RATIO[format];

/** Estilo do quadro: largura da tela + proporção real. Nunca altura livre. */
export const frameStyle = (format: StudioFormat, key = "studio"): CSSProperties => ({
  width: `min(${MAX_WIDTH[format]}px, 100%)`,
  aspectRatio: String(frameRatio(format, key)),
});

/** Largura lógica usada na exportação (o alvo do Instagram é 1080 de largura). */
export const EXPORT_WIDTH = 1080;

/** Dimensões lógicas da arte exportada, na proporção do quadro. */
export const exportSize = (format: StudioFormat, key = "studio") => {
  const ratio = frameRatio(format, key);
  return { width: EXPORT_WIDTH, height: Math.round(EXPORT_WIDTH / ratio) };
};
