import type { WorldContent } from "./types";

/**
 * Blocos tipográficos institucionais compartilhados entre os mundos.
 * O mundo profissional tem repertório próprio (mais palco); os demais herdam
 * este conjunto até ganharem versões dedicadas. Tipografia institucional não
 * declara tópico, então não interfere na dívida editorial.
 */
export const defaultTypos: WorldContent["typos"] = [
  { lead: "A conta é nossa.", big: "A decisão", tail: " é sua." },
  { lead: "Raciocínio clínico com", big: "alma", tail: " de fisioterapeuta." },
  { lead: "Menos teclado.", big: "Mais clínica", tail: "." },
  { lead: "O sistema sugere.", big: "Você", tail: " decide." },
];

export const defaultStats: WorldContent["stats"] = [
  {
    heading: "Números que sustentam o discurso",
    items: [
      { value: "100%", label: "dos casos com triagem de red flags", note: "segurança não é opcional" },
      { value: "PEDro ≥ 7", label: "nas fontes que o sistema cita", note: "evidência de verdade, não achismo" },
      { value: "1 PDF", label: "resume o caso inteiro", note: "a história clínica não morre na memória" },
    ],
  },
  {
    heading: "O fim do retrabalho",
    items: [
      { value: "6 fases", label: "do método STEPS em cada caso", note: "a progressão tem trilha" },
      { value: "4 eixos", label: "avaliados pelo D.I.F.I", note: "dor, inibição, fraqueza e incapacidade" },
      { value: "24h", label: "de histórico sempre acessível", note: "o caso inteiro, não a última sessão" },
    ],
  },
];

export const defaultTriptychs: WorldContent["triptychs"] = [
  {
    heading: "Três palavras que mudam a rotina clínica",
    panels: [
      { word: "Avalie", line: "Com método, da história ao teste funcional.", topic: "anamnesis" },
      { word: "Decida", line: "Com evidência citada e confiança declarada.", topic: "evidence-library" },
      { word: "Documente", line: "Sem digitar a mesma coisa duas vezes.", topic: "report" },
    ],
  },
  {
    heading: "O ciclo que fecha sozinho",
    panels: [
      { word: "Suspeite", line: "Red flags em 100% das avaliações.", topic: "red-flags" },
      { word: "Teste", line: "O cluster certo aparece pela suspeita.", topic: "functional-tests" },
      { word: "Comprove", line: "Evolução medida, não lembrada.", topic: "questionnaires" },
    ],
  },
];
