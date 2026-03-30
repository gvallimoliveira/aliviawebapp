

## Retenção de Pacientes: Push Notifications + Gamificação no Diário de Dor

### 1. Notificações Push (PWA)

**Infraestrutura:**
- Adicionar service worker handler para push events no PWA existente
- Criar edge function `send-push-notification` que envia notificações via Web Push API
- Nova tabela `push_subscriptions` para armazenar as subscriptions dos dispositivos (user_id, endpoint, p256dh, auth, created_at)
- Gerar par de chaves VAPID (será armazenado como secret `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`)

**Cenários de notificação (via cron jobs):**

| Gatilho | Público | Frequência |
|---------|---------|------------|
| Lembrete do diário de dor | Paciente assinante | Diário, 20h, se não registrou hoje |
| Avaliação premium disponível | Paciente assinante | Semanal, se tem crédito não usado |
| Convite para avaliação básica | Paciente sem assinatura | Quinzenal |
| Novo paciente/avaliação | Profissional | Imediato (trigger no insert de assessment) |

**Fluxo do usuário:**
- No Dashboard, exibir card/banner pedindo permissão de notificações (via `Notification.requestPermission()`)
- Ao aceitar, salvar subscription na tabela `push_subscriptions`
- Edge function cron consulta quem precisa ser notificado e dispara via `web-push`

**Componentes:**
- `src/hooks/usePushNotifications.ts` — hook para gerenciar permissão e subscription
- Card no Dashboard para opt-in de notificações
- Edge function `send-push-notification/index.ts` usando lib `web-push`
- Edge function `push-cron/index.ts` para verificação periódica dos gatilhos

### 2. Gamificação Leve no Diário de Dor

**Streak de registros:**
- Calcular streak (dias consecutivos) a partir dos registros existentes em `pain_diary_entries` — sem nova tabela
- Lógica client-side: iterar entries ordenadas por `logged_at` e contar sequência até hoje/ontem

**Progresso visual no componente `PainDiary`:**
- Exibir badge de streak com ícone de fogo (🔥) e contador ("7 dias seguidos!")
- Barra de progresso circular ou linear mostrando progresso semanal (ex: 5/7 dias registrados esta semana)
- Mensagens motivacionais contextuais baseadas no streak (0 dias, 3+, 7+, 14+, 30+)
- Micro-animação ao registrar (confetti leve ou pulse no badge)

**UI no PainDiary:**
```text
┌─────────────────────────────────┐
│ 🔥 Streak: 7 dias              │
│ ████████████░░░░  5/7 esta sem. │
│ "Excelente consistência!"       │
├─────────────────────────────────┤
│ [Slider dor]  [Notas]  [Salvar]│
└─────────────────────────────────┘
```

### Alterações

| Ação | Arquivo |
|------|---------|
| Migração | Nova tabela `push_subscriptions` + RLS |
| Criar | `src/hooks/usePushNotifications.ts` |
| Criar | `supabase/functions/send-push-notification/index.ts` |
| Editar | `src/components/dashboard/PainDiary.tsx` — streak + progresso visual |
| Editar | `src/pages/Dashboard.tsx` — card opt-in notificações |
| Editar | `src/main.tsx` — push event listener no SW |
| Editar | `vite.config.ts` — custom SW para push handler |
| Editar | `src/locales/pt.json`, `en.json`, `es.json` — traduções |
| Secret | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Cron | Agendar `push-cron` via pg_cron |

### Riscos mitigados

- **Sem spam**: limitar a 1 notificação/dia por tipo por usuário
- **Opt-in explícito**: usuário precisa aceitar; card some após decisão
- **Streak sem pressão**: mensagem neutra quando streak quebra ("Que tal retomar hoje?")
- **Sem nova tabela para streak**: cálculo derivado dos dados existentes

