/**
 * MÉTODO EM LINGUAGEM DE LEIGO (STEPS e D.I.F.I)
 *
 * Nas artes, "STEPS" e "D.I.F.I" apareciam só como sigla — autoridade sem
 * desejo. Aqui cada fase e cada eixo ganha uma frase que qualquer pessoa
 * entende, na voz do paciente ou na voz do profissional. Nada de promessa de
 * cura, prazo ou garantia: a frase descreve o que o método faz, não o resultado.
 *
 * Tudo é local e determinístico — nenhum crédito de IA é consumido.
 */
import { createRng } from "@/pages/studio/rng";

export type MethodVoice = "patient" | "pro";

export type MethodLine = {
  /** Rótulo curto para kicker/etiqueta na arte. */
  tag: string;
  /** Frase em linguagem de leigo (voz do paciente). */
  patient: string;
  /** Mesma ideia, na voz de quem atende. */
  pro: string;
};

/** Os seis degraus do STEPS traduzidos em efeito clínico concreto. */
export const STEPS_PLAIN: MethodLine[] = [
  {
    tag: "Fase 1",
    patient: "Primeiro reduz a irritação e protege o que está sensível",
    pro: "Controle de dor e inflamação para reduzir irritabilidade antes de exigir carga",
  },
  {
    tag: "Fase 2",
    patient: "Depois respeita o reparo e o tempo que o tecido precisa",
    pro: "Reparo e cicatrização tecidual orientam a dose e o momento de progredir",
  },
  {
    tag: "Fase 3",
    patient: "Em seguida recupera o movimento que ficou limitado",
    pro: "Mobilidade e flexibilidade recuperadas antes de ampliar a demanda",
  },
  {
    tag: "Fase 4",
    patient: "Com o movimento disponível, força e resistência voltam a crescer",
    pro: "Força e resistência progridem com carga, resposta e assimetrias medidas",
  },
  {
    tag: "Fase 5",
    patient: "A força passa a funcionar nas tarefas e movimentos do seu dia",
    pro: "Controle motor e função reintegram capacidade à tarefa específica",
  },
  {
    tag: "Fase 6",
    patient: "A volta ao esporte e à rotina acontece com testes, não no achismo",
    pro: "Retorno ao esporte e alta dependem de critérios objetivos de prontidão",
  },
];

/** Os quatro eixos do D.I.F.I, sem jargão. */
export const DIFI_PLAIN: MethodLine[] = [
  {
    tag: "Dor",
    patient: "Onde dói, quando dói e o que faz doer",
    pro: "Dor mapeada por mecanismo, não só por intensidade",
  },
  {
    tag: "Inibição",
    patient: "O músculo que existe, mas não está sendo usado",
    pro: "Inibição: capacidade presente e não recrutada",
  },
  {
    tag: "Fraqueza",
    patient: "A força que faltou e dá para medir",
    pro: "Fraqueza medida, com dinamometria e comparação de lados",
  },
  {
    tag: "Incapacidade",
    patient: "O que você deixou de fazer no dia a dia",
    pro: "Incapacidade funcional descrita pela rotina do paciente",
  },
];

/** Um dos dois métodos, escolhido de forma estável pela seed. */
export const methodPlainLine = (seed: string, voice: MethodVoice = "patient"): string => {
  const rng = createRng(`method-plain:${seed}`);
  const pool = rng.int(2) === 0 ? STEPS_PLAIN : DIFI_PLAIN;
  const line = pool[rng.int(pool.length)];
  return voice === "pro" ? line.pro : line.patient;
};

/** Acervo completo em linguagem simples — usado como prova/apoio nas artes. */
export const methodPlainPool = (voice: MethodVoice = "patient"): string[] =>
  [...STEPS_PLAIN, ...DIFI_PLAIN].map((line) => (voice === "pro" ? line.pro : line.patient));
