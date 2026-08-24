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
  kickers: ["ENTENDA SUA DOR", "PARA QUEM SENTE DOR", "PRIMEIRO PASSO", "SEM SAIR DE CASA", "DOR TEM EXPLICAÇÃO", "ANTES DE ACEITAR CONVIVER", "DO CELULAR, EM MINUTOS"],
  headlines: [
    { strong: "Sua dor tem nome, causa e caminho.", rest: "Em poucos minutos você entende o que está acontecendo e o que fazer a seguir." },
    { strong: "Antes de aceitar “é só desgaste”, entenda o seu caso.", rest: "Uma avaliação guiada, com triagem de sinais de alerta e orientação clara." },
    { strong: "Você não precisa conviver com a dor por falta de informação.", rest: "Mapa de dor, questionário e um plano de exercícios pensado para o seu quadro." },
    { strong: "Um relatório para levar ao seu fisioterapeuta.", rest: "Tudo que você respondeu vira um documento organizado que acelera o atendimento." },
    { strong: "Do desconforto à direção.", rest: "Sem promessa de cura mágica: informação clínica responsável, do início ao fim." },
    { strong: "Dor que dura meses não é normal — é sinal.", rest: "Descubra em minutos o que investigar e quando procurar um profissional." },
    { strong: "Você já gastou mais com pomada do que com uma avaliação séria.", rest: "Uma avaliação guiada custa menos que um mês tentando adivinhar sozinho." },
    { strong: "Pare de pesquisar sintoma no Google.", rest: "Responda no seu ritmo e receba uma explicação feita por fisioterapeuta." },
    { strong: "Seu exercício errado pode estar mantendo a dor.", rest: "Programa em vídeo escolhido para o seu quadro, com progressão respeitosa." },
  ],
  subs: [
    "Avaliação guiada em poucos minutos, direto do celular.",
    "Feito por fisioterapeuta, com tecnologia por trás.",
    "Entender é o primeiro alívio.",
    "Você responde, o Aliv.iA organiza, seu fisioterapeuta decide.",
    "Sem consultório, sem espera, sem palpite de internet.",
    "Comece hoje, entenda hoje.",
  ],
  kinetic: [
    { kicker: "O QUE VOCÊ GANHA", word: "Clareza", caption: "Entender a dor muda como você lida com ela." },
    { kicker: "EM MINUTOS", word: "Direção", caption: "Saber o próximo passo, não só o nome do problema." },
    { kicker: "SEM MEDO", word: "Segurança", caption: "Triagem de sinais de alerta em toda avaliação." },
    { kicker: "TODOS OS DIAS", word: "Progresso", caption: "Diário de dor mostrando sua evolução real." },
    { kicker: "NA CONSULTA", word: "Voz", caption: "Você chega com relatório, não com dúvida." },
    { kicker: "EM CASA", word: "Autonomia", caption: "Exercícios certos, na ordem certa." },
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
    [
      { value: 1, suffix: " celular", label: "é tudo que você precisa para começar" },
      { value: 24, suffix: "h", label: "de acesso ao seu plano, quando quiser" },
      { value: 3, label: "fases de progressão dos exercícios" },
    ],
  ],
  compare: [
    {
      title: "Duas maneiras de começar",
      before: ["Pesquisar sintoma no Google", "Ler fórum e ficar com mais medo", "Tomar remédio e esperar", "Chegar na consulta sem histórico"],
      after: ["Avaliação guiada passo a passo", "Explicação em linguagem clara", "Exercícios adequados ao seu quadro", "Relatório completo em mãos"],
    },
    {
      title: "Duas formas de encarar a dor crônica",
      before: ["“Vou aguentando”", "Exercício aleatório do YouTube", "Sem registro do que melhora", "Cada profissional recomeçando do zero"],
      after: ["Avaliação com sinais de alerta checados", "Programa escolhido para o seu quadro", "Diário de dor mostrando a curva", "Histórico organizado em um documento"],
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
    { tag: "RELATÓRIO", title: "Um documento para mostrar ao profissional", description: "Sua história, seus testes e sua evolução organizados em PDF.", image: stepReport },
    { tag: "MAIS DE UMA DOR", title: "Ombro e lombar acompanhados separadamente", description: "Cada condição com seu próprio histórico e seu próprio plano.", image: stepDiary },
    { tag: "PROFISSIONAIS", title: "Encontre um fisioterapeuta perto de você", description: "Vitrine de profissionais que já trabalham com o método." },
  ],
  quotes: [
    '"Entender a própria dor é o primeiro passo do tratamento."',
    '"Informação clínica responsável não promete cura — dá direção."',
    '"Você merece mais que “é só desgaste”."',
    '"Dor crônica não se resolve com paciência — se resolve com plano."',
    '"O corpo avisa. O problema é quando ninguém traduz."',
  ],
  marquee: [
    ["Dor lombar", "Ombro", "Joelho", "Cervical", "Tendinopatias"],
    ["Avaliação guiada", "Sinais de alerta", "Diário de dor", "Exercícios em vídeo", "Relatório"],
    ["Dor no quadril", "Dor no pé", "Dor de cabeça tensional", "Dor ao correr"],
  ],
  closings: [
    { title: "Comece pela sua avaliação", sub: "Poucos minutos para entender o que está acontecendo.", cta: "Fazer minha avaliação" },
    { title: "Sua dor merece um plano", sub: "Não um palpite da internet.", cta: "Quero entender minha dor" },
    { title: "Hoje é um bom dia para entender", sub: "Avaliação guiada direto do celular.", cta: "Começar agora" },
  ],
  sales: {
    audience: "quem convive com dor há semanas ou meses",
    proofs: [
      "Avaliação guiada em cerca de 7 minutos, direto do celular",
      "Mapa de dor para apontar a região sem termo técnico",
      "Triagem de sinais de alerta antes de qualquer exercício",
      "Explicação da sua dor em linguagem que você entende",
      "Programa de exercícios em vídeo, na sua fase de tratamento",
      "Diário de dor com a curva da sua evolução",
      "Relatório em PDF para levar ao fisioterapeuta ou médico",
      "Vitrine de profissionais para continuar o cuidado",
    ],
    objections: [
      "Não substitui consulta: organiza o seu caso para o profissional decidir melhor e mais rápido.",
      "Você não precisa saber nome de músculo nem de exame — as perguntas são simples.",
      "Se aparecer qualquer sinal de alerta, o sistema orienta procurar avaliação médica antes.",
      "Dá para começar pela avaliação gratuita e só depois decidir se quer o plano completo.",
    ],
    offers: [
      "Avaliação inicial gratuita; plano completo por R$ 109 em pagamento único.",
      "Acompanhamento mensal por R$ 79,90, com diário de dor e programa em vídeo.",
      "Comece grátis: você só avança se fizer sentido para o seu caso.",
    ],
    ctas: [
      "Link na bio para fazer sua avaliação gratuita",
      "Comenta DOR que eu te mando o link",
      "Marca alguém que vive dizendo “é só desgaste”",
      "Salva para fazer com calma hoje à noite",
    ],
    hashtags: [
      "dorlombar",
      "dornascostas",
      "dornoombro",
      "dornojoelho",
      "fisioterapia",
      "dorcronica",
      "saudedacoluna",
      "exercicioterapeutico",
      "qualidadedevida",
      "aliviaapp",
      "herniadedisco",
      "tendinite",
    ],
  },
};


export default patient;
