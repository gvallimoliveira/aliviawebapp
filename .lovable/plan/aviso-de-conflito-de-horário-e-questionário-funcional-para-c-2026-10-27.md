# Aviso de conflito de horário e questionário funcional para coluna

## 1. Aviso de conflito ao aprovar uma solicitação de agendamento
Na janela "Confirmar agendamento" da Agenda, assim que você abrir a solicitação ou mudar a data, o horário, os minutos ou o terapeuta, o sistema confere a agenda daquele dia e mostra um aviso amarelo, sem bloquear nada:

- "Atenção: já existe 1 agendamento que se sobrepõe a este horário", com a lista de cada um: horário de início e fim, nome do paciente (ou "Compromisso" quando for o cinza) e o tipo.
- Conta também a sobreposição parcial. Exemplo: um agendamento existente das 16h às 17h e uma solicitação das 15h30 às 16h30 se sobrepõem em 30 minutos, e o aviso diz "sobrepõe 30 min".
- Horários cancelados ou com falta não contam.
- **Clínica:** a conferência usa o terapeuta escolhido. Se nenhum estiver escolhido, olha a clínica toda e avisa isso. **PRO autônomo:** olha só a sua agenda.
- A decisão continua sendo sua: o botão "Confirmar e agendar" segue ativo e você ainda pode recusar.

## 2. Questionário funcional para coluna no fluxo de acompanhamento (sem dor)
Os questionários de coluna que já existem no sistema (ODI e NDI) perguntam sobre dor em todos os itens, por isso ficaram de fora. Proposta validada: **PSFS – Escala Funcional Específica do Paciente** (Stratford 1995; validada para lombar por Stratford 1995 e para cervical por Westaway 1998, com versão em português validada).

- O paciente escolhe até 3 atividades do dia a dia que acha difíceis ou quer proteger (ex.: carregar peso, ficar sentado muito tempo, correr) e dá nota de 0 a 10 para a capacidade de fazer cada uma (10 = faz como antes).
- A pontuação é a média das notas. Fala só de função e limitação, não de dor, e serve para comparar reavaliações.
- Aparece só na avaliação de acompanhamento/prevenção, quando a região marcada é cervical, torácica ou lombar. A avaliação com dor continua com ODI e NDI, como hoje.
- Fica identificado como funcional no prontuário, no PDF e no raciocínio. Dor continua como "não coletada".
- A ajuda em pt/en/es é atualizada.

Observação: não existe questionário validado de coluna "sem nenhuma referência à dor" além de escalas específicas do paciente como a PSFS. O Roland-Morris e o Quebec perguntam "por causa das costas/dor" e por isso não são indicados aqui.

## Detalhes técnicos
- `AppointmentRequestsPanel.tsx`: busca com debounce em `professional_appointments` do mesmo escopo (clinic_id ou professional_id + clinic_id null) para a data, e excluindo status cancelados/falta. Usa uma função pura `findOverlaps(start, duration, rows)` em `src/lib/appointmentConflicts.ts`, com testes (16–17h × 15h30–16h30 = 30 min; encostados, como 15–16h × 16–17h, não conflitam). Os horários sem duração usam 50 min como padrão. Somente leitura, sem mudar a aprovação no servidor.
- `questionnaireData.ts`: nova definição `psfs` (3 itens de atividade escrita + nota 0–10, `scoringDirection: higher_better`), mapeada para as regiões cervical, torácica e lombar e usada apenas por `getFunctionalQuestionnaires`. Não entra no `getApplicableQuestionnaires`, que é o fluxo com dor.
- `QuestionnaireStep.tsx`: campo de texto da atividade para itens PSFS, com o texto salvo junto às respostas (`activityLabels`). PDF e prontuário mostram as atividades com as notas.
- Testes: PSFS aparece no preventivo de lombar e não aparece no fluxo com dor; a média é calculada corretamente.
