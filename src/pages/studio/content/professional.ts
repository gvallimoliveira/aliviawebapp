import type { WorldContent } from "./types";
import posterAgente from "@/assets/studio/poster-hipotese.jpg";
import posterHep from "@/assets/studio/poster-hep-video.jpg";
import posterDitado from "@/assets/studio/poster-ditado.jpg";
import posterTestes from "@/assets/studio/poster-testes.jpg";

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
      strong: "Reavaliar não é perguntar apenas se melhorou.",
      rest: "Dor, questionários, ADM e força voltam à mesma régua para mostrar o que mudou desde a última avaliação.",
    },
    {
      strong: "Laudo de dinamometria não é planilha para você decifrar.",
      rest: "Faça upload, o sistema extrai as medidas, calcula assimetria entre os lados e sinaliza o risco.",
    },
    {
      strong: "Fale durante a sessão. O prontuário se escreve sozinho.",
      rest: "Grave a anamnese em voz, receba o resumo estruturado e ganhe minutos de olho no paciente — não no teclado.",
    },
    {
      strong: "Nota de evolução às 22h não é dedicação. É retrabalho.",
      rest: "Dite a evolução durante a sessão; o Aliv.iA transcreve o registro e descarta o áudio.",
    },
    {
      strong: "Sua concorrência não é o colega. É a desorganização.",
      rest: "Quem entrega avaliação estruturada e relatório com a própria marca não disputa preço.",
    },
    {
      strong: "Recém-formado com o método de quem tem vinte anos de clínica.",
      rest: "Fluxo padrão-ouro desde o primeiro atendimento, sem improviso e sem achismo.",
    },
    {
      strong: "O paciente entende o plano ou não adere. Não existe meio-termo.",
      rest: "Exercício em vídeo, fase explicada e relatório que ele mostra para a família.",
    },
    {
      strong: "Você trata melhor quando não está digitando.",
      rest: "A voz da sessão vira prontuário estruturado, sem tirar o olho do paciente.",
    },
    {
      strong: "A primeira consulta não começa na maca. Começa no link.",
      rest: "Anamnese, mapa de dor e triagem respondidos antes de o paciente chegar.",
    },
    {
      strong: "Currículo bonito não segura estágio. Raciocínio segura.",
      rest: "Treine o fluxo completo e chegue com repertório de decisão, não de decoreba.",
    },
    {
      strong: "Quem documenta bem não teme auditoria.",
      rest: "Cada hipótese com autor, justificativa e trilha de decisão registrada.",
    },
    {
      strong: "Protocolo de prateleira não conhece o seu paciente.",
      rest: "A conduta nasce do caso: mecanismo de dor, medidas e resposta ao plano.",
    },
    {
      strong: "Seu diferencial não cabe em uma legenda. Cabe em um relatório.",
      rest: "PDF clínico com a sua marca, que o paciente leva ao médico.",
    },
  ],
  subs: [
    "Sistema de raciocínio clínico com alma de fisioterapeuta.",
    "IA especializada em fisioterapia. Não é IA genérica.",
    "Uma IA treinada com as competências de quem trata.",
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
    { kicker: "SEU DIFERENCIAL", word: "Método", caption: "STEPS organiza seis fases; D.I.F.I conecta dor, inibição, fraqueza e incapacidade.", topic: "steps-method" },
    { kicker: "NA PRÁTICA", word: "Autoridade", caption: "Relatórios que o paciente mostra para o médico.", topic: "report" },
    { kicker: "NO FINANCEIRO", word: "Valor", caption: "Quem documenta melhor, precifica melhor.", topic: "pricing" },
    { kicker: "NA ROTINA", word: "Tempo", caption: "A papelada sai durante a sessão, não depois.", topic: "voice-notes" },
    { kicker: "NA DÚVIDA", word: "Respaldo", caption: "Diferenciais listados e justificados por escrito.", topic: "differential" },
    { kicker: "COM O PACIENTE", word: "Adesão", caption: "Programa em vídeo, entendido na primeira leitura.", topic: "hep" },
    { kicker: "NO RETORNO", word: "Comparação", caption: "Dor, função, ADM e força mostrando o que mudou.", topic: "express-reassessment" },
    { kicker: "NO EIXO", word: "D.I.F.I", caption: "Mapeia como dor, inibição muscular, perda de força e limitação funcional se alimentam.", topic: "difi" },
    { kicker: "NA SEGURANÇA", word: "Triagem", caption: "Red flags checadas em 100% das avaliações.", topic: "red-flags" },
    { kicker: "NO LONGO PRAZO", word: "História", caption: "Impressão clínica lendo a evolução inteira do caso.", topic: "clinical-impression" },
  ],
  typos: [
    { lead: "A organização dos dados é nossa.", big: "A decisão", tail: " é sua." },
    { lead: "Raciocínio clínico com", big: "alma", tail: " de fisioterapeuta." },
    { lead: "Menos teclado.", big: "Mais clínica", tail: "." },
    { lead: "O sistema sugere.", big: "Você", tail: " decide." },
    { lead: "Documentar bem é", big: "proteger", tail: " quem você atende." },
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
      { value: 40, suffix: "+", label: "testes funcionais com critério de positividade" },
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
  stats: [
    {
      heading: "O consultório, medido",
      items: [
        { value: "12 min", label: "economizados por avaliação", note: "é uma sessão a mais no fim do dia" },
        { value: "40+", label: "testes funcionais mapeados", note: "cada um com critério de positividade descrito" },
        { value: "100%", label: "dos casos com triagem de red flags", note: "segurança não é opcional" },
      ],
    },
    {
      heading: "Números que sustentam o discurso",
      items: [
        { value: "100%", label: "dos casos com triagem de red flags", note: "segurança não é opcional" },
        { value: "1 link", label: "e a avaliação chega pronta", note: "o paciente responde de casa" },
        { value: "2 cliques", label: "entre a sessão e o relatório", note: "menos teclado, mais clínica" },
      ],
    },
    {
      heading: "O fim do retrabalho",
      items: [
        { value: "5 h/mês", label: "de burocracia devolvidas ao clínico", note: "tempo que volta para o raciocínio" },
        { value: "1 PDF", label: "com a sua marca em cada alta", note: "o paciente leva o seu nome, não o nosso" },
        { value: "6 fases", label: "do método STEPS em cada caso", note: "dor e inflamação → reparo → mobilidade → força → função → retorno" },
      ],
    },
    {
      heading: "A clínica inteira no mesmo raciocínio",
      items: [
        { value: "4 eixos", label: "conectados pelo D.I.F.I", note: "dor pode inibir; inibição favorece fraqueza; fraqueza limita a função" },
        { value: "15+", label: "questionários validados", note: "ODI, HOOS, DASH e outros com ponto de corte" },
        { value: "24h", label: "de prontuário sempre acessível", note: "a história do caso não morre na memória" },
      ],
    },
  ],
  triptychs: [
    {
      heading: "Três palavras que mudam a rotina clínica",
      panels: [
        { word: "Avalie", line: "Com método, do link ao teste funcional.", topic: "anamnesis" },
        { word: "Decida", line: "Com evidência citada e confiança declarada.", topic: "evidence-library" },
        { word: "Documente", line: "Sem digitar a mesma coisa duas vezes.", topic: "report" },
      ],
    },
    {
      heading: "O que separa rotina de excelência",
      panels: [
        { word: "Suspeite", line: "Red flags em 100% das avaliações.", topic: "red-flags" },
        { word: "Teste", line: "O cluster certo aparece pela suspeita.", topic: "functional-tests" },
        { word: "Comprove", line: "Relatório que o paciente entende.", topic: "report" },
      ],
    },
    {
      heading: "O ciclo que fecha sozinho",
      panels: [
        { word: "Ouça", line: "A voz da sessão vira registro estruturado.", topic: "voice-notes" },
        { word: "Meça", line: "Dinamometria e amplitude comparadas no tempo.", topic: "dynamometry" },
        { word: "Progrida", line: "HEP em pirâmide de dificuldade.", topic: "hep" },
      ],
    },
    {
      heading: "A voz do consultório",
      panels: [
        { word: "Menos", line: "Formulário, retrabalho e achismo.", topic: "anamnesis" },
        { word: "Mais", line: "Clínica, presença e evidência.", topic: "clinical-agent" },
        { word: "Sempre", line: "A decisão final é do fisioterapeuta.", topic: "final-hypothesis" },
      ],
    },
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
        "Evolução registrada por voz durante a sessão",
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
        "Nova avaliação na mesma régua do caso",
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
        { title: "Nova avaliação", description: "Dor, questionários, ADM e força comparados ao histórico do caso.", topic: "express-reassessment" },
        { title: "Medidas objetivas", description: "Dinamometria e amplitude com assimetria calculada e semáforo de risco.", topic: "dynamometry" },
        { title: "Impressão clínica", description: "Leitura longitudinal do caso, sessão por sessão.", topic: "clinical-impression" },
        { title: "Relatório de alta", description: "Evolução comparativa em um documento entregável.", topic: "discharge-report" },
      ],
    },
  ],
  features: [
    { tag: "AGENTE CLÍNICO", title: "Discussão de caso a qualquer hora", description: "Um agente treinado em evidência que discute conduta, gera HEP e cita a fonte.", topic: "clinical-agent", headline: "Discuta o caso com quem cita a fonte.", poster: posterAgente },
    { tag: "MECANISMO DE DOR", title: "Nociceptiva, neuropática ou nociplástica", description: "Triagem baseada em Kosek e Finnerup, com implicação direta na conduta.", topic: "pain-mechanism" },
    { tag: "HEP", title: "Programa domiciliar com vídeo", description: "Exercícios em pirâmide de dificuldade, respeitando restrições posicionais.", topic: "hep", headline: "O exercício sai do papel.", poster: posterHep },
    { tag: "REAVALIAÇÃO", title: "Medir de novo com a mesma régua", description: "Compara dor, questionários, ADM e força entre avaliações do mesmo paciente.", topic: "express-reassessment" },
    { tag: "DINAMOMETRIA", title: "A organização da assimetria é nossa — a decisão é sua", description: "Upload do laudo externo, extração dos valores e semáforo de risco, sem cálculo manual.", topic: "dynamometry" },
    { tag: "DIFERENCIAIS", title: "Quando a confiança não é alta, o sistema abre o leque", description: "Diagnósticos diferenciais com critério de inclusão e exclusão por escrito.", topic: "differential" },
    { tag: "FABQ-BRASIL", title: "Medo-evitação medido, não presumido", description: "Escores de atividade e trabalho com pontos de corte validados.", topic: "fabq" },
    { tag: "SAÚDE GERAL", title: "Comorbidade com nível de risco graduado", description: "Hipertensão, diabetes, cardiopatia e medicação contínua na mesma tela.", topic: "health-general" },
    { tag: "RELATÓRIO DE ALTA", title: "Evolução comparativa em um documento", description: "Do primeiro atendimento à alta, com números lado a lado.", topic: "discharge-report" },
    { tag: "VOZ", title: "Fale, o sistema escreve", description: "Grave a sessão, receba resumo estruturado. O áudio é descartado.", topic: "voice-notes", headline: "Você atende. O Aliv.iA escreve.", poster: posterDitado },
    { tag: "MAPA DE DOR", title: "Topografia marcada pelo próprio paciente", description: "Região, extensão e padrão da dor chegam prontos para leitura clínica.", topic: "pain-map" },
    { tag: "ANAMNESE", title: "História clínica em campos comparáveis", description: "Queixa, início, fatores de piora e histórico sempre no mesmo formato.", topic: "anamnesis" },
    { tag: "TESTES FUNCIONAIS", title: "Cluster sugerido pela suspeita", description: "Laslett, neurodinâmica e ombro com critério de positividade descrito.", topic: "functional-tests", headline: "O teste certo, na hora certa.", poster: posterTestes },
    { tag: "QUESTIONÁRIOS", title: "Escore validado, interpretado na hora", description: "ODI, HOOS, DASH e outros com ponto de corte e significado clínico.", topic: "questionnaires" },
    { tag: "HIPÓTESE FINAL", title: "A palavra final é sua, e fica registrada", description: "Sobrescreva a hipótese da IA: vale no prontuário, no PDF e no WhatsApp.", topic: "final-hypothesis" },
    { tag: "AVALIAÇÃO EXTERNA", title: "Traga o que veio de fora para dentro do método", description: "Upload de PDF ou foto: a IA mapeia para o padrão Aliv.iA e vira avaliação nativa.", topic: "external-upload" },
    { tag: "EVIDÊNCIA", title: "Protocolo com PEDro ≥ 7 e PMID", description: "Cada recomendação com fonte rastreável, validada contra PubMed e Crossref.", topic: "evidence-library" },
    { tag: "DIÁRIO DE DOR", title: "A curva do paciente entre as sessões", description: "Registro diário do paciente chegando no seu prontuário.", topic: "pain-diary" },
    { tag: "IMPRESSÃO CLÍNICA", title: "Leitura do caso inteiro, não da última sessão", description: "Síntese longitudinal com testes externos e observações da evolução.", topic: "clinical-impression" },
    { tag: "MENSAGENS", title: "Canal direto com o paciente", description: "Dúvidas de exercício resolvidas no chat, dentro do prontuário.", topic: "messaging" },
    { tag: "STEPS", title: "Seis degraus guiando a conduta", description: "Dor e inflamação, reparo, mobilidade, força, função e retorno: cada avanço exige critérios medidos.", topic: "steps-method" },
    { tag: "D.I.F.I", title: "Dor, inibição, fraqueza e incapacidade", description: "O método identifica como os quatro eixos se alimentam e em qual ponto o plano deve romper o ciclo.", topic: "difi" },
    { tag: "LGPD", title: "Consentimento registrado e dados sob controle", description: "Base legal, log de consentimento e exclusão a pedido do titular.", topic: "privacy" },
    { tag: "VITRINE", title: "Pacientes encontrando você", description: "Perfil na vitrine de profissionais que trabalham com o método.", topic: "marketplace" },
  ],
  quotes: [
    { text: '"O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."' },
    { text: '"A tecnologia devolve o tempo. O raciocínio continua sendo humano."', topic: "voice-notes" },
    { text: '"Não é chatbot com jaleco: é IA treinada no raciocínio do fisioterapeuta."' },
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
    { text: '"A voz do paciente vira texto do prontuário sem perder a nuance."', topic: "voice-notes" },
    { text: '"Transcrever não é luxo: é tempo devolvido para o clínico."', topic: "voice-notes" },
  ],
  marquee: [
    ["Raciocínio clínico", "Red flags", "STEPS: dor ao retorno", "D.I.F.I: dor à função", "Evidência PEDro ≥ 7"],
    ["Mapa de dor", "Dinamometria", "Questionários validados", "HEP em vídeo", "Prontuário vivo"],
    ["Laslett", "McKenzie", "HSR", "Neurodinâmica", "Controle motor"],
    ["FABQ-Brasil", "Mecanismo de dor", "Diferenciais", "Saúde geral", "Relatório de alta"],
    ["Avaliação por link", "Comparação entre avaliações", "Agente clínico", "PDF com sua marca"],
    ["Ditado por voz", "Impressão clínica", "Avaliação externa", "Diário de dor", "LGPD"],
  ],
  closings: [
    { title: "Sua clínica com raciocínio de ponta", sub: "Teste o painel profissional sem cadastro.", cta: "Ver o Aliv.iA Profissional" },
    { title: "Comece pelo próximo paciente", sub: "Envie um link e veja a avaliação chegar estruturada.", cta: "Quero experimentar" },
    { title: "Menos formulário, mais fisioterapia", sub: "Painel demonstrativo aberto, com dados fictícios.", cta: "Entrar no modo demonstração" },
    { title: "O relatório que fecha o atendimento", sub: "Documento com sua marca em cada alta.", cta: "Assinar o plano Profissional" },
  ],
  stories: [
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "A fisio que recuperou as próprias noites",
      beats: [
        "Consultório no interior, dez pacientes por dia.",
        "O atendimento terminava às 19h. O prontuário, às 22h.",
        "O primeiro link de avaliação foi enviado numa terça.",
      ],
      turn: "Na quarta, o caso já chegou estruturado — e o jantar voltou a ser na mesa.",
      moral: "Doze minutos por avaliação devolvidos ao raciocínio.",
      topic: "assessment-link",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "Recém-formada, postura de veterana",
      beats: [
        "Primeiro emprego, primeiro paciente particular.",
        "A insegurança era de quem nunca conduziu um caso sozinha.",
        "O fluxo guiou: triagem, anamnese, testes, hipótese.",
      ],
      turn: "O paciente elogiou a “experiência”. Ela tinha três meses de formada.",
      moral: "Método não substitui vivência — acelera.",
      topic: "steps-method",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "O laudo que virou decisão",
      beats: [
        "Dinamometria do atleta, dezenas de números soltos.",
        "Antes: uma hora de planilha e conta de cabeça.",
        "O upload levou segundos.",
      ],
      turn: "Assimetria de 18% entre os lados, sinalizada em vermelho.",
      moral: "A conta é do sistema. A conduta é do fisioterapeuta.",
      topic: "dynamometry",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "O paciente que voltou por causa de um PDF",
      beats: [
        "Ele abandonou o plano na terceira semana, como sempre.",
        "Na alta parcial, recebeu o relatório da evolução.",
        "Mostrou para a esposa. Mostrou para o médico.",
      ],
      turn: "Voltou no mês seguinte pedindo para continuar — agora com metas.",
      moral: "Quem vê o próprio progresso não abandona o plano.",
      topic: "report",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "A discussão de caso às 23h",
      beats: [
        "Joelho complicado, conduta duvidosa, ninguém para consultar.",
        "O caso foi aberto no agente clínico.",
        "Três hipóteses confrontadas, cada uma com a fonte.",
      ],
      turn: "A conduta da manhã seguinte entrou com PMID junto.",
      moral: "Segunda opinião não deveria depender de horário.",
      topic: "clinical-agent",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "A dor no ombro que pedia outra pergunta",
      beats: [
        "O exame falava em tendão. A queixa aparecia também em repouso.",
        "Antes de prescrever, a fisioterapeuta retomou a triagem.",
        "O agente organizou sinais, hipóteses e o que ainda precisava ser testado.",
      ],
      turn: "A conduta mudou porque o raciocínio veio antes do exercício.",
      moral: "IA especializada organiza o caso. A decisão continua sendo clínica.",
      topic: "clinical-agent",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "O programa que finalmente coube na rotina",
      beats: [
        "O paciente recebia listas longas e abandonava na primeira semana.",
        "A fisio registrou limitações, nível e objetivo funcional.",
        "O HEP saiu em vídeo, por fases e com dificuldade mista.",
      ],
      turn: "Na revisão, ele não pediu novos exercícios. Pediu a próxima fase.",
      moral: "Adesão começa quando a prescrição conversa com a vida real.",
      topic: "hep",
    },
    {
      kicker: "CASO REAL, NOME PROTEGIDO",
      title: "A evolução que deixou de depender da memória",
      beats: [
        "A melhora era percebida, mas difícil de demonstrar.",
        "Força, questionário e dor foram comparados no mesmo prontuário.",
        "A curva mostrou o que avançou e o que ainda travava.",
      ],
      turn: "A alta deixou de ser uma impressão e virou decisão compartilhada.",
      moral: "Quando a evolução aparece, o valor clínico também aparece.",
      topic: "express-reassessment",
    },
  ],
  lists: [
    {
      heading: "4 sinais de que a sua documentação está te custando pacientes",
      items: [
        "O paciente some e você não sabe em que fase ele parou",
        "O relatório só sai quando alguém pede",
        "A evolução mora na sua memória, não no prontuário",
        "Você não consegue mostrar o resultado do próprio trabalho",
      ],
      closing: "O Aliv.iA resolve os quatro no fluxo da sessão.",
    },
    {
      heading: "3 erros comuns ao prescrever exercício domiciliar",
      items: [
        "Mandar o exercício sem o paciente entender o porquê",
        "Progressão no improviso, sem critério de fase",
        "Ignorar a posição que provoca dor no quadro dele",
      ],
      closing: "O HEP do Aliv.iA vem em vídeo, por fases e com restrições respeitadas.",
    },
    {
      heading: "5 coisas que o paciente entende melhor no papel do que na conversa",
      items: [
        "O que ele tem, em uma frase",
        "Por que o plano é esse e não outro",
        "Em que fase do tratamento ele está",
        "O que melhorou desde a primeira sessão",
        "O que falta para a alta",
      ],
      closing: "É exatamente o que o relatório do Aliv.iA entrega.",
    },
    {
      heading: "4 habilidades que separam o recém-formado disputado do comum",
      items: [
        "Conduzir anamnese sem roteiro decorado",
        "Escolher o teste por critério, não por hábito",
        "Justificar a conduta com evidência",
        "Documentar como quem responde por aquilo",
      ],
      closing: "O Aliv.iA treina as quatro, caso a caso.",
    },
  ],
  carousels: [
    {
      id: "pro-link-to-report",
      kicker: "DO LINK AO RELATÓRIO",
      title: "Sua próxima avaliação, em três movimentos",
      coverSub: "Arraste para ver o fluxo completo.",
      slides: [
        { heading: "1. O paciente responde antes", body: "Link por WhatsApp: anamnese, mapa de dor e red flags chegam prontos.", topic: "assessment-link" },
        { heading: "2. Você valida o raciocínio", body: "Hipótese, mecanismo de dor e diferenciais organizados para a sua decisão.", topic: "hypothesis" },
        { heading: "3. O relatório sai na hora", body: "PDF com a sua marca, a sua hipótese final e o plano por fases.", topic: "report" },
      ],
      cta: { title: "Teste no seu próximo paciente", sub: "Painel demonstrativo no link da bio." },
    },
    {
      id: "pro-new-graduate-method",
      kicker: "RECÉM-FORMADO",
      title: "Do diploma ao primeiro atendimento com método",
      coverSub: "Quatro passos para não improvisar. Arraste.",
      slides: [
        { heading: "1. Treine no simulado", body: "Casos fictícios para repetir o fluxo até ele virar natural.", topic: "simulated-env" },
        { heading: "2. Conduza casos reais", body: "Estágio e familiares no mesmo fluxo padrão-ouro.", topic: "academic-tracks" },
        { heading: "3. Justifique com evidência", body: "Cada conduta com fonte PEDro ≥ 7 para citar.", topic: "evidence-library" },
        { heading: "4. Documente como veterano", body: "Relatório estruturado desde o primeiro paciente.", topic: "report" },
      ],
      cta: { title: "Comece pelo plano acadêmico", sub: "Link na bio." },
    },
    {
      id: "pro-paperwork-routine",
      kicker: "NA ROTINA",
      title: "O que muda quando a papelada sai na hora",
      coverSub: "Dois retratos da rotina de quem usa o Aliv.iA.",
      slides: [
        { heading: "12 minutos por avaliação", body: "É o tempo devolvido a cada caso que chega respondido por link.", topic: "assessment-link" },
        { heading: "Fim do prontuário noturno", body: "Evolução ditada durante a sessão, transcrita no prontuário e revisada antes de salvar.", topic: "voice-notes" },
      ],
      cta: { title: "Recupere as suas noites", sub: "Link na bio." },
    },
    {
      id: "pro-dynamometry-decision",
      kicker: "DECISÃO COM MEDIDA",
      title: "Por que medir força muda a conduta",
      coverSub: "Arraste para ver o que o olho clínico não pega.",
      slides: [
        { heading: "Assimetria tem número", body: "Déficit entre os lados calculado pelo sistema, não estimado.", topic: "dynamometry" },
        { heading: "Risco tem semáforo", body: "O laudo externo vira leitura clínica com sinalização objetiva.", topic: "dynamometry" },
        { heading: "Progressão tem critério", body: "A fase avança quando a medida avança — não quando a agenda pede.", topic: "treatment-plan" },
      ],
      cta: { title: "Meça no seu próximo caso", sub: "Link na bio." },
    },
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
      "Comparação longitudinal entre avaliações do mesmo paciente",
      "Ditado por voz na sessão: você fala, o sistema estrutura",
      "Upload de avaliação externa convertida para o padrão Aliv.iA",
      "Impressão clínica lendo o caso inteiro, sessão por sessão",
    ],
    objections: [
      "Não substitui o seu raciocínio: a IA organiza, você decide e sobrescreve quando quiser.",
      "Não precisa mudar sua forma de atender — só o tempo que você gasta digitando.",
      "Sem instalar nada: funciona no celular, no navegador, no meio da sessão.",
      "Se você já usa planilha e caderno, a migração leva um atendimento.",
      "Dados do paciente com consentimento registrado e exclusão a pedido dele.",
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
