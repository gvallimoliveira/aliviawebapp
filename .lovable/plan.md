
Objetivo: corrigir de forma estrutural os 3 problemas que hoje estão se reforçando entre si: o aceite da videochamada no receptor aborta o fluxo, o chat do paciente pode ficar “oculto” mesmo com notificação, e a lista de profissionais não reflete corretamente quem enviou a pré-avaliação.

Diagnóstico consolidado
1. O fluxo do receptor ainda tem um ponto crítico de UI:
- `IncomingCallModal` usa `Dialog` com `onOpenChange={(isOpen) => !isOpen && onReject()}`.
- Ao aceitar a chamada, o estado muda de `ringing` para `connecting`; isso fecha o modal controlado e pode disparar `onReject()` no mesmo ciclo.
- Resultado provável: o receptor entra no aceite, o fluxo é resetado, some a tela de chamada e volta para a aba de mensagens.

2. O aceite ainda navega cedo demais:
- `handleAcceptCall()` chama `onNavigateToChat(convId)` logo após enviar `call-accept`/`answer`, antes de confirmar conexão real.
- Em mobile isso pode mascarar o overlay, re-renderizar a área de mensagens e dar a sensação de “voltou para o início”.

3. O chat invisível no paciente tem causa funcional clara:
- `ConversationList` esconde conversas com `hidden_by_patient = false` como condição obrigatória.
- Se o paciente apagou a conversa, ela pode continuar existindo com novas mensagens/notificações, mas seguir invisível.
- O badge/notificação continua chegando porque o restante do app não trata esse ocultamento de forma consistente.

4. O filtro de profissional a partir do link de pré-avaliação está incompleto:
- No modo paciente, a busca de profissionais para iniciar conversa depende de `assessments.user_id = user.id`.
- Mas a pré-avaliação profissional hoje cria avaliação com `user_id: null` e guarda vínculo por `patient_email`/`patients`.
- Resultado: o paciente que entrou por link do profissional não vê esse profissional corretamente na lista de conversa.

O que será implementado

1. Reestruturar o aceite da videochamada no receptor
- Remover a dependência do fechamento automático do `Dialog` para controlar rejeição.
- Trocar o modal de chamada recebida por uma camada fixa/overlay controlada explicitamente, sem `onOpenChange` disparando `onReject`.
- Separar claramente os estados:
  - `ringing`
  - `accepting_media`
  - `negotiating`
  - `connected`
  - `ended`
- Garantir que “aceitar” só possa ser disparado uma vez por chamada, com trava contra duplo clique e contra reset concorrente.

2. Preservar o gesto do usuário no receptor
- Fazer o caminho de aceite inteiro nascer do clique em “Atender”.
- Criar/preparar mídia e peer connection dentro do fluxo do receptor sem deixar a UI desmontar no meio.
- Se já existir oferta pendente, aplicar `setRemoteDescription -> createAnswer -> setLocalDescription -> send answer` ainda dentro do fluxo preservado.
- Se a oferta ainda não chegou, manter o receptor em estado explícito de negociação aguardando a oferta, sem resetar a sessão.

3. Impedir reset acidental durante o handshake
- Blindar `resetToIdle`, `cleanup` e `endCallInternal` para não interromper uma sessão em aceite se o `callId` atual ainda estiver válido.
- Revisar timers de timeout/desconexão para não matarem a chamada antes de SDP/ICE estarem realmente em fase útil.
- Ignorar eventos tardios de chamadas antigas sem desmontar a chamada atual.

4. Parar de navegar para mensagens antes da conexão
- Remover a navegação imediata em `handleAcceptCall`.
- Só sincronizar a aba/chat quando:
  - a chamada já estiver conectada, ou
  - o usuário tocar manualmente para abrir o chat.
- O overlay da chamada deve permanecer soberano sobre a interface, sem depender da aba de mensagens estar aberta.

5. Tornar o diagnóstico do handshake visível e acionável
- Manter os logs detalhados já iniciados, mas complementar com rastreamento de etapa em memória:
  - mídia adquirida
  - PC criado
  - offer recebida
  - remote description aplicada
  - answer criada
  - local description aplicada
  - answer enviada
  - primeiro ICE remoto
  - primeiro track remoto
  - `iceConnectionState`
  - `connectionState`
- Exibir falha resumida em toast/system message quando o fluxo morrer antes de conectar, para não depender só do console.
- Padronizar prefixos de log entre caller e receiver para facilitar testes futuros.

6. Corrigir o problema de “notifica, mas não mostra o chat”
- Ajustar a lógica de conversa para reaparecer quando houver retomada legítima da conversa.
- Corrigir o reaproveitamento de conversa existente para desocultar os lados corretos.
- Revisar:
  - criação de conversa pelo paciente
  - criação pelo profissional
  - reabertura após conversa apagada
  - recebimento de nova mensagem em conversa escondida
- Unificar o comportamento entre lista, badge de não lidas e navegação por `?conv=` para evitar estado incoerente.

7. Corrigir a origem da lista de profissionais no paciente
- Parar de depender apenas de `assessments.user_id`.
- Criar uma fonte consolidada para o paciente enxergar profissionais relacionados por:
  - avaliações vinculadas ao usuário
  - avaliações/preenchimentos por `patient_email`
  - registros em `patients`
  - conversas já existentes
  - encaminhamentos/referrals quando aplicável
- Assim o profissional que enviou o link de pré-avaliação passa a aparecer para iniciar conversa mesmo se a avaliação original foi criada antes do login.

8. Ajustar backend para suportar o fluxo correto
- Revisar a função `create_conversation_for_patient` para reaproveitar conversa existente sem deixar um dos lados invisível indevidamente.
- Criar ou revisar RPC específica para listar profissionais elegíveis ao paciente com base no vínculo real de pré-avaliação.
- Garantir que o app trate ocultação como preferência de UI, não como bloqueio permanente de retomada.

Arquivos mais prováveis de alteração
- `src/contexts/VideoCallContext.tsx`
- `src/components/chat/IncomingCallModal.tsx`
- `src/components/chat/VideoCallOverlay.tsx`
- `src/components/chat/ConversationList.tsx`
- `src/components/dashboard/MessagesTab.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/ProfessionalSearch.tsx`
- migrations em `supabase/migrations/` para funções de conversa e vínculo paciente-profissional

Validação que será feita
1. Videochamada
- chamada recebida abre interface estável no receptor
- tocar em “Atender” não volta para mensagens
- receptor permanece em tela de negociação
- caller e receiver trocam offer/answer/ICE
- primeiro áudio/vídeo remoto aparece dos dois lados
- segunda chamada após encerrar também funciona

2. Chat
- paciente apaga conversa
- profissional manda mensagem nova
- conversa reaparece corretamente ou pode ser retomada sem “notificação fantasma”
- abrir por `?conv=` realmente seleciona a conversa

3. Filtro/profissional do link
- paciente que veio por link profissional consegue ver o profissional relacionado
- iniciar conversa abre/reaproveita a conversa correta
- não ficam profissionais faltando por causa de `user_id` nulo na avaliação antiga

Detalhes técnicos
- O bug mais crítico hoje não parece ser apenas ICE/TURN; há forte indício de interrupção de estado no receptor antes do handshake terminar.
- O principal candidato é o fechamento controlado do `Dialog` chamando rejeição involuntária.
- Em paralelo, a modelagem atual do paciente para “quem posso conversar” está incompleta para fluxos de pré-avaliação anônima/sem login prévio.
- A correção precisa ser estrutural, não só mais um ajuste pontual no WebRTC.

Resultado esperado
- O receptor não aborta mais ao clicar em atender.
- A videochamada permanece em tela de conexão até negociar ou falhar com motivo claro.
- O chat do paciente volta a aparecer corretamente após retomadas.
- O profissional vinculado ao link de pré-avaliação passa a aparecer corretamente para iniciar conversa.
