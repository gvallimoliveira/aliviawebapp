/**
 * ACERVO DE EXEMPLOS DA LANDING PÚBLICA
 *
 * Cada item descreve uma arte de demonstração (mesma gramática visual dos
 * blocos do núcleo criativo), com copy de nichos variados — nada de saúde ou
 * fisioterapia. É só vitrine: nenhuma dependência de conta, foto ou backend.
 */

export type ShowcaseFormat = "story" | "post" | "carousel";

export type ShowcaseKind =
  | "mono"
  | "echo"
  | "typo"
  | "split"
  | "stats"
  | "list"
  | "brand"
  | "quote";

/**
 * Slide de um carrossel de verdade: capa, desenvolvimento e fechamento com
 * CTA. Mesma marca, mesmo tema — o encadeamento é o produto.
 */
export type ShowcaseSlide = {
  /** Papel narrativo do slide, usado para variar a composição. */
  role: "cover" | "point" | "stat" | "cta";
  kicker?: string;
  headline: string;
  accent?: string;
  support?: string;
  value?: string;
  lines?: string[];
};

/**
 * Paleta local do exemplo. Só valores HSL crus, aplicados como override de
 * tokens semânticos no card — nenhuma cor solta em componentes. Serve para
 * mostrar que o Studio não está preso a uma única combinação de cores.
 */
export type ShowcasePalette = {
  /** hsl cru: "24 30% 12%" */
  primary: string;
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  ink: string;
  paper: string;
  mid: string;
};

export type ShowcaseItem = {
  id: string;
  kind: ShowcaseKind;
  format: ShowcaseFormat;
  /** Nicho de exemplo, exibido como etiqueta discreta. */
  niche: string;
  brand: string;
  kicker?: string;
  headline: string;
  /** Palavra destacada dentro da headline (precisa existir no texto). */
  accent?: string;
  support?: string;
  lines?: string[];
  value?: string;
  caption?: string;
  /** Paleta própria do exemplo (opcional: sem ela, usa o tema do site). */
  palette?: ShowcasePalette;
  /** Presente apenas em formato carrossel: 4 a 5 slides amarrados. */
  slides?: ShowcaseSlide[];
};

export const FORMAT_LABEL: Record<ShowcaseFormat, string> = {
  story: "Story 9:16",
  post: "Post 1:1",
  carousel: "Carrossel",
};

/** Paletas de nichos distintos — cada exemplo puxa a sua. */
export const PALETTES: Record<string, ShowcasePalette> = {
  cafe: {
    primary: "28 88% 54%",
    background: "34 44% 96%",
    card: "34 44% 96%",
    foreground: "24 34% 13%",
    mutedForeground: "24 14% 40%",
    border: "30 24% 84%",
    ink: "24 34% 13%",
    paper: "34 44% 96%",
    mid: "30 14% 66%",
  },
  tattoo: {
    primary: "352 82% 56%",
    background: "0 0% 7%",
    card: "0 0% 11%",
    foreground: "0 0% 96%",
    mutedForeground: "0 0% 62%",
    border: "0 0% 22%",
    ink: "0 0% 7%",
    paper: "0 0% 96%",
    mid: "0 0% 58%",
  },
  arch: {
    primary: "221 74% 46%",
    background: "210 22% 97%",
    card: "210 22% 97%",
    foreground: "218 32% 14%",
    mutedForeground: "216 14% 42%",
    border: "215 20% 86%",
    ink: "218 32% 14%",
    paper: "210 22% 97%",
    mid: "215 12% 64%",
  },
  fashion: {
    primary: "338 62% 52%",
    background: "20 30% 96%",
    card: "20 30% 96%",
    foreground: "330 18% 15%",
    mutedForeground: "330 8% 42%",
    border: "20 18% 86%",
    ink: "330 22% 12%",
    paper: "20 30% 96%",
    mid: "330 8% 62%",
  },
  gym: {
    primary: "84 74% 44%",
    background: "220 16% 11%",
    card: "220 16% 14%",
    foreground: "80 12% 96%",
    mutedForeground: "220 8% 66%",
    border: "220 12% 24%",
    ink: "220 18% 9%",
    paper: "80 12% 96%",
    mid: "220 8% 60%",
  },
  finance: {
    primary: "192 82% 42%",
    background: "205 30% 97%",
    card: "205 30% 97%",
    foreground: "210 40% 12%",
    mutedForeground: "208 16% 40%",
    border: "205 22% 85%",
    ink: "210 44% 10%",
    paper: "205 30% 97%",
    mid: "208 14% 62%",
  },
  realestate: {
    primary: "42 88% 48%",
    background: "40 26% 96%",
    card: "40 26% 96%",
    foreground: "215 28% 14%",
    mutedForeground: "215 12% 40%",
    border: "40 18% 84%",
    ink: "215 30% 12%",
    paper: "40 26% 96%",
    mid: "215 10% 62%",
  },
  brandkit: {
    primary: "268 72% 62%",
    background: "265 30% 97%",
    card: "265 30% 97%",
    foreground: "265 34% 13%",
    mutedForeground: "265 12% 42%",
    border: "265 20% 86%",
    ink: "265 40% 11%",
    paper: "265 30% 97%",
    mid: "265 10% 64%",
  },
};


export const SHOWCASE: ShowcaseItem[] = [
  {
    id: "cafe-mono",
    palette: PALETTES.cafe,
    kind: "mono",
    format: "post",
    niche: "Cafeteria",
    brand: "Torra Lenta",
    kicker: "Edição mono",
    headline: "Café bom não tem pressa.",
    accent: "pressa",
    support: "Grãos torrados na semana, moídos no pedido.",
  },
  {
    id: "studio-echo",
    palette: PALETTES.tattoo,
    kind: "echo",
    format: "story",
    niche: "Estúdio de tatuagem",
    brand: "Linha Preta",
    headline: "PERMANENTE",
    accent: "PERMANENTE",
    support: "Agenda de setembro aberta.",
  },
  {
    id: "arq-typo",
    palette: PALETTES.arch,
    kind: "typo",
    format: "post",
    niche: "Arquitetura",
    brand: "Atelier Norte",
    kicker: "Projeto do mês",
    headline: "Espaço não se decora. Se resolve.",
    accent: "resolve",
    support: "Reforma de 62 m² entregue em 9 semanas.",
  },
  {
    id: "moda-split",
    palette: PALETTES.fashion,
    kind: "split",
    format: "story",
    niche: "Moda autoral",
    brand: "Feito à Mão",
    kicker: "Nova cápsula",
    headline: "Menos peças. Mais escolha.",
    accent: "escolha",
    support: "12 modelagens, tecido natural, produção local.",
  },
  {
    id: "academia-stats",
    palette: PALETTES.gym,
    kind: "stats",
    format: "post",
    niche: "Box de treino",
    brand: "Ferro & Cal",
    kicker: "Balanço do trimestre",
    value: "312",
    headline: "treinos registrados pela turma da manhã.",
    accent: "registrados",
    support: "Constância vence intensidade.",
  },
  {
    id: "contabil-list",
    palette: PALETTES.finance,
    kind: "list",
    format: "carousel",
    niche: "Contabilidade",
    brand: "Clareza Contábil",
    kicker: "3 erros que custam caro",
    headline: "O que trava o caixa de um negócio pequeno.",
    accent: "trava",
    slides: [
      {
        role: "cover",
        kicker: "3 erros que custam caro",
        headline: "O que trava o caixa de um negócio pequeno.",
        accent: "trava",
        support: "Arrasta para ver os três — e o que fazer em cada um.",
      },
      {
        role: "point",
        kicker: "Erro 1",
        headline: "Conta pessoal e conta da empresa no mesmo lugar.",
        accent: "mesmo lugar",
        support: "Sem separação, ninguém sabe quanto o negócio realmente lucra.",
      },
      {
        role: "point",
        kicker: "Erro 2",
        headline: "Regime tributário escolhido uma vez e nunca revisto.",
        accent: "nunca revisto",
        support: "A cada faturamento novo, a conta muda. Revisar é economia.",
      },
      {
        role: "stat",
        kicker: "Erro 3",
        value: "1 em 3",
        headline: "negócios fecham o mês sem olhar a margem por produto.",
        accent: "margem",
        support: "Vender mais com margem errada só acelera o prejuízo.",
      },
      {
        role: "cta",
        kicker: "Próximo passo",
        headline: "Comece separando as contas esta semana.",
        accent: "esta semana",
        support: "Chame no direct: a gente monta o mapa do seu caixa.",
      },
    ],
  },
  {
    id: "imob-quote",
    palette: PALETTES.realestate,
    kind: "quote",
    format: "post",
    niche: "Imobiliária",
    brand: "Chave Norte",
    kicker: "Caso real, nome protegido",
    headline: "Achei em duas semanas o que procurava há oito meses.",
    accent: "duas",
    support: "Cliente compradora, zona sul.",
  },
  {
    id: "brand-lockup",
    palette: PALETTES.brandkit,
    kind: "brand",
    format: "story",
    niche: "Marca própria",
    brand: "Torra Lenta",
    headline: "Sua assinatura em toda arte.",
    accent: "assinatura",
    support: "Logo, cor e tipografia aplicados automaticamente.",
  },
  {
    id: "moda-carousel",
    palette: PALETTES.fashion,
    kind: "list",
    format: "carousel",
    niche: "Moda autoral",
    brand: "Feito à Mão",
    kicker: "Cápsula de inverno",
    headline: "Quatro peças, dez combinações.",
    accent: "dez",
    slides: [
      {
        role: "cover",
        kicker: "Cápsula de inverno",
        headline: "Quatro peças, dez combinações.",
        accent: "dez",
        support: "Um guarda-roupa que resolve a semana inteira.",
      },
      {
        role: "point",
        kicker: "Peça 1 e 2",
        headline: "Alfaiataria de lã com camisa de algodão cru.",
        accent: "lã",
        support: "Base neutra: vai do escritório ao jantar sem trocar de roupa.",
      },
      {
        role: "point",
        kicker: "Peça 3 e 4",
        headline: "Tricô encorpado e saia midi de caimento reto.",
        accent: "reto",
        support: "Volume em cima, linha limpa embaixo. Sempre funciona.",
      },
      {
        role: "cta",
        kicker: "Produção local",
        headline: "Cada peça sai de um atelier com nome e endereço.",
        accent: "nome e endereço",
        support: "Cápsula disponível no site — numeração limitada.",
      },
    ],
  },
];
