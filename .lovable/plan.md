## Diagnóstico

O que falta é só o "handshake" final quando o destinatário entra pela notificação — nada do caminho de push precisa mudar.

Sequência real (confirmada lendo `src/contexts/VideoCallContext.tsx`):

1. Quem liga entra em `state = "calling"` e arma um timer de **45s** (`CALL_TIMEOUT_MS`), enquanto o convite no banco vale **90s** (`expires_at` em `supabase/functions/video-call-session/index.ts`).
2. Abrir o app pelo push no celular (boot do PWA + tocar em atender) leva facilmente mais de 45s.
3. Aos 45s o lado do chamador dispara `endCallInternal(true)`: fecha o vídeo dele, manda `call-end` e grava "Videochamada não atendida" no chat.
4. A Aline atende depois disso: o app dela abre a tela da chamada, envia `call-accept`, mas ninguém mais responde com a `offer`. Aos 30s o `startConnectionTimeout` dela grava **"Falha ao conectar a videochamada"** no chat — exatamente a falha que você viu.
5. Além disso, o chamador só reage ao `call-accept` via broadcast. Se o broadcast chegar num momento ruim (canal recém-inscrito, app em background no iOS), o "aceite" se perde mesmo dentro do prazo — hoje não existe caminho alternativo pelo banco.

Com os dois apps abertos isso nunca aparecia porque o aceite acontece em 2–5s.

## Correção proposta (escopo restrito ao momento de atender)

Arquivo: `src/contexts/VideoCallContext.tsx` (nenhuma mudança em push, service worker, triggers ou edge functions de notificação).

1. **Alinhar o tempo de espera do chamador ao convite durável**
   - `CALL_TIMEOUT_MS` de 45s → 90s, igual ao `expires_at` da sessão.
   - Antes de desistir, reconsultar a linha em `video_call_sessions`: se o status já for `accepted`/`connecting`, não encerrar — continuar aguardando a negociação.

2. **Segundo caminho para o aceite (via banco, não só broadcast)**
   - Extrair a lógica hoje embutida no `case "call-accept"` para uma função única `beginCallerNegotiation(convId, callId, otherName)` — mídia local, `createPeerConnection`, `createOffer`, `setLocalDescription`, envio da `offer`.
   - Proteger com um guard idempotente (`negotiationStartedRef`) para que broadcast e banco não gerem duas offers.
   - No listener de `postgres_changes` que já existe para `video_call_sessions`: se `call.id === callIdRef.current`, `status === "accepted"` e o estado local for `calling`, chamar a mesma `beginCallerNegotiation`. Assim o aceite chega mesmo que o broadcast falhe.

3. **Reenvio do aceite pelo lado de quem atende**
   - Ao atender sem offer bufferizada, além de mandar `call-accept`, reenviar `call-accept` uma vez após ~3s se a `offer` ainda não tiver chegado (o `updatePersistedCall("accepted")` já grava o estado durável, então o reenvio é só sinalização).

4. **Não mais mensagem de "falha" quando a chamada já foi encerrada**
   - No `handleAcceptCall`, checar o status atual da sessão antes de pedir câmera/microfone: se estiver `ended`/`missed`/`rejected`/`failed` ou expirado, mostrar toast "A chamada não está mais ativa", voltar para idle e **não** gravar mensagem de falha no chat.
   - No `startConnectionTimeout`, quando a sessão já estiver terminal, encerrar silenciosamente em vez de escrever "Falha ao conectar a videochamada".

5. **Manter tudo o que já funciona**
   - Sem alteração em `joinCallFromPush`, `call-ready`, `presentPersistedIncomingCall`, `public/sw-push.js`, `notify-user` e triggers do banco.

## Validação

- Verificar em `video_call_sessions` a progressão `ringing → accepted → connected` na próxima chamada de teste.
- Conferir nos logs do console (`[VideoCall][Caller] createOffer OK`, `[VideoCall][Receiver] answer sent OK`) que a negociação ocorre depois do aceite vindo pela notificação.
- Confirmar que nenhuma mensagem "Falha ao conectar" é gravada no chat nos casos de chamada já encerrada.
