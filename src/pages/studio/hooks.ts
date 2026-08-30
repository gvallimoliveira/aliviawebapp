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
const lower1 = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : text);
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

/** Aplica o mecanismo aos ingredientes da marca (determinístico, sem IA). */
export const composeHooks = (ing: HookIngredients): StudioHook[] =>
  HOOK_FRAMES.map((frame) => frame.build(ing))
    .filter((hook): hook is StudioHook => !!hook && hook.strong.length >= 12);
