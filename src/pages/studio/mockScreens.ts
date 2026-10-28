import type { TopicId } from "./topics";
import { ALIVIA_NAME, BRAND_NAME } from "./brand";

/**
 * TELAS SIMULADAS DAS ILUSTRAÇÕES (aparelhos em cena)
 *
 * A maquete dentro do notebook/tablet/celular precisa contar a MESMA história
 * do título: se a arte fala de testes, a tela mostra testes; se fala de carga,
 * mostra carga. Cada linha tem rótulo + valor concreto — nunca o nome do
 * público, nunca rótulo repetido.
 *
 * As telas temáticas descrevem funções reais do Aliv.iA e só valem para a
 * marca dona. Marcas de clientes recebem a tela montada dos próprios
 * diferenciais (títulos curtos, sem repetir o público).
 */
export type MockRow = { label: string; value: string; pct: number };
export type MockScreen = { title: string; rows: MockRow[] };

type Theme = { topics: TopicId[]; keywords: RegExp; screen: MockScreen };

const THEMES: Theme[] = [
  {
    topics: ["functional-tests", "hypothesis", "differential", "final-hypothesis"],
    keywords: /\b(testes?|cluster|hip[óo]tese|diferencia|decor|l[óo]gica|racioc[ií]nio)/i,
    screen: {
      title: "Hipótese com critério",
      rows: [
        { label: "Cluster de Laslett", value: "3 de 4 positivos", pct: 75 },
        { label: "Neurodinâmica (SLR)", value: "Negativo", pct: 20 },
        { label: "Mecanismo de dor", value: "Nociceptivo", pct: 68 },
        { label: "Confiança da hipótese", value: "Alta", pct: 84 },
      ],
    },
  },
  {
    topics: ["anamnesis", "pain-map", "red-flags", "assessment-link", "voice-notes", "health-general"],
    keywords: /\b(anamnese|prontu[áa]rio|avalia|formul|red flag|triagem|digita|escrev)/i,
    screen: {
      title: "Avaliação pronta para validar",
      rows: [
        { label: "Red flags", value: "Ausentes", pct: 100 },
        { label: "Mapa de dor", value: "Lombar · EVA 6", pct: 60 },
        { label: "Anamnese estruturada", value: "Completa", pct: 92 },
        { label: "Saúde geral", value: "HAS controlada", pct: 55 },
      ],
    },
  },
  {
    topics: ["questionnaires", "fabq"],
    keywords: /\b(question[áa]rio|escore|odi|spadi|fabq|koos|medo)/i,
    screen: {
      title: "Escores interpretados",
      rows: [
        { label: "ODI", value: "34% · moderada", pct: 34 },
        { label: "FABQ atividade", value: "17 · elevado", pct: 71 },
        { label: "PSFS", value: "5,7 / 10", pct: 57 },
        { label: "Reavaliação", value: "−12 pontos", pct: 80 },
      ],
    },
  },
  {
    topics: ["treatment-plan", "steps-method", "difi", "hep"],
    keywords: /\b(steps|d\.?i\.?f\.?i|plano|exerc[ií]cio|hep|progress|fase|conduta)/i,
    screen: {
      title: "Plano guiado pelo STEPS",
      rows: [
        { label: "Fase atual", value: "Força · 4 de 6", pct: 66 },
        { label: "Critério para avançar", value: "Assimetria < 10%", pct: 72 },
        { label: "HEP em vídeo", value: "6 exercícios", pct: 85 },
        { label: "Adesão em 14 dias", value: "86%", pct: 86 },
      ],
    },
  },
  {
    topics: ["dynamometry", "express-reassessment"],
    keywords: /\b(for[çc]a|dinam|assimetria|reavalia|medir)/i,
    screen: {
      title: "Força medida, não estimada",
      rows: [
        { label: "Quadríceps D × E", value: "Assimetria 18%", pct: 82 },
        { label: "Isquiotibiais D × E", value: "Assimetria 7%", pct: 93 },
        { label: "Semáforo de risco", value: "Atenção", pct: 50 },
        { label: "Desde a última medida", value: "+14% de força", pct: 74 },
      ],
    },
  },
  {
    topics: ["pain-diary", "clinical-impression", "report", "discharge-report"],
    keywords: /\b(evolu|alta|relat[óo]rio|pdf|di[áa]rio|curva)/i,
    screen: {
      title: "Evolução lado a lado",
      rows: [
        { label: "Dor (EVA)", value: "7 → 2", pct: 78 },
        { label: "Função (PSFS)", value: "3,2 → 8,1", pct: 81 },
        { label: "Fase do STEPS", value: "Retorno", pct: 95 },
        { label: "Relatório de alta", value: "PDF pronto", pct: 100 },
      ],
    },
  },
  {
    topics: ["clinical-agent", "evidence-library"],
    keywords: /\b(agente|evid[êe]ncia|pedro|pubmed|fonte|caso)/i,
    screen: {
      title: "Discussão de caso com fonte",
      rows: [
        { label: "Evidência PEDro", value: "≥ 7 pontos", pct: 80 },
        { label: "Fonte rastreável", value: "PMID validado", pct: 100 },
        { label: "Conduta sugerida", value: "Carga progressiva", pct: 70 },
        { label: "Decisão final", value: "Do fisioterapeuta", pct: 100 },
      ],
    },
  },
  {
    topics: ["agenda", "nps", "permissions", "shared-record", "white-label", "institutional-link", "pricing"],
    keywords: /\b(agenda|gest[ãa]o|cl[ií]nica|equipe|nps|convers|ocupa)/i,
    screen: {
      title: "Gestão da clínica",
      rows: [
        { label: "Ocupação da agenda", value: "82%", pct: 82 },
        { label: "Avaliação → agenda", value: "74% em 7 dias", pct: 74 },
        { label: "NPS da equipe", value: "71 · excelente", pct: 71 },
        { label: "Reativações sugeridas", value: "9 pacientes", pct: 45 },
      ],
    },
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Escolhe a tela: o TÍTULO da arte manda (coerência com a promessa); sem
 * palavra-chave, vale o tópico da funcionalidade principal. Só marca dona.
 */
export const themedScreen = (headline: string, topics: (TopicId | undefined)[]): MockScreen | null => {
  if (BRAND_NAME !== ALIVIA_NAME) return null;
  const byKeyword = THEMES.find((t) => t.keywords.test(headline));
  if (byKeyword) return byKeyword.screen;
  for (const topic of topics) {
    const hit = topic && THEMES.find((t) => t.topics.includes(topic));
    if (hit) return hit.screen;
  }
  return null;
};

/**
 * Tela de reserva para qualquer marca: rótulos únicos, curtos, sem repetir o
 * público (palavras do kicker/título) e sem valores inventados.
 */
export const fallbackScreen = (
  features: { tag?: string; title: string }[],
  avoid: string[],
): MockScreen => {
  const banned = avoid.map(norm).filter(Boolean);
  const seen = new Set<string>();
  const rows: MockRow[] = [];
  for (const f of features) {
    const candidates = [f.tag ?? "", f.title];
    for (const raw of candidates) {
      const label = raw.split(/\s·\s/).pop()!.trim();
      const key = norm(label);
      if (!key || key.length > 34 || seen.has(key)) continue;
      if (banned.some((b) => b && (key === b || key.includes(b) || b.includes(key)))) continue;
      seen.add(key);
      rows.push({ label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(), value: "", pct: 48 + ((rows.length * 17) % 44) });
      break;
    }
    if (rows.length >= 4) break;
  }
  const title = features.find((f) => f.title.length <= 40)?.title ?? features[0]?.title ?? "";
  return { title, rows };
};
