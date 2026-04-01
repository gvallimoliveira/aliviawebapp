

# Persistir dados da avaliação básica para pagamentos via boleto

## Problema

Os dados da avaliação básica são armazenados em `sessionStorage` (morre ao fechar aba) e `localStorage` com TTL de 30 minutos. Para boletos, o pagamento pode levar até 3 dias úteis. Quando o webhook confirma o pagamento, o sistema cria uma avaliação premium nova, mas **sem os dados da avaliação básica** (anamnese, regiões de dor, etc.) — o usuário precisaria refazer tudo.

## Solução

Salvar os dados da avaliação básica **no banco de dados** (tabela `assessments`) no momento do checkout, vinculando ao `user_id`. Quando o webhook confirmar o boleto, restaurar esses dados na nova avaliação premium.

## Fluxo proposto

```text
Usuário completa avaliação básica
  ↓
Clica upgrade → UpgradeWelcome → Auth (login/cadastro)
  ↓
Assessment Premium → Paywall → create-payment
  ↓
create-payment salva basic_assessment_data no metadata do Stripe session
  ↓
  ├─ Cartão: paga na hora → fulfillOrder cria assessment premium COM dados básicos
  └─ Boleto: pending → webhook async_payment_succeeded → fulfillOrder cria assessment COM dados
```

## Alterações

### 1. Edge Function `create-payment/index.ts`
- Receber campo opcional `basic_upgrade_data` no body da requisição (JSON com anamnese, pain regions, etc.)
- Salvar esse dado no `metadata` da sessão Stripe (campo `basic_data` — truncado se necessário, Stripe aceita até 500 chars por valor)
- **Alternativa melhor**: Como os dados podem ser grandes demais para metadata do Stripe (limite de 500 chars por campo), salvar os dados numa coluna `pending_upgrade_data` na tabela assessments ou criar um registro temporário

### 2. Migração: adicionar coluna `pending_upgrade_data` na tabela `assessments`
- `pending_upgrade_data jsonb DEFAULT NULL` — armazena temporariamente os dados da básica até o pagamento ser confirmado
- Sem necessidade de nova tabela

### 3. Edge Function `create-payment/index.ts` (ajuste)
- Antes de criar a sessão Stripe, salvar um registro de assessment premium com `payment_status = 'awaiting_payment'` e `pending_upgrade_data = { anamnesis, painRegions, painScore, capturedEmail, capturedName }`
- Incluir o `assessment_id` no metadata da sessão Stripe

### 4. Edge Function `stripe-webhook/index.ts`
- No `fulfillOrder` para `premium_single`/`undefined`: em vez de criar nova assessment do zero, verificar se já existe uma com `payment_status = 'awaiting_payment'` para aquele user
- Se existir, fazer UPDATE para `payment_status = 'paid'` e mover `pending_upgrade_data` para os campos corretos (`anamnesis_data`, `pain_regions`, `pain_score`, etc.)
- Na falha do boleto (`async_payment_failed`): marcar como `payment_failed` ou deletar o registro temporário

### 5. Frontend `src/pages/Assessment.tsx`
- Na função de checkout (paywall), enviar os dados de upgrade junto com a requisição para `create-payment`
- Ao carregar premium com `payment_check`, verificar se existe assessment com `awaiting_payment` que já tem `pending_upgrade_data` e restaurar de lá (em vez de só do localStorage)

### 6. `src/components/assessment/DiagnosisResult.tsx`
- Continuar salvando no localStorage/sessionStorage (para fluxo imediato com cartão)
- Sem mudança nesse arquivo

## Detalhes técnicos

- **Coluna nova**: `pending_upgrade_data jsonb DEFAULT NULL` em `assessments`
- **Estados de payment_status**: adicionar `'awaiting_payment'` ao fluxo existente (`pending` → `awaiting_payment` → `paid` / `payment_failed`)
- **Limpeza**: o registro `awaiting_payment` que nunca é pago pode ser limpo por um cron futuro (baixa prioridade)
- **Tamanho dos dados**: anamnese + pain regions é tipicamente < 10KB, sem problema para jsonb

## Resultado

O usuário que paga via boleto terá seus dados da avaliação básica preservados por tempo indeterminado no banco. Quando o boleto compensar (1-3 dias), o webhook restaura tudo automaticamente e o usuário continua de onde parou nos questionários premium.

