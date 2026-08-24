import type { WorldContent } from "./types";
import stepPainMap from "@/assets/step-painmap.jpg";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepDiary from "@/assets/step-diary.jpg";
import stepReport from "@/assets/step-report.jpg";

const patient: WorldContent = {
  id: "paciente",
  label: "Paciente",
  kickers: ["ENTENDA SUA DOR", "PARA QUEM SENTE DOR", "PRIMEIRO PASSO", "SEM SAIR DE CASA"],
  headlines: [
    { strong: "Sua dor tem nome, causa e caminho.", rest: "Em poucos minutos você entende o que está acontecendo e o que fazer a seguir." },
    { strong: "Antes de aceitar “é só desgaste”, entenda o seu caso.", rest: "Uma avaliação guiada, com triagem de sinais de alerta e orientação clara." },
    { strong: "Você não precisa conviver com a dor por falta de informação.", rest: "Mapa de dor, questionário e um plano de exercícios pensado para o seu quadro." },
    { strong: "Um relatório para levar ao seu fisioterapeuta.", rest: "Tudo que você respondeu vira um documento organizado que acelera o atendimento." },
    { strong: "Do desconforto à direção.", rest: "Sem promessa de cura mágica: informação clínica responsável, do início ao fim." },
  ],
  subs: [
    "Avaliação guiada em poucos minutos, direto do celular.",
    "Feito por fisioterapeuta, com tecnologia por trás.",
    "Entender é o primeiro alívio.",
    "Você responde, o Aliv.iA organiza, seu fisioterapeuta decide.",
  ],
  kinetic: [
    { kicker: "O QUE VOCÊ GANHA", word: "Clareza", caption: "Entender a dor muda como você lida com ela." },
    { kicker: "EM MINUTOS", word: "Direção", caption: "Saber o próximo passo, não só o nome do problema." },
    { kicker: "SEM MEDO", word: "Segurança", caption: "Triagem de sinais de alerta em toda avaliação." },
    { kicker: "TODOS OS DIAS", word: "Progresso", caption: "Diário de dor mostrando sua evolução real." },
  ],
  metrics: [
    [
      { value: 7, suffix: " min", label: "para concluir a avaliação" },
      { value: 0, suffix: " consultas", label: "necessárias para começar" },
      { value: 1, suffix: " relatório", label: "para levar ao profissional" },
    ],
    [
      { value: 100, suffix: "%", label: "das avaliações com triagem de segurança" },
      { value: 30, suffix: " dias", label: "de acompanhamento no diário de dor" },
      { value: 4, label: "regiões do corpo mapeadas por vez" },
    ],
  ],
  compare: [
    {
      title: "Duas maneiras de começar",
      before: ["Pesquisar sintoma no Google", "Ler fórum e ficar com mais medo", "Tomar remédio e esperar", "Chegar na consulta sem histórico"],
      after: ["Avaliação guiada passo a passo", "Explicação em linguagem clara", "Exercícios adequados ao seu quadro", "Relatório completo em mãos"],
    },
  ],
  journeys: [
    {
      kicker: "COMO FUNCIONA",
      heading: "Quatro passos até entender sua dor",
      steps: [
        { title: "Marque onde dói", description: "Um mapa do corpo para apontar a região e o tipo de dor.", image: stepPainMap },
        { title: "Conte sua história", description: "Perguntas simples sobre início, intensidade e o que piora.", image: stepAnamnesis },
        { title: "Testes guiados", description: "Movimentos seguros que você faz em casa, com orientação.", image: stepTests },
        { title: "Seu plano", description: "Exercícios em vídeo, organizados por fase de tratamento.", image: stepTreatment },
      ],
    },
    {
      kicker: "DEPOIS DA AVALIAÇÃO",
      heading: "O acompanhamento continua",
      steps: [
        { title: "Diário de dor", description: "Um registro por dia, e você vê a curva mudar.", image: stepDiary },
        { title: "Programa em vídeo", description: "Sabe exatamente o que fazer, quantas vezes e como.", image: stepTreatment },
        { title: "Relatório", description: "Leve para o seu fisioterapeuta ou médico.", image: stepReport },
      ],
    },
  ],
  features: [
    { tag: "MAPA DE DOR", title: "Aponte onde dói, no seu corpo", description: "Toque na região e descreva o padrão — sem precisar saber nomes técnicos.", image: stepPainMap },
    { tag: "SEGURANÇA", title: "Sinais de alerta sempre checados", description: "Se algo exigir avaliação médica, o Aliv.iA avisa antes de qualquer exercício.", image: stepAnamnesis },
    { tag: "DIÁRIO DE DOR", title: "Sua evolução em uma linha", description: "Registro diário simples que mostra se o plano está funcionando.", image: stepDiary },
    { tag: "PROGRAMA", title: "Exercícios em vídeo para casa", description: "Selecionados para o seu quadro, com progressão respeitosa.", image: stepTreatment },
  ],
  quotes: [
    '"Entender a própria dor é o primeiro passo do tratamento."',
    '"Informação clínica responsável não promete cura — dá direção."',
    '"Você merece mais que “é só desgaste”."',
  ],
  marquee: [
    ["Dor lombar", "Ombro", "Joelho", "Cervical", "Tendinopatias"],
    ["Avaliação guiada", "Sinais de alerta", "Diário de dor", "Exercícios em vídeo", "Relatório"],
  ],
  closings: [
    { title: "Comece pela sua avaliação", sub: "Poucos minutos para entender o que está acontecendo.", cta: "Fazer minha avaliação" },
    { title: "Sua dor merece um plano", sub: "Não um palpite da internet.", cta: "Quero entender minha dor" },
  ],
};

export default patient;
