

## Separação de Acesso: Pro ≠ Premium no painel "Minha Saúde"

### Problema

Hoje, `verify-payment` verifica apenas pagamentos B2C (Premium mensal/avulso). O profissional com plano Pro (mensal R$49 ou anual R$418,80) **não** ganha `has_access: true` via `verify-payment` — portanto o Diário de Dor e Comparação de Métricas já ficam ocultos corretamente para ele.

Porém, há pontos onde o status de profissional "vaza" benefícios no painel de cliente:

1. **`QuickActions`** recebe `hasPremiumAccess` mas também `hasProfessional` — usado apenas para esconder o CTA de registro. Não há vazamento aqui.

2. **`UpgradeBanner`** — sem vazamento direto, depende só de `premiumAccess`.

3. **`WelcomeSection`** — recebe `professional` e `premiumAccess`, pode exibir badges que confundem (ex: mostrar badge "Pro" junto com status de cliente básico sem distinção clara).

### Verificação real do bug

O fluxo atual **já segrega corretamente** na maioria dos casos porque `verify-payment` consulta apenas o produto Premium B2C (`prod_U9PZeaM93PlMwb`) no Stripe. Um profissional com Pro (`prod_U5dB77Y8adgxGf`) **não** recebe `has_access: true`.

**Mas há um cenário de vazamento**: se o profissional é VIP (está na tabela `vip_users`), recebe acesso total tanto no painel profissional quanto no cliente — isso é intencional (admin/VIP).

### O que precisa ser verificado/corrigido

O risco real está em: **o profissional com Pro ativo pode achar que tem Premium** por causa da UX — badges, textos. Preciso verificar `WelcomeSection` para confirmar.

### Alterações

**1. `src/components/dashboard/WelcomeSection.tsx`** — Garantir que o badge exibido no painel "Minha Saúde" reflita apenas o status de pagamento B2C. Se o usuário é profissional Pro mas não pagou Premium, mostrar badge "Básico" (não "Pro").

**2. `src/pages/Dashboard.tsx`** — Já correto: Diário de Dor e Comparação exigem `premiumAccess?.has_access && subscription_type === "monthly"`. Nenhuma mudança necessária.

**3. Revisão de `WelcomeSection`** — Separar visualmente: badge Pro aparece apenas na aba Profissional, badge Premium/Básico aparece na aba Minha Saúde.

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/WelcomeSection.tsx` | Separar badges Pro vs Premium — Pro badge só na aba profissional |
| `src/pages/Dashboard.tsx` | Passar flag para WelcomeSection indicando contexto (já está ok, apenas confirmar) |

### Escopo mínimo

A arquitetura já está correta na lógica de acesso. A correção é **cosmética/UX**: garantir que o usuário Pro não veja badges ou textos que sugiram que tem Premium no painel de cliente.

