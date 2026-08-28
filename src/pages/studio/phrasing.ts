/**
 * ESTRUTURAS RETÓRICAS DO MOTOR CRIATIVO
 *
 * A mesma ideia ("A") pode virar afirmação, contraste, pergunta, imperativo,
 * dado+consequência, antes/depois, provérbio curto ou promessa em duas partes.
 * Combinando frame × ingrediente do kit × léxico do registro, cada slot passa
 * de ~5 variações fixas para milhares de possibilidades — sem inventar
 * promessas: os ingredientes vêm todos do kit da marca.
 */

import type { Rng } from "./rng";
import { applyLexicon, type VoiceRegister } from "./lexicon";

/** Insumos vindos do kit da marca (nunca do campo "tom de voz"). */
export type CopyIngredients = {
  brand: string;
  niche: string;
  /** Público ativo (quando há segmento selecionado). */
  audience?: string;
  pains: string[];
  desires: string[];
  /** "Soluções que ofereço" / provas do kit. */
  solutions: string[];
  keywords: string[];
  positioning?: string;
  cta?: string;
};

export type PhrasingOptions = {
  register: VoiceRegister;
  seed: string;
  forbidden?: string[];
  intensity?: number;
};

const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const noDot = (text: string) => clean(text).replace(/[.!?]+$/, "");
const lower = (text: string) => {
  const t = noDot(text);
  return t.charAt(0).toLowerCase() + t.slice(1);
};
const upperFirst = (text: string) => {
  const t = clean(text);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const rotate = <T,>(list: readonly T[], n: number): T[] =>
  list.length ? [...list.slice(n % list.length), ...list.slice(0, n % list.length)] : [];

/** Pega o item i de uma lista, com fallback quando o kit está incompleto. */
const at = (list: string[], i: number, fallback: string) => {
  const value = list.map(clean).filter(Boolean);
  return value.length ? value[i % value.length] : fallback;
};

export type Headline = { strong: string; rest: string };

type HeadlineFrame = {
  id: string;
  /** Frames que exigem dor/desejo declarados só entram quando existem. */
  needs?: "pain" | "desire" | "solution";
  build: (ing: CopyIngredients, i: number) => Headline;
};

/**
 * FRAMES DE HEADLINE — cada um é uma construção retórica diferente para a
 * mesma mensagem. `i` gira os ingredientes, então o mesmo frame rende várias
 * frases distintas.
 */
const HEADLINE_FRAMES: HeadlineFrame[] = [
  // Afirmação
  { id: "afirma-existe", build: (ing) => ({ strong: ing.brand, rest: ` existe para resolver o que ficou sem solução em ${lower(ing.niche)}.` }) },
  { id: "afirma-referencia", build: (ing) => ({ strong: `A referência em ${lower(ing.niche)}`, rest: " começa por uma escolha bem feita." }) },
  { id: "afirma-metodo", build: () => ({ strong: "Feito com método", rest: ", não com sorte." }) },
  { id: "afirma-detalhe", build: () => ({ strong: "Detalhe não é enfeite", rest: " — é resultado." }) },
  // Contraste / negação
  { id: "contraste-nao-e", needs: "solution", build: (ing, i) => ({ strong: `Não é sobre ${lower(at(ing.keywords, i, "promessa"))}`, rest: `. É sobre ${lower(at(ing.solutions, i, "resultado claro"))}.` }) },
  { id: "contraste-preco", build: () => ({ strong: "O barato cobra duas vezes", rest: ". O certo cobra uma." }) },
  { id: "contraste-dor-desejo", needs: "pain", build: (ing, i) => ({ strong: at(ing.pains, i, "Improviso"), rest: ` não precisa ser a sua rotina.` }) },
  { id: "contraste-todo-mundo", build: (ing) => ({ strong: `Feito para ${lower(ing.audience ?? ing.niche)}`, rest: ", não para todo mundo." }) },
  // Pergunta
  { id: "pergunta-percebe", needs: "pain", build: (ing, i) => ({ strong: `Até quando ${lower(at(ing.pains, i, "a correria"))}`, rest: " vai definir o seu dia?" }) },
  { id: "pergunta-imagina", needs: "desire", build: (ing, i) => ({ strong: `E se ${lower(at(ing.desires, i, "o processo ficasse claro"))}`, rest: " fosse o normal, e não a exceção?" }) },
  { id: "pergunta-escolha", build: (ing) => ({ strong: "Como você escolhe", rest: ` quem cuida disso em ${lower(ing.niche)}?` }) },
  // Imperativo
  { id: "imperativo-comece", needs: "desire", build: (ing, i) => ({ strong: "Comece pelo que muda", rest: `: ${lower(at(ing.desires, i, "clareza no processo"))}.` }) },
  { id: "imperativo-pare", needs: "pain", build: (ing, i) => ({ strong: `Pare de aceitar ${lower(at(ing.pains, i, "achismo"))}`, rest: ". Existe caminho melhor." }) },
  { id: "imperativo-escolha", build: (ing) => ({ strong: "Escolha por resultado", rest: `, não por hábito — é isso que ${ing.brand} entrega.` }) },
  // Dado + consequência
  { id: "dado-decisao", build: () => ({ strong: "Uma decisão bem tomada", rest: " economiza meses de retrabalho." }) },
  { id: "dado-clareza", build: () => ({ strong: "Quem entende o processo", rest: " segue até o fim. Quem não entende, desiste." }) },
  { id: "dado-consistencia", build: () => ({ strong: "Consistência vira lembrança", rest: ". Lembrança vira escolha." }) },
  // Antes / depois
  { id: "antes-depois", needs: "desire", build: (ing, i) => ({ strong: `De ${lower(at(ing.pains, i, "dúvida"))} a ${lower(at(ing.desires, i, "clareza"))}`, rest: " com um método que você acompanha." }) },
  { id: "antes-depois-curto", build: () => ({ strong: "Menos ruído", rest: ". Mais valor entendido." }) },
  // Provérbio curto
  { id: "proverbio-volta", build: () => ({ strong: "Quem escolhe bem", rest: " volta." }) },
  { id: "proverbio-simples", build: () => ({ strong: "Simples de entender.", rest: " Difícil de esquecer." }) },
  { id: "proverbio-processo", build: () => ({ strong: "Processo não é burocracia", rest: " — é previsibilidade." }) },
  // Promessa em duas partes
  { id: "promessa-dupla", needs: "solution", build: (ing, i) => ({ strong: upperFirst(at(ing.solutions, i, "Um caminho claro")), rest: `, com a assinatura de ${ing.brand}.` }) },
  { id: "promessa-posicionamento", build: (ing) => ({ strong: ing.positioning ? noDot(ing.positioning) : `${ing.brand} entrega o que promete`, rest: ". Sem letra miúda." }) },
  { id: "promessa-publico", build: (ing) => ({ strong: `Para ${lower(ing.audience ?? ing.niche)}`, rest: ` que não quer só mais uma opção — quer a escolha certa.` }) },
];

const hasIngredient = (ing: CopyIngredients, needs?: HeadlineFrame["needs"]) => {
  if (!needs) return true;
  if (needs === "pain") return ing.pains.filter(Boolean).length > 0;
  if (needs === "desire") return ing.desires.filter(Boolean).length > 0;
  return ing.solutions.filter(Boolean).length > 0;
};

const dress = (text: string, opts: PhrasingOptions) =>
  applyLexicon(text, { register: opts.register, seed: opts.seed, forbidden: opts.forbidden, intensity: opts.intensity });

/**
 * Gera um acervo grande de headlines: cada frame elegível rende variações
 * girando os ingredientes, e cada frase passa pelo léxico do registro.
 */
export const composeHeadlines = (
  ing: CopyIngredients,
  opts: PhrasingOptions,
  rng: Rng,
  perFrame = 3,
): Headline[] => {
  const eligible = HEADLINE_FRAMES.filter((f) => hasIngredient(ing, f.needs));
  const share = opts.intensity !== undefined && opts.intensity < 0.35 ? 0.45 : opts.intensity !== undefined && opts.intensity < 0.75 ? 0.72 : 1;
  const frames = rng.shuffle(eligible).slice(0, Math.max(6, Math.ceil(eligible.length * share)));
  const out: Headline[] = [];
  /** Deslocamento do lote: gira os ingredientes de cada frame a cada seed. */
  const offset = rng.int(101);
  frames.forEach((frame, fi) => {
    for (let i = 0; i < perFrame; i += 1) {
      const built = frame.build(ing, fi + i + offset);
      out.push({
        strong: dress(built.strong, { ...opts, seed: `${opts.seed}:${frame.id}:${offset}:${i}:s` }),
        rest: dress(built.rest, { ...opts, seed: `${opts.seed}:${frame.id}:${offset}:${i}:r` }),
      });
    }
  });
  // Dedup por texto final: frames diferentes podem convergir com kit pobre.
  const seen = new Set<string>();
  return out.filter((h) => {
    const key = `${h.strong}|${h.rest}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Subtítulos: mesma ideia em construções variadas. */
export const composeSubs = (ing: CopyIngredients, opts: PhrasingOptions, rng: Rng): string[] => {
  const templates: ((i: number) => string)[] = [
    (i) => `${ing.brand} transforma ${lower(at(ing.keywords, i, "conhecimento"))} em uma experiência clara.`,
    (i) => `Em ${lower(ing.niche)}, ${lower(at(ing.keywords, i, "detalhe"))} não é enfeite — é resultado.`,
    (i) => `${upperFirst(at(ing.solutions, i, "Um processo com começo e fim"))}, do primeiro contato ao resultado.`,
    (i) => `Quem procura ${lower(at(ing.desires, i, "clareza"))} não precisa aceitar ${lower(at(ing.pains, i, "improviso"))}.`,
    () => "Uma decisão bem tomada economiza meses.",
    (i) => `${upperFirst(at(ing.desires, i, "Resultado claro"))} com método, não com promessa.`,
    (i) => `Para ${lower(ing.audience ?? ing.niche)}: ${lower(at(ing.solutions, i, "um caminho claro"))}.`,
    () => `${ing.brand} comunica valor sem ruído e sem letra miúda.`,
    (i) => `${upperFirst(at(ing.keywords, i, "Consistência"))} é o que separa presença de tentativa.`,
  ];
  const out = rng.shuffle(templates).flatMap((make, i) => [dress(make(i), { ...opts, seed: `${opts.seed}:sub:${i}` })]);
  return Array.from(new Set(out.map(clean)));
};

/** Blocos tipográficos (lead / palavra grande / cauda). */
export const composeTypos = (
  ing: CopyIngredients,
  opts: PhrasingOptions,
  rng: Rng,
): { lead: string; big: string; tail: string }[] => {
  const raw: { lead: string; big: string; tail: string }[] = [
    { lead: "A gente cuida do processo.", big: "Você", tail: " colhe o resultado." },
    { lead: "Menos ruído.", big: "Mais valor", tail: "." },
    { lead: `Em ${lower(ing.niche)},`, big: " consistência", tail: " vale mais que sorte." },
    { lead: "O barato sai caro.", big: "O certo", tail: " sai uma vez." },
    { lead: "Detalhe não é enfeite.", big: "É resultado", tail: "." },
    { lead: ing.brand, big: " existe", tail: " para resolver." },
    { lead: `${upperFirst(at(ing.pains, 0, "Dúvida"))} hoje.`, big: at(ing.desires, 0, "Clareza"), tail: " amanhã." },
    { lead: "Promessa qualquer um faz.", big: "Método", tail: " poucos entregam." },
    { lead: "Escolher barato é fácil.", big: "Escolher certo", tail: " dura." },
    { lead: `Quem entende,`, big: " decide", tail: " melhor." },
  ];
  return rng.shuffle(raw).map((item, i) => ({
    lead: dress(item.lead, { ...opts, seed: `${opts.seed}:typo:${i}:l` }),
    big: dress(item.big, { ...opts, seed: `${opts.seed}:typo:${i}:b` }),
    tail: dress(item.tail, { ...opts, seed: `${opts.seed}:typo:${i}:t` }),
  }));
};

/** Palavra-chave cinética + legenda. */
export const composeKinetic = (
  ing: CopyIngredients,
  opts: PhrasingOptions,
  rng: Rng,
): { kicker: string; word: string; caption: string }[] => {
  const words = ["Cuidado", "Constância", "Clareza", "Método", "Confiança", "Presença", "Valor", "Escolha"];
  const captions = [
    "Cada detalhe expressa uma escolha consciente.",
    "Presença consistente cria reconhecimento.",
    "Uma proposta fácil de entender e de lembrar.",
    `Do primeiro contato ao resultado, em ${lower(ing.niche)}.`,
    `${upperFirst(at(ing.solutions, 0, "Um processo claro"))} do começo ao fim.`,
    "O que é simples de entender é simples de escolher.",
  ];
  const kickers = ["O QUE MOVE A MARCA", "NOSSA APOSTA", "PROMESSA", "O QUE SUSTENTA", "PRINCÍPIO"];
  return rotate(words, rng.int(words.length)).map((word, i) => ({
    kicker: kickers[i % kickers.length],
    word: dress(word, { ...opts, seed: `${opts.seed}:kin:${i}:w` }),
    caption: dress(captions[i % captions.length], { ...opts, seed: `${opts.seed}:kin:${i}:c` }),
  }));
};

/** Fechamentos com CTA do kit. */
export const composeClosings = (
  ing: CopyIngredients,
  opts: PhrasingOptions,
  rng: Rng,
): { title: string; sub: string; cta: string }[] => {
  const cta = ing.cta?.trim() || "Falar com a gente";
  const raw = [
    { title: "Vamos conversar?", sub: `Conte o seu cenário e ${ing.brand} responde com um caminho.`, cta: "Chamar no direct" },
    { title: "Sua próxima escolha pode ser diferente", sub: `${upperFirst(at(ing.solutions, 0, "Uma proposta pensada para você"))}.`, cta },
    { title: `${ing.brand} está com agenda aberta`, sub: "Poucas vagas por mês para manter o padrão.", cta: "Garantir a minha vaga" },
    { title: "Compartilhe com quem precisa", sub: "Alguém do seu contato está procurando isso hoje.", cta: "Enviar agora" },
    { title: "O próximo passo é seu", sub: at(ing.desires, 0, `Fale com ${ing.brand} hoje.`), cta },
    { title: "Dá para começar simples", sub: "A primeira conversa é sem compromisso.", cta: "Começar agora" },
  ];
  return rng.shuffle(raw).map((item, i) => ({
    title: dress(item.title, { ...opts, seed: `${opts.seed}:clo:${i}:t` }),
    sub: dress(item.sub, { ...opts, seed: `${opts.seed}:clo:${i}:s` }),
    cta: item.cta,
  }));
};

/** Total teórico de headlines possíveis — usado em testes e diagnóstico. */
export const headlineFrameCount = HEADLINE_FRAMES.length;
