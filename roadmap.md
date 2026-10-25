# Roadmap

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
