## Diagnóstico confirmado do estado atual

- Hoje a chamada nasce apenas na memória do aparelho do remetente e em um broadcast em tempo real (`VideoCallContext.tsx`). Não existe um registro durável de “chamada em andamento” no backend.
- O push também é iniciado pelo navegador de quem liga, depois do broadcast. Se o navegador suspender a tarefa, estiver com código antigo ou a chamada à função falhar, o backend nunca fica sabendo que deveria notificar o destinatário.
- Os dois usuários testados têm uma inscrição Apple Push válida no banco, e a conversa Aline ↔ Guilherme identifica corretamente ambos os participantes.
- Nos logs recentes, o provedor aceitou pushes somente para o endpoint da Aline. Não há evidência equivalente de envio ao endpoint do Guilherme no teste inverso. Portanto, “notificações ativadas” não é o problema central: em pelo menos um sentido, o pedido de push nem completou a cadeia atual.
- O retorno `200` da função não prova entrega: ela também responde `200` quando não encontra dispositivo, quando a categoria está desativada ou quando todos os envios falham. O chamador atual ignora o resultado após duas tentativas e continua mostrando “chamando”.
- O destinatário que abre o PWA depende de o remetente ainda estar online e responder ao sinal `call-ready`; como não há chamada persistida, não é possível recuperar de forma confiável o convite perdido.

## Ajuste definitivo

### 1. Criar uma sessão de chamada durável
Criar uma tabela protegida de sessões de videochamada contendo conversa, identificador único, remetente, destinatário, estado (`ringing`, `accepted`, `connecting`, `connected`, `rejected`, `missed`, `ended`, `failed`), timestamps e motivo de falha.

Somente participantes da conversa poderão visualizar ou alterar a sessão correspondente. O backend validará remetente e destinatário, sem confiar em IDs enviados pelo cliente.

### 2. Tornar o backend responsável por iniciar e notificar
Criar uma função única de início de chamada que, em uma operação controlada:

1. valida autenticação e participação na conversa;
2. resolve exatamente o outro participante;
3. cria a sessão `ringing`;
4. procura todos os dispositivos ativos do destinatário;
5. envia o push de alta prioridade com o ID durável da chamada;
6. grava quantidade enviada, falhas e endpoints expirados;
7. devolve ao remetente um resultado inequívoco.

O frontend não chamará mais diretamente a função genérica de push para iniciar chamadas.

### 3. Recuperar a chamada com o app aberto, minimizado ou fechado
O destinatário receberá o convite por três caminhos convergentes para a mesma sessão:

- atualização em tempo real da nova sessão quando o app estiver aberto;
- push quando estiver minimizado/fechado;
- consulta de chamada pendente ao iniciar ou retomar o PWA, cobrindo push atrasado, clique perdido e reinício do iOS.

O service worker abrirá uma URL com apenas o ID da chamada. Após autenticar, o app consultará o backend, confirmará que a chamada ainda está `ringing` e então exibirá Atender/Recusar. Não dependerá de um broadcast antigo nem de o remetente “reanunciar” a chamada.

### 4. Sincronizar aceite e WebRTC pela sessão
Atender/recusar/finalizar atualizará primeiro a sessão no backend. O realtime da sessão avisará imediatamente o outro lado. O WebRTC continuará usando o canal em tempo real para SDP/ICE, mas somente depois de ambos reconhecerem a mesma sessão e o mesmo `callId`.

Manteremos o TURN já configurado, porém separando claramente:

```text
Convite e estado: backend durável
Aviso ao aparelho: Apple/Android Web Push
Negociação de áudio/vídeo: realtime + WebRTC
```

Assim uma falha de push não apaga a chamada, e uma perda de broadcast não impede sua recuperação.

### 5. Eliminar espera indefinida e mostrar estados verdadeiros
- Se nenhum dispositivo estiver registrado ou nenhum push for aceito, informar ao remetente imediatamente, mantendo uma curta janela apenas se o destinatário estiver online no app.
- Aplicar expiração autoritativa no backend (por exemplo, 45 segundos), marcando `missed` e encerrando ambos os lados.
- Mostrar ao remetente estados reais: “Notificando…”, “Chamando”, “Atendida — conectando”, “Não atendida”, “Destinatário sem notificações disponíveis” ou “Falha ao entregar”.
- Cancelar a notificação pelo mesmo ID ao atender, recusar, expirar ou desligar.

### 6. Observabilidade e autocorreção
- Registrar por chamada: destinatário resolvido, dispositivos encontrados, resposta de cada provedor, aceite, conexão e encerramento — sem armazenar conteúdo clínico.
- Tratar `sent: 0` e erros por endpoint como falha real, não como sucesso HTTP genérico.
- Remover inscrições expiradas e atualizar a data de último uso/último sucesso de cada dispositivo.
- Exibir em “Minha Conta” um teste de notificação do aparelho atual e um estado verificável (“registrado e testado”), em vez de confiar apenas na permissão do navegador.

## Validação obrigatória antes de concluir

1. Teste automatizado da resolução Aline → Guilherme e Guilherme → Aline.
2. Testes da função: sem dispositivo, dispositivo expirado, push aceito, usuário fora da conversa e preferências desativadas.
3. Teste em dois navegadores com app aberto: tocar, atender, conectar áudio/vídeo e desligar.
4. Teste real nos dois PWAs iPhone: tela bloqueada/app fechado em ambos os sentidos.
5. Teste de clique tardio: abrir depois da expiração deve mostrar “chamada encerrada”, nunca uma tela falsa de chamada.
6. Teste de ausência de resposta: o remetente deve sair automaticamente de “chamando” no prazo definido.
7. Conferência dos logs pelo mesmo `callId` para provar toda a cadeia, do início ao encerramento.

A implementação preservará o worker exclusivo de push, sem adicionar cache global ou service worker de navegação, mantendo a estabilidade de autenticação já definida no projeto.