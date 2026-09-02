# Visão semanal (somente leitura) no link do preparador

## Objetivo
Quem acessa pelo link do preparador (personal/preparador físico, sem conta no sistema) passa a ver o microciclo da semana já planejado — todas as frentes (fisio, academia, campo) — antes de prescrever a própria sessão. Apenas visualização: o link do preparador continua sem editar sessões existentes, só adiciona a dose planejada dele.

## Mudanças

### 1. Edge Function `periodization-checkin` (ação `load`)
- Para `link.audience === "coach"`, além de `today_targets`, retornar `week_sessions`: todas as linhas de `periodization_sessions` do paciente entre a segunda-feira e o domingo da semana corrente (mesma regra de semana usada no `MicroWeekGrid`), ordenadas por data.
- Campos por sessão: `session_date`, `track`, `planned_duration_min`, `planned_rpe`, `title`. Nenhum identificador interno extra além do já exposto; sem dados de sRPE do paciente (não é papel do preparador ver o esforço percebido).
- Link de paciente (`audience === "patient"`) não recebe `week_sessions` (paciente vê só "duração e esforço alvo" do dia, regra de não enviesar o sRPE).

### 2. Página `/carga/:token` (`PeriodizationCheckin.tsx`)
- Novo bloco colapsável "Semana planejada (visão geral)" exibido apenas quando `isCoach`, acima do formulário de planejamento:
  - Lista os 7 dias (Seg→Dom) com data; cada dia mostra as sessões planejadas com frente (label), duração alvo, nota de sRPE alvo e selo de intensidade derivado (`loadLevelFromRpe`), e observação (`title`) quando houver.
  - Dia sem sessão: "—" / "Sem sessão planejada".
  - Sessões já adicionadas pelo próprio preparador nesta visita aparecem na lista após salvar (refetch do `load` após `submit_planned_session`, reaproveitando `fetchInfo`).
- Tudo somente leitura: nenhum botão de editar/excluir; o formulário de "Salvar dose planejada" permanece como está.
- Texto explicativo curto: "Veja como a semana está montada em todas as frentes para dosar melhor a sua sessão."

## Detalhes técnicos
- `supabase/functions/periodization-checkin/index.ts`: no branch `action === "load"`, quando coach, query extra em `periodization_sessions` com `gte(lunes)/lte(domingo)`; cálculo de segunda-feira em UTC alinhado ao `weekStart` de `MicroWeekGrid`.
- `src/pages/PeriodizationCheckin.tsx`: estender `Info` com `week_sessions?: WeekSession[]`; novo componente interno (lista simples, sem dependência do `MicroWeekGrid`, que é interativo e ligado ao banco via props do dashboard); reutilizar `TRACK_LABEL` e `loadLevelFromRpe`/`plannedLoad` de `@/lib/periodization` e `scales`.
- Após `submitPlanned` com sucesso, chamar `fetchInfo()` para atualizar a visão semanal.
- Reimplantar a Edge Function ao final.

## Verificação
- Typecheck/build.
- Teste com link de coach: visão semanal aparece, datas corretas, salvar dose atualiza a lista.
- Teste com link de paciente: nada muda (sem `week_sessions`).
