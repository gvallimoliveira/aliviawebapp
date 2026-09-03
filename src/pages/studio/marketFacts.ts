/**
 * ACERVO DE PERCENTUAIS REAIS (dados de mercado por marca)
 *
 * O bloco `percent` e o bloco `stats` só podem mostrar número que exista de
 * verdade: o motor NUNCA inventa estatística. Este arquivo é a única fonte de
 * percentuais externos das artes — cada item traz, na própria nota, a FONTE e o
 * ANO e é marcado como `source: "market"` para não se confundir com métricas
 * internas do produto.
 * Se um dado não tem fonte pública verificável, ele não entra aqui.
 *
 * ISOLAMENTO DE MARCA: cada tabela só é lida quando a marca corresponde
 * (mesma regra do acervo curado de ganchos, `hookLibrary.ts`). Marca de cliente
 * sem acervo próprio simplesmente não recebe percentual externo — e aí o bloco
 * de dado percentual não é gerado, em vez de exibir número de outra empresa.
 *
 * Conferido em out/2026 nas fontes primárias:
 * - OMS — "Low back pain" (2023) e "Musculoskeletal health" (2022).
 * - Peek et al., *Disability and Rehabilitation* (2017) — adesão a exercício domiciliar.
 * - Doctoralia/Docplanner — "Quem é o Paciente Digital" (2023).
 * - Sebrae/ASN — Transformação Digital nos Pequenos Negócios (2023).
 * - GoDaddy — Pesquisa Global de Empreendedorismo (2025), dados do Brasil.
 */

import type { StatItem, WorldContent } from "./content/types";

export type MarketFactSet = { heading: string; items: StatItem[] };

/** Marca cada item como dado externo para o bloco de percentual. */
const markMarketFacts = (sets: MarketFactSet[]): MarketFactSet[] =>
  sets.map(({ heading, items }) => ({
    heading,
    items: items.map((item) => ({ ...item, source: "market" as const })),
  }));

const PAIN_FACTS: MarketFactSet[] = [
  {
    heading: "Dor nas costas não é exceção — é regra",
    items: [
      {
        value: "8%",
        label: "da população mundial convive com dor lombar",
        note: "OMS, 2023: 619 milhões de pessoas em 2020",
      },
      {
        value: "21%",
        label: "das pessoas têm alguma condição musculoesquelética",
        note: "OMS, 2022: 1,71 bilhão de pessoas no mundo",
      },
      {
        value: "+36%",
        label: "de casos de dor lombar projetados até 2050",
        note: "OMS, 2023: de 619 para 843 milhões de casos",
      },
    ],
  },
  {
    heading: "O problema não é começar. É continuar",
    items: [
      {
        value: "70%",
        label: "das pessoas não seguem o exercício em casa como combinado",
        note: "Peek et al., Disability and Rehabilitation, 2017",
      },
      {
        value: "8%",
        label: "da população mundial convive com dor lombar",
        note: "OMS, 2023: 619 milhões de pessoas em 2020",
      },
      {
        value: "90%",
        label: "das pessoas buscam informação de saúde na internet",
        note: "Doctoralia, Quem é o Paciente Digital, 2023",
      },
    ],
  },
];

/** Comportamento do paciente digital e adesão — público profissional/clínica. */
const CARE_MARKET_FACTS: MarketFactSet[] = [
  {
    heading: "Como o paciente escolhe quem vai atender",
    items: [
      {
        value: "80%",
        label: "escolhem o especialista pelas avaliações online",
        note: "Doctoralia, Quem é o Paciente Digital, 2023",
      },
      {
        value: "90%",
        label: "buscam informação de saúde na internet antes de marcar",
        note: "Doctoralia, Quem é o Paciente Digital, 2023",
      },
      {
        value: "79%",
        label: "confiam no agendamento online",
        note: "Doctoralia, Quem é o Paciente Digital, 2023",
      },
    ],
  },
  {
    heading: "A conta que a agenda não mostra",
    items: [
      {
        value: "70%",
        label: "dos pacientes não seguem o programa domiciliar como prescrito",
        note: "Peek et al., Disability and Rehabilitation, 2017",
      },
      {
        value: "21%",
        label: "da população tem condição musculoesquelética",
        note: "OMS, 2022: 1,71 bilhão de pessoas no mundo",
      },
      {
        value: "+36%",
        label: "de casos de dor lombar até 2050",
        note: "OMS, 2023: de 619 para 843 milhões de casos",
      },
    ],
  },
];

/** Autônomos, redes sociais e criação de conteúdo — marca do produto de artes. */
const SOCIAL_MEDIA_FACTS: MarketFactSet[] = [
  {
    heading: "Todo mundo está na rede. Poucos dão conta do conteúdo",
    items: [
      {
        value: "38%",
        label: "dos empreendedores acham difícil ter ideia de post",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
      {
        value: "31%",
        label: "não têm tempo para criar e publicar com regularidade",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
      {
        value: "45%",
        label: "querem ferramenta mais simples para criar e publicar",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
    ],
  },
  {
    heading: "A rede social virou o balcão do negócio",
    items: [
      {
        value: "64%",
        label: "dos pequenos negócios têm perfil no Instagram",
        note: "Sebrae, Transformação Digital nos Pequenos Negócios, 2023",
      },
      {
        value: "43%",
        label: "vendem direto pelas redes sociais",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
      {
        value: "90%",
        label: "dizem que a rede social é importante para vender",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
    ],
  },
  {
    heading: "Postar não é o problema. Falar com quem importa é",
    items: [
      {
        value: "67%",
        label: "precisam de um jeito melhor de alcançar o público certo",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
      {
        value: "70%",
        label: "dos pequenos negócios já estão nas redes sociais",
        note: "Sebrae, Transformação Digital nos Pequenos Negócios, 2023",
      },
      {
        value: "38%",
        label: "travam na hora de pensar o que postar",
        note: "GoDaddy, Pesquisa Global de Empreendedorismo, 2025",
      },
    ],
  },
];

/** Detecta o produto de artes (marca própria do Studio). */
const isStudioSelf = (name: string) => /aliv\s*\.?\s*ia\s*studio/i.test(name);
/** Detecta o app clínico, excluindo o Studio. */
const isClinicalApp = (name: string) => !isStudioSelf(name) && /aliv\s*\.?\s*i\s*a\b/i.test(name);
/** Detecta a marca pessoal do fisioterapeuta. */
const isVallim = (name: string) => /guilherme\s+vallim|gvallim/i.test(name);

/**
 * Percentuais reais disponíveis para a marca. `patientVoice` entrega o recorte
 * de quem sente dor; sem ele vale o recorte de quem atende.
 * Marca sem acervo declarado devolve lista vazia — de propósito.
 */
export const marketStatsFor = (
  brandName: string,
  opts: { patientVoice?: boolean } = {},
): WorldContent["stats"] => {
  const name = (brandName ?? "").replace(/\s+/g, " ").trim();
  if (!name) return [];
  if (isStudioSelf(name)) return SOCIAL_MEDIA_FACTS;
  if (isClinicalApp(name)) return opts.patientVoice ? PAIN_FACTS : CARE_MARKET_FACTS;
  // Marca pessoal do fisioterapeuta: fala com quem sente dor e com quem indica.
  if (isVallim(name)) return [...PAIN_FACTS, CARE_MARKET_FACTS[0]];
  return [];
};

export { PAIN_FACTS, CARE_MARKET_FACTS, SOCIAL_MEDIA_FACTS };
