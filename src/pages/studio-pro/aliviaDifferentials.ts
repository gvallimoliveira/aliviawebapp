/**
 * DIFERENCIAIS EDITORIAIS DO ALIV.IA
 *
 * Fonte canônica dos recortes de produto usados pelo Studio. Cada recorte tem
 * começo, mecanismo, prova e entrega próprios; nunca é reutilizado por marcas
 * de clientes. Os textos descrevem somente fluxos existentes no produto.
 */
import type { BrandAudience } from "./audiences";

export const ALIVIA_DIFFERENTIAL_GROUP = "Diferenciais Aliv.iA";

export type AliviaDifferentialId =
  | "diferencial-pre-avaliacao"
  | "diferencial-avaliacao-manual"
  | "diferencial-reavaliacao"
  | "diferencial-agente-clinico"
  | "diferencial-evolucao-voz"
  | "diferencial-hep-video"
  | "diferencial-relatorios"
  | "diferencial-insights"
  | "diferencial-periodizacao"
  | "diferencial-prontidao-carga"
  | "diferencial-red-flags"
  | "diferencial-avaliacao-externa-ia";

export const ALIVIA_DIFFERENTIALS: BrandAudience[] = [
  {
    id: "diferencial-pre-avaliacao",
    label: "Pré-avaliação por link",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Pré-avaliação por link",
    hook: "O atendimento pode começar antes de o paciente entrar na sala",
    hooks: [
      "Enquanto o paciente responde em casa, você já começa a organizar o caso",
      "A primeira pergunta da consulta não precisa partir do zero",
      "O link que transforma espera em preparo clínico",
    ],
    description: "O paciente responde antes da consulta; mapa e nota de dor, histórico, triagem e questionários chegam organizados para a leitura do fisioterapeuta.",
    pains: ["Metade da consulta consumida para reconstruir a história", "Mapa de dor e questionários espalhados", "Relatório difícil de sustentar com dados soltos"],
    desires: ["Chegar à consulta já preparado para aprofundar o caso", "Usar o encontro para avaliar e decidir", "Documentar a avaliação com dados comparáveis"],
    proof: ["Link próprio enviado antes da consulta", "Mapa e nota de dor organizados no painel", "Histórico, triagem e questionários reunidos no mesmo caso"],
    scenes: ["O próximo paciente chega em uma hora e você já consegue revisar as respostas", "Antes da primeira pergunta, mapa de dor e questionários já estão no painel"],
    objections: ["Meu paciente não vai preencher antes", "Isso vai criar mais uma etapa para eu conferir"],
    stakes: ["A consulta continua começando pela coleta que poderia ter acontecido antes", "Dados importantes seguem espalhados quando chega a hora do relatório"],
    triggers: ["A agenda encheu e a anamnese começou a roubar o tempo de exame", "Chegou um caso novo que precisa de preparo antes do encontro"],
    cta: "Testar a pré-avaliação por link",
  },
  {
    id: "diferencial-avaliacao-manual",
    label: "Avaliação manual guiada",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Avaliação manual guiada",
    hook: "Frente a frente com o paciente, o método continua guiando cada decisão",
    hooks: ["O Aliv.iA não começa e termina no link", "Você avalia; o sistema organiza o caminho sem engessar a consulta"],
    description: "Fluxo presencial em dez etapas: anamnese, red flags, mapa de dor, intensidade e tipo, observações, questionários, ADM, testes funcionais, dinamometria e diagnóstico.",
    pains: ["Avaliação presencial sem uma sequência estável", "Achados importantes ficando fora do prontuário", "Teste escolhido sem ligação clara com a hipótese"],
    desires: ["Conduzir a avaliação presencial com método", "Manter liberdade clínica sem perder etapas", "Fechar a hipótese com o raciocínio documentado"],
    proof: ["Dez etapas conectadas no mesmo fluxo", "Red flags obrigatórias antes da conduta", "STEPS e D.I.F.I organizando progressão e prioridades"],
    scenes: ["O paciente está na sua frente e cada resposta abre a próxima etapa da avaliação", "Entre a anamnese e o diagnóstico, nenhum achado precisa ficar solto"],
    objections: ["Fluxo guiado vai engessar meu raciocínio", "Eu prefiro avaliar do meu jeito"],
    stakes: ["A qualidade do registro continua variando conforme a correria do dia", "A hipótese pode ficar desconectada dos achados que a sustentam"],
    triggers: ["Você quer abandonar a ficha solta sem abandonar sua forma de atender", "Um caso complexo exige que o raciocínio inteiro fique visível"],
    cta: "Conhecer a avaliação manual",
  },
  {
    id: "diferencial-reavaliacao",
    label: "Reavaliação e comparação",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Reavaliação comparável",
    hook: "Reavaliar é medir de novo, não depender da memória",
    hooks: ["A pergunta não é apenas se melhorou", "A evolução aparece quando a mesma régua volta ao caso"],
    description: "Nova avaliação vinculada ao histórico do paciente, com questionários, dor, ADM e força disponíveis para comparação longitudinal.",
    pains: ["Perguntar se melhorou sem conseguir demonstrar quanto", "Medidas de momentos diferentes difíceis de comparar", "Alta decidida por impressão"],
    desires: ["Mostrar evolução com a mesma régua", "Ajustar a conduta a partir do que mudou", "Definir continuidade ou alta com critérios"],
    proof: ["Avaliações do mesmo paciente reunidas no prontuário", "Dor, questionários, ADM e dinamometria comparáveis", "Relatório de evolução com recorte de período"],
    scenes: ["No retorno, o paciente diz que está melhor e você abre os números para conferir", "A alta se aproxima e você precisa mostrar o caminho percorrido"],
    objections: ["Reavaliar dá trabalho demais", "O paciente percebe a melhora sem precisar de número"],
    stakes: ["A progressão continua baseada em lembrança", "O valor do tratamento fica difícil de mostrar ao paciente e ao médico"],
    triggers: ["Chegou o primeiro retorno depois de algumas semanas", "O paciente ou o convênio pediu uma justificativa de evolução"],
    cta: "Comparar a evolução do próximo caso",
  },
  {
    id: "diferencial-agente-clinico",
    label: "Agente de Raciocínio Clínico",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Agente de Raciocínio Clínico",
    hook: "Caso difícil não precisa virar busca solta na internet",
    hooks: ["Uma dúvida clínica merece contexto, não uma resposta genérica", "Discuta hipótese, conduta e HEP dentro do mesmo raciocínio"],
    description: "Espaço para discutir casos, organizar hipóteses, tirar dúvidas clínicas e formular um HEP; a decisão final permanece com o fisioterapeuta.",
    pains: ["Dúvida clínica no fim do dia sem colega disponível", "Pesquisa genérica sem o contexto do caso", "Dificuldade para transformar achados em um HEP coerente"],
    desires: ["Confrontar hipóteses antes de decidir", "Encontrar um próximo passo coerente com o caso", "Montar o programa de casa com contexto clínico"],
    proof: ["Conversa organizada por caso clínico", "Formulação de HEP dentro do contexto do paciente", "Resposta assistiva que não substitui a decisão profissional"],
    scenes: ["São 23h e um caso do dia ainda não fecha na sua cabeça", "Antes da próxima sessão, você quer confrontar as hipóteses possíveis"],
    objections: ["IA genérica não entende fisioterapia", "Não quero que uma ferramenta decida por mim"],
    stakes: ["A pesquisa continua fragmentada entre abas sem considerar o caso inteiro", "A dúvida pode virar conduta por impulso"],
    triggers: ["Chegou um caso fora do padrão que você costuma atender", "Os achados apontam para mais de uma hipótese"],
    cta: "Discutir um caso com o Agente",
  },
  {
    id: "diferencial-evolucao-voz",
    label: "Evolução por voz",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Evolução por voz",
    hook: "Você fala a evolução; o prontuário recebe o texto estruturado",
    hooks: ["Menos teclado durante a sessão, mais atenção ao paciente", "A observação clínica não precisa esperar o fim do dia"],
    description: "O fisioterapeuta dita a evolução durante o atendimento; o áudio é transcrito, resumido e descartado, enquanto o texto permanece no prontuário.",
    pains: ["Evolução escrita horas depois do atendimento", "Detalhes perdidos entre a sessão e o prontuário", "Contato com o paciente interrompido pelo teclado"],
    desires: ["Registrar enquanto o caso ainda está fresco", "Manter a atenção na conversa e no exame", "Deixar a evolução legível no prontuário"],
    proof: ["Gravação durante a avaliação manual", "Transcrição e resumo estruturado", "Áudio descartado após o processamento"],
    scenes: ["O paciente explica uma mudança importante e você registra por voz sem quebrar a conversa", "O último atendimento termina e a evolução já está escrita"],
    objections: ["Ditado vai gerar um texto confuso", "Não quero guardar áudio do paciente"],
    stakes: ["O prontuário continua atrasado e dependente da memória", "Nuances importantes podem sumir quando o registro fica para depois"],
    triggers: ["A agenda está cheia e as evoluções começaram a acumular", "Você percebeu que passa mais tempo olhando a tela do que o paciente"],
    cta: "Testar a evolução por voz",
  },
  {
    id: "diferencial-hep-video",
    label: "HEP em vídeo e templates",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "HEP em vídeo",
    hook: "O exercício de casa precisa chegar claro o bastante para ser feito",
    hooks: ["Uma lista de nomes não ensina o movimento", "Prescrever de novo não significa montar tudo de novo"],
    description: "Programa de exercícios enviado por link, com vídeos, dose definida e biblioteca de templates reutilizáveis e editáveis para cada paciente.",
    pains: ["Exercício enviado por mensagem sem demonstração", "Programa remontado do zero a cada paciente", "Dificuldade para ajustar dose e restrições com clareza"],
    desires: ["Entregar um programa que o paciente consiga consultar no celular", "Reaproveitar estruturas sem copiar uma prescrição inteira", "Ajustar exercício e dose ao caso"],
    proof: ["Biblioteca de exercícios com vídeos", "Séries, repetições e frequência definidas no programa", "Templates próprios e pré-construídos editáveis antes do envio"],
    scenes: ["O paciente chega em casa e abre o vídeo do exercício no celular", "Um caso parecido chega e o template vira ponto de partida, não receita pronta"],
    objections: ["Meu paciente não vai lembrar como fazer", "Template deixa a prescrição genérica"],
    stakes: ["A execução em casa continua dependendo da memória da sessão", "O tempo gasto remontando programas reduz a atenção ao ajuste fino"],
    triggers: ["O paciente pediu novamente o vídeo do exercício", "Você percebeu que repete a mesma base em vários programas"],
    cta: "Montar um HEP em vídeo",
  },
  {
    id: "diferencial-relatorios",
    label: "Relatórios comparativos",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Relatório comparativo",
    hook: "A evolução ganha valor quando cabe em um documento claro",
    hooks: ["O relatório não precisa nascer de uma tela em branco", "Dor, função, ADM e força contam melhor a história quando aparecem juntas"],
    description: "Relatórios em PDF da avaliação e da evolução, com seleção do período, comparação de dor, questionários, ADM, dinamometria e notas clínicas.",
    pains: ["Relatório improvisado quando o paciente pede", "Resultados espalhados em telas e datas diferentes", "Dificuldade para justificar continuidade ou alta"],
    desires: ["Entregar um documento profissional", "Mostrar o antes e o depois com contexto", "Compartilhar a evolução com paciente, médico ou convênio"],
    proof: ["PDF da avaliação com identidade profissional", "Comparação entre duas ou mais avaliações", "Recorte por período e síntese dos achados objetivos"],
    scenes: ["O paciente pede um relatório para levar ao médico e os dados já estão reunidos", "Na conversa de alta, a evolução aparece lado a lado"],
    objections: ["Relatório completo demora demais", "Número demais pode confundir o paciente"],
    stakes: ["O trabalho clínico continua difícil de comunicar fora da sala", "A decisão de alta fica sem documento que conte a evolução"],
    triggers: ["O médico ou convênio pediu documentação do caso", "Chegou a hora de decidir alta ou continuidade"],
    cta: "Gerar um relatório comparativo",
  },
  {
    id: "diferencial-insights",
    label: "Insights inteligentes",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "clinica",
    keyword: "Insights inteligentes",
    hook: "O dado da rotina só tem valor quando aponta onde agir",
    hooks: ["Falta, dor estagnada e baixa adesão não deveriam aparecer tarde demais", "Na clínica, satisfação também precisa de uma régua"],
    description: "Painéis PRO e Clínica cruzam adesão, faltas, evolução e agenda; a clínica também acompanha pesquisa de satisfação e NPS.",
    pains: ["Risco de abandono percebido tarde", "Gestão decidindo só por impressão", "Satisfação do paciente sem uma medida comum"],
    desires: ["Identificar quem precisa de contato antes de abandonar", "Planejar agenda e alta com sinais objetivos", "Enxergar satisfação e adesão da clínica"],
    proof: ["Score de adesão e sinalização de risco", "Predição de alta e indicadores de ocupação", "Pesquisa pública de satisfação com painel de NPS na clínica"],
    scenes: ["Antes de abrir a agenda, o painel mostra quais pacientes pedem atenção", "Na reunião da clínica, NPS e adesão deixam de ser opinião"],
    objections: ["Já conheço meus pacientes sem precisar de painel", "Mais indicador significa mais coisa para alimentar"],
    stakes: ["O abandono continua sendo descoberto depois que o paciente some", "A clínica perde a chance de agir sobre uma insatisfação recorrente"],
    triggers: ["As faltas aumentaram e ninguém sabe qual paciente abordar primeiro", "A clínica quer entender a experiência além dos comentários informais"],
    cta: "Conhecer os Insights",
  },
  {
    id: "diferencial-periodizacao",
    label: "Periodização e carga planejada",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Periodização de carga",
    hook: "Progressão de carga precisa de plano antes de precisar de correção",
    hooks: ["A sessão de hoje deve conversar com a fase e com a semana", "Carga planejada e resposta percebida contam histórias diferentes"],
    description: "Macro, meso e microciclos vinculam objetivos e sessões às fases do STEPS; carga planejada e carga percebida podem ser acompanhadas ao longo do plano.",
    pains: ["Sessões progredindo sem visão do ciclo", "Carga aumentada por calendário", "Medidas de carga espalhadas entre sessões"],
    desires: ["Planejar a progressão por fase e objetivo", "Comparar o que foi prescrito com o que foi percebido", "Enxergar o plano semanal sem perder o ciclo completo"],
    proof: ["Macro, meso e microciclos ligados ao STEPS", "Sessões com dose e carga planejadas", "Visão semanal conectada ao plano de periodização"],
    scenes: ["Antes da semana começar, cada sessão já tem objetivo e carga esperada", "Ao revisar o plano, a sessão aparece dentro da fase e do ciclo que a justificam"],
    objections: ["Periodização é complexa demais para a rotina clínica", "Planejar carga vai engessar a resposta do paciente"],
    stakes: ["A progressão continua reagindo apenas ao que aconteceu na última sessão", "A carga pode subir sem considerar a resposta acumulada"],
    triggers: ["O paciente entrou na fase de força e precisa de progressão clara", "O retorno ao esporte exige que cada sessão responda ao objetivo da fase"],
    cta: "Planejar a próxima fase",
  },
  {
    id: "diferencial-prontidao-carga",
    label: "Prontidão e carga percebida",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Prontidão e carga percebida",
    hook: "A resposta do paciente entre sessões também faz parte da dose",
    hooks: ["A carga prescrita termina no papel; a percebida volta como dado", "Prontidão baixa antes da sessão muda a leitura da carga"],
    description: "Links públicos permitem ao paciente registrar prontidão e carga percebida; o profissional acompanha sRPE, tendência de prontidão e alertas no plano.",
    pains: ["Descobrir fadiga e dor só na sessão seguinte", "Carga percebida diferente da carga planejada sem registro", "Decisão de progressão sem a resposta entre sessões"],
    desires: ["Ajustar a sessão com a resposta recente do paciente", "Comparar dose planejada e percebida", "Identificar queda de prontidão antes de progredir"],
    proof: ["Link público sem login para o check-in", "Registro de sRPE e prontidão", "Alertas de carga e queda de prontidão no painel"],
    scenes: ["Antes da sessão, o paciente responde ao link e a prontidão já aparece no plano", "A carga pareceu moderada no papel, mas a resposta do paciente contou outra história"],
    objections: ["O paciente não vai entrar no sistema para responder", "Escala subjetiva não ajuda a decidir"],
    stakes: ["A resposta entre sessões continua invisível", "A próxima dose pode repetir uma carga que o paciente não tolerou como esperado"],
    triggers: ["A fadiga mudou de uma semana para outra", "A carga percebida ficou distante da planejada"],
    cta: "Acompanhar prontidão e carga",
  },
  {
    id: "diferencial-red-flags",
    label: "Triagem de red flags",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Triagem de red flags",
    hook: "Antes de pensar em conduta, o sistema ajuda a reconhecer quando é preciso parar",
    hooks: [
      "Segurança clínica começa pelas perguntas que não podem ser esquecidas",
      "Um sinal de alerta não pode depender da memória no meio da correria",
      "A hipótese pode esperar quando a segurança pede prioridade",
    ],
    description: "Triagem obrigatória registra perguntas e respostas, sinaliza achados positivos e diferencia a conduta: interrompe o fluxo autônomo do paciente ou mantém a avaliação profissional sob ressalva até liberação médica ou revisão justificada.",
    pains: [
      "Perguntas de segurança variando conforme a correria",
      "Sinal de alerta descoberto depois da conduta",
      "Decisão importante sem registro do que foi perguntado",
    ],
    desires: [
      "Seguir uma triagem de segurança em toda avaliação",
      "Saber como conduzir o fluxo diante de um alerta",
      "Manter perguntas, respostas e decisão documentadas",
    ],
    proof: [
      "Oito perguntas obrigatórias antes da continuidade",
      "Alerta imediato ao identificar uma resposta positiva",
      "Hipótese sob ressalva no fluxo profissional até liberação ou revisão justificada",
    ],
    scenes: [
      "No meio da anamnese, uma resposta positiva muda a prioridade antes de qualquer teste",
      "O profissional revisa o alerta e encontra perguntas, respostas e horário registrados no caso",
    ],
    objections: [
      "Eu já faço essas perguntas de memória",
      "Uma triagem obrigatória vai interromper todos os atendimentos",
    ],
    stakes: [
      "Uma pergunta essencial pode ficar de fora justamente no dia mais corrido",
      "A conduta pode avançar sem que o alerta e a decisão profissional fiquem documentados",
    ],
    triggers: [
      "Um relato de trauma, febre ou perda de força aparece durante a anamnese",
      "A equipe precisa seguir o mesmo critério de segurança em todas as avaliações",
    ],
    cta: "Conhecer a triagem de red flags",
  },
  {
    id: "diferencial-avaliacao-externa-ia",
    label: "Avaliação externa por IA",
    editorialGroup: ALIVIA_DIFFERENTIAL_GROUP,
    parentId: "pro",
    keyword: "Leitura de avaliação externa por IA",
    hook: "Uma avaliação feita fora do Aliv.iA não precisa continuar presa em arquivos soltos",
    hooks: [
      "Do PDF ao prontuário estruturado, sempre com revisão profissional",
      "Até cinco arquivos podem virar um ponto de partida organizado para a avaliação",
      "A IA organiza o material externo; você confere cada campo antes de salvar",
    ],
    description: "O fisioterapeuta envia até cinco PDFs ou imagens; a IA combina a leitura, distribui os achados nos campos do padrão Aliv.iA e preserva o conteúdo adicional para revisão, edição e confirmação profissional.",
    pains: [
      "Avaliação anterior espalhada entre PDFs e fotos",
      "Digitação manual de informações que já estão documentadas",
      "Informação externa sem campo correspondente",
    ],
    desires: [
      "Trazer uma avaliação externa para o mesmo padrão do prontuário",
      "Começar a revisão com os campos já organizados",
      "Manter controle profissional sobre cada informação importada",
    ],
    proof: [
      "Leitura combinada de até cinco PDFs ou imagens",
      "Campos do formulário manual carregados para revisão e edição",
      "Informações sem campo correspondente preservadas em um bloco adicional",
    ],
    scenes: [
      "O paciente chega com laudo, fotos e uma avaliação anterior; os arquivos entram juntos para leitura",
      "Antes de salvar, o fisioterapeuta abre o formulário, revisa os campos e corrige o que for necessário",
    ],
    objections: [
      "A IA pode errar a leitura?",
      "E se o arquivo não seguir o padrão Aliv.iA?",
    ],
    stakes: [
      "O histórico externo continua separado do raciocínio atual",
      "A transcrição manual consome tempo e ainda pode deixar informações importantes para trás",
    ],
    triggers: [
      "Um paciente novo trouxe uma avaliação completa de outro serviço",
      "A migração de prontuário chegou em PDFs, imagens e formatos diferentes",
    ],
    cta: "Organizar uma avaliação externa",
  },
];

export const ALIVIA_DIFFERENTIAL_IDS = new Set(ALIVIA_DIFFERENTIALS.map((item) => item.id));

export const isAliviaDifferential = (id: string): id is AliviaDifferentialId =>
  ALIVIA_DIFFERENTIAL_IDS.has(id);