# Cota do parceiro decosancho: diagnóstico e correção

## O que os dados mostram (verificado)

- Existe apenas **um** usuário `decosancho@gmail.com` (último login 28/08 00:04).
- A concessão está ativa: `studio_granted_access` com `plan = solo`, `revoked_at` nulo.
- A linha de créditos dele está zerada: `plan = free`, `used_this_period = 0`, `period_start = 28/08`, `extra_credits = 0`.
- A função `studio_credit_status()` no banco já está na versão corrigida (concessão vence plano antigo) e `studio_plan_allowance('solo') = 60`. Permissões de execução para `authenticated` estão presentes nas duas funções usadas pelo app.

Conclusão: a regra de banco está correta e **nada foi consumido** (uso = 0). Ou seja, ele não estourou cota — a chamada de consumo não chegou a debitar. O que o app faz hoje é tratar **qualquer** falha da chamada como "cota esgotada":

- `useStudioQuota.consume()` retorna `false` tanto quando a cota acabou quanto quando a chamada falha (erro de rede, sessão expirada, cache do PostgREST desatualizado). O usuário vê sempre "Sua cota deste período acabou".
- `useStudioQuota.refresh()` também engole o erro: `quota` fica nulo e o painel exibe `0` artes restantes (`quota?.remaining ?? 0`), reforçando a impressão de bloqueio.

Ou seja: a causa exata da falha ainda não está identificada porque o app descarta a mensagem de erro. O primeiro passo do trabalho é fazer o erro aparecer.

## Correções

1. **Distinguir erro de cota esgotada** (`useStudioQuota.ts`)
   - `consume()` passa a devolver um resultado tipado: `"allowed" | "exhausted" | "error"` (com a mensagem do banco).
   - `refresh()` passa a expor `error` além de `quota`.

2. **Mensagens honestas na interface** (`StudioProCreate.tsx`, `StudioProApp.tsx`)
   - `"exhausted"` → mantém o aviso de upgrade.
   - `"error"` → aviso "Não foi possível confirmar sua cota agora. Tente novamente." com o motivo técnico no console, sem falar em upgrade.
   - Quando a cota é desconhecida (erro/carregando), o contador mostra `—` em vez de `0`, e o botão "Nova versão" não fica desabilitado por falta de dado.

3. **Fail-open controlado**: se a leitura de cota falhar mas a concessão/plano do usuário for pago ou cortesia (`useStudioAccess` já resolve isso por e-mail), a geração continua liberada — o débito real segue sendo do banco, então não há risco de abuso além de um lote.

4. **Recarregar o cache da API do banco**: nova migração com `NOTIFY pgrst, 'reload schema'` e reafirmação dos `GRANT EXECUTE` em `studio_credit_status()` e `consume_studio_generation(integer)`, cobrindo o cenário em que o app ainda vê a assinatura antiga da função após as alterações de ontem.

5. **Provar o comportamento**: consultar diretamente o status/consumo simulando o usuário do parceiro e confirmar `plan = solo`, `allowance = 60`, `generations_left = 10`, e que um consumo real incrementa `used_this_period` para 6.

## Detalhes técnicos

- Arquivos: `src/pages/studio-pro/useStudioQuota.ts`, `src/pages/studio-pro/StudioProCreate.tsx`, `src/pages/studio-pro/StudioProApp.tsx`, `src/pages/studio-pro/StudioProBrand.tsx` (repasse do estado de erro), mais uma migração SQL.
- Nada muda na regra de negócio de cota (Solo 60 artes / 6 por lote) nem no app clínico.
