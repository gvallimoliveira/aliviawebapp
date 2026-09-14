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

/** As fases do STEPS traduzidas (espelham o macrociclo do produto). */
export const STEPS_PLAIN: MethodLine[] = [
  {
    tag: "Fase 1",
    patient: "Primeiro tira a dor do caminho e protege o que está machucado",
    pro: "Controle de dor e proteção tecidual antes de exigir carga",
  },
  {
    tag: "Fase 2",
    patient: "Depois devolve força para a região aguentar o seu dia",
    pro: "Reconstrução de força e tolerância à carga com progressão registrada",
  },
  {
    tag: "Fase 3",
    patient: "Só então treina velocidade e movimento de verdade",
    pro: "Potência e transição, quando o caso pede alta demanda",
  },
  {
    tag: "Fase 4",
    patient: "E a última fase é você voltando ao que gosta com critério, não com achismo",
    pro: "Retorno à atividade com critérios objetivos de liberação",
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
