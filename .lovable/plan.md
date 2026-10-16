# Agendamentos com horário de início e fim

## O que está errado hoje
- A duração é salva (ex.: 540 min no curso), mas a agenda desenha cada card só dentro da faixa de 1h em que ele começa. Por isso o curso das 8h às 17h aparece como 8h–9h.
- No formulário só existe "Horário" + "Duração (min)", o que obriga a fazer conta.
- Na leitura do print, a IA só devolve a duração e usa 50 min quando não vê nada; ela não lê o horário de fim.

## O que muda
1. **Formulário (novo e editar):** "Início" e "Fim" lado a lado. A duração é calculada sozinha e aparece como texto ("9h00 de duração"). Mudar o início mantém a duração e empurra o fim. Fim antes do início não deixa salvar. Atalhos rápidos: 30 min, 50 min, 1h, 2h, Dia inteiro (8h–18h).
2. **Agenda (semana e dia):** o card ocupa a altura real, do início até o fim (o curso cobre 8h–17h). Cards que se sobrepõem ficam lado a lado na mesma coluna. Arrastar um card mantém sua duração.
3. **Importação por print:** a IA passa a ler também o horário de fim quando ele aparece ("08:00–17:00"). Na tela de revisão, cada linha mostra início e fim, e os dois podem ser editados antes de importar.
4. **Card "Agenda de hoje":** mostra "08:00–17:00" no lugar de "08:00 · 540 min".
5. Os agendamentos já salvos não mudam: o curso que você já importou passa a aparecer com a altura certa sem nenhuma ação sua.
6. Páginas de suporte (pt/en/es) atualizadas.

## Detalhes técnicos
- Sem migração: a tabela guarda `appointment_time` + `duration_minutes`; o fim é sempre derivado (início + duração).
- `AppointmentEditorDialog.tsx`: campos `start`/`end` (input time) → `duration_minutes`; validação end > start, sem passar da meia-noite.
- `ProSchedule.tsx`: renderizar cards em camada absoluta por coluna de dia, com `top`/`height` calculados a partir da altura da faixa de hora (minutos); agrupar sobreposições em colunas; `getAptsForSlot` só para o clique em faixa vazia. O drop recalcula só o início.
- `parse-schedule-image`: campo opcional `end_time` (HH:MM); duração = fim − início quando os dois vêm, senão a duração lida, senão 50.
- `AgendaImportModal.tsx`: editar início/fim por linha.
- `ProScheduleCard.tsx`: mostrar o intervalo.
- Função pura `appointmentTime.ts` (fim a partir do início e da duração, duração entre dois horários, posição/altura no dia) com teste: 08:00 + 540 → 17:00; 08:00–17:00 → 540; fim antes do início é rejeitado.
