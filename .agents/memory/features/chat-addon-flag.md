---
name: Chat Addon Flag
description: Card de venda do "Chat do Agente — Mensal" (R$14,90/150 msgs) fica oculto até o enforcement do chat entrar em vigor
type: feature
---

`ENABLE_CHAT_ADDON` em `src/lib/featureFlags.ts` está **false**.

Motivo: o card de assinatura do Chat do Agente (R$ 14,90/mês, 150 msgs) em `AiCreditsStore.tsx` estava exposto a todos os usuários, mas o bloqueio/limite real de mensagens do chat ainda não está em vigor. Vender antes disso gera dúvida ("estou pagando pelo quê?").

**Quando virar para `true`:** no MESMO deploy em que o enforcement do chat do agente for ligado (contagem `ln_msgs_used` bloqueando de fato ao atingir a cota, junto com o soft-block de créditos da Fase 5.4). Nunca antes.

Backend já pronto e mantido: `create-chat-addon-checkout`, webhook Stripe (`type: "ln"`), campos `ln_*` em `profiles`, consumo em `clinical-agent-chat`. Não remover — só a UI está oculta.
