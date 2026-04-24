

## Objetivo
Fortalecer o que já está funcionando (videochamada, chat, descoberta de profissionais) **sem alterar o fluxo atual**, corrigindo dois pontos:

1. Notificação sonora/vibração quando chega videochamada — inclusive com app em segundo plano (como WhatsApp).
2. Nome do profissional aparecendo como genérico “Profissional” na visão do paciente (quando deveria mostrar o nome completo, igual à busca).

---

## 1. Aviso sonoro + vibração da chamada em background

### Causa
O sinal de chamada hoje viaja por Supabase Realtime (broadcast WebSocket). Quando o app está em segundo plano (aba inativa, tela bloqueada), o navegador suspende o JavaScript e o broadcast não chega. Por isso a chamada só toca se o app estiver aberto.

### Solução
Disparar, **em paralelo ao broadcast atual**, uma push notification para o destinatário no exato momento em que a chamada começa. O Service Worker `sw-push.js` (já existente) recebe a push mesmo com o app fechado e mostra notificação nativa do sistema com som e vibração.

### Mudanças
- **`src/contexts/VideoCallContext.tsx`** — Em `startCall`, após enviar `call-request` pelo broadcast, invocar também `send-push-notification` para o usuário do outro lado, com:
  - título: “📹 Chamada recebida”
  - corpo: `"<nome> está te chamando…"`
  - URL: `/dashboard?tab=messages&conv=<id>`
  - flag interna (`tag: "video-call"`, `requireInteraction: true`) para o SW tratar como chamada.
- **`public/sw-push.js`** — Tratar push do tipo chamada com:
  - `vibrate: [400, 200, 400, 200, 400, 200, 400]` (padrão de toque longo)
  - `requireInteraction: true` (notificação não some sozinha)
  - `tag: "video-call-<convId>"` (substitui notificações antigas da mesma chamada, evita duplicar)
  - ações: “Atender” e “Recusar” (botões da notificação)
  - Som: navegadores tocam som padrão do sistema automaticamente quando há `vibrate` + `requireInteraction`. Sem reproduzir áudio próprio (browsers bloqueiam).
- Quando a chamada é encerrada/recusada/aceita, enviar push “silenciosa” adicional com `tag` igual para fechar a notificação anterior (evita ficar tocando depois).

### Garantias para não quebrar o fluxo atual
- A push é **adicional**, não substitui o broadcast. Se o app estiver aberto, o modal continua aparecendo via broadcast (caminho atual). A push só é a “rede de segurança” para quando o app está em background.
- Se o usuário ainda não autorizou push, nada quebra: a invocação falha em silêncio (já está em try/catch).
- Som/vibração só dispara no receptor, não no caller.

### Limitações honestas
- iOS Safari só toca som de push se o usuário tiver instalado o app como PWA na tela inicial (limitação do iOS, não do código).
- No Android, funciona em qualquer navegador moderno com push autorizado.

---

## 2. Nome correto do profissional na visão do paciente

### Causa raiz (confirmada via RLS do banco)
A política RLS de `public.professionals` permite leitura apenas pelo próprio profissional ou por admin. Quando o paciente faz `SELECT id, full_name FROM professionals WHERE id IN (...)`, o RLS retorna **zero linhas** → o código cai no fallback `"Profissional"`.

A busca de profissionais (lista para iniciar conversa) funciona porque usa o RPC `get_patient_professionals` (security definer), que ignora RLS. Já a lista de conversas existentes faz `SELECT` direto e bate no bloqueio.

### Solução
Criar um RPC security-definer que retorne nome + logo dos profissionais que o paciente tem direito de ver (mesmos critérios de elegibilidade já usados em `get_patient_professionals`: avaliações por user_id ou email, conversas existentes, referrals).

### Mudanças
- **Migration nova** — Função `get_professionals_basic_info(_professional_ids uuid[])`:
  - Recebe lista de IDs.
  - Retorna `id`, `full_name`, `logo_url` apenas dos profissionais que `auth.uid()` tem vínculo legítimo (conversa existente, avaliação por user_id ou patient_email, ou referral).
  - Security definer, sem expor dados sensíveis (apenas nome e logo, que já são públicos no marketplace).
- **`src/components/chat/ConversationList.tsx`** — No `fetchConversations` modo patient, trocar o `supabase.from("professionals").select(...)` pelo novo RPC. Mantém todo o resto da lógica intacta.
- **`src/components/chat/ChatWindow.tsx`** — Não precisa mudar, recebe `otherName` por prop.

### Garantias
- Nenhuma mudança no fluxo: lista, abertura, mensagens, push e videochamada continuam idênticos.
- Apenas a fonte do nome muda de SELECT bloqueado por RLS para RPC security-definer com filtro de elegibilidade equivalente.
- Sem expor dados de profissionais aleatórios — só os já vinculados ao paciente.

---

## Arquivos afetados
- `src/contexts/VideoCallContext.tsx` (push de chamada)
- `public/sw-push.js` (tratamento de notificação tipo chamada, vibração, tag)
- `src/components/chat/ConversationList.tsx` (usar RPC para nome do profissional)
- nova migration em `supabase/migrations/` (RPC `get_professionals_basic_info`)

## Validação
1. **Som/vibração**: caller liga → receptor com app fechado/em background recebe notificação do sistema vibrando + som do sistema; ao tocar, abre app no chat e modal de chamada já está visível via broadcast.
2. **Encerramento**: caller ou receptor encerra → notificação some (push silenciosa com mesma tag).
3. **Nome do profissional**: na lista de conversas do paciente, aparece o nome real (ex.: “Guilherme Vallim”) em vez de “Profissional”. Igual ao mostrado em “Iniciar conversa”.
4. **Não-regressão**: chamada de vídeo continua conectando como hoje; chat não fica oculto; lista de profissionais segue completa.

