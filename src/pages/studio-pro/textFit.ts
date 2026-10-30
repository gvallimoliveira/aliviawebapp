/**
 * ENCURTAMENTO INTELIGENTE DE FRASES PARA ARTES
 *
 * Antes o texto era cortado por caractere e recebia "…", o que aparecia dentro
 * da arte ("...ACOMPANHAMENTO DE…") e quebrava a leitura. Aqui a frase é
 * condensada preservando a mensagem: primeiro corta em fronteira natural
 * (cláusula), depois remove caudas preposicionais e palavras de ligação, e por
 * último cai para as primeiras palavras completas. Nunca devolve reticências.
 */

const FILLER = new Set([
  "de", "da", "do", "das", "dos", "e", "ou", "em", "no", "na", "nos", "nas",
  "para", "por", "com", "sem", "a", "o", "as", "os", "um", "uma", "que", "ao", "aos",
  "à", "às", "sobre", "entre", "como", "mais", "muito", "muita", "seu", "sua", "seus", "suas",
  "versus", "vs", "está", "estão", "era", "eram", "foi", "foram", "ser", "sendo", "fica", "ficam",
]);

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

const stripEdges = (text: string) =>
  text.replace(/^[\s,;:–—-]+/, "").replace(/[\s,;:–—-]+$/, "").replace(/\.+$/, "").trim();

/** Remove palavras de ligação penduradas no fim ("avaliação e", "plataforma de"). */
const trimDanglingFiller = (text: string) => {
  let out = stripEdges(text);
  for (let i = 0; i < 4; i += 1) {
    const words = out.split(" ");
    const last = words[words.length - 1]?.toLowerCase().replace(/[^\wáéíóúâêôãõçü]/gi, "");
    if (words.length > 1 && last && FILLER.has(last)) {
      out = stripEdges(words.slice(0, -1).join(" "));
    } else break;
  }
  return out;
};

/**
 * Condensa `text` para caber em `max` caracteres sem reticências.
 * Retorna string vazia se não houver conteúdo aproveitável.
 */
export const condensePhrase = (text: string | null | undefined, max = 90): string => {
  const clean = normalize(text ?? "");
  if (!clean) return "";

  // 1) primeira frase
  const sentence = stripEdges(clean.split(/(?<=[.!?])\s/)[0] ?? clean);
  if (sentence.length <= max) return sentence;

  // A label-like prefix ("HEP conectado ao") is not a complete short version.
  // Keep the source sentence: AutoFit handles its size without losing meaning.
  if (/\b(?:HEP|STEPS|D\.I\.F\.I)\b|\d/.test(sentence)) return sentence;

  // 2) fronteiras naturais de cláusula, do maior trecho que couber
  const boundary = /[,;:–—]| que | para | com | e /gi;
  let best = "";
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(sentence))) {
    const candidate = trimDanglingFiller(sentence.slice(0, match.index));
    if (candidate.length && candidate.length <= max) best = candidate;
    else if (candidate.length > max) break;
  }
  if (best.length >= Math.min(24, max)) return best;

  // 3) palavras completas
  const words = sentence.split(" ");
  let acc = "";
  for (const w of words) {
    const next = acc ? `${acc} ${w}` : w;
    if (next.length > max) break;
    acc = next;
  }
  const fitted = trimDanglingFiller(acc);
  if (fitted && !/\b(?:conectad[oa]|enviado|entre|antes|depois)$/i.test(fitted)) return fitted;
  if (acc) return sentence;

  // 4) última saída: primeira palavra cortada, ainda sem reticências
  return stripEdges(words[0]?.slice(0, max) ?? "");
};

/** Rótulo curto (nicho, categoria) para usar dentro de headlines. */
export const condenseLabel = (text: string | null | undefined, max = 34) =>
  condensePhrase(text, max);
