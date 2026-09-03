import type { StudioPhoto } from "./photos";

/**
 * ROTATIVIDADE DO ACERVO DENTRO DE UM MESMO LOTE.
 *
 * O nexo foto × assunto (photoMeaning) escolhe QUAIS fotos podem sustentar a
 * arte; este registro decide QUAL delas entra, olhando o lote inteiro em vez de
 * cada arte isolada. Sem ele, várias artes com assuntos parecidos caíam na
 * mesma foto e o lote parecia repetitivo.
 *
 * Regras:
 * - a foto menos usada no lote tem preferência (empate resolvido pela ordem
 *   determinística que chega do nexo — mesma seed → mesmo resultado);
 * - com acervo de 10 fotos ou mais, nenhuma foto pode aparecer mais de 3 vezes
 *   na mesma geração (teto duro).
 *
 * A escolha por arte é memorizada (`artKey`), então re-render do React não
 * conta uso duas vezes nem troca a foto de uma arte já composta.
 */

/** Teto de repetições por lote quando o acervo é grande. */
export const MAX_REPEAT_PER_ROUND = 3;

/** A partir de quantas fotos no acervo o teto duro passa a valer. */
export const REPEAT_CAP_MIN_LIBRARY = 10;

type Ledger = {
  round: string;
  counts: Map<string, number>;
  byArt: Map<string, StudioPhoto>;
};

let ledger: Ledger = { round: "", counts: new Map(), byArt: new Map() };

/** `artKey` chega como "<lote>|<arte>": o lote reinicia a contagem. */
const parse = (artKey: string): { round: string; art: string } => {
  const at = artKey.indexOf("|");
  if (at < 0) return { round: artKey, art: artKey };
  return { round: artKey.slice(0, at), art: artKey.slice(at + 1) };
};

/**
 * Escolhe a foto da arte respeitando a rotatividade do lote. `pool` já vem
 * filtrado por nexo e ordenado de forma determinística.
 */
export const claimPhoto = (
  artKey: string | undefined,
  pool: StudioPhoto[],
  libraryTotal: number,
): StudioPhoto | undefined => {
  if (pool.length === 0) return undefined;
  if (!artKey) return pool[0];

  const { round, art } = parse(artKey);
  if (ledger.round !== round) ledger = { round, counts: new Map(), byArt: new Map() };

  const already = ledger.byArt.get(art);
  if (already && pool.some((p) => p.id === already.id)) return already;

  const cap = libraryTotal >= REPEAT_CAP_MIN_LIBRARY ? MAX_REPEAT_PER_ROUND : Infinity;
  const used = (photo: StudioPhoto) => ledger.counts.get(photo.id) ?? 0;

  // Menos usada primeiro; empate mantém a ordem determinística do nexo.
  const ranked = pool.map((photo, i) => ({ photo, i, n: used(photo) }));
  ranked.sort((a, b) => a.n - b.n || a.i - b.i);

  const allowed = ranked.find((r) => r.n < cap) ?? ranked[0];
  const chosen = allowed.photo;

  ledger.counts.set(chosen.id, used(chosen) + 1);
  ledger.byArt.set(art, chosen);
  return chosen;
};
