/**
 * MODELOS DE CONTEÚDO POR NICHO
 *
 * Não são landing pages nem sites: são *kits de conteúdo* prontos que
 * preenchem nicho, tom de voz, posicionamento e públicos de uma marca nova.
 * Servem de ponto de partida para o motor criativo gerar as artes estáticas
 * — o usuário edita tudo depois.
 */

import type { BrandAudience } from "./audiences";

export type NichePreset = {
  id: string;
  label: string;
  hint: string;
  niche: string;
  tone: string;
  positioning: string;
  strategy_notes: string;
  keywords: string;
  audiences: BrandAudience[];
};

export const NICHE_PRESETS: NichePreset[] = [
  {
    id: "fisio-autonomo",
    label: "Fisioterapeuta autônomo",
    hint: "Atendimento individual, agenda própria, indicação como principal canal",
    niche: "Fisioterapia autônoma",
    tone: "Acolhedor e técnico ao mesmo tempo: explica sem jargão, nunca promete cura milagrosa.",
    positioning:
      "Reabilitação individualizada com raciocínio clínico: cada pessoa recebe um plano feito para o corpo e a rotina dela, com reavaliação a cada etapa.",
    strategy_notes:
      "Informar: desmontar mitos de dor e movimento. Dor: nomear a dor que volta sempre e a frustração de tratamentos genéricos. Desejo: voltar a treinar, dormir e trabalhar sem medo. Venda: prova de método (avaliação, plano, reavaliação) + CTA para agendar.",
    keywords: "dor lombar, reabilitação, exercício terapêutico, avaliação, fisioterapia",
    audiences: [
      {
        id: "paciente-dor-cronica",
        label: "Paciente com dor crônica",
        description: "Convive com dor há meses, já passou por vários profissionais e desconfia de promessa fácil.",
        pains: ["A dor sempre volta", "Exame não explica o que sinto", "Medo de piorar se me mexer"],
        desires: ["Entender a causa", "Voltar à rotina sem depender de remédio"],
        proof: ["Avaliação completa na primeira sessão", "Plano de exercícios para casa", "Reavaliação a cada 4 semanas"],
        cta: "Agendar minha avaliação",
      },
      {
        id: "atleta-amador",
        label: "Atleta amador",
        description: "Corre, pedala ou treina força e quer voltar ao esporte sem recair na lesão.",
        pains: ["Parar de treinar por causa da lesão", "Alta sem critério e nova recaída"],
        desires: ["Voltar ao esporte com segurança", "Performance sem dor"],
        proof: ["Testes de força e controle motor", "Progressão de carga documentada", "Critérios objetivos de retorno ao esporte"],
        cta: "Quero voltar a treinar",
      },
      {
        id: "pos-operatorio",
        label: "Pós-operatório",
        description: "Acabou de operar e precisa de condução segura fase a fase.",
        pains: ["Insegurança sobre o que pode fazer", "Orientação genérica pós-alta hospitalar"],
        desires: ["Recuperar movimento no tempo certo", "Saber exatamente o que fazer em casa"],
        proof: ["Protocolo por fases", "Acompanhamento entre as sessões", "Relatório de evolução para o médico"],
        cta: "Falar sobre minha cirurgia",
      },
    ],
  },
  {
    id: "nutri-estudio-saude",
    label: "Nutricionista / estúdio de saúde",
    hint: "Consultoria contínua, planos por assinatura, forte presença no Instagram",
    niche: "Nutrição e bem-estar",
    tone: "Direto, sem dieta punitiva: fala de comida real, constância e resultado sustentável.",
    positioning:
      "Acompanhamento nutricional que cabe na vida real: plano ajustado à rotina, à cultura alimentar e ao orçamento de cada pessoa.",
    strategy_notes:
      "Informar: educar sobre saciedade, proteína e ultraprocessados. Dor: cansaço da dieta que não dura. Desejo: energia, roupa servindo, relação leve com comida. Venda: antes/depois de hábito (não só de corpo) + CTA para a primeira consulta.",
    keywords: "nutrição, emagrecimento saudável, hipertrofia, hábitos, consulta online",
    audiences: [
      {
        id: "reeducacao",
        label: "Reeducação alimentar",
        description: "Já tentou várias dietas e desistiu de todas antes do terceiro mês.",
        pains: ["Efeito sanfona", "Dieta que não cabe na rotina", "Culpa depois de comer"],
        desires: ["Emagrecer sem sofrer", "Ter um plano que dure"],
        proof: ["Plano com comida de verdade", "Ajuste quinzenal", "Suporte entre consultas"],
        cta: "Marcar primeira consulta",
      },
      {
        id: "performance",
        label: "Performance e treino",
        description: "Treina sério e quer nutrição alinhada ao objetivo de força ou resistência.",
        pains: ["Treina muito e não evolui", "Suplementação no achismo"],
        desires: ["Ganhar massa magra", "Render mais no treino"],
        proof: ["Cálculo de macros por fase", "Estratégia pré e pós-treino", "Reavaliação de composição corporal"],
        cta: "Quero meu plano de performance",
      },
      {
        id: "saude-clinica",
        label: "Condição clínica",
        description: "Diabetes, hipertensão ou colesterol alto — precisa de alimentação terapêutica.",
        pains: ["Exames alterados", "Medo de aumentar a medicação"],
        desires: ["Exames de volta ao normal", "Comer bem sem restrição extrema"],
        proof: ["Conduta baseada em diretriz clínica", "Diálogo com o médico", "Metas por exame"],
        cta: "Cuidar da minha saúde",
      },
    ],
  },
  {
    id: "consultorio-b2b",
    label: "Consultório / clínica (B2B)",
    hint: "Equipe, gestão de agenda, captação e padronização de atendimento",
    niche: "Clínica multiprofissional",
    tone: "Institucional e confiante: fala de padrão, equipe e resultado mensurável.",
    positioning:
      "Uma clínica com padrão único de atendimento: mesma qualidade em qualquer profissional da equipe, com indicadores acompanhados de perto.",
    strategy_notes:
      "Informar: bastidores do padrão clínico e da estrutura. Dor: fila, desistência e atendimento desigual. Desejo: clínica reconhecida e agenda cheia. Venda: prova social e indicadores + CTA para agendar ou conhecer a estrutura.",
    keywords: "clínica, equipe multiprofissional, agendamento, convênio, atendimento",
    audiences: [
      {
        id: "paciente-final",
        label: "Paciente da clínica",
        description: "Procura um lugar confiável e resolutivo perto de casa ou do trabalho.",
        pains: ["Demora para conseguir horário", "Atendimento diferente a cada sessão"],
        desires: ["Resolver rápido e bem", "Ser atendido por uma equipe que se fala"],
        proof: ["Equipe multiprofissional", "Horários estendidos", "Plano de tratamento por escrito"],
        cta: "Agendar minha consulta",
      },
      {
        id: "empresa-parceira",
        label: "Empresa parceira",
        description: "RH ou gestor buscando reduzir afastamento e absenteísmo do time.",
        pains: ["Afastamentos por dor", "Custo de plano de saúde subindo"],
        desires: ["Time saudável e presente", "Relatórios para justificar o investimento"],
        proof: ["Programa in company", "Relatório de indicadores", "Atendimento prioritário"],
        cta: "Solicitar proposta corporativa",
      },
      {
        id: "profissional-parceiro",
        label: "Profissional parceiro",
        description: "Médico ou personal que quer um lugar de confiança para encaminhar pacientes.",
        pains: ["Encaminhar e nunca receber retorno", "Perder o vínculo com o paciente"],
        desires: ["Parceiro que devolve relatório", "Encaminhamento seguro"],
        proof: ["Relatório de evolução a cada ciclo", "Canal direto com a equipe", "Contrarreferência garantida"],
        cta: "Quero encaminhar pacientes",
      },
    ],
  },
];
