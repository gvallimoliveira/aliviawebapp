# Roadmap

## Correção de localização dos painéis
- [ ] Devolver solicitações de agendamento à Agenda no PRO e na clínica.
- [ ] Mover Serviços e valores para Insights → Operação, retirando de Pacientes/Equipe e atualizando a ajuda.
- [ ] Verificar a navegação autenticada e preservar os vínculos dos serviços e agendamentos.

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
- [x] Editor disponível em Pacientes → Serviços e valores; gravação/leitura/remoção verificadas na conta profissional.

## Ajustes solicitados agora
- [x] Agenda corrigida: respostas antigas não substituem o período atual; horários 26/10 12:15 e 13:00 verificados com atraso artificial no celular, sem alterar registros.
- [x] Serviços PRO em Pacientes → Serviços e valores; clínica em Clínica → Equipe → Serviços e valores, dono/admin; ajuda pt/en/es e 9 testes aprovados.
- [x] Abandono silencioso: rolagem e descarte persistente pelo mecanismo existente.
- [x] Adesão: causa confirmada (ambos sem e-mail); RPC usa ID do paciente, canais ausentes não diluem e lista completa pesquisável.
- [x] Frequência: comparar somente oportunidades decorridas no mês, considerando início do acompanhamento.
- [x] Financeiro: detalhar pacientes, dias, horários e valores de LTV/cadeira vazia com os mesmos dados dos totais.
- [x] 29 testes passaram, incluindo execução SQL e isolamento; ajuda pt/en/es; UI autenticada da clínica sem erros.
- [ ] Conferir visualmente Francisco/Fábio e detalhes financeiros com dados: conta disponível não possui os perfis PRO desses pacientes e clínica acessível não tem preços/casos representativos. Aguarda acesso ao perfil correspondente.
