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
  ],
  quotes: [
    '"Padrão clínico é o ativo mais valioso de uma clínica."',
    '"O paciente não deveria recontar a história a cada troca de terapeuta."',
    '"Documentação boa é gestão de risco."',
  ],
  marquee: [
    ["Prontuário compartilhado", "White label", "Agenda da equipe", "NPS", "Permissões por função"],
    ["Padrão de avaliação", "Relatório de alta", "Programa domiciliar", "Documentos do paciente", "Auditoria clínica"],
  ],
  closings: [
    { title: "Sua clínica em um padrão só", sub: "15 dias de teste, sem cartão de crédito.", cta: "Ver o Aliv.iA Clínica" },
    { title: "Padronize sem burocratizar", sub: "Método para a equipe, liberdade para o clínico.", cta: "Quero testar na minha clínica" },
  ],
};

export default clinic;
