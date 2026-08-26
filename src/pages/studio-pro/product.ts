/**
 * IDENTIDADE DO PRODUTO PÚBLICO
 *
 * O Studio público é um produto de criação de posts para QUALQUER nicho — não
 * fala de fisioterapia, não linka para o app clínico. Toda string de marca fica
 * centralizada aqui para que renomear (marca própria) seja uma edição só.
 */

export const PRODUCT = {
  name: "Studio",
  wordmark: "Studio",
  tagline: "Sua marca postando todo dia, sem designer.",
  claim:
    "Um estúdio de arte que entende o DNA da sua marca e gera posts editoriais prontos para publicar — em segundos, em qualquer nicho.",
  /** Rota base isolada do produto público. */
  base: "/studio-pro",
} as const;

export type PlanId = "solo" | "marca" | "agencia";

export const PLANS: {
  id: PlanId;
  label: string;
  audience: string;
  brands: string;
  exports: string;
  perks: string[];
}[] = [
  {
    id: "solo",
    label: "Solo",
    audience: "Criador ou profissional autônomo",
    brands: "1 marca",
    exports: "60 artes por mês",
    perks: ["Kit de marca (logo, cores, fontes)", "Galeria de favoritos", "Legendas geradas com a arte"],
  },
  {
    id: "marca",
    label: "Marca",
    audience: "Negócio com presença constante",
    brands: "3 marcas",
    exports: "200 artes por mês",
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
    audience: "Quem cuida da marca de outros",
    brands: "15 marcas",
    exports: "800 artes por mês",
    perks: ["Tudo do Marca", "Pastas por cliente", "Créditos extras avulsos", "Suporte prioritário"],
  },
];
