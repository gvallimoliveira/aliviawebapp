
Objetivo: reestruturar a videochamada para que dois aparelhos realmente entrem na mesma sessão, recebam o aviso de chamada corretamente e consigam transmitir áudio/vídeo com estabilidade.

1. Corrigir a arquitetura da chamada
- Substituir o fluxo dividido atual entre `useVideoCall` e `VideoCallListener` por uma única camada de controle da chamada.
- Centralizar em um único controlador por conversa:
  - canal realtime
  - estado da chamada
  - `RTCPeerConnection`
  - stream local/remoto
  - timeout
  - limpeza
- Fazer o modal de chamada recebida e a tela de chamada ativa consumirem esse mesmo controlador, eliminando competição entre dois fluxos diferentes.

2. Corrigir os pontos que hoje impedem a conexão
- Remover a marcação prematura de “connected” no lado que inicia a chamada; só considerar conectada após `answer` aplicado e conexão WebRTC realmente estabelecida.
- Corrigir o buffer de ICE candidates nos dois lados:
  - hoje o caller acumula candidatos antes do `remoteDescription`
  - mas não faz o flush completo depois que recebe a `answer`
- Garantir que ofertas, respostas e ICE sejam ignorados se forem de chamadas antigas usando um `callId` único por tentativa.
- Ajustar o listener para não depender de closures desatualizadas de estado (`isRinging`, `callState`), evitando comportamento inconsistente entre toques, aceites e encerramentos.

3. Corrigir o fluxo de permissão e câmera
- Manter a obtenção de mídia dentro do gesto direto do usuário.
- Reaproveitar corretamente o stream aprovado na pré-chamada quando possível, em vez de destruir e recriar de forma frágil.
- Adicionar tratamento robusto para:
  - câmera disponível
  - apenas áudio
  - permissão negada
  - câmera ocupada por outro app
  - preview preto mesmo com permissão concedida
- Forçar `video.play()` após `srcObject` e `onloadedmetadata` para melhorar compatibilidade em mobile.
- Resetar completamente streams e tracks entre tentativas para não deixar vídeo remoto/local “preso” ou preto.

4. Corrigir a exibição do aviso de chamada recebida
- Garantir que o evento `call-request` abra o modal mesmo fora da conversa já expandida.
- Navegar para a conversa correta apenas após o aceite, sem quebrar o contexto da chamada.
- Exibir estados distintos:
  - recebendo chamada
  - conectando
  - conectada
  - encerrada
  - falha de conexão

5. Adicionar fallback real para redes diferentes
- O código atual usa apenas STUN, o que costuma falhar entre aparelhos em redes móveis/NAT diferentes.
- Adicionar servidor de relay (TURN) como fallback para permitir conexão real entre aparelhos em cenários fora da mesma rede.
- Manter STUN para casos simples e usar TURN quando necessário.

6. Melhorar a resiliência do encerramento e novas tentativas
- Encerrar sem deixar canais órfãos, timers ativos ou peer connections antigas.
- Permitir nova chamada logo após falha/recusa/timeout sem precisar recarregar a página.
- Evitar mensagens duplicadas de “encerrada” e limpar corretamente o estado visual em ambos os aparelhos.

7. Validar ponta a ponta antes de publicar
- Testar nos dois sentidos:
  - aparelho A liga para B
  - aparelho B liga para A
- Testar:
  - mesma rede
  - redes diferentes
  - aceitar
  - recusar
  - timeout
  - áudio sem câmera
  - app em foreground/background
  - repetidas chamadas seguidas
- Confirmar:
  - modal de chamada aparece
  - preview local aparece nos dois aparelhos
  - vídeo remoto aparece
  - áudio trafega
  - encerramento sincroniza
  - retry funciona sem tela preta

Detalhes técnicos
- Arquivos principais a reestruturar:
  - `src/hooks/useVideoCall.ts`
  - `src/components/chat/VideoCallListener.tsx`
  - `src/components/chat/PreCallScreen.tsx`
  - `src/components/chat/VideoCallOverlay.tsx`
  - `src/components/chat/ChatWindow.tsx`
  - `src/pages/Dashboard.tsx`
- Ajustes principais de engenharia:
  - estado único da chamada
  - `callId` por sessão
  - flush de ICE pendente após `setRemoteDescription`
  - transição para “connected” baseada em `connectionState`/`iceConnectionState`
  - limpeza forte de stream, tracks, peer connection e canal
  - fallback TURN para redes difíceis

Resultado esperado
- O aparelho receptor passa a ver o aviso de chamada.
- Os dois aparelhos entram na mesma sessão ao aceitar.
- Áudio e vídeo passam a circular de forma confiável.
- Tentativas seguintes deixam de quebrar com tela preta ou chamada “fantasma”.
