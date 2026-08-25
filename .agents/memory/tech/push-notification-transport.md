---
name: Push Notification Transport
description: Todo push disparado por trigger do banco deve usar notify-user com x-internal-secret; anon key em http_post retorna 401.
type: constraint
---

**Regra:** gatilhos de banco (`net.http_post`) NUNCA devem chamar `send-push-notification` com a anon key
no `Authorization`/`apikey`. Esse caminho retornou **HTTP 401 `{"error":"Unauthorized"}`** (a anon key é
tratada como JWT de usuário inválido), matando silenciosamente as notificações de chat e videochamada.

**Padrão correto:** o gatilho chama a edge function `notify-user` com header
`x-internal-secret` (mesmo segredo `INTERNAL_ALERT_SECRET` usado por `notify-admin`).
`notify-user` reencaminha para `send-push-notification` com a **service role key** e grava
`public.push_delivery_log` (status: sent / no_device / failed, devices, sent, detail).

**Avaliação concluída:** `push_assessment_completed` (trigger em `assessments`) também usa `notify-user`
desde 2026-08-25 (antes chamava `send-push-notification` com anon key → 401 silencioso).
Corpo sempre inclui o nome do paciente; avaliações de clínica notificam todos os `clinic_members` ativos.
O alerta de admin (`notify_admin_new_assessment`) passa `body` explícito com o nome do paciente —
NUNCA depender da ordem das chaves de `fields` (jsonb reordena alfabeticamente/por tamanho).

**Videochamada:** o push é disparado pelo trigger `trg_push_video_call_ringing`
(AFTER INSERT em `video_call_sessions`, status já criado como `ringing`, `expires_at` = 90s).
A edge function `video-call-session` NÃO envia push.

**iOS/Apple Web Push:** payload do service worker deve ser mínimo — sem `actions`,
`requireInteraction`, `renotify` ou `vibrate`; esses campos podem impedir a exibição.

**Diagnóstico:** conferir `public.push_delivery_log` e `net._http_response` (status_code/content).
