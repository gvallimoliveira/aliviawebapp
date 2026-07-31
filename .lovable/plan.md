## Situação hoje (verificada)

- A edge function `customer-portal` já existe e abre o portal Stripe, mas hoje só é chamada do painel PRO (`useProSubscription`) — não há nada em **Minha Conta**. A Rita não tem, nesse momento, um lugar claro para ver ou cancelar a própria assinatura.
- `check-pro-subscription` já devolve status, parceiro/VIP e datas — dá para exibir ao usuário sem novo backend de leitura.
- O `stripe-webhook` já trata `customer.subscription.updated` / `.deleted` e `invoice.*`, mas só dispara `notify-admin` para `stripe_sale` e `stripe_refund`. Cancelamentos e mudanças de plano **não** te avisam hoje.
- `Minha Conta` (368 linhas) é uma pilha plana de cards: Perfil, Notificações, Preferências, Senha, Assinatura digital, Acesso estudante, Desempenho acadêmico, Privacidade, Passkey, Tour. Sem agrupamento.

## O que será feito

### 1. Card "Minha assinatura" (autogestão)
Novo `src/components/account/SubscriptionCard.tsx`, exibido para quem tem assinatura própria (PRO mensal/anual, Premium, Clínica dono):
- Plano atual, valor, status (ativa / cancelamento agendado / inadimplente / cortesia-parceiro), próxima cobrança ou fim de acesso.
- Botão **Gerenciar pagamento** → `customer-portal` (troca de cartão, faturas, recibos).
- Botão **Cancelar assinatura** com diálogo de confirmação em 2 passos (digitar/confirmar + motivo opcional) → agenda cancelamento ao fim do período (mantém acesso pago até a data), nunca corta acesso já pago.
- Botão **Mudar para anual** (upgrade) quando estiver no mensal, mostrando economia; confirmação antes.
- Parceiros/VIP/estudantes-cortesia veem um estado informativo sem botões de cobrança.

Backend: nova função `manage-my-subscription` (só age sobre a assinatura do próprio usuário autenticado, ações permitidas: `cancel_at_period_end`, `resume` (desfazer cancelamento) e `switch_to_annual`). Toda ação registrada em `subscription_admin_actions` com `performed_by` = próprio usuário, para aparecer na mesma auditoria que você já lê no Admin.

### 2. Aviso imediato para você + painel Admin atualizado
- `manage-my-subscription` chama `notify-admin` na hora (e-mail/Telegram/push) com evento `subscription_self_service` — cancelamento, retomada ou upgrade.
- `stripe-webhook`: adicionar `notify-admin` em `customer.subscription.updated` (quando entra/sai `cancel_at_period_end` ou muda de preço) e em `customer.subscription.deleted`, além de `invoice.payment_failed`, para cobrir também mudanças feitas direto no portal Stripe.
- O `SubscriptionAdminDialog` já lê o estado ao vivo do Stripe, então seu painel reflete a mudança automaticamente; adiciono na lista de assinaturas o destaque de "cancelamento solicitado pelo usuário em <data>" a partir da auditoria.

### 3. Reorganização de "Minha Conta" em seções
Manter os mesmos cards, apenas agrupados com subtítulos e um índice de âncoras no topo (mobile-first, sem mudar comportamento):
1. **Conta** — Perfil, Senha, Passkey
2. **Assinatura e cobrança** — novo card de assinatura, créditos/faturas
3. **Notificações** — dispositivo + preferências
4. **Perfil profissional** — assinatura digital, acesso estudante, desempenho acadêmico
5. **Privacidade e dados** — PrivacyRightsCard
6. **Ajuda** — tour, versão do app

## Detalhes técnicos
- `SubscriptionCard` consome `check-pro-subscription` (e `check-clinic-subscription` quando o usuário é dono de clínica) para status, e `manage-my-subscription` para ações.
- `manage-my-subscription` valida JWT, resolve o customer Stripe pelo e-mail do próprio usuário, e recusa qualquer `subscription_id` que não pertença a esse customer.
- Downgrade/cancelamento nunca altera flags de acesso direto: o status do app continua vindo do webhook, evitando divergência.
- Textos em pt/en (padrão atual da página).

## Pendência anotada (LGPD)
Registro em memória, sem implementar agora: banner de cookies, consentimento versionado nos cadastros de profissional/clínica, fila de pedidos LGPD no Admin com prazo de 15 dias, retenção/expurgo automático e link de privacidade nos e-mails transacionais.
