# Ajustes da reunião com a clínica — Agenda

Três mudanças pontuais, sem alterar regras de permissão, cobrança, insights ou o fluxo atual de agendamento.

## 1. Horários com 3 ou mais atendimentos
Hoje cada atendimento simultâneo vira uma coluna estreita dentro da célula (3+ ficam ilegíveis).

- Até 2 atendimentos no mesmo horário: continua igual (lado a lado).
- 3 ou mais: a linha daquele horário cresce automaticamente e os cards se organizam em grade de 2 colunas (2 em cima, 2 embaixo...), todos dentro do mesmo horário.
- Só a linha afetada cresce; as demais horas mantêm a altura atual.
- Arrastar, soltar, clicar no card e criar novo horário continuam funcionando.
- Celular: mesmo comportamento, com 2 colunas no máximo.

## 2. Serviços personalizados (ex.: "Recovery")
O cadastro de serviços já existe em Insights → Operação (só dono/admin), mas só aceita 6 categorias fixas.

- No cadastro de serviços, permitir criar um serviço próprio da clínica (nome livre, ex. Recovery) com cor.
- A agenda passa a mostrar como filtro: as categorias usadas + os serviços personalizados ativos da clínica/PRO (escopos isolados).
- O modal de agendamento aberto pela agenda já lista os serviços cadastrados; o personalizado aparece ali e fica salvo no horário, com a cor no card.
- Clínica que só tem Recovery pode ocultar/desativar os demais e ver só o que usa.
- Atualizar páginas de Suporte (pt/en/es).

## 3. Ditado na evolução pelo modal da agenda
O botão de ditado existe no prontuário, mas não no campo de evolução do modal de agendamento.

- Adicionar o mesmo botão de ditado ao campo de evolução desse modal, acrescentando o texto ao que já foi digitado (mesma regra do prontuário).
- Salvar, editar e excluir evolução seguem como hoje.

## Proteção do fluxo
- Testes para: distribuição em grade com 3+, filtro incluindo serviço personalizado, ditado acrescentando sem apagar texto.
- Verificação visual na agenda (desktop e celular) com 1, 2, 3 e 4 atendimentos no mesmo horário.

## Detalhes técnicos
- `ProSchedule.tsx`: altura por linha calculada a partir do máximo de `assignLanes` naquela hora; quando lanes ≥ 3, posicionar em grade 2×N (lane → coluna lane%2, linha floor(lane/2)), sem tocar na lógica de sobreposição nem no drag (coordenadas de drop pelo `data-cell-hour`).
- Serviços: `care_services` já tem `service_type`; serviços personalizados usam `service_type = 'custom:<id>'` ou chip pelo `service_id`, com coluna opcional `color` (migração aditiva). Filtro da agenda usa `service_id` quando presente e `service_type` como fallback — agendamentos antigos inalterados. Financeiro continua via `buildPriceResolver`.
- `AppointmentEditorDialog.tsx`: reutilizar `DictationBar` (`onAppend`) no Textarea da evolução.
