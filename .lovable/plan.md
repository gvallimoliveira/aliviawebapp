## Diagnóstico confirmado

Os registros das tentativas de **14:02–14:05 UTC** mostram que a primeira chamada não falhou antes de conectar: os dois aparelhos registraram **“Videochamada iniciada”**, a sessão recebeu `connected_at`, e cerca de 1–2 segundos depois o lado chamador gravou **“Falha ao conectar a videochamada”** e encerrou a sessão. A segunda tentativa permaneceu ativa até o desligamento manual.

A causa está na concorrência entre os três caminhos que hoje entregam o mesmo SDP: broadcast, evento da sessão e polling a cada segundo. Em `VideoCallContext.tsx`, esses caminhos podem entrar simultaneamente em `handleSignal()` antes de `appliedOfferSdpRef`/`appliedAnswerSdpRef` serem preenchidos. Assim, a mesma oferta/resposta é aplicada duas vezes ao `RTCPeerConnection`; a segunda aplicação pode lançar erro de estado mesmo depois da conexão ter sido estabelecida, e o `catch` atual encerra a chamada como falha. Isso explica precisamente a conexão por 2 segundos seguida de queda na primeira tentativa.

Há ainda uma regressão de estado no backend: ao persistir uma oferta ou resposta, `video-call-session` força a sessão para `connecting` mesmo se ela já estiver `connected`. Isso permite que uma atualização atrasada faça o estado durável andar para trás e alimente novamente os caminhos de recuperação.

No fluxo vindo da notificação, a evidência disponível confirma uma corrida de inicialização, mas não identifica sozinha qual requisição falhou. A correção será acompanhada de telemetria técnica por etapa para tornar esse caminho determinístico sem alterar push, notificação ou popup.

## Implementação

1. **Serializar oferta e resposta por chamada**
   - Criar travas de processamento por `callId + tipo + SDP` antes do primeiro `await`.
   - Fazer broadcast, evento da sessão e polling compartilharem a mesma operação idempotente em vez de iniciarem negociações paralelas.
   - Marcar SDP como recebido/em processamento imediatamente e como aplicado apenas após sucesso; liberar a trava somente quando for seguro tentar novamente.

2. **Tornar a máquina de estados monotônica**
   - Impedir `connected → connecting` na função `video-call-session`.
   - Rejeitar atualizações atrasadas de uma sessão terminal e preservar os timestamps existentes.
   - No cliente, ignorar eventos duráveis atrasados que representem regressão do estado local.

3. **Não derrubar uma chamada saudável por duplicata tardia**
   - Tratar SDP idêntico, `InvalidStateError` por descrição já aplicada e sinais antigos como duplicatas benignas.
   - Antes de encerrar em um erro de negociação, verificar `connectionState`, `iceConnectionState`, `connectedOnceRef` e o estado durável.
   - Se a chamada já conectou, manter a mídia e registrar apenas diagnóstico técnico; encerrar somente por falha real persistente após a janela de recuperação.

4. **Fortalecer a primeira abertura via notificação**
   - Tornar `joinCallFromPush` reexecutável quando a sessão/auth ainda estiver hidratando, sem deixar `joinedFromPushRef` bloquear uma nova tentativa válida.
   - Desabilitar o botão Atender durante uma única operação e tornar o aceite idempotente no backend.
   - Aguardar sessão ativa, canal e mídia em etapas independentes; uma indisponibilidade transitória não fechará o popup nem encerrará a chamada.
   - Manter intactos o trigger, push, service worker, link da notificação e fluxo anterior ao aceite.

5. **Adicionar telemetria útil sem poluir o chat**
   - Registrar por `callId`, participante, etapa, origem do sinal (`broadcast`, evento ou polling), estados WebRTC e motivo de encerramento.
   - Preencher `failure_reason` somente em falha terminal real.
   - Não criar mensagens de falha no chat para duplicatas, reconexões ou erros transitórios.

## Validação obrigatória

- Testes automatizados com oferta e resposta chegando simultaneamente pelos três caminhos; cada SDP deve ser aplicado uma única vez.
- Teste de atualização atrasada comprovando que uma sessão `connected` nunca volta a `connecting`.
- Teste de `InvalidStateError` duplicado após conexão comprovando que a chamada permanece ativa.
- Teste de partida fria via notificação com hidratação atrasada, aceite único e recuperação do canal.
- Teste em dois contextos de navegador com mídia simulada: primeira chamada deve percorrer `ringing → accepted → connecting → connected` e permanecer ativa até desligamento explícito.
- Conferência final no banco e chat: `connected_at` preenchido, `failure_reason` vazio em sucesso e nenhuma mensagem de falha/encerramento automático.