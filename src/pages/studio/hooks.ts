/**
 * BIBLIOTECA DE GANCHOS (frases virais adaptadas à marca)
 *
 * Duas camadas, ambas locais e determinísticas (zero crédito de IA):
 *
 * 1. `HOOK_FRAMES` — o MECANISMO de criação do gancho. São as 10 estruturas
 *    virais ("Ninguém te conta isso sobre…", "O erro que quase todo mundo
 *    comete", "90% ignoram isso"…) escritas como funções que recebem os
 *    ingredientes reais da marca (dor, desejo, oferta, público, palavra-chave,
 *    CTA) e devolvem o gancho já contextualizado. Vale para QUALQUER marca do
 *    Studio: se o kit tem insumo, o gancho nasce; se não tem, o frame é pulado.
 *
 * 2. `hookLibrary.ts` — o acervo CURADO, escrito à mão para as marcas do dono
 *    (Aliv.iA Studio, Aliv.iA profissional/clínica, Aliv.iA paciente e
 *    Guilherme Vallim Fisioterapia). Quando a marca tem acervo curado, ele
 *    entra na frente; o mecanismo continua completando o repertório.
 *
 * Nada aqui altera a lógica de composição das artes: é acervo de redação lido
 * em tempo de geração, exatamente como `charmCopy` e `persuasion`.
 */

import { lowerInitial } from "./grammar";

/** Um gancho pronto para a arte. */
export type StudioHook = {
  /** Rótulo do frame viral (documental, também usado como kicker curto). */
  hook: string;
  /** Parte forte do gancho (fica em destaque tipográfico). */
  strong: string;
  /** Complemento que fecha a ideia (pode ser vazio). */
  rest: string;
  /** Apoio: fecha a ponte lógica sem prometer resultado. */
  sub?: string;
  /** Convite seguro. */
  cta?: string;
};

/** Ingredientes lidos do kit/briefing da marca. */
export type HookIngredients = {
  brand: string;
  niche?: string;
  audience?: string;
  pain?: string;
  desire?: string;
  offer?: string;
  belief?: string;
  keyword?: string;
  cta?: string;
  /** Palavra de oferta discriminada pela marca ("produto", "meu atendimento"…). */
  offerWord?: string;
};

const clean = (text?: string) => (text ?? "").trim().replace(/\s+/g, " ");
const noDot = (text?: string) => clean(text).replace(/\s*[.!?…]+$/, "");
const lower1 = lowerInitial;
const upper1 = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

export type HookFrame = {
  id: string;
  /** Rótulo do gancho viral original. */
  label: string;
  /** Monta o gancho; devolve null quando falta insumo real no kit. */
  build: (ing: HookIngredients) => StudioHook | null;
};

/**
 * OS 10 MECANISMOS. Cada um usa só o que a marca declarou — nenhum inventa
 * promessa, número ou resultado.
 */
export const HOOK_FRAMES: HookFrame[] = [
  {
    id: "ninguem-conta",
    label: "Ninguém te conta isso",
    build: (ing) => {
      const seed = noDot(ing.belief) || noDot(ing.pain);
      if (!seed) return null;
      return {
        hook: "Ninguém te conta isso",
        strong: `Ninguém te conta que ${lower1(seed)}`,
        rest: ".",
        sub: noDot(ing.offer) ? `${upper1(noDot(ing.offer))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "erro-comum",
    label: "O erro que quase todo mundo comete",
    build: (ing) => {
      const seed = noDot(ing.pain);
      if (!seed) return null;
      const who = noDot(ing.audience) || noDot(ing.niche);
      return {
        hook: "O erro que quase todo mundo comete",
        strong: who ? `O erro mais comum de quem é ${lower1(who)}:` : "O erro que quase todo mundo comete:",
        rest: ` ${lower1(seed)}.`,
        sub: noDot(ing.belief) ? `${upper1(noDot(ing.belief))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "sabotando",
    label: "Se você ainda faz isso, tá se sabotando",
    build: (ing) => {
      const seed = noDot(ing.pain);
      if (!seed) return null;
      return {
        hook: "Se você ainda faz isso",
        strong: `Se ${lower1(seed)}, você está se sabotando`,
        rest: ".",
        sub: "Não é falta de esforço — é falta de ordem no processo.",
        cta: ing.cta,
      };
    },
  },
  {
    id: "muda-resultado",
    label: "Isso pode mudar seu resultado",
    build: (ing) => {
      const seed = noDot(ing.offer) || noDot(ing.belief);
      if (!seed) return null;
      return {
        hook: "Isso muda o seu resultado",
        strong: upper1(lower1(seed)),
        rest: " muda mais o resultado do que dez ideias soltas.",
        sub: noDot(ing.desire) ? `O objetivo é simples: ${lower1(noDot(ing.desire))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "jeito-facil",
    label: "O jeito mais fácil de melhorar",
    build: (ing) => {
      const seed = noDot(ing.offer);
      if (!seed) return null;
      return {
        hook: "O jeito mais fácil de melhorar",
        strong: "O jeito mais fácil de melhorar:",
        rest: ` ${lower1(seed)}.`,
        sub: noDot(ing.belief) ? `${upper1(noDot(ing.belief))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "mais-informacao",
    label: "Você não precisa de mais informação",
    build: (ing) => {
      const seed = noDot(ing.offer) || noDot(ing.desire);
      if (!seed) return null;
      return {
        hook: "Você não precisa de mais informação",
        strong: "Você não precisa de mais informação.",
        rest: ` Precisa de ${lower1(seed)}.`,
        sub: noDot(ing.audience) ? `Feito para ${lower1(noDot(ing.audience))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "noventa-por-cento",
    label: "90% ignoram isso",
    build: (ing) => {
      const seed = noDot(ing.pain) || noDot(ing.belief);
      if (!seed) return null;
      const who = noDot(ing.audience) || noDot(ing.niche) || "as pessoas";
      return {
        hook: "90% ignoram isso",
        strong: `A maioria de ${lower1(who)} ignora isso:`,
        rest: ` ${lower1(seed)}.`,
        sub: "Não é detalhe pequeno — é o que decide o próximo passo.",
        cta: ing.cta,
      };
    },
  },
  {
    id: "segredo-simples",
    label: "O segredo que parece simples",
    build: (ing) => {
      const seed = noDot(ing.belief) || noDot(ing.offer);
      if (!seed) return null;
      return {
        hook: "O segredo que parece simples",
        strong: "O segredo é chato:",
        rest: ` ${lower1(seed)}.`,
        sub: "Simples de entender — e quase ninguém sustenta.",
        cta: ing.cta,
      };
    },
  },
  {
    id: "comecar-do-zero",
    label: "Se eu começasse do zero",
    build: (ing) => {
      const seed = noDot(ing.offer) || noDot(ing.belief);
      if (!seed) return null;
      return {
        hook: "Se eu começasse do zero",
        strong: "Se eu começasse hoje:",
        rest: ` ${lower1(seed)}. Nessa ordem.`,
        sub: noDot(ing.desire) ? `Porque o que importa é ${lower1(noDot(ing.desire))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
  {
    id: "pare-imediatamente",
    label: "Pare imediatamente",
    build: (ing) => {
      const seed = noDot(ing.pain);
      if (!seed) return null;
      return {
        hook: "Pare imediatamente",
        strong: `Pare de ${lower1(seed).replace(/^(de|que)\s+/i, "")}`,
        rest: ".",
        sub: noDot(ing.offer) ? `${upper1(noDot(ing.offer))}.` : undefined,
        cta: ing.cta,
      };
    },
  },
];

/**
 * LIMITE DE PARADA DE SCROLL (regra global, todas as marcas)
 *
 * Gancho é frase de impacto, não redação: passando deste tamanho a pessoa lê
 * em vez de parar. O excedente não é jogado fora — desce para o apoio (`sub`),
 * que é justamente o lugar de fechar a ponte lógica.
 */
export const HOOK_HEADLINE_MAX = 64;
const HOOK_SUB_MAX = 130;

const END_PUNCT = /[.!?…]+$/;

/** Pontos naturais de corte, do mais “editorial” para o mais neutro. */
const CUT_MARKS = [" — ", " – ", ": ", "; ", ". ", ", "];

const capSub = (text: string) => {
  const value = clean(text);
  if (value.length <= HOOK_SUB_MAX) return value;
  const cut = value.slice(0, HOOK_SUB_MAX);
  const space = cut.lastIndexOf(" ");
  return `${noDot(space > 40 ? cut.slice(0, space) : cut)}.`;
};

/**
 * Encurta um gancho longo sem perder conteúdo: corta a manchete no ponto
 * natural mais próximo do limite e manda a cauda para o apoio.
 */
export const tightenHook = (hook: StudioHook): StudioHook => {
  const headline = clean(`${hook.strong ?? ""}${hook.rest ?? ""}`);
  if (!headline) return hook;
  if (headline.length <= HOOK_HEADLINE_MAX) {
    return hook.sub ? { ...hook, sub: capSub(hook.sub) } : hook;
  }

  /**
   * Candidatos de corte. Prefere o mais longo dentro do limite, mas descarta
   * manchete pendurada ("…muda mais do que.") — frase incompleta não é gancho.
   */
  const candidates: Array<{ at: number; mark: number }> = [];
  for (const mark of CUT_MARKS) {
    let index = headline.indexOf(mark, 13);
    while (index > 12) {
      candidates.push({ at: index, mark: mark.length });
      index = headline.indexOf(mark, index + 1);
    }
  }
  const window = headline.slice(0, HOOK_HEADLINE_MAX);
  const space = window.lastIndexOf(" ");
  if (space > 12) candidates.push({ at: space, mark: 1 });

  const DANGLING =
    /\b(?:e|ou|mas|que|do|da|de|dos|das|no|na|nos|nas|ao|aos|à|às|a|o|os|as|com|sem|por|para|em|se|the|mais|menos|muito|como|quando|onde|um|uma)$/i;

  const inLimit = candidates
    .filter((c) => c.at <= HOOK_HEADLINE_MAX)
    .sort((a, b) => b.at - a.at);
  const overflow = candidates
    .filter((c) => c.at > HOOK_HEADLINE_MAX)
    .sort((a, b) => a.at - b.at);

  /* Último recurso: recua palavra por palavra até a manchete fechar sentido. */
  const backOff = (from: number): { at: number; mark: number } | undefined => {
    let at = from;
    for (let guard = 0; guard < 12; guard += 1) {
      const prev = headline.lastIndexOf(" ", at - 1);
      if (prev <= 12) return undefined;
      if (!DANGLING.test(noDot(headline.slice(0, prev)))) return { at: prev, mark: 1 };
      at = prev;
    }
    return undefined;
  };

  const pick =
    inLimit.find((c) => !DANGLING.test(noDot(headline.slice(0, c.at)))) ??
    overflow.find((c) => !DANGLING.test(noDot(headline.slice(0, c.at)))) ??
    (inLimit[0] ? backOff(inLimit[0].at) : undefined) ??
    inLimit[0] ??
    overflow[0];

  if (!pick) return hook.sub ? { ...hook, sub: capSub(hook.sub) } : hook;
  const cutAt = pick.at;
  const markLength = pick.mark;



  const head = noDot(headline.slice(0, cutAt));
  const tail = noDot(headline.slice(cutAt + markLength));
  const endMark = headline.match(END_PUNCT)?.[0] ?? ".";
  const extra = tail ? `${upper1(tail)}.` : "";
  const sub = [extra, clean(hook.sub)].filter(Boolean).join(" ");

  return {
    ...hook,
    strong: head,
    rest: endMark === "." ? "." : endMark,
    sub: sub ? capSub(sub) : undefined,
  };
};

/** Aplica o limite de manchete a uma lista inteira de ganchos. */
export const tightenHooks = (hooks: StudioHook[] | undefined): StudioHook[] =>
  (hooks ?? []).map(tightenHook);

/** Aplica o mecanismo aos ingredientes da marca (determinístico, sem IA). */
export const composeHooks = (ing: HookIngredients): StudioHook[] =>
  HOOK_FRAMES.map((frame) => frame.build(ing))
    .filter((hook): hook is StudioHook => !!hook && hook.strong.length >= 12)
    .map(tightenHook);

