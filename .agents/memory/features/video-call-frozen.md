---
name: Video Call Flow Frozen
description: Fluxo de videochamada (signaling durável + retry automático) está congelado; só alterar sob pedido direto do usuário.
type: constraint
---

**Status: CONGELADO (validado e funcionando em produção).**

Não alterar, refatorar, "otimizar" ou reescrever nada abaixo sem pedido **direto e explícito** do usuário:

- `src/contexts/VideoCallContext.tsx` — signaling idempotente, `processingSignalsRef`,
  `appliedOfferSdpRef` / `appliedAnswerSdpRef`, polling de SDP (1s), guards de ICE gathering,
  `attemptAutoRetry` + sinal `call-renegotiate`, `MAX_CONNECT_RETRIES = 2`,
  `CONNECTION_TIMEOUT_MS = 30_000`, `DISCONNECT_GRACE_MS = 6_000`, `isCallerRef`, `joinCallFromPush`.
- Tabela `video_call_sessions` (incl. `offer_sdp`, `answer_sdp`, `expires_at` 90s) e transições
  monotônicas de status na edge function `video-call-session`.
- Trigger `trg_push_video_call_ringing` → `notify-user` com `x-internal-secret`
  (a edge function de chamada NÃO envia push).
- Payload mínimo do push no service worker (`public/sw-push.js`) por compatibilidade iOS.

Se uma tarefa parecer exigir mudança aqui, **avisar o usuário e pedir autorização antes**.
