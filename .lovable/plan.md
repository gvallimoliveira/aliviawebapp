## Diagnóstico (confirmado nos dados, não é suposição)

Investiguei os registros reais do backend das suas tentativas de ontem:

- Mensagem "Oi" da Aline às **00:39:19** → o gatilho de push da tabela de mensagens **foi executado**, chamou a função de push e recebeu de volta **HTTP 401 `{"error":"Unauthorized"}`**. Ou seja: a notificação de chat morre na autenticação, nunca chega a ser enviada ao dispositivo.
- Avaliação da Aline concluída às **01:02:53** → o mesmo mecanismo, mas passando pela função `notify-admin` (que usa um **segredo interno** em vez de token de usuário), respondeu **200** com `push: sent, 1 device group(s)`. É exatamente o fluxo que funcionou no seu celular.
- Videochamada às **00:39:59** → a sessão ficou registrada com `push_devices_found=1`, `push_sent=1`, sem erros. Aqui o envio saiu, mas por outro caminho (função de vídeo chamando push com chave de serviço), e o aviso não apareceu no aparelho — sem log por dispositivo não é possível afirmar o motivo, então isso entra como item a instrumentar e endurecer.
- Só existem 2 assinaturas de push no sistema (a sua e a da Aline), ambas Apple Web Push, e nenhuma preferência de notificação salva (logo, ninguém está "opt-out").

Conclusão: a diferença entre o fluxo que funciona e os que falham é o **caminho de autenticação/instrumentação**, não o dispositivo nem a permissão.

## O que vou fazer

### 1. Unificar todo push no caminho já validado
Criar uma única porta de entrada interna de notificação (mesmo padrão de segredo interno que a avaliação usa hoje) e fazer **mensagens de chat** e **videochamada** passarem por ela:
- Gatilho de nova mensagem → porta interna (elimina o 401).
- Nova sessão de chamada → gatilho no banco na criação da sessão (mesma mecânica da avaliação concluída), em vez de depender do envio dentro da função de vídeo.

### 2. Log de entrega por notificação
Nova tabela de log (destinatário, categoria, título, resultado por dispositivo, código de erro, horário), gravada sempre. Com isso, na próxima tentativa eu (e você, na Central de Alertas) sabemos em segundos se foi "não enviado", "enviado e não exibido" ou "assinatura expirada" — hoje isso é invisível.

### 3. Endurecer a notificação para iOS (app fechado)
No service worker de push:
- Payload simples, igual ao da avaliação que funciona (sem `actions`, `requireInteraction`, `renotify` e `vibrate`, que o iOS ignora ou rejeita e que podem fazer o aviso não aparecer).
- Título/corpo claros: "Chamada de vídeo — Aline está te chamando".
- Ao tocar: abre o Aliv.iA direto na conversa com o parâmetro da chamada.

### 4. Notificação de chamada como atalho (como você propôs)
Ao abrir pelo toque na notificação, o app consulta a chamada pendente e **reexibe o pop-up de aceitar/recusar** dentro do chat. Isso já existe parcialmente (há busca de chamada pendente no boot), mas hoje só funciona com o painel montado; vou garantir que funcione também quando o app é aberto frio pela notificação, e ampliar a validade da chamada para dar tempo de abrir o app (hoje expira em 45s).

### 5. Aviso na tela também para quem está com o app aberto
Toast + som já existente permanece; a chamada deixa de depender exclusivamente do canal em tempo real.

### 6. Verificação prática
Depois de aplicar: enviar uma mensagem de teste e iniciar uma chamada de teste, e conferir no log de entrega se o resultado foi 200 com dispositivo alcançado — em vez de depender só de "chegou/não chegou" no aparelho.

## Detalhes técnicos

- Novo endpoint interno `notify-user` (verifica `x-internal-secret`, resolve destinatário e delega ao envio de push), evitando o caminho anon/JWT que retorna 401.
- Reescrever `public.push_new_message()` para chamar `notify-user` com o segredo interno.
- Novo `public.push_video_call_ringing()` disparado em `AFTER INSERT ON public.video_call_sessions`; `video-call-session` deixa de fazer o `fetch` de push e passa a só registrar a sessão (mantendo `push_sent`/`push_devices_found` alimentados pelo log).
- Nova tabela `public.push_delivery_log` (RLS: leitura só do próprio usuário + admin; GRANT para authenticated/service_role) escrita pela função de envio.
- Ajustes em `public/sw-push.js` (payload mínimo compatível com Apple Web Push) e em `src/contexts/VideoCallContext.tsx` (recuperação de chamada pendente em boot frio via parâmetro `call` da URL).
- Aumentar `expires_at` da chamada de 45s para ~90s.

## Fora do escopo
Não vou mexer em autenticação, no cliente do backend nem em cache/PWA de app-shell (regra do projeto: nada de service worker de cache interceptando login).
