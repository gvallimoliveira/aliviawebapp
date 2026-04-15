

## Plano: Painel Unificado de Gestão de Parceiros

### Problema atual

O `PartnerManagement.tsx` só controla **acesso profissional** (flag `is_partner` na tabela `professionals`). Falta controle sobre:
- **Acesso Clínica** — criar/ativar assinatura gratuita de clínica para o parceiro
- **Avaliação Premium pessoal** — liberar avaliações premium sem pagamento

O admin precisa entrar em múltiplos lugares para gerenciar isso. O objetivo é ter tudo num único card por parceiro, com toggles visuais.

### O que será feito

#### 1. Nova coluna `premium_granted` na tabela `professionals`
- Adicionar `premium_granted boolean NOT NULL DEFAULT false` via migração
- Quando `true`, o parceiro pode fazer avaliações premium pessoais sem pagar
- O `check-pro-subscription` e o fluxo de pagamento de avaliação já verificam `is_partner`; vamos estender para checar `premium_granted` também

#### 2. Nova action `get_partner_details` na Edge Function `manage-vip-users`
- Retorna para cada parceiro: `id`, `full_name`, `email`, `is_partner`, `premium_granted`, e se possui clínica ativa (join com `clinics` e `clinic_members`)
- Usado para popular o painel com o estado atual de cada toggle

#### 3. Nova action `toggle_partner_access` na Edge Function `manage-vip-users`
- Recebe `{ professional_id, access_type: "pro" | "clinic" | "premium", enabled: boolean }`
- **pro**: atualiza `is_partner` e `subscription_status` (já existe, será refatorado)
- **clinic**: se `enabled`, cria uma clínica com `subscription_status: 'active'` e adiciona o parceiro como owner (se não tiver uma). Se `!enabled`, marca `subscription_status: 'inactive'`
- **premium**: atualiza `premium_granted` no registro do profissional

#### 4. Refatorar `PartnerManagement.tsx` → painel com toggles
- Cada parceiro aparece como um card/row com **3 switches**:
  - 🩺 **PRO** — acesso profissional (is_partner)
  - 🏥 **Clínica** — plataforma Minha Clínica
  - ⭐ **Premium** — avaliação premium pessoal
- Toggle muda estado instantaneamente com feedback visual (loading spinner no switch)
- Manter o formulário de adicionar parceiro por email no topo

#### 5. Ajustar `check-pro-subscription` e fluxo de pagamento
- No `check-pro-subscription`, adicionar verificação de `premium_granted` para retornar flag ao frontend
- No fluxo de criação de avaliação premium, se o usuário tem `premium_granted: true`, pular pagamento

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| **Nova migração SQL** | Adiciona coluna `premium_granted` em `professionals` |
| **`manage-vip-users/index.ts`** | Novas actions `get_partner_details` e `toggle_partner_access` |
| **`check-pro-subscription/index.ts`** | Verificar `premium_granted` |
| **`PartnerManagement.tsx`** | Redesign completo com 3 switches por parceiro |
| **Fluxo de pagamento de avaliação** | Bypass quando `premium_granted = true` |

### Detalhes técnicos

```text
┌─────────────────────────────────────────────────┐
│  Parceiros — Acesso Gratuito                    │
├─────────────────────────────────────────────────┤
│  [Email do parceiro]          [+ Adicionar]     │
├─────────────────────────────────────────────────┤
│  João Silva (joao@ex.com)                       │
│  🩺 PRO [ON]  🏥 Clínica [OFF]  ⭐ Premium [ON]│
├─────────────────────────────────────────────────┤
│  Maria Santos (maria@ex.com)                    │
│  🩺 PRO [ON]  🏥 Clínica [ON]   ⭐ Premium [OFF]│
└─────────────────────────────────────────────────┘
```

### Pontos de atenção revisados

1. **Criação de clínica para parceiro**: ao ativar "Clínica", se o parceiro não tem uma clínica, cria automaticamente com nome "Clínica de [Nome]" e status ativo. Isso evita exigir que o parceiro faça o fluxo de cadastro de clínica.
2. **Revogação segura**: ao desativar um toggle, não deleta dados — apenas marca como inativo. Preserva histórico.
3. **Sem migração destrutiva**: `premium_granted` tem default `false`, não quebra dados existentes.
4. **RLS**: a coluna `premium_granted` está na tabela `professionals`, que já tem RLS adequado. A edge function usa service role, sem problema.

