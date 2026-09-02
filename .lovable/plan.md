# Sessão de hoje pré-preenchida a partir do microciclo

## Resposta à dúvida

Sim, hoje já ficam vinculadas: quando o paciente registra a sessão, o servidor procura uma sessão planejada com a **mesma data e a mesma frente** e grava esse vínculo (`session_id`) no sRPE. A aderência de dose (subdosado / dose certa / superdosado) já sai desse pareamento.

O que falta é exatamente o que você apontou: o paciente ainda precisa escolher a frente e digitar a duração na mão. Se ele erra a frente (marca "Academia" quando a sessão planejada era "Fisio"), o vínculo se perde e a sessão entra como avulsa. Hoje o planejado do dia aparece só como texto informativo.

## O que muda para o paciente

Ao abrir "Sessão de hoje", se existir planejamento para a data:

1. Aparece a lista **"Suas sessões de hoje"** como cartões selecionáveis — um por sessão planejada (frente, duração alvo, descrição). Ele toca no cartão e confirma.
2. Ao selecionar, a **frente** e a **duração** já vêm preenchidas (a duração continua editável, para o caso de ter feito 35 min em vez de 50).
3. O **esforço percebido não é pré-preenchido** — continua começando neutro, porque sugerir a nota alvo enviesaria a resposta. A carga alvo em número continua invisível para ele.
4. Se houver só uma sessão planejada, ela já vem selecionada — um toque para confirmar.
5. Sessão já respondida hoje aparece marcada como "já registrada", evitando duplicidade.
6. Botão discreto **"Fiz outra atividade não planejada"** abre o formulário livre atual (escolhe frente e digita tudo), que é também o comportamento padrão quando ninguém planejou nada para o dia.

## O que muda para o vínculo

O registro passa a enviar o identificador da sessão escolhida, em vez de depender de casar data + frente. Assim, se houver duas sessões da mesma frente no mesmo dia (ex.: fisio manhã e fisio tarde), cada sRPE vai para a sessão certa.

## Detalhes técnicos

- `supabase/functions/periodization-checkin/index.ts`
  - `action: "load"`: em `today_targets`, incluir `already_reported: boolean` (verificando `srpe_entries` do dia por `session_id`).
  - `action: "submit_srpe"`: aceitar `entry.session_id` opcional; validar que a sessão pertence ao mesmo paciente e à mesma data antes de usar; herdar a `track` da sessão. Sem `session_id`, mantém o pareamento atual por data + frente (compatibilidade).
- `src/pages/PeriodizationCheckin.tsx`
  - Estado `selectedSessionId`; auto-seleção quando há exatamente uma sessão pendente.
  - Cartões de sessão planejada substituindo o bloco informativo "Planejado para hoje"; ao selecionar, aplicar `track` e `duration` (não o RPE).
  - Modo "atividade não planejada" mostrando os seletores de frente/duração como hoje.
  - Enviar `session_id` no `submit_srpe`.
- Nada muda no cálculo de carga, ACWR, prontidão ou nos alertas — `pairSessionsWithSrpe` já prioriza `session_id`.
- Sem consumo de créditos de IA.
- Atualizar a memória do módulo (`features/periodization-load`) com a regra de pré-preenchimento.
