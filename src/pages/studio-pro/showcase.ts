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
  /** Presente apenas em formato carrossel: 4 a 5 slides amarrados. */
  slides?: ShowcaseSlide[];
};

export const FORMAT_LABEL: Record<ShowcaseFormat, string> = {
  story: "Story 9:16",
  post: "Post 1:1",
  carousel: "Carrossel",
};

export const SHOWCASE: ShowcaseItem[] = [
  {
    id: "cafe-mono",
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
    kind: "list",
    format: "carousel",
    niche: "Contabilidade",
    brand: "Clareza Contábil",
    kicker: "3 erros que custam caro",
    headline: "O que trava o caixa de um negócio pequeno.",
    accent: "trava",
    lines: [
      "Misturar conta pessoal e conta da empresa.",
      "Deixar o regime tributário no automático.",
      "Fechar o mês sem olhar a margem por produto.",
    ],
  },
  {
    id: "imob-quote",
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
    kind: "brand",
    format: "story",
    niche: "Marca própria",
    brand: "Torra Lenta",
    headline: "Sua assinatura em toda arte.",
    accent: "assinatura",
    support: "Logo, cor e tipografia aplicados automaticamente.",
  },
];
