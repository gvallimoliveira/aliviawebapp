import type { WorldContent } from "./types";

/**
 * Copy do mundo Profissional.
 * REGRA: cada item declara `topic` (registro em `../topics.ts`). Nenhuma imagem
 * é escrita aqui — a imagem vem do tópico e só existe quando há a tela exata.
 */
const professional: WorldContent = {
  id: "pro",
  label: "Profissional",
  kickers: [
    "RACIOCÍNIO CLÍNICO",
    "PARA FISIOTERAPEUTAS",
    "CLÍNICA COM MÉTODO",
    "EVIDÊNCIA NA MÃO",
    "PRONTUÁRIO QUE PENSA",
    "DOCUMENTAÇÃO SEM DOR",
    "MENOS TECLADO, MAIS CLÍNICA",
    "PADRÃO PERICIAL",
  ],

  headlines: [
    {
      strong: "Você não estudou fisioterapia para preencher formulários.",
      rest: "O Aliv.iA coleta, organiza e estrutura o caso para você fazer o que só você faz: raciocinar, decidir e tratar.",
    },
    {
      strong: "Do primeiro contato à alta, tudo em um raciocínio.",
      rest: "Anamnese, mapa de dor, testes funcionais, questionários validados e plano de tratamento em uma linha só.",
    },
    {
      strong: "A avaliação chega pronta antes do paciente entrar.",
      rest: "Link enviado, respostas estruturadas, hipóteses e testes sugeridos esperando sua validação.",
    },
    {
      strong: "Prontuário que pensa junto com você.",
      rest: "Evolução, dinamometria, amplitude e questionários lidos em conjunto — não como planilhas soltas.",
    },
    {
      strong: "Sua hipótese continua sendo sua.",
      rest: "A IA propõe, organiza e justifica. Você sobrescreve com uma linha e isso vale no prontuário, no PDF e no relatório.",
    },
    {
      strong: "O paciente não lembra o que você disse. O relatório lembra.",
      rest: "Documento com sua marca, sua hipótese e o plano por fases — pronto em um clique, no fim da sessão.",
    },
    {
      strong: "Cobrar mais começa por entregar diferente.",
      rest: "Quem entrega avaliação estruturada, evidência citada e relatório de alta não disputa preço com ninguém.",
    },
    {
      strong: "Você já perdeu paciente por falta de clareza, não de técnica.",
      rest: "Quando o caso é explicado com mapa, escore e progressão, a adesão deixa de ser sorte.",
    },
    {
      strong: "Evidência não é slide de congresso.",
      rest: "Protocolos com PEDro ≥ 7 validados contra PubMed e Crossref, aplicados ao caso que está na sua frente.",
    },
    {
      strong: "Sua agenda cheia não deveria custar suas noites.",
      rest: "Anamnese, evolução e relatórios saem no horário do atendimento — não depois do jantar.",
    },
    {
      strong: "Reavaliar não é recomeçar.",
      rest: "A reavaliação expressa traz o que já sabemos preenchido e destaca só o que mudou desde a última visita.",
    },
    {
      strong: "Laudo de dinamometria não é planilha para você decifrar.",
      rest: "Faça upload, o sistema extrai as medidas, calcula assimetria entre os lados e sinaliza o risco.",
    },
    {
      strong: "Fale durante a sessão. O prontuário se escreve sozinho.",
      rest: "Grave a anamnese em voz, receba o resumo estruturado e ganhe minutos de olho no paciente — não no teclado.",
    },
  ],
  subs: [
    "Sistema de raciocínio clínico com alma de fisioterapeuta.",
    "Menos digitação, mais decisão clínica.",
    "O tempo que você gasta transcrevendo volta para o atendimento.",
    "Documentação de nível pericial, sem esforço de secretaria.",
    "Feito por fisioterapeuta, para a rotina real de consultório.",
    "A avaliação pronta antes da primeira sessão começar.",
    "Autoridade clínica também se constrói no papel.",
  ],

  kinetic: [
    { kicker: "EM MENOS TEMPO", word: "Com mais resultados", caption: "A avaliação estruturada antes da primeira sessão.", topic: "assessment-link" },
    { kicker: "O QUE MUDA", word: "Clareza", caption: "Do relato confuso à hipótese mais provável.", topic: "hypothesis" },
    { kicker: "SEU DIFERENCIAL", word: "Método", caption: "STEPS e D.I.F.I guiando cada decisão.", topic: "steps-method" },
    { kicker: "NA PRÁTICA", word: "Autoridade", caption: "Relatórios que o paciente mostra para o médico.", topic: "report" },
    { kicker: "NO FINANCEIRO", word: "Valor", caption: "Quem documenta melhor, precifica melhor.", topic: "pricing" },
    { kicker: "NA ROTINA", word: "Tempo", caption: "A papelada sai durante a sessão, não depois.", topic: "voice-notes" },
    { kicker: "NA DÚVIDA", word: "Respaldo", caption: "Diferenciais listados e justificados por escrito.", topic: "differential" },
    { kicker: "COM O PACIENTE", word: "Adesão", caption: "Programa em vídeo, entendido na primeira leitura.", topic: "hep" },
    { kicker: "NO RETORNO", word: "Comparação", caption: "Reavaliação expressa mostrando o que mudou.", topic: "express-reassessment" },
    { kicker: "NO EIXO", word: "D.I.F.I", caption: "Dor, inibição, fraqueza e incapacidade em cada caso.", topic: "difi" },
    { kicker: "NA SEGURANÇA", word: "Triagem", caption: "Red flags checadas em 100% das avaliações.", topic: "red-flags" },
    { kicker: "NO LONGO PRAZO", word: "História", caption: "Impressão clínica lendo a evolução inteira do caso.", topic: "clinical-impression" },
  ],
  metrics: [
    [
      { value: 12, suffix: " min", label: "economizados por avaliação" },
      { value: 40, suffix: "+", label: "testes funcionais mapeados" },
      { value: 4, label: "camadas de raciocínio clínico" },
    ],
    [
      { value: 100, suffix: "%", label: "dos casos com triagem de red flags" },
      { value: 6, label: "fases do método STEPS" },
      { value: 3, label: "níveis de dificuldade no HEP" },
    ],
    [
      { value: 1, suffix: " link", label: "e o paciente já respondeu" },
      { value: 15, suffix: "+", label: "questionários validados" },
      { value: 24, suffix: "h", label: "de prontuário sempre acessível" },
    ],
    [
      { value: 7, suffix: "+", label: "escore PEDro mínimo das fontes citadas" },
      { value: 10, label: "nichos de pesquisa clínica acompanhados" },
      { value: 0, suffix: " papel", label: "para arquivar depois da consulta" },
    ],
    [
      { value: 5, suffix: " h/mês", label: "de burocracia devolvidas ao clínico" },
      { value: 1, suffix: " PDF", label: "com a sua marca em cada alta" },
      { value: 2, suffix: " cliques", label: "entre a sessão e o relatório" },
    ],
    [
      { value: 2, label: "lados comparados em cada dinamometria" },
      { value: 4, label: "eixos avaliados pelo D.I.F.I" },
      { value: 1, suffix: " upload", label: "para trazer avaliação externa para dentro" },
    ],
  ],

  compare: [
    {
      title: "O antes e o depois do seu atendimento",
      topics: ["anamnesis", "functional-tests", "clinical-impression", "report"],
      before: [
        "Anamnese digitada durante a sessão",
        "Testes escolhidos de memória",
        "Evolução em caderno ou bloco de notas",
        "Relatório improvisado quando pedem",
      ],
      after: [
        "Paciente responde antes de chegar",
        "Testes sugeridos por região e suspeita",
        "Evolução com pré-preenchimento inteligente",
        "PDF clínico pronto em um clique",
      ],
    },
    {
      title: "Duas formas de fechar uma hipótese",
      topics: ["hypothesis", "differential", "dynamometry"],
      before: [
        "Impressão baseada só na queixa",
        "Diferenciais ficando na cabeça",
        "Dinamometria olhada teste a teste",
      ],
      after: [
        "Hipótese com confiança declarada",
        "Diagnósticos diferenciais listados e justificados",
        "Assimetria calculada e sinalizada",
      ],
    },
    {
      title: "Duas formas de conduzir o retorno",
      topics: ["express-reassessment", "pain-diary", "discharge-report"],
      before: [
        "Refazer a avaliação do zero",
        "Perguntar “melhorou?” e anotar a resposta",
        "Alta sem documento comparativo",
      ],
      after: [
        "Reavaliação expressa com o que já sabemos",
        "Curva do diário de dor na tela",
        "Relatório de alta com números lado a lado",
      ],
    },
    {
      title: "Duas formas de tratar o risco do paciente",
      topics: ["red-flags", "health-general", "fabq"],
      before: [
        "Comorbidade lembrada de memória",
        "Medicação contínua sem registro",
        "Medo do movimento avaliado “no olho”",
      ],
      after: [
        "Red flags checadas antes de qualquer conduta",
        "Hipertensão, diabetes e cardiopatia com nível de risco",
        "FABQ-Brasil com escore e ponto de corte",
      ],
    },
    {
      title: "Duas formas de fazer a anamnese",
      topics: ["voice-notes", "anamnesis"],
      before: [
        "Digitar enquanto o paciente fala",
        "Perder detalhes por dividir atenção",
        "Resumo feito depois da sessão",
      ],
      after: [
        "Gravar e receber transcrição estruturada",
        "Olho no paciente, não no teclado",
        "Texto pronto no prontuário na hora",
      ],
    },
  ],
  journeys: [
    {
      kicker: "COMO FUNCIONA",
      heading: "Quatro passos até a conduta",
      steps: [
        { title: "Mapa de dor", description: "O paciente marca a região e o padrão. Você recebe topografia e extensão.", topic: "pain-map" },
        { title: "Anamnese estruturada", description: "História, saúde geral, medicação contínua e red flags em campos comparáveis.", topic: "anamnesis" },
        { title: "Testes sugeridos", description: "Clusters validados aparecem conforme a suspeita — Laslett, neurodinâmica, ombro.", topic: "functional-tests" },
        { title: "Plano de tratamento", description: "Progressão por fases, HEP com vídeos e reavaliação programada.", topic: "treatment-plan" },
      ],
    },
    {
      kicker: "DOCUMENTAÇÃO",
      heading: "Do dado bruto ao relatório assinado",
      steps: [
        { title: "Coleta por link", description: "Link enviado por WhatsApp, resposta salva mesmo se o paciente parar no meio.", topic: "assessment-link" },
        { title: "Raciocínio", description: "Hipótese, mecanismo de dor e diferenciais organizados para sua validação.", topic: "hypothesis" },
        { title: "Relatório", description: "PDF com sua marca, seu nome e a hipótese final que você definiu.", topic: "report" },
      ],
    },
    {
      kicker: "ACOMPANHAMENTO",
      heading: "Do retorno até a alta",
      steps: [
        { title: "Reavaliação expressa", description: "Pré-preenchida com o caso, destacando só o que mudou.", topic: "express-reassessment" },
        { title: "Medidas objetivas", description: "Dinamometria e amplitude com assimetria calculada e semáforo de risco.", topic: "dynamometry" },
        { title: "Impressão clínica", description: "Leitura longitudinal do caso, sessão por sessão.", topic: "clinical-impression" },
        { title: "Relatório de alta", description: "Evolução comparativa em um documento entregável.", topic: "discharge-report" },
      ],
    },
  ],
  features: [
    { tag: "AGENTE CLÍNICO", title: "Discussão de caso a qualquer hora", description: "Um agente treinado em evidência que discute conduta, gera HEP e cita a fonte.", topic: "clinical-agent" },
    { tag: "MECANISMO DE DOR", title: "Nociceptiva, neuropática ou nociplástica", description: "Triagem baseada em Kosek e Finnerup, com implicação direta na conduta.", topic: "pain-mechanism" },
    { tag: "HEP", title: "Programa domiciliar com vídeo", description: "Exercícios em pirâmide de dificuldade, respeitando restrições posicionais.", topic: "hep" },
    { tag: "REAVALIAÇÃO EXPRESSA", title: "Comparar sem recomeçar", description: "Pré-preenche o que já sabemos e destaca o que mudou desde a última visita.", topic: "express-reassessment" },
    { tag: "DINAMOMETRIA", title: "A conta da assimetria é nossa — a decisão é sua", description: "Upload do laudo externo, extração dos valores e semáforo de risco, sem cálculo manual.", topic: "dynamometry" },
    { tag: "DIFERENCIAIS", title: "Quando a confiança não é alta, o sistema abre o leque", description: "Diagnósticos diferenciais com critério de inclusão e exclusão por escrito.", topic: "differential" },
    { tag: "FABQ-BRASIL", title: "Medo-evitação medido, não presumido", description: "Escores de atividade e trabalho com pontos de corte validados.", topic: "fabq" },
    { tag: "SAÚDE GERAL", title: "Comorbidade com nível de risco graduado", description: "Hipertensão, diabetes, cardiopatia e medicação contínua na mesma tela.", topic: "health-general" },
    { tag: "RELATÓRIO DE ALTA", title: "Evolução comparativa em um documento", description: "Do primeiro atendimento à alta, com números lado a lado.", topic: "discharge-report" },
    { tag: "VOZ", title: "Fale, o sistema escreve", description: "Grave a sessão, receba resumo estruturado. O áudio é descartado.", topic: "voice-notes" },
    { tag: "MAPA DE DOR", title: "Topografia marcada pelo próprio paciente", description: "Região, extensão e padrão da dor chegam prontos para leitura clínica.", topic: "pain-map" },
    { tag: "ANAMNESE", title: "História clínica em campos comparáveis", description: "Queixa, início, fatores de piora e histórico sempre no mesmo formato.", topic: "anamnesis" },
    { tag: "TESTES FUNCIONAIS", title: "Cluster sugerido pela suspeita", description: "Laslett, neurodinâmica e ombro com critério de positividade descrito.", topic: "functional-tests" },
    { tag: "QUESTIONÁRIOS", title: "Escore validado, interpretado na hora", description: "ODI, HOOS, DASH e outros com ponto de corte e significado clínico.", topic: "questionnaires" },
    { tag: "HIPÓTESE FINAL", title: "A palavra final é sua, e fica registrada", description: "Sobrescreva a hipótese da IA: vale no prontuário, no PDF e no WhatsApp.", topic: "final-hypothesis" },
    { tag: "AVALIAÇÃO EXTERNA", title: "Traga o que veio de fora para dentro do método", description: "Upload de PDF ou foto: a IA mapeia para o padrão Aliv.iA e vira avaliação nativa.", topic: "external-upload" },
    { tag: "EVIDÊNCIA", title: "Protocolo com PEDro ≥ 7 e PMID", description: "Cada recomendação com fonte rastreável, validada contra PubMed e Crossref.", topic: "evidence-library" },
    { tag: "DIÁRIO DE DOR", title: "A curva do paciente entre as sessões", description: "Registro diário do paciente chegando no seu prontuário.", topic: "pain-diary" },
    { tag: "IMPRESSÃO CLÍNICA", title: "Leitura do caso inteiro, não da última sessão", description: "Síntese longitudinal com testes externos e observações da evolução.", topic: "clinical-impression" },
    { tag: "MENSAGENS", title: "Canal direto com o paciente", description: "Dúvidas de exercício resolvidas no chat, dentro do prontuário.", topic: "messaging" },
    { tag: "STEPS", title: "Seis fases guiando a conduta", description: "O método que organiza da triagem à alta, sem pular etapa.", topic: "steps-method" },
    { tag: "D.I.F.I", title: "Dor, inibição, fraqueza e incapacidade", description: "Quatro eixos avaliados em conjunto, não isoladamente.", topic: "difi" },
    { tag: "LGPD", title: "Consentimento registrado e dados sob controle", description: "Base legal, log de consentimento e exclusão a pedido do titular.", topic: "privacy" },
    { tag: "VITRINE", title: "Pacientes encontrando você", description: "Perfil na vitrine de profissionais que trabalham com o método.", topic: "marketplace" },
  ],
  quotes: [
    { text: '"O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."' },
    { text: '"A tecnologia devolve o tempo. O raciocínio continua sendo humano."', topic: "voice-notes" },
    { text: '"Documentar bem é proteger o paciente e proteger você."', topic: "report" },
    { text: '"Sistema de raciocínio clínico com alma de fisioterapeuta."' },
    { text: '"Diagnóstico não é chute com nome bonito."', topic: "hypothesis" },
    { text: '"Quem explica melhor, trata por mais tempo."', topic: "hep" },
    { text: '"O paciente não paga pela hora. Paga pela clareza."', topic: "pricing" },
    { text: '"Força que você não mede é força que você imagina."', topic: "dynamometry" },
    { text: '"Medo do movimento também é achado clínico."', topic: "fabq" },
    { text: '"Bom clínico não é quem sabe mais exercício. É quem sabe por quê."', topic: "steps-method" },
    { text: '"A anamnese certa vale por dez testes mal escolhidos."', topic: "anamnesis" },
    { text: '"Red flag ignorada não é pressa. É negligência."', topic: "red-flags" },
    { text: '"Se a conduta não cabe numa frase, ela ainda não está pronta."', topic: "hypothesis" },
    { text: '"Reavaliar é medir de novo, não lembrar de cor."', topic: "express-reassessment" },
    { text: '"O prontuário conta a história que a memória esquece."', topic: "report" },
    { text: '"Dor que não é classificada é tratada no escuro."', topic: "pain-mechanism" },
  ],
  marquee: [
    ["Raciocínio clínico", "Red flags", "STEPS", "D.I.F.I", "Evidência PEDro ≥ 7"],
    ["Mapa de dor", "Dinamometria", "Questionários validados", "HEP em vídeo", "Prontuário vivo"],
    ["Laslett", "McKenzie", "HSR", "Neurodinâmica", "Controle motor"],
    ["FABQ-Brasil", "Mecanismo de dor", "Diferenciais", "Saúde geral", "Relatório de alta"],
    ["Avaliação por link", "Reavaliação expressa", "Agente clínico", "PDF com sua marca"],
    ["Ditado por voz", "Impressão clínica", "Avaliação externa", "Diário de dor", "LGPD"],
  ],
  closings: [
    { title: "Sua clínica com raciocínio de ponta", sub: "Teste o painel profissional sem cadastro.", cta: "Ver o Aliv.iA Profissional" },
    { title: "Comece pelo próximo paciente", sub: "Envie um link e veja a avaliação chegar estruturada.", cta: "Quero experimentar" },
    { title: "Menos formulário, mais fisioterapia", sub: "Painel demonstrativo aberto, com dados fictícios.", cta: "Entrar no modo demonstração" },
    { title: "O relatório que fecha o atendimento", sub: "Documento com sua marca em cada alta.", cta: "Assinar o plano Profissional" },
  ],
  sales: {
    audience: "fisioterapeutas que atendem no consultório",
    proofs: [
      "Avaliação chega respondida antes do paciente entrar na sala",
      "Testes funcionais sugeridos por região e suspeita clínica",
      "Hipótese com confiança declarada e diferenciais justificados",
      "Relatório em PDF com a sua marca, pronto em um clique",
      "Programa domiciliar em vídeo, com progressão por fases",
      "Triagem de red flags em 100% dos casos",
      "Agente clínico para discutir conduta e citar a fonte",
      "Dinamometria e amplitude lidas em conjunto, com assimetria calculada",
      "Reavaliação expressa que compara sem recomeçar",
      "Ditado por voz na sessão: você fala, o sistema estrutura",
      "Upload de avaliação externa convertida para o padrão Aliv.iA",
      "Impressão clínica lendo o caso inteiro, sessão por sessão",
    ],
    objections: [
      "Não substitui o seu raciocínio: a IA organiza, você decide e sobrescreve quando quiser.",
      "Não precisa mudar sua forma de atender — só o tempo que você gasta digitando.",
      "Sem instalar nada: funciona no celular, no navegador, no meio da sessão.",
      "Se você já usa planilha e caderno, a migração leva um atendimento.",
      "Dados do paciente com consentimento registrado e exclusão garantida por LGPD.",
    ],
    offers: [
      "Plano Profissional a partir de R$ 67/mês no anual (R$ 97 no mensal).",
      "Painel demonstrativo aberto, sem cadastro e sem cartão.",
      "Teste o fluxo completo com dados fictícios antes de assinar.",
    ],
    ctas: [
      "Link na bio para abrir o painel demonstrativo",
      "Comenta MÉTODO que eu te mando o acesso",
      "Salva esse post e testa no seu próximo paciente",
      "Manda no direct a região que você mais atende",
    ],
    hashtags: [
      "fisioterapia",
      "raciocinioclinico",
      "fisioterapeuta",
      "reabilitacao",
      "fisioesportiva",
      "dorlombar",
      "evidenciacientifica",
      "prontuarioeletronico",
      "clinicadefisioterapia",
      "aliviaapp",
      "gestaoclinica",
      "fisioterapiaortopedica",
    ],
  },
};


export default professional;
