## Diagnóstico confirmado

**Do I know what the issue is? Sim.**

Os registros das tentativas de **13:38, 13:44 e 13:45 UTC** mostram o mesmo padrão: a sessão muda para `accepted`, nunca chega a `connected` e é encerrada entre 6 e 16 segundos depois. As mensagens do anexo são emitidas exclusivamente quando `sendSignal()` devolve `false` ao enviar `call-accept` ou `answer`.

A regressão está em `src/contexts/VideoCallContext.tsx`:

- A versão anteriormente funcional enviava os sinais diretamente pelo canal e deixava a negociação prosseguir.
- A versão atual passou a exigir que o canal armazenado esteja exatamente em `SUBSCRIBED` e trata qualquer falha/timeout de confirmação do envio como encerramento definitivo.
- `createRealtimeChannel()` reutiliza o canal existente mesmo se ele estiver `CLOSED`, `TIMED_OUT` ou `CHANNEL_ERROR`; portanto, `waitForChannelReady()` pode ficar preso a um canal morto.
- Em seguida, `handleAcceptCall()` encerra uma chamada já aceita quando o `call-accept` ou a `answer` não recebe confirmação. Isso explica exatamente “Falha ao confirmar...” e “Falha ao enviar a resposta...”, inclusive com os dois apps abertos.
- O backend respondeu **200** em todas as operações das sessões; logo, a falha não está no convite, no push ou no aceite persistido.

## Correção

1. **Consertar o ciclo de vida do canal Realtime**
   - Recriar o canal quando estiver `CLOSED`, `TIMED_OUT` ou `CHANNEL_ERROR`, em vez de reutilizá-lo indefinidamente.
   - Esperar uma nova assinatura real e registrar transições de status com `callId`, lado da chamada e tipo do sinal.
   - Evitar canais duplicados durante reconexão.

2. **Remover o falso encerramento por confirmação de transporte**
   - Não interpretar a ausência de ACK do broadcast como prova de que o outro aparelho não recebeu o sinal.
   - `call-accept`, `offer` e `answer` terão reenvio idempotente; uma tentativa sem ACK não encerrará imediatamente mídia e sessão.
   - Encerrar apenas por estado terminal persistido, rejeição explícita, expiração ou timeout real da negociação.

3. **Adicionar caminho durável para a negociação WebRTC**
   - Manter o broadcast como caminho rápido.
   - Persistir temporariamente `offer` e `answer` na sessão da chamada por meio da função autenticada existente, com leitura restrita aos dois participantes.
   - Cada lado recuperará o SDP persistido se o broadcast falhar; o guard idempotente impedirá aplicar a mesma descrição duas vezes.
   - Aguardar a coleta ICE necessária antes de persistir o SDP, reduzindo dependência de candidatos efêmeros; manter o envio incremental como otimização.
   - Limpar os dados de negociação ao finalizar a chamada.

4. **Preservar tudo que já funciona**
   - Não alterar push, service worker, triggers, `notify-user`, abertura pelo aviso nem o popup de atender/recusar.
   - Não reativar o `VideoCallListener` legado; somente o `VideoCallProvider` continuará como fonte única.

5. **Impedir poluição do chat**
   - Registrar uma única mensagem final por chamada.
   - Falhas transitórias de transporte ficarão apenas no log técnico; o chat só mostrará falha quando a sessão realmente terminar sem conexão.

## Validação obrigatória

- Teste automatizado do canal em `SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR` e reconexão.
- Teste da perda de `call-accept`, `offer`, `answer` e ACK, comprovando recuperação pelo estado durável.
- Teste com dois contextos de navegador e mídia simulada: chamada deve percorrer `ringing → accepted → connecting → connected` e permanecer ativa até desligamento explícito.
- Verificação final no banco: `accepted_at` e `connected_at` preenchidos, sem mensagem de falha no chat.
- Conferência separada com ambos os apps abertos e com entrada pela notificação, sem mexer no transporte das notificações.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>