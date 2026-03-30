

## Pop-up de Exit Intent + Lembrete de Avaliação Abandonada

### 1. Pop-up de Exit Intent na Landing

**Novo componente**: `src/components/ExitIntentPopup.tsx`

- Detecta `mouseleave` no topo da janela (desktop) e `visibilitychange` (mobile) como sinais de saída
- Exibe um Dialog com oferta: "Primeira avaliação básica grátis — comece agora!" + CTA para `/assessment/basic`
- Mostra apenas 1x por sessão (`sessionStorage`) e não aparece para usuários logados
- Delay de 5s antes de ativar (evitar disparar em scroll acidental)
- Botão secundário "Ver planos premium" que leva à seção de comparação

**Integração**: Adicionar `<ExitIntentPopup />` em `PatientLanding.tsx` e `LandingLegacy.tsx`

### 2. Lembrete de Avaliação Abandonada (push-cron)

**Editar**: `supabase/functions/push-cron/index.ts`

Adicionar seção 5 após o safety net de cupons:

- Busca avaliações com `status = 'in_progress'` criadas há mais de 1 hora e menos de 7 dias
- Filtra apenas usuários com push subscription ativa
- Envia push: "📋 Sua avaliação está quase pronta! Continue de onde parou."
- URL: `/assessment/{type}` (basic ou premium conforme o tipo)
- Limita a 1 lembrete por avaliação por dia (verifica `updated_at` para não repetir)
- Adiciona contador `abandoned_reminders` nos resultados

### Alterações

| Arquivo | Ação |
|---|---|
| `src/components/ExitIntentPopup.tsx` | Criar componente com detecção de exit intent |
| `src/pages/PatientLanding.tsx` | Importar e renderizar `ExitIntentPopup` |
| `src/pages/LandingLegacy.tsx` | Importar e renderizar `ExitIntentPopup` |
| `supabase/functions/push-cron/index.ts` | Adicionar seção de lembrete de avaliação abandonada |

