## Causa raiz

Dois bugs combinados produzem o sintoma do vídeo (múltiplos toasts "Avaliação concluída" ao salvar edição de dados cadastrais):

1. **`AddPatientModal.handleSave`** dispara `UPDATE` em **todas** as `assessments` do paciente (e em `professional_appointments`) sempre que se salva uma edição, mesmo que `patient_name`/`patient_email` não tenham mudado. Cada linha atualizada gera um evento Realtime.
2. **`useRealtimeNotifications`** detecta "tornou-se concluída" comparando `payload.old.status !== "completed"`. Mas o Supabase Realtime só envia em `old` as colunas da REPLICA IDENTITY (PK por padrão), então `old.status` é sempre `undefined`. Resultado: **qualquer** UPDATE numa avaliação já concluída dispara o toast — não apenas a transição real para "completed".

## Correções

### 1. `src/hooks/useRealtimeNotifications.ts`
Endurecer a checagem de transição para evitar falsos positivos:
- Só disparar o toast "Avaliação concluída" quando `payload.old.status` estiver **presente** (não undefined) **e** for diferente de `"completed"`, **e** `row.status === "completed"`.
- Isso elimina a notificação espúria em qualquer UPDATE sobre rows já completas, vinda de qualquer fluxo (edição de cadastro, reavaliação, ajustes manuais etc.).

### 2. `src/components/dashboard/AddPatientModal.tsx` (handleSave, ramo `isEdit`)
- Só executar o `UPDATE` em `assessments` / `professional_appointments` se **realmente houve mudança** em `full_name` ou `email`. Comparar com os valores originais de `editPatient.full_name` / `editPatient.email`.
- Quando nada mudou nesses dois campos, **não tocar** em `assessments` nem em `professional_appointments` — apenas atualizar a linha do paciente.
- Esta mudança é defensiva (reduz writes desnecessários e eventos Realtime) e complementa a correção no listener.

### 3. Verificação
Após editar:
- Salvar sem alterar nome/email → nenhum toast espúrio (correção 2 evita o UPDATE; correção 1 garante segurança caso outro fluxo dispare).
- Salvar alterando nome → toasts de "concluída" continuam **não** disparando (correção 1), mas os registros relacionados são atualizados corretamente.
- Concluir uma avaliação de verdade (status passa de pending → completed) → toast continua funcionando normalmente, pois `old.status` virá como `"pending"` (já presente nos eventos legítimos de transição, e ainda que viesse `undefined` por replica identity, deixamos passar somente quando explicitamente diferente — ver nota técnica).

## Nota técnica sobre o listener

A regra final será:
```ts
const oldStatus = oldRow?.status;
const becameCompleted =
  oldStatus !== undefined &&
  oldStatus !== "completed" &&
  row.status === "completed";
```
Se quisermos suportar também o caso em que a REPLICA IDENTITY não envia `old.status` mas a transição é real, a alternativa seria ativar `REPLICA IDENTITY FULL` em `assessments`. **Não** vou propor essa mudança de schema agora porque (a) aumenta payload do Realtime para todas as outras telas, e (b) a transição "completed" no app já é acompanhada por outras rotas (a tela do profissional faz refetch quando o paciente envia). Mantemos a checagem estrita no client — sem falsos positivos é melhor que toast duplicado.

## Arquivos a editar
- `src/hooks/useRealtimeNotifications.ts` — endurecer condição `becameCompleted`.
- `src/components/dashboard/AddPatientModal.tsx` — condicionar UPDATE de `assessments` / `professional_appointments` a mudança real de nome/email.

Nenhuma migração de banco necessária.