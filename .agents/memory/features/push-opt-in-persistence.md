---
name: Push Opt-In Persistence
description: Autorização de push é sticky (flag push_opt_in_enabled_v1) e se auto-restaura após updates; só o opt-out manual desativa.
type: feature
---

Uma vez que o usuário ativa notificações, o estado é **permanente até desativação manual**:

- Flag sticky em `localStorage`: `push_opt_in_enabled_v1` (gravada em `subscribe`,
  removida **apenas** em `unsubscribe`).
- `healPushSubscription(userId)` em `src/hooks/usePushNotifications.ts`:
  re-registra `/sw-push.js`, re-inscreve se o browser dropou a subscription
  (ou se ficou stale por rotação de VAPID) e faz upsert em `push_subscriptions`.
  Nunca abre prompt — só roda com `Notification.permission === "granted"` + flag ativa.
- `src/components/PushSubscriptionKeeper.tsx` está montado no `App.tsx` e roda o heal
  no boot e a cada retorno ao foreground (`visibilitychange`).

Motivo: deploys/limpeza de cache/SW faziam a autorização "sumir" e exigiam reativação manual.
Não remover o keeper nem limpar a flag em rotinas de cache/cleanup.
