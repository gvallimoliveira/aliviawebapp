/**
 * IDENTIDADE DO PRODUTO PÚBLICO
 *
 * O Studio público é um produto de criação de posts para QUALQUER nicho — não
 * fala de fisioterapia, não linka para o app clínico. Toda string de marca fica
 * centralizada aqui para que renomear (marca própria) seja uma edição só.
 */

export const PRODUCT = {
  name: "Aliv.iA Studio",
  wordmark: "Aliv.iA Studio",
  tagline: "Sua marca postando todo dia, sem designer.",
  claim:
    "Um estúdio de arte que entende o DNA da sua marca e gera posts editoriais prontos para publicar — em segundos, em qualquer nicho.",
  /** Rota base isolada do produto público. */
  base: "/studio-pro",
  /** Artes gratuitas concedidas no cadastro (saem com marca d'água discreta). */
  freeCredits: 5,
  /** Desconto aplicado no plano anual (20%). */
  annualDiscount: 0.2,
} as const;

/** Preço mensal equivalente quando o cliente paga o ano inteiro. */
export const annualMonthlyPrice = (monthly: number) =>
  Math.round(monthly * (1 - PRODUCT.annualDiscount));

export type PlanId = "solo" | "marca" | "agencia";

export const PLANS: {
  id: PlanId;
  label: string;
  price: number;
  audience: string;
  brands: string;
  exports: string;
  highlight?: boolean;
  perks: string[];
}[] = [
  {
    id: "solo",
    label: "Solo",
    price: 39,
    audience: "Criador ou profissional autônomo",
    brands: "1 marca",
    exports: "60 artes por mês",
    perks: [
      "Kit de marca (logo, cores, fontes)",
      "Galeria de favoritos salva na sua conta",
      "Legendas geradas junto com a arte",
      "Download sem marca d'água",
    ],
  },
  {
    id: "marca",
    label: "Marca",
    price: 99,
    audience: "Negócio com presença constante",
    brands: "3 marcas",
    exports: "200 artes por mês",
    highlight: true,
    perks: [
      "Tudo do Solo",
      "Extração de marca pelo site ou Instagram",
      "Cronograma editorial e carrosséis",
      "Exportação em feed, story e carrossel",
    ],
  },
  {
    id: "agencia",
    label: "Agência",
    price: 249,
    audience: "Quem cuida da marca de outros",
    brands: "15 marcas",
    exports: "800 artes por mês",
    perks: ["Tudo do Marca", "Pastas por cliente", "Créditos extras avulsos", "Suporte prioritário"],
  },
];

