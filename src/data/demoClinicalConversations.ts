export type DemoTool =
  | { kind: "hep"; title: string; items: string[] }
  | { kind: "tests"; title: string; items: string[] }
  | { kind: "link"; title: string; patient: string }
  | { kind: "evidence"; title: string; refs: string[] };
export type DemoMessage = { role: "user" | "assistant"; text: string; tool?: DemoTool; suggestions?: string[] };
export type DemoThread = { id: string; title: string; preview: string; updatedAt: string; patient?: string; messages: DemoMessage[] };

/** Scripted discussion, not a live model response, prescription or patient write. */
export const DEMO_CLINICAL_THREADS: DemoThread[] = [
  {
    id: "load-joao", title: "João Santos — corrida, piora e adesão", patient: "João Santos", updatedAt: "Hoje",
    preview: "Carga concorrente, D.I.F.I e retomada em STEPS 1",
    messages: [
      { role: "user", text: "João voltou após semanas sem fisio. Dor no joelho 7/10, edema e KOOS de 42 para 28. Continuou correndo mais de 10 km aos domingos. Como organizar a reavaliação?" },
      { role: "assistant", text: "**O que sabemos:** piora de dor e função, edema, interrupção do acompanhamento e corrida mantida. **Hipótese:** incompatibilidade entre demanda e capacidade atual; ainda não explica sozinha toda a piora. Não concluo lesão estrutural pela dor ou pelo KOOS.\n\nAntes de planejar dose: verificar trauma novo, bloqueio verdadeiro, instabilidade, febre, calor importante, sinais vasculares e evolução do edema. Rever o exame e o contexto médico quando houver alerta." },
      { role: "user", text: "Sem trauma ou sinais sistêmicos. O joelho fica mais inchado no dia seguinte à corrida. Ele diz que academia não conta como treino de corrida." },
      { role: "assistant", text: "A **carga concorrente conta na exposição total**: corrida, academia, Pilates e fisio podem disputar a mesma recuperação. sRPE permite acompanhar esforço e duração, mas não equivale a carga mecânica específica no joelho.\n\nPeça os dias, minutos, esforço percebido, exercícios e resposta na manhã seguinte. Não atribua causalidade ao gráfico isoladamente. O padrão temporal relatado ajuda a formular e testar a hipótese." },
      { role: "user", text: "Como levar isso para o microciclo sem assustar ou proibir tudo?" },
      { role: "assistant", text: "Use **STEPS 1 — controle de dor e inflamação**, compatível com a reabordagem atual. Pelo D.I.F.I: dor pode limitar ativação; a perda de capacidade e a dificuldade em tarefas ajudam a localizar o problema, sem presumir fraqueza medida.\n\nPactue uma semana possível, com atividades toleráveis, recuperação entre maiores demandas e revisão da corrida longa. Diferencie: planejado, realizado e sem resposta. Ausência de check-in não prova que não treinou.", tool: { kind: "tests", title: "Reavaliação focada", items: ["Dor/edema e resposta de 24 horas relatada", "Tolerância a escadas e tarefa escolhida pelo paciente", "ADM, força quando tolerada e exame direcionado", "Barreiras de adesão, sono e atividades fora da fisio"] } },
      { role: "user", text: "Se aparecer superdose na academia e subdose na fisio, eu somo e considero compensado?" },
      { role: "assistant", text: "**Não.** A soma descreve carga global, mas uma atividade não substitui automaticamente a outra. Revise a comparação por frente: a academia pode ter ultrapassado o combinado enquanto a tarefa terapêutica ficou incompleta.\n\nUma sessão sem resposta fica **não respondida**, não subdose. Verifique por que a dose mudou e como o paciente ficou depois. Prontidão baixa é um sinal para conversar e ajustar com critério, não diagnóstico nem ordem automática." },
      { role: "user", text: "Que orientação eu mandaria para ele e quando rever?" },
      { role: "assistant", text: "Mensagem possível: “Vamos combinar uma semana que seu joelho tolere. Registre o que realmente fez, inclusive academia e corrida, e como ficou no dia seguinte. Se houver aumento importante do inchaço, travamento ou sintomas novos, entre em contato para reavaliarmos.”\n\nRever a resposta após as atividades pactuadas, antes de aumentar a demanda. Progressão depende de função, exame, objetivos e tolerância — não de um percentual fixo do gráfico.", suggestions: ["Como documentar a decisão de carga?", "Como conversar sobre baixa adesão?", "Como revisar a semana seguinte?"] },
    ],
  },
  {
    id: "shoulder-roberto", title: "Roberto Tavares — SLAP, academia e critérios", patient: "Roberto Tavares", updatedAt: "Hoje",
    preview: "Força específica não é liberação overhead irrestrita",
    messages: [
      { role: "user", text: "Roberto está pós-reparo SLAP. Dor 1/10, LSI de rotação externa 88% e flexão 92%. Quer voltar ao esporte overhead. Já faz academia e Pilates." },
      { role: "assistant", text: "Os dados mostram evolução, mas **dor baixa não encerra a decisão de retorno**. A fase fictícia é **STEPS 5 — força específica**, sem alta ou liberação irrestrita.\n\nFaltam tempo pós-operatório confirmado, orientações do cirurgião, demanda esportiva, capacidade absoluta de força, resistência, tolerância overhead e confiança. LSI é uma comparação: pode parecer bom quando os dois lados estão destreinados." },
      { role: "user", text: "O Pilates tem apoio nos braços e a academia tem desenvolvimento. Isso muda a semana?" },
      { role: "assistant", text: "Sim, a descrição da modalidade é insuficiente. Precisamos do **gesto e da exposição do ombro**: apoio, amplitude, resistência, repetições, velocidade e resposta tardia.\n\nA mesma semana pode reunir três estímulos overhead sem que o paciente perceba. Negocie com os outros profissionais e mantenha os limites pós-operatórios; não use o ACWR como autorização cirúrgica." },
      { role: "user", text: "Quais pontos separariam avançar, manter e regredir?" },
      { role: "assistant", text: "**Avançar:** critérios clínicos e cirúrgicos atendidos, tarefa atual tolerada, recuperação aceitável e objetivos claros. **Manter:** capacidade ainda não demonstrada ou resposta variável, mesmo com dor baixa. **Regredir/reavaliar:** piora persistente de dor, perda funcional, sintomas novos ou descumprimento de restrição.\n\nNo demo, não há medida de resistência ou teste esportivo que permita inventar aprovação.", tool: { kind: "tests", title: "Informação que falta confirmar", items: ["Orientações cirúrgicas e tempo pós-operatório", "Força absoluta e resistência específica", "Tolerância ao gesto e à repetição overhead", "Recuperação, confiança e demanda real do esporte"] } },
      { role: "user", text: "Como mostrar isso para o paciente sem parecer que está tudo proibido?" },
      { role: "assistant", text: "“Sua dor melhorou. Agora precisamos mostrar que o ombro sustenta os gestos e a repetição que seu esporte exige. Vamos combinar o que manter na academia e no Pilates, testar a tolerância e avançar quando os critérios estiverem presentes.”\n\nRegistre a capacidade já demonstrada e a ainda não testada. O microciclo organiza exposição; não substitui o exame nem libera esporte automaticamente.", suggestions: ["Como documentar a decisão de carga?", "Como revisar a semana seguinte?"] },
    ],
  },
  {
    id: "cervical-ana", title: "Ana Oliveira — cervical, Pilates e recuperação", patient: "Ana Oliveira", updatedAt: "Ontem",
    preview: "Dor residual, contexto de saúde e limites da prontidão",
    messages: [
      { role: "user", text: "Ana está com dor cervical 4/10, irradiação resolvida e faz Pilates leve. Diabetes não controlado apareceu na triagem. A prontidão oscila. Posso aumentar a dose?" },
      { role: "assistant", text: "**Não há informação suficiente para aumentar só pelo gráfico.** A diabetes sem controle confirmado continua como ressalva e demanda avaliação/acompanhamento médico. Não inventamos liberação a partir da melhora cervical.\n\nSTEPS 3 — mobilidade corresponde ao cenário atual. Verifique sintomas, exame neurológico quando indicado, tarefas limitadas e quais escalas de prontidão mudaram." },
      { role: "user", text: "Sono ruim e fadiga sobem no dia após o Pilates, mas dor não muda. Pode ser efeito do treino?" },
      { role: "assistant", text: "É uma **coincidência temporal a investigar**, não causalidade demonstrada. Sono, trabalho, contexto metabólico, outros esforços e resposta ao Pilates podem coexistir. Pergunte sobre o conteúdo da aula e a resposta de 24 horas, sem explicar tudo por uma variável." },
      { role: "user", text: "Como coordenar sem retirar uma atividade de que ela gosta?" },
      { role: "assistant", text: "Combine objetivos e limite tolerável com a paciente e o profissional de Pilates, mediante autorização. Preserve a atividade possível e evite sobrepor sessões exigentes até compreender a resposta.\n\nUma semana com menos esforço não é fracasso: pode ser ajuste consciente. Compare dose planejada e percebida por frente; prontidão serve de contexto, não de sentença.", tool: { kind: "hep", title: "Pontos de um plano a revisar pelo profissional", items: ["Tarefa cervical relevante e tolerável", "Pausas no trabalho e mobilidade confortável", "Conteúdo real das aulas de Pilates", "Limites de saúde e retorno médico registrados"] } },
      { role: "user", text: "Como resumir o raciocínio na evolução?" },
      { role: "assistant", text: "“Irradiação previamente relatada resolvida; dor cervical residual 4/10. Oscilação de sono/fadiga após atividade relatada, sem estabelecer causalidade. Mantida ressalva de diabetes sem controle confirmado. Planejado revisar tolerância, coordenar carga concorrente e confirmar acompanhamento médico antes de progressão.”\n\nAdicione apenas o que realmente examinou e pactuou, identificando relato, medida e interpretação separadamente.", suggestions: ["Como documentar a decisão de carga?", "Como revisar a semana seguinte?"] },
    ],
  },
  {
    id: "safety-carlos", title: "Carlos Mendes — segurança antes da carga", patient: "Carlos Mendes", updatedAt: "Ontem",
    preview: "Sem histórico inventado após investigação recente",
    messages: [
      { role: "user", text: "Carlos terminou a investigação lombar hoje. Dor 6/10. Cardiopatia parcialmente controlada e atenolol. O histórico de carga está vazio; podemos preencher para demonstrar ACWR?" },
      { role: "assistant", text: "**Não neste paciente.** Não existe histórico de exercício confirmado no cenário antes da investigação; inventá-lo sugeriria uma base de segurança que não temos. O histórico vazio e o ACWR sem base são resultados coerentes aqui.\n\nOs outros casos fictícios têm registros anteriores. Carlos começa em STEPS 1 e conserva a ressalva cardiovascular." },
      { role: "user", text: "A investigação da lombar já permite treino cardiovascular?" },
      { role: "assistant", text: "Não. Investigar a queixa lombar não confirma controle da cardiopatia nem libera esforço. Obtenha as orientações médicas pertinentes e mantenha vigilância de sintomas. Atenolol pode modificar a resposta de frequência cardíaca; não crie um teto baseado apenas na idade." },
      { role: "user", text: "O que eu posso deixar planejado?" },
      { role: "assistant", text: "No exemplo, apenas avaliação supervisionada e mobilidade confortável **condicionadas à avaliação profissional e às orientações médicas**, sem progressão automática. Registre os limites e as informações ausentes.\n\nA prontidão de hoje não equivale a aptidão cardiovascular. Sintomas novos ou sinais de alerta exigem reavaliar a conduta, não completar o calendário a qualquer custo.", suggestions: ["Como documentar a decisão de carga?"] },
    ],
  },
];

export const DEMO_DEEP_REPLIES: Record<string, DemoMessage> = {
  "Como documentar a decisão de carga?": { role: "assistant", text: "Separe a evolução em **relato, medidas, interpretação e decisão compartilhada**.\n\n1. O que o paciente fez e como respondeu, incluindo atividades fora da fisio.\n2. O que foi medido e o que continua desconhecido.\n3. Hipótese de trabalho, fase STEPS e ressalvas aplicáveis ao caso.\n4. Dose pactuada, limites e momento de reavaliação.\n\nNão registre liberação, exame ou encaminhamento como realizado se foi apenas sugerido. Esta conversa não grava o prontuário.", suggestions: ["Como revisar a semana seguinte?", "Como conversar sobre baixa adesão?"] },
  "Como conversar sobre baixa adesão?": { role: "assistant", text: "Não comece cobrando um percentual. Pergunte **o que atrapalhou**: tempo, medo, desconforto, entendimento ou excesso de atividades. Diferencie treino não realizado de registro ausente.\n\nReduza a complexidade, escolha uma tarefa ligada ao objetivo do paciente e pactue o mínimo viável. Registre a preferência e revise a resposta antes de ampliar. Adesão não é um julgamento moral.", suggestions: ["Como revisar a semana seguinte?", "Como documentar a decisão de carga?"] },
  "Como revisar a semana seguinte?": { role: "assistant", text: "Revise **planejado versus realizado por frente**, resposta após as atividades, prontidão e tarefa funcional relevante. Compare semanas equivalentes e confira registros faltantes.\n\nAvance apenas se o exame, a resposta e as restrições do caso permitirem; mantenha quando houver incerteza; reavalie ou reduza a demanda se houver piora persistente. Um ACWR na faixa esperada não demonstra segurança e uma superdose isolada não prova lesão.", suggestions: ["Como documentar a decisão de carga?", "Como conversar sobre baixa adesão?"] },
};