# Roadmap

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

## Próxima rodada
- [ ] Editor de catálogo de serviços para PRO autônomo (schema/loader já suportam).
