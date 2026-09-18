/**
 * REVISÃO DE CONCORDÂNCIA (professor de português do motor criativo)
 *
 * O léxico e a reescrita trocam palavras; a troca às vezes muda o gênero ou o
 * número do núcleo do grupo nominal e nasce erro clássico:
 *
 *   "apenas o primeiro etapa"   →  "apenas a primeira etapa"
 *   "não precisa ser a sua dia a dia" → "... o seu dia a dia"
 *
 * Este módulo é o revisor final: percorre determinantes (artigo, possessivo,
 * demonstrativo, ordinal, quantificador) e ajusta a flexão ao núcleo nominal
 * que vem depois. É conservador por decisão: quando o gênero/número do núcleo
 * não é conhecido com segurança, NADA é alterado.
 *
 * 100% local e determinístico. Nenhuma ideia nova é inventada — só a forma.
 */

/** Substantivos frequentes cujo gênero contraria o sufixo (-a masculino, etc.). */
const MASC_EXCEPTIONS = new Set([
  "dia","problema","sistema","programa","mapa","esquema","tema","clima","enigma","sintoma","diagrama",
  "cinema","planeta","atleta","dilema","trauma","estigma","carisma","dogma","panorama","paradigma",
]);

const FEM_EXCEPTIONS = new Set([
  "fase","dor","base","chave","parte","arte","noite","gente","mente","saúde","rede","série","classe",
  "vez","luz","cruz","análise","síntese","crise","imagem","mensagem","origem","viagem","coragem",
  "razão","razões","decisão","sessão","lesão","pressão","tensão","condição","evolução","reabilitação",
  "função","atenção","intenção","opção","solução","questão","gestão","conclusão","precisão",
  "mão","nação","paixão","estação","rotina","meta","tarde","chance","ordem","paz","dose","face",
  "carne","fome","sorte","morte","frente","ponte","dúvida","pele","tarefa",
]);

const PLURAL_EXCEPTIONS = new Set(["mês","país","gás","atrás","através","depois","pois","mais","menos","vez","luz","cruz","paz","após","ninguém","lápis","ônibus","vírus","tênis","status","campus","atlas"]);

type Agreement = { gender: "m" | "f"; plural: boolean } | null;

const isPlural = (word: string) => {
  const w = word.toLowerCase();
  if (PLURAL_EXCEPTIONS.has(w)) return false;
  if (!w.endsWith("s")) return false;
  return w.length > 3;
};

const singularOf = (word: string) => {
  const w = word.toLowerCase();
  if (w.endsWith("ões")) return `${w.slice(0, -3)}ão`;
  if (w.endsWith("ais")) return `${w.slice(0, -3)}al`;
  if (w.endsWith("eis")) return `${w.slice(0, -3)}el`;
  if (w.endsWith("res") || w.endsWith("ses") || w.endsWith("zes")) return w.slice(0, -2);
  if (w.endsWith("ns")) return `${w.slice(0, -2)}m`;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
};

/**
 * Siglas ("DNA", "IA", "CRM", "SEO") não seguem o sufixo: "DNA" termina em "a"
 * mas é masculino ("o DNA"). Como o gênero de sigla é imprevisível, o revisor
 * declara desconhecido e não mexe no determinante escrito pela marca.
 */
const isAcronym = (rawWord: string) => /^[A-ZÀ-Ý][A-ZÀ-Ý0-9.]{1,}$/.test(rawWord.replace(/[^A-Za-zÀ-ÿ0-9.]/g, ""));

/** Gênero e número do núcleo nominal; `null` quando não há certeza suficiente. */
export const agreementOf = (rawWord: string): Agreement => {
  if (isAcronym(rawWord)) return null;
  const word = rawWord.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!word || word.length < 3) return null;

  const plural = isPlural(word);
  const base = plural ? singularOf(word) : word;

  if (MASC_EXCEPTIONS.has(base)) return { gender: "m", plural };
  if (FEM_EXCEPTIONS.has(base) || FEM_EXCEPTIONS.has(word)) return { gender: "f", plural };
  if (/(ção|dade|agem|tude|ência|ância|eza|ice|ura|ite|ose)$/.test(base)) return { gender: "f", plural };
  if (/(mento|ismo|ário|eiro|dor|ão)$/.test(base)) return { gender: "m", plural };
  if (base.endsWith("a")) return { gender: "f", plural };
  if (base.endsWith("o")) return { gender: "m", plural };
  return null;
};

/** Determinantes e modificadores flexionáveis: [m.s, f.s, m.pl, f.pl]. */
const FORMS: string[][] = [
  ["o", "a", "os", "as"],
  ["um", "uma", "uns", "umas"],
  ["do", "da", "dos", "das"],
  ["no", "na", "nos", "nas"],
  ["ao", "à", "aos", "às"],
  ["pelo", "pela", "pelos", "pelas"],
  ["este", "esta", "estes", "estas"],
  ["esse", "essa", "esses", "essas"],
  ["aquele", "aquela", "aqueles", "aquelas"],
  ["seu", "sua", "seus", "suas"],
  ["meu", "minha", "meus", "minhas"],
  ["nosso", "nossa", "nossos", "nossas"],
  ["todo", "toda", "todos", "todas"],
  ["outro", "outra", "outros", "outras"],
  ["mesmo", "mesma", "mesmos", "mesmas"],
  ["primeiro", "primeira", "primeiros", "primeiras"],
  ["segundo", "segunda", "segundos", "segundas"],
  ["terceiro", "terceira", "terceiros", "terceiras"],
  ["último", "última", "últimos", "últimas"],
  ["próprio", "própria", "próprios", "próprias"],
  ["certo", "certa", "certos", "certas"],
  ["novo", "nova", "novos", "novas"],
  ["bom", "boa", "bons", "boas"],
  ["pouco", "pouca", "poucos", "poucas"],
  ["muito", "muita", "muitos", "muitas"],
];

const INDEX: Map<string, string[]> = new Map();
FORMS.forEach((row) => row.forEach((form) => INDEX.set(form, row)));

/** Modificadores que ficam entre o determinante e o núcleo, e também flexionam. */
const MODIFIERS = new Set([
  "o","a","os","as","um","uma","uns","umas","do","da","dos","das","no","na","nos","nas",
  "primeiro","primeira","primeiros","primeiras","segundo","segunda","segundos","segundas",
  "terceiro","terceira","terceiros","terceiras","último","última","últimos","últimas",
  "próprio","própria","próprios","próprias","mesmo","mesma","mesmos","mesmas",
  "novo","nova","novos","novas","outro","outra","outros","outras","certo","certa","certos","certas",
  "bom","boa","bons","boas","muito","muita","muitos","muitas","pouco","pouca","poucos","poucas",
  // Possessivos entram na cadeia ("o seu dia", "a sua fase"): flexionam junto com o núcleo.
  "seu","sua","seus","suas","meu","minha","meus","minhas","nosso","nossa","nossos","nossas",
]);

const inflect = (form: string, target: Agreement): string => {
  if (!target) return form;
  const row = INDEX.get(form.toLowerCase());
  if (!row) return form;
  const idx = (target.plural ? 2 : 0) + (target.gender === "f" ? 1 : 0);
  const next = row[idx];
  if (!next) return form;
  // Preserva a caixa da palavra original.
  if (form[0] === form[0].toUpperCase()) return next.charAt(0).toUpperCase() + next.slice(1);
  return next;
};

/** Palavras que nunca são núcleo nominal (não servem de referência de gênero). */
const NOT_HEAD = new Set([
  "que","de","da","do","das","dos","em","na","no","para","por","com","sem","e","ou","mas","se","é","ser",
  "mais","menos","muito","bem","já","não","também","como","quando","onde","até","sobre","entre",
]);

/**
 * Revisão de concordância determinante → núcleo. Conservador: só altera quando
 * o núcleo tem gênero/número reconhecível.
 */
export const fixAgreement = (text: string): string => {
  if (!text) return text;
  const tokens = text.split(/(\s+)/);
  const wordAt = (i: number) => tokens[i]?.replace(/[^A-Za-zÀ-ÿ]/g, "") ?? "";

  for (let i = 0; i < tokens.length; i += 1) {
    const raw = wordAt(i);
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!INDEX.has(key)) continue;

    // Encontra o núcleo: pula modificadores flexionáveis.
    const chain: number[] = [i];
    let j = i + 2; // +2 por causa do separador de espaço
    while (j < tokens.length && MODIFIERS.has(wordAt(j).toLowerCase())) {
      chain.push(j);
      j += 2;
    }
    const head = wordAt(j);
    if (!head || NOT_HEAD.has(head.toLowerCase())) continue;
    const target = agreementOf(head);
    if (!target) continue;

    // Locuções fixas do tipo "dia a dia", "fase a fase", "passo a passo": ali o
    // "a" é preposição da expressão, não artigo — não se flexiona.
    if (wordAt(i - 2).toLowerCase() === head.toLowerCase()) continue;

    chain.forEach((pos) => {
      const original = tokens[pos];
      const word = wordAt(pos);
      if (!INDEX.has(word.toLowerCase())) return;
      const fixed = inflect(word, target);
      if (fixed.toLowerCase() === word.toLowerCase()) return;
      tokens[pos] = original.replace(word, fixed);
    });
  }

  return tokens.join("");
};

/** True quando não há erro de concordância detectável no texto. */
export const agreesWell = (text: string): boolean => fixAgreement(text) === text;

/**
 * Revisor final aplicado a todo texto que vai para a arte: concordância +
 * limpeza de pontuação duplicada e espaços órfãos.
 */
export const proofread = (text: string): string => {
  if (!text) return text;
  let out = fixAgreement(text);
  out = out
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\1+/g, "$1")
    .replace(/\.\.(?!\.)/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
};
