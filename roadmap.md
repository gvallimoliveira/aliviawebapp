# Roadmap

## Comunicação de capacidade da IA nas landings
- [x] Parágrafo por público e dois cards com ícones em PRO, Clínica e Acadêmico (ambos os layouts), pt/en/es, sem destacar cotas numéricas; combinações alternativas estimadas, saldo na conta e pacote opcional preservados. Páginas públicas conferidas em 1280px e 440px, sem transbordamento ou erros; 41 testes passaram e build OK. Layouts antigos e idiomas EN/ES não abertos no navegador; publicação não solicitada.

## Visibilidade dos créditos nas landings
- [x] Créditos destacados junto aos preços em PRO, Acadêmico e Clínica, nos dois layouts; mensal/anual mostra 30/33 e 20/22, clínicas 80/150/250. Páginas públicas atuais verificadas em 1280px e 440px, sem transbordamento ou erros; 41 testes passaram e build OK. Layouts preservados não abertos; publicação não solicitada.

## Cotas e pacotes de IA — novembro
- [x] PRO 30/33, Acadêmico 20/22, clínicas Small 80, Medium 120, Large 200 compartilhados; migração 0069 e cotas correntes atualizadas, sem apagar consumo ou saldo comprado. Margens e bloqueios atuais mantidos.
- [x] Pacotes 15/R$39, 30/R$69, 60/R$129 criados no Stripe, catálogo compartilhado e funções implantadas; webhook verifica pares exatos de ID/preço atual ou anterior para preservar sessões pendentes.
- [x] Telas/suporte pt/en/es atualizados; 41 testes passaram, build OK. Conta administradora → clínica → Insights → pacotes → Stripe Mini R$39 verificados sem cobrança. Conta admin continua ilimitada; saldo não-VIP e pools testados em banco isolado, não na tela real de assinante. Compra paga/liberação real continua pendente de compra autorizada; demais bloqueadores antigos abaixo não fazem parte desta revisão.

## Admin — consumo recente e avaliações gratuitas
- [x] Hoje (São Paulo), Últimas 24h, tabela das 100 chamadas recentes e atualização a cada minuto visível/manual; consultas concorrentes protegidas. Conta real: 30d → Hoje → 24h → 7d → atualizar → Leads conferidos, sem erros. Hoje/24h realmente sem chamadas; 7d mostra 43 registros. 401 sem sessão e janela inválida recusados; build OK.
- [x] Diagnóstico/tratamento gravam apenas referência autorizada de avaliação; admin resolve nome/e-mail e distingue link institucional de fluxo básico. Nome salvo também ao iniciar avaliação; Leads mostra nome existente e busca nome/e-mail. 47 testes distintos passaram. Registro anônimo antigo não contém assessment_id: impossível atribuí-lo com certeza, mantido sem vínculo sem inventar. Nova avaliação completa até IA não criada para evitar gravação clínica/custo; identificação de uma nova chamada ainda não exercitada ponta a ponta, aparelho físico não testado.

## Pré-operatório LCA — avaliação testagem externa
- [x] Reconhecimento inclui preventionGoalDetails e data marcada em outro campo, inclusive 12/12/26; trajetória reúne preparação e etapas pós-operatórias consultáveis, mantendo confirmação da cirurgia/data realizada e beta admin.
- [x] Lista genérica sem dor substituída por escolha profissional opcional, sem instrumentos automáticos nem adaptação de KOOS; respostas históricas preservadas e ajuda pt/en/es atualizada.
- [x] 39 testes passaram, build OK. Conta administradora do paciente: ativação e recarga conferidas, 42 dias até 12/12/2026, fase futura aberta; preparação mantida no paciente de teste sem marcar metas. Formulário de cirurgia abriu sem data inventada e foi cancelado, nenhum pós-operatório criado. Etapa de questionários percorrida sem lista genérica; avaliação/hipótese/impressão originais não alteradas. Nova avaliação completa e cirurgia real não gravadas; iPhone físico não testado.

## Pré-operatório de LCA
- [x] Registro explícito de pré-operatório de LCA na avaliação habilita preparação no prontuário, com três etapas, metas e data cirúrgica opcional; mesma autorização beta/paciente. Região ou início isolados não ativam. Dados guardados separadamente sem alterar pós-operatórios.
- [x] 21 testes passaram; quadro real montado no navegador autenticado com anamnese técnica: data 20/11 pré-preenchida, 21 dias até cirurgia, metas gravadas/lidas, avanço e etapas futuras conferidos. Paciente técnico removido. Ajuda pt/en/es e inserção em relatório ajustadas, build OK. Avaliação manual completa até prontuário e download PDF não reexecutados; Valéria não alterada.

## R-LCA — material clínico e organização didática
- [x] Sete prints transcritos em docs/rlca-referencia-clinica.md com origem, métricas, métodos, objetivos e avançar/manter/regredir; cortes não universais separados da evidência identificada.
- [x] Referência curada compartilhada no chat, impressão, hipótese, plano e relatório evolutivo; histórico cirúrgico preservado e cache versionado sem reescrever relatórios salvos. Futura seção ortopédica não criada.
- [x] Cinco funções implantadas; chamadas autenticadas com caso fictício retornaram 200 e chat lido pela tela. Primeiro teste trouxe corte psicológico não sustentado: instruções reforçadas e reteste não o repetiu. Planos condicionaram fases avançadas à avaliação/liberação. Trinta testes passaram, build OK; nenhum prontuário alterado. Não garante todas as respostas futuras nem valida todos os cortes dos prints; emissão de PDF/fluxo completo de avaliação não reexecutados.

## Idioma — equipe e agenda no iPhone privado
- [x] Menu deixa de trocar PT→EN em um toque: escolha explícita PT/EN/ES compartilhada entre menus e painel. Contexto segue o idioma efetivo após carregar traduções, sem efeitos dentro de atualização de estado ou toques concorrentes. Imagens mostram idioma geral em inglês; não foi possível confirmar o toque que originou a mudança no aparelho.
- [x] Conta Sifeg autenticada em WebKit móvel, sessão nova com navegador en-US: identificação na equipe e edição de Diego Ramos no PRO demo abertas em português, sem salvar dados. Menu abriu sem mudar idioma; escolha English e retorno Português conferidos. Dez testes passaram, build OK. iPhone físico não testado.

## Relatórios — identidade e assinatura dos colaboradores
- [x] Resolução compartilhada preserva o emissor e a assinatura mesmo sem conselho; marca da clínica mantida. Causa: Sifeg tinha assinatura salva, mas CREFITO provisório fazia o emissor cair no dono.
- [x] Nome completo e conselho/número em Minha conta e edição por dono/admin na Equipe, separados por clínica; autorização no servidor e ajuda pt/en/es.
- [x] Cadastro de Sifeg salvo sem inventar dados, recarga conferida e encaminhamento real de Aline baixado com marca GV Fisio e assinatura de Sifeg; dez testes aprovados, build OK. Servidor recusou alteração do dono por Sifeg, registro fictício e acesso a outra clínica. Nome completo/número reais de Sifeg não fornecidos; mantido cadastro existente. Edição pelo dono/admin e aparelho físico não exercitados.

## Studio — manual editorial Aliv.iA atualizado
- [x] Interpretar com IA executado na conta de Guilherme; resultado revisado editorialmente antes do salvamento final. Manual atualizado com recursos recentes e limites reais, nove públicos/subnichos com frases completas e 14 diálogos por público. Os 34 públicos/temas originais, logo, cores, fontes e slogan foram preservados; salvamento e recarga conferidos pela tela e leitura autenticada, sem erros. Não realizada nova auditoria de lotes nesta tarefa.

## Studio — sombras no PNG
- [x] Falha de sombras deslocadas reproduzida em WebKit; sombras convertidas em camada estável no exportador compartilhado, texto centralizado preservado. Download PNG real comparado antes/depois e regressões de exportação aprovadas; aparelho físico não testado.

## Studio — linguagem após auditoria de três lotes
- [x] Escrita natural preserva frases completas e fatos; intervalos/negações protegidos, concordância e corte de frases da pinça corrigidos.
- [x] Copiar/baixar/salvar legendas usa texto renderizado; objeções soltas removidas, público oficial ligado ao seu acervo em vez de um sorteio independente.
- [x] Três gerações autenticadas finais: 16, 12 e 13 artes, sem erro de execução; imagens e legendas conferidas. Sem publicar ou salvar na galeria. Ainda há textos promocionais antigos e descrições extensas a revisar editorialmente; não se promete qualidade definitiva de todas as peças.

## Trial restaurado e aviso de reembolso anual
- [x] Renovação automática exclusiva restaurada; GV Fisio renovada até 13/11/2026, confirmada no banco e sete testes de isolamento/15 dias aprovados.
- [x] Aviso anual discreto e suporte pt/en/es para paciente/PRO/Acadêmico/clínica; antigas negativas de reembolso acadêmico corrigidas. Nove testes passaram; seleção anual/mensal no PRO e avisos acadêmico/clínica e suportes conferidos no navegador sem erros. Paciente atualmente oferece mensal/avulso, sem seletor anual; nenhum plano novo criado. Reembolso informado como solicitação ao suporte, sem execução automática de pagamento. Trial restaurado confirmado no banco, não no painel autenticado do proprietário (sessão disponível corresponde a outra conta).

## Assinatura dentro do aviso de trial encerrado
- [x] Planos mensal/anual no aviso e por botão durante trial; proprietário/admin segue direto ao Stripe. Clínica validada no servidor e transmitida ao provisionamento, retorno/cancelamento no painel e recarga do contexto após pagamento.
- [x] Doze testes passaram; aviso expirado conferido na conta real com expiração simulada só na leitura, três planos e checkout real aberto sem pagar. Preços Essencial mensal R$197/anual R$1.344 confirmados no Stripe; IDs dos seis preços conferidos por teste. Ajuda pt/en/es atualizada, funções implantadas e build OK. O Stripe abriu mas o valor não apareceu no navegador automatizado; cobrança final/reativação após pagamento não executadas, pois exigem compra autorizada.

## Trial pessoal do administrador e acesso aos planos
- [x] Trial da GV Fisio renovado até 13/11/2026; renovação de 15 dias ao acessar/após expirar com a tela aberta, exclusiva do proprietário Guilherme com autoridade admin no servidor; criação preservada.
- [x] Botões do trial levam diretamente aos planos (#planos/#pricing compatíveis); 'Ver planos' no início das duas versões da página.
- [x] Sete testes passaram (15 dias, isolamento, autoridade, assinatura paga e acesso anônimo); clínica real autenticada mostra 15 dias, clique do trial e botão inicial posicionam preços abaixo do cabeçalho. Ajuda pt/en/es atualizada e build OK. Nenhuma compra realizada; expiração futura validada em teste isolado.

## Erro ao criar HEP na clínica pagante
- [x] Recusa 403 reproduzida na conta afetada: HEP exigia PRO solo apesar da clínica ativa. Migração 0056 corrige programas e itens pelo escopo clínico, mantém autoria/membros clínicos ativos e pagamento separado do PRO. Edição verifica erros sem trocar clínica. Oito testes de RLS passaram; build OK. Criação real autenticada retornou 201, item e autoria conferidos no banco, link exibiu exercício e marca corretos; registro técnico removido sem alterar pacientes. Envio push e dose no microciclo não executados neste teste para não prescrever/notificar paciente real.

## Lista compacta de solicitações na Agenda
- [x] Painel compartilhado PRO/clínica limitado à altura real dos três primeiros pedidos, com rolagem interna, total e data/hora de criação em ordem de chegada. Ajuda pt/en/es atualizada; sete testes passaram e build OK. Clínica autenticada: seis pedidos simulados apenas nas respostas de leitura, três visíveis, ordem correta, rolagem até o último e aprovação aberta sem gravar. Clínica sem pedidos reais; PRO disponível apenas em demo, portanto não houve aprovação real nem validação visual do PRO real.

## Revisão do suporte do paciente
- [x] Ajuda específica para check-in, HEP, solicitações e avisos; localização de histórico, diário, comparação, indicação e plano pessoal corrigida em pt/en/es. Guia para PRO e clínica e dúvidas sobre vínculo acrescentados. Tópicos do paciente e da clínica abertos no navegador, sem erros; traduções presentes e build OK. Somente orientações alteradas, sem mudanças de acesso ou dados.

## Organização do perfil pessoal do paciente
- [x] Rotina em Hoje, histórico em Minha Evolução, Agenda preservada e Mensagens & Avisos reunidos; vínculo determinado pelas consultas existentes, ofertas fora do topo e indicação recolhida.
- [x] Ajuda pt/en/es atualizada; 12 testes passaram, build OK. Perfil real autenticado: Hoje → Evolução → Agenda → Avisos → abertura do check-in conferidos no celular/computador sem erros ou sobreposição; links antigos health/notices conferidos. Nenhuma resposta clínica alterada. Conta sem HEP ativo, avisos ou agendamentos: execução/gravação desses recursos não repetida; componentes e permissões existentes preservados.

## Organização dos pacientes na clínica
- [x] Totais e relatório movidos para o registro Resumo dos Insights; lista sem métricas/status duplicados. Cálculos e acessos mantidos, ajuda pt/en/es atualizada. Percurso autenticado Pacientes → Insights → Resumo conferido no desktop/celular com dados reais; oito testes passaram e build OK.

## Correção dos controles de parceiros
- [x] Validação de CREFITO corrigida sem registro fictício; desativação do Acadêmico e remoção de Juliana realizadas no Admin autenticado e confirmadas no banco, preservando conta/histórico. Cinco testes passaram; build OK. Toggles recarregam dados e mantêm a pessoa na lista até remoção explícita.

## Preparação dos créditos de IA
- [x] PRO com margem de 10%; parceiros 25/mês e compra permitida; clínica mantém 20%; ilimitado só admin/VIP.
- [x] Avisos 80/100%, recuperação contextual e controles seletivos no Admin; chave geral desligada e categorias vazias.
- [x] 29 testes aprovados para política, compra idempotente, saldo compartilhado, débitos fracionados, expiração e permissões. Admin autenticado, parceiros reais e clínica pagante consultados; pagamento aberto sem cobrança. Aviso de 100% → renovação → pacotes conferido com saldo simulado apenas no navegador; ajuda pt/en/es atualizada.
- [ ] Antes da ativação hard: confirmar um pagamento real de pacote até o saldo aparecer (aguarda compra autorizada) e executar concorrência/escopo clínica-PRO com contas não-VIP representativas (aguarda contas autorizadas). Nenhum bloqueio ativado.

## Categorias de clínicas no Admin
- [x] Separados 1 assinante, 4 parceiros ativos gratuitos e 2 clínicas em teste/inativas; busca e detalhes preservados. Quatro testes passaram, build OK e navegação autenticada desktop/celular conferida com dados reais, sem alterar acessos.

## Blindagem de compromissos pessoais
- [x] Compromissos excluídos nos cards locais e em 10 RPCs, incluindo notas explicitamente vinculadas; Agenda e escopos preservados. Migração 0044 aplicada e definições conferidas no servidor.
- [x] 44 testes passaram: invariância dos cálculos com compromissos em todos os status, notas, tipos nulos, clínica/solo e recusas de acesso. Insights → Operação conferido na clínica autenticada, sem erros; build OK. Clínica acessível sem atendimentos representativos e PRO disponível só demo: confronto visual com compromissos reais não realizado; regressões usam dados isolados, sem escrever em produção.
- [x] Ajuda pt/en/es atualizada; regra registrada no AGENTS dos Insights.

## Serviço na solicitação
- [x] Serviço escolhido visível no pedido e na confirmação, com ID pré-selecionado e nomes do catálogo no mesmo escopo (incluindo inativos). Pedido real consultado: Avaliação. Tela autenticada da clínica sem pedidos reais; visual desktop/celular conferido com resposta simulada somente de leitura, sem aprovar ou gravar. Build OK. Aprovação real no PRO não reexecutada: conta disponível tem PRO demo.

## Correção de localização dos painéis
- [x] Solicitações devolvidas à Agenda no PRO e na clínica, com permissões e atualização existentes preservadas.
- [x] Serviços e valores em Insights → Operação, retirados de Pacientes/Equipe; ajuda pt/en/es atualizada.
- [x] Navegação autenticada da clínica conferida, 9 testes aprovados e build OK; sem alterações nos dados. Conta disponível sem PRO real ou solicitações pendentes: aprovação e navegação PRO não reexecutadas nesta correção de localização.

## Concluído (esta rodada)
- [x] Insights deixam de usar diário de dor e mensagens; sinais agora: check-in de prontidão (dor por região/nota), HEP e comparecimento na agenda (migrações 0032–0034, RPCs validadas).
- [x] Verificada a aba Pacientes vazia na clínica de teste: integração OK, ausência real de dados no escopo; escopo rico produz sinais (~20 silêncios, dor estagnada).
- [x] Previsão de alta multi-sinal: dor, fase STEPS, progresso de carga e prontidão, com % de progresso e chips de fatores.
- [x] Financeiro com catálogo de serviços da clínica (preço por sessão ou mensal diluído), serviço vinculável ao agendamento, LTV/cadeira vazia/receita por hora com preço correto.
- [x] Prontuário em dia não mostra mais 100% falso: horários passados sem classificação viram pendência; sem casos avaliáveis mostra "—".
- [x] Ajuda atualizada (locales pt/en/es + ClinicSupport inline); testes (18) e build OK.

## Rodada 2 (concluída)
- [x] Cancelamento tardio: slot sem hora não finge antecedência; janela segue a data do cancelamento.
- [x] Sem próximo horário: nome da sessão mais recente; sessões só com evolução resolvem nome pelo cadastro.
- [x] Gargalo de capacidade: solo não mostra 100% falso; card ganhou "ocupação da agenda" (horários usados ÷ possíveis).

## Catálogo PRO
- [x] Editor agora em Insights → Operação → Serviços e valores; mecanismo de gravação/leitura/remoção preservado.

## Ajustes solicitados agora
- [x] Agenda corrigida: respostas antigas não substituem o período atual; horários 26/10 12:15 e 13:00 verificados com atraso artificial no celular, sem alterar registros.
- [x] Serviços PRO/clínica agora em Insights → Operação → Serviços e valores (clínica: dono/admin); ajuda pt/en/es e 9 testes aprovados.
- [x] Abandono silencioso: rolagem e descarte persistente pelo mecanismo existente.
- [x] Adesão: causa confirmada (ambos sem e-mail); RPC usa ID do paciente, canais ausentes não diluem e lista completa pesquisável.
- [x] Frequência: comparar somente oportunidades decorridas no mês, considerando início do acompanhamento.
- [x] Financeiro: detalhar pacientes, dias, horários e valores de LTV/cadeira vazia com os mesmos dados dos totais.
- [x] 29 testes passaram, incluindo execução SQL e isolamento; ajuda pt/en/es; UI autenticada da clínica sem erros.
- [ ] Conferir visualmente Francisco/Fábio e detalhes financeiros com dados: conta disponível não possui os perfis PRO desses pacientes e clínica acessível não tem preços/casos representativos. Aguarda acesso ao perfil correspondente.
