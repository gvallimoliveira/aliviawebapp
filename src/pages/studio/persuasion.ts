/**
 * CAMADA DE PERSUASÃO DO MOTOR CRIATIVO
 *
 * Diretrizes aprovadas (ago/2026, "Diretrizes do Motor Criativo"):
 * - Postura padrão de sócio mais experiente: direta, adulta, prática — SEMPRE
 *   sobreponível pelo tom de voz declarado no kit da marca.
 * - Provocação só contra o problema (feed abandonado, template em branco,
 *   retrabalho), nunca contra a pessoa, a profissão ou concorrente nomeado.
 * - Objeção tratada com empatia antes da solução; preço comparado com o custo
 *   de não resolver — nunca com "menos que um café".
 * - Zero jargão de consultoria e zero métrica inventada.
 *
 * O que este módulo entrega: frames de alto impacto para o PONTO ZERO da arte
 * (a primeira frase que faz o leitor parar) — lacuna de curiosidade,
 * especificidade, custo da inação e quebra de objeção. Todos os ingredientes
 * continuam vindo do kit: nada aqui inventa número, prova ou promessa.
 */

import type { CopyIngredients } from "./phrasing";

/** Jargão vazio e promessa irreal — proibidos em qualquer texto de arte. */
export const BANNED_JARGON: readonly string[] = [
  "soluções inovadoras",
  "solução inovadora",
  "excelência",
  "transformar vidas",
  "transformando vidas",
  "menos que um café",
  "menos de um café",
  "viralize",
  "viralizar",
  "bombar no instagram",
  "sinergia",
  "disruptivo",
  "alavancar resultados",
  "seguidores por semana",
  "resultado garantido",
];

/** True quando o texto contém jargão proibido (usado nos testes de guarda). */
export const hasBannedJargon = (text: string): boolean => {
  const t = text.toLowerCase();
  return BANNED_JARGON.some((term) => t.includes(term));
};

/**
 * VÍCIOS DE LINGUAGEM DO MOTOR (clichês herdados).
 *
 * Frases que nasceram no acervo neutro/interno e passaram a aparecer em
 * qualquer marca, independentemente do manual — é isso que fazia o texto soar
 * igual desde a primeira versão do Studio. Qualquer frase que caia nesses
 * padrões é descartada e recomposta a partir do kit da marca.
 */
export const STALE_PHRASES: readonly string[] = [
  "detalhe não é enfeite",
  "o barato sai caro",
  "sem mistério",
  "pilares",
  "clareza que aproxima",
  "presença digital todo dia",
  "presença todo dia",
  "com método, não com sorte",
  "feito com método",
  "difícil de esquecer",
  "difícil de confundir",
  "um produto,",
  "um só padrão",
  "escuta, método",
  "quem escolhe bem",
  "sem letra miúda",
  "sem ruído",
  "visão sobre o público",
  "identidade reconhecível",
  "consistência gera reconhecimento",
  "existe para resolver",
  "transforma conhecimento",
  "faz sentido para o seu público",
  "o certo sai uma vez",
];

/** True quando o texto repete um vício de linguagem do motor. */
export const isStale = (text: string): boolean => {
  const t = text.toLowerCase();
  return STALE_PHRASES.some((term) => t.includes(term));
};


/**
 * Vocabulário exigido pelas diretrizes — EXCLUSIVO da marca Aliv.iA Studio
 * vendendo a si mesma. Não pode entrar no motor global: em uma marca de cliente
 * esses termos soariam como se ela vendesse a ferramenta, quebrando o
 * isolamento de marca.
 */
export const STUDIO_SELF_KEYWORDS: readonly string[] = [
  "kit de marca",
  "seu tom",
  "sua paleta",
  "presença constante",
  "sem designer",
  "autonomia",
  "lote",
  "carrossel completo",
];

/** Detecta a própria marca do produto (Aliv.iA Studio). */
export const isStudioSelfBrand = (brandName: string): boolean =>
  /aliv\s*\.?\s*ia\s*studio/i.test(brandName.replace(/\s+/g, " "));

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
const at = (list: string[], i: number, fallback: string) => {
  const value = (list ?? []).map(clean).filter(Boolean);
  return value.length ? value[i % value.length] : fallback;
};

export type PersuasionFrame = {
  id: string;
  needs?: "pain" | "desire" | "solution";
  build: (ing: CopyIngredients, i: number) => { strong: string; rest: string };
};

/**
 * FRAMES DE PONTO ZERO — feitos para interromper o scroll. Curtos, no presente,
 * com um ponto de tensão concreto. O alvo da provocação é sempre o problema.
 */
export const PERSUASION_FRAMES: PersuasionFrame[] = [
  // --- Lacuna de curiosidade (o leitor precisa da linha seguinte) ---
  {
    id: "curiosidade-detalhe",
    build: (ing) => ({ strong: "Tem um detalhe que muda tudo", rest: ` em ${lower(ing.niche)} — e quase ninguém olha para ele.` }),
  },
  {
    id: "curiosidade-mesmo-motivo",
    needs: "pain",
    build: (ing, i) => ({ strong: `Quase todo mundo trava em ${lower(at(ing.pains, i, "começar"))}`, rest: " pelo mesmo motivo. E não é falta de esforço." }),
  },
  {
    id: "curiosidade-volta-sempre",
    needs: "pain",
    build: (ing, i) => ({ strong: `Sabe por que ${lower(at(ing.pains, i, "o problema"))} volta sempre?`, rest: " A resposta não está onde você procura." }),
  },
  {
    id: "curiosidade-tres-coisas",
    needs: "desire",
    build: (ing, i) => ({ strong: "Três coisas explicam", rest: ` ${lower(at(ing.desires, i, "o resultado que você quer"))}. A terceira ninguém comenta.` }),
  },
  {
    id: "curiosidade-contraintuitivo",
    needs: "desire",
    build: (ing, i) => ({ strong: `${upperFirst(at(ing.desires, i, "Resultado"))} não vem de fazer mais`, rest: ". Vem de parar de fazer o que atrapalha." }),
  },
  {
    id: "curiosidade-erro-comum",
    build: (ing) => ({ strong: `O erro mais comum em ${lower(ing.niche)}`, rest: " parece cuidado. Na prática, atrasa o resultado." }),
  },

  // --- Custo da inação (compara com o custo de não resolver, nunca com café) ---
  {
    id: "custo-nao-e-economia",
    needs: "pain",
    build: (ing, i) => ({ strong: `Conviver com ${lower(at(ing.pains, i, "o improviso"))} não é economia`, rest: ". É conta que chega depois." }),
  },
  {
    id: "custo-caro",
    build: () => ({ strong: "O que sai mais caro", rest: " é continuar do jeito que está." }),
  },
  {
    id: "custo-cada-semana",
    needs: "desire",
    build: (ing, i) => ({ strong: "Cada semana sem decidir", rest: ` adia ${lower(at(ing.desires, i, "o que você quer"))}.` }),
  },

  // --- Quebra de objeção com empatia (reconhece, depois resolve) ---
  {
    id: "objecao-tempo",
    needs: "pain",
    build: (ing, i) => ({ strong: "“Não tenho tempo”", rest: ` — é justamente por isso que ${lower(at(ing.pains, i, "isso"))} precisa sair do seu colo.` }),
  },
  {
    id: "objecao-tentei",
    build: () => ({ strong: "“Já tentei e parei”", rest: " — parar não foi falha sua. Faltou método para continuar." }),
  },
  {
    id: "objecao-comecar",
    needs: "solution",
    build: (ing, i) => ({ strong: "“Não sei por onde começar”", rest: ` — o ponto zero é ${lower(at(ing.solutions, i, "organizar o que já existe"))}.` }),
  },
  {
    id: "objecao-preco",
    build: () => ({ strong: "Comparar preço é fácil", rest: ". Difícil é medir o custo de não resolver." }),
  },

  // --- Especificidade (o oposto de genérico) ---
  {
    id: "especifico-antes-de",
    build: (ing, i) => ({ strong: `Antes de investir em ${lower(at(ing.keywords, i, "mais uma tentativa"))}`, rest: ", resolva o que trava o começo." }),
  },
  {
    id: "especifico-ponto-zero",
    needs: "pain",
    build: (ing, i) => ({ strong: "Começa no ponto zero", rest: `: entender por que ${lower(at(ing.pains, i, "isso"))} acontece.` }),
  },
  {
    id: "especifico-para-quem",
    needs: "solution",
    build: (ing, i) => ({ strong: `Se ${lower(at(ing.pains, i, "o assunto"))} te soa familiar`, rest: `, ${lower(at(ing.solutions, i, "existe um caminho pronto"))} já resolve isso.` }),
  },
];

/** Subtítulos de apoio com a mesma postura — usados junto do ponto zero. */
export const persuasionSubs = (ing: CopyIngredients): ((i: number) => string)[] => [
  (i) => `Ninguém para em ${lower(ing.niche)} por acaso: para quando reconhece ${lower(at(ing.pains, i, "o próprio problema"))}.`,
  (i) => `${upperFirst(at(ing.solutions, i, "Um caminho definido"))} — sem prometer o que não se entrega.`,
  (i) => `O custo de não resolver ${lower(at(ing.pains, i, "isso"))} aparece antes do próximo trimestre.`,
  (i) => `Reconhecer o problema já é meia decisão. A outra metade é ${lower(at(ing.solutions, i, "escolher o método"))}.`,
];
