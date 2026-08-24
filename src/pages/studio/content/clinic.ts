import type { WorldContent } from "./types";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepReport from "@/assets/step-report.jpg";
import stepQuestionnaires from "@/assets/step-questionnaires.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";

const clinic: WorldContent = {
  id: "clinica",
  label: "Clínica",
  kickers: ["ALIV.IA CLÍNICA", "PARA EQUIPES", "GESTÃO COM PADRÃO CLÍNICO", "MULTIPROFISSIONAL", "15 DIAS SEM CARTÃO", "WHITE LABEL", "QUALIDADE AUDITÁVEL"],
  headlines: [
    { strong: "Padrão clínico não pode depender de quem atendeu.", rest: "Toda a equipe avaliando pelo mesmo método, com o mesmo nível de documentação." },
    { strong: "Sua clínica com um prontuário só.", rest: "Recepção, fisioterapeutas e gestão olhando o mesmo paciente, com permissões diferentes." },
    { strong: "Quando o paciente troca de terapeuta, o raciocínio continua.", rest: "Histórico, hipótese, evolução e programa domiciliar sempre no mesmo lugar." },
    { strong: "Qualidade auditável, não prometida.", rest: "Cada hipótese com autor, cada ressalva com justificativa, cada relatório com marca própria." },
    { strong: "Sua marca no relatório, seu método no processo.", rest: "White label com logo e cores da clínica em toda documentação entregue." },
    { strong: "Quem sai da sua clínica leva um documento, não uma sensação.", rest: "Relatório de alta com evolução comparativa e a identidade visual da casa." },
    { strong: "Terapeuta novo entrando? O método já está pronto.", rest: "Onboarding clínico em dias, não em meses de acompanhamento de perto." },
    { strong: "Você não escala uma clínica sem padronizar a avaliação.", rest: "Link institucional, triagem obrigatória e prontuário compartilhado por toda a equipe." },
  ],
  subs: [
    "O sistema de raciocínio clínico da sua equipe.",
    "15 dias de teste, sem cartão de crédito.",
    "Padronize a avaliação sem engessar o clínico.",
    "Agenda, prontuário e evidência no mesmo fluxo.",
    "Gestão que enxerga adesão, evolução e satisfação.",
    "Sua marca em cada documento entregue.",
  ],
  kinetic: [
    { kicker: "NA EQUIPE", word: "Padrão", caption: "Todos avaliando com o mesmo rigor." },
    { kicker: "PARA A GESTÃO", word: "Visibilidade", caption: "Adesão, evolução e satisfação em um painel." },
    { kicker: "NO ATENDIMENTO", word: "Continuidade", caption: "Nenhum caso recomeça do zero." },
    { kicker: "PARA A MARCA", word: "Autoridade", caption: "Relatórios com a identidade da clínica." },
    { kicker: "NO RISCO", word: "Proteção", caption: "Documentação completa é gestão de risco." },
    { kicker: "NO CRESCIMENTO", word: "Escala", caption: "Novo terapeuta entra com o método pronto." },
  ],

  metrics: [
    [
      { value: 15, suffix: " dias", label: "de teste sem cartão" },
      { value: 0, suffix: " R$", label: "por tratamento gerado no modo clínica" },
      { value: 1, suffix: " link", label: "institucional para toda a equipe" },
    ],
    [
      { value: 3, label: "níveis de permissão (gestão, terapeuta, recepção)" },
      { value: 20, suffix: " MB", label: "de documentos por paciente" },
      { value: 100, suffix: "%", label: "dos relatórios com a marca da clínica" },
    ],
    [
      { value: 8, label: "membros no plano intermediário" },
      { value: 1, suffix: " painel", label: "com adesão, evolução e NPS" },
      { value: 0, suffix: " cartão", label: "exigido para começar o teste" },
    ],
  ],
  compare: [
    {
      title: "Antes e depois na operação",
      before: ["Cada terapeuta com seu próprio padrão", "Prontuário em papel ou planilha", "Paciente recontando a história", "Relatório sem identidade da clínica"],
      after: ["Método único, link institucional", "Prontuário compartilhado com permissões", "Histórico completo em qualquer troca de terapeuta", "PDF com logo e cores da casa"],
    },
    {
      title: "Duas formas de crescer a clínica",
      before: ["Qualidade dependendo do terapeuta de plantão", "Gestão sem número de adesão", "Satisfação medida por percepção", "Onboarding longo de cada contratação"],
      after: ["Padrão de avaliação para toda a equipe", "Indicadores no painel de gestão", "NPS com pesquisa pública", "Novo terapeuta produtivo em dias"],
    },
  ],

  journeys: [
    {
      kicker: "FLUXO DA CLÍNICA",
      heading: "Do agendamento ao relatório de alta",
      steps: [
        { title: "Link institucional", description: "Recepção envia, paciente responde antes de chegar.", image: stepAnamnesis },
        { title: "Avaliação padronizada", description: "Mesmo método, mesma triagem de segurança, em toda a equipe.", image: stepDiagnosis },
        { title: "Evolução compartilhada", description: "Sessões, observações e programa domiciliar visíveis ao time.", image: stepTreatment },
        { title: "Relatório de alta", description: "Comparativo de evolução com a marca da clínica.", image: stepReport },
      ],
    },
  ],
  features: [
    { tag: "WHITE LABEL", title: "A clínica no centro da entrega", description: "Logo e cores próprias nos relatórios e nas telas do paciente.", image: stepReport },
    { tag: "AGENDA", title: "Encaixe por arrastar e soltar", description: "Grade da equipe com importação de agenda por imagem.", image: stepTreatment },
    { tag: "NPS", title: "Satisfação medida de verdade", description: "Pesquisa pública com painel de NPS e retorno direto ao chat.", image: stepQuestionnaires },
    { tag: "GOVERNANÇA", title: "Ressalva com autor e justificativa", description: "Hipóteses sob ressalva só são liberadas por um terapeuta da casa.", image: stepDiagnosis },
    { tag: "DOCUMENTOS", title: "Exames do paciente no mesmo lugar", description: "Até 20 MB por paciente, acessíveis a quem tem permissão.", image: stepAnamnesis },
    { tag: "ARQUIVO", title: "Arquive sem perder histórico", description: "A recepção organiza a lista e nada é apagado do prontuário.", image: stepReport },
    { tag: "PERMISSÕES", title: "Cada função vê o que precisa", description: "Gestão, terapeuta e recepção com acessos distintos.", image: stepQuestionnaires },
  ],
  quotes: [
    '"Padrão clínico é o ativo mais valioso de uma clínica."',
    '"O paciente não deveria recontar a história a cada troca de terapeuta."',
    '"Documentação boa é gestão de risco."',
    '"Clínica que não padroniza avaliação não escala — só acumula."',
    '"Sua marca vale mais quando o processo sustenta a promessa."',
  ],
  marquee: [
    ["Prontuário compartilhado", "White label", "Agenda da equipe", "NPS", "Permissões por função"],
    ["Padrão de avaliação", "Relatório de alta", "Programa domiciliar", "Documentos do paciente", "Auditoria clínica"],
    ["Link institucional", "Onboarding de terapeuta", "Indicadores de adesão", "Satisfação do paciente"],
  ],
  closings: [
    { title: "Sua clínica em um padrão só", sub: "15 dias de teste, sem cartão de crédito.", cta: "Ver o Aliv.iA Clínica" },
    { title: "Padronize sem burocratizar", sub: "Método para a equipe, liberdade para o clínico.", cta: "Quero testar na minha clínica" },
    { title: "Teste com a sua equipe inteira", sub: "15 dias, sem cartão, com dados reais da sua rotina.", cta: "Começar o teste da clínica" },
  ],
  sales: {
    audience: "donos e gestores de clínica de fisioterapia",
    proofs: [
      "Toda a equipe avaliando pelo mesmo método clínico",
      "Prontuário compartilhado com três níveis de permissão",
      "Relatórios white label com logo e cores da clínica",
      "Agenda da equipe com encaixe por arrastar e soltar",
      "NPS com pesquisa pública e painel de satisfação",
      "Tratamentos inclusos, sem custo por paciente no modo clínica",
      "Link institucional para a recepção enviar antes da consulta",
      "Histórico preservado mesmo com troca de terapeuta",
    ],
    objections: [
      "Padronizar não engessa: o clínico continua sobrescrevendo a hipótese quando discorda.",
      "Sem cartão de crédito para testar — você decide depois de ver funcionando.",
      "A migração começa pelos pacientes novos; o histórico antigo entra no seu ritmo.",
      "A recepção usa o mesmo sistema, sem treinamento longo.",
    ],
    offers: [
      "15 dias de teste sem cartão de crédito.",
      "Planos por tamanho de equipe, a partir de R$ 197/mês (ou R$ 112/mês no anual).",
      "Tratamentos gerados no modo clínica não têm custo adicional.",
    ],
    ctas: [
      "Link na bio para começar os 15 dias de teste",
      "Comenta CLÍNICA que eu te mando os planos",
      "Manda no direct quantos terapeutas você tem",
      "Salva e mostra para o seu sócio",
    ],
    hashtags: [
      "clinicadefisioterapia",
      "gestaoclinica",
      "fisioterapia",
      "gestaodeclinicas",
      "empreendedorismonasaude",
      "prontuarioeletronico",
      "equipemultidisciplinar",
      "qualidadeassistencial",
      "npsnasaude",
      "aliviaapp",
      "raciocinioclinico",
      "marketingparaclinicas",
    ],
  },
};


export default clinic;
