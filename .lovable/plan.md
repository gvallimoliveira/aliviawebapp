

# Plano: Videochamada no Chat (com feature flag desativada)

## Visão Geral

Adicionar um botão de videochamada no header do ChatWindow que permite chamadas de vídeo P2P entre paciente e fisioterapeuta usando WebRTC. A funcionalidade ficará completamente implementada mas escondida atrás de uma feature flag (`ENABLE_VIDEO_CALL = false`).

## Arquitetura Técnica

```text
┌─────────────┐     Supabase Realtime     ┌─────────────┐
│  Usuário A   │◄──── (signaling channel) ────►│  Usuário B   │
│  (browser)   │                               │  (browser)   │
│              │◄──── WebRTC P2P stream ──────►│              │
└─────────────┘      (video + audio)           └─────────────┘
```

**Sinalização via Supabase Realtime Broadcast** — sem necessidade de servidor TURN/STUN próprio. Usaremos servidores STUN públicos do Google (`stun:stun.l.google.com:19302`) + um TURN gratuito de fallback (Metered.ca free tier ou similar configurável).

## Componentes e Arquivos

### 1. Feature Flag
- **`src/lib/featureFlags.ts`** — arquivo simples com `export const ENABLE_VIDEO_CALL = false;`
- Todos os pontos de entrada da UI verificam esse flag antes de renderizar

### 2. Hook `useVideoCall`
- **`src/hooks/useVideoCall.ts`**
- Gerencia todo o ciclo WebRTC: criar offer, receber answer, trocar ICE candidates
- Sinalização via `supabase.channel(`video-${conversationId}`).send()` (Broadcast)
- Estados: `idle` → `calling` → `ringing` → `connected` → `ended`
- Controles: `startCall()`, `acceptCall()`, `rejectCall()`, `endCall()`, `toggleMute()`, `toggleCamera()`
- Cleanup automático ao desmontar (fecha streams, remove peer connection)
- Timeout de 60s para chamada sem resposta (auto-cancela)

### 3. Componente `VideoCallOverlay`
- **`src/components/chat/VideoCallOverlay.tsx`**
- Overlay fullscreen (mobile-first) com:
  - Vídeo remoto em tela cheia
  - Vídeo local em PiP (picture-in-picture, canto inferior direito, arrastável)
  - Barra de controles: mute microfone, ligar/desligar câmera, encerrar chamada
  - Timer de duração da chamada
  - Indicador de estado (chamando, tocando, conectado)

### 4. Componente `IncomingCallModal`
- **`src/components/chat/IncomingCallModal.tsx`**
- Dialog modal quando recebe chamada: nome do outro, botões Aceitar (verde) e Recusar (vermelho)
- Vibração do dispositivo (Navigator.vibrate) se disponível
- Som de toque via Web Audio API (tom simples, sem arquivo externo)

### 5. Integração no `ChatWindow`
- Botão de vídeo (ícone `Video`) no header, ao lado do nome, condicionado ao feature flag
- Ao clicar, inicia o fluxo de chamada via `useVideoCall`

### 6. Listener global de chamadas recebidas
- **`src/components/chat/VideoCallListener.tsx`**
- Montado no `ConversationList` — escuta broadcast em todas as conversas ativas
- Exibe `IncomingCallModal` quando recebe sinal de chamada

### 7. Traduções
- Chaves adicionadas em `pt.json`, `en.json`, `es.json`:
  - `chat.video_call`, `chat.video_calling`, `chat.video_ringing`, `chat.video_connected`
  - `chat.video_ended`, `chat.video_accept`, `chat.video_reject`, `chat.video_end`
  - `chat.video_mute`, `chat.video_unmute`, `chat.video_camera_on`, `chat.video_camera_off`
  - `chat.video_no_answer`, `chat.video_busy`, `chat.video_permission_denied`

## Detalhes de Implementação

### Sinalização (sem tabela extra)
Usaremos **Supabase Realtime Broadcast** (ephemeral, sem persistência) para trocar SDP offers/answers e ICE candidates. Não precisa de tabela nova nem migration.

```typescript
// Enviar sinal
channel.send({ type: "broadcast", event: "webrtc-signal", payload: { type: "offer", sdp, from: userId } });

// Receber sinal
channel.on("broadcast", { event: "webrtc-signal" }, (payload) => { ... });
```

### Permissões de mídia
- Solicitar `getUserMedia({ video: true, audio: true })` apenas ao iniciar/aceitar chamada
- Tratar erros de permissão com mensagem amigável (toast)
- Fallback: se câmera negada, permitir chamada só com áudio

### Compatibilidade mobile
- Funciona em Safari iOS 14.5+, Chrome Android, navegadores modernos
- Layout responsivo: overlay adapta para viewport pequeno
- Prevenir scroll do body durante chamada ativa

### Segurança
- Broadcast só funciona para participantes autenticados no channel
- Verificação de `is_conversation_participant` implícita pelo contexto (usuário já está no chat)
- Nenhum dado de vídeo passa pelo servidor — é P2P direto

## O que NÃO será feito
- Gravação de chamadas
- Chamadas em grupo
- Compartilhamento de tela
- TURN server próprio (usa STUN público por enquanto)

## Ordem de Implementação
1. Criar `featureFlags.ts`
2. Criar hook `useVideoCall`
3. Criar `IncomingCallModal`
4. Criar `VideoCallOverlay`
5. Criar `VideoCallListener`
6. Integrar botão no `ChatWindow`
7. Montar listener no `ConversationList`
8. Adicionar traduções (pt, en, es)

