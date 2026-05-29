
# Modernização dos Demos (Clínica + Profissional Autônomo)

## Diagnóstico atual

**Clinic Demo (`/clinic-demo`)** — Página standalone com 5 abas planas (Agenda, Pacientes, Equipe, Link, Mensagens vazia). Falta: Insights (6 cards de IA), DailySummaryCard, FeedbackSurvey/Results, Gestão & KPIs (charts), ExportData, Mensagens reais, sub-abas em "Clínica", white-label/logo. Estética divergente (header simples, max-w-5xl, sem WelcomeSection).

**Pro Demo (`activeContext='professional_demo'`)** — Já vive dentro do Dashboard real e reaproveita `ProDashboard isDemoMode`. Falta: aba Insights, DailySummaryCard na agenda, MessagesTab real (hoje placeholder), Referrals, ExportDataCard, lifetime upsell. CTAs fracos.

## Estratégia

Como os componentes reais (DailySummaryCard, InsightsTab, ProSchedule, ClinicSecretaryDashboard, ClinicOwnerDashboard, MessagesTab, FeedbackSurveyCard, ClinicTeamManagement) buscam dados via Supabase e dependem de `auth.uid()`, **injetar mocks via props em cada componente seria invasivo demais**. Adotaremos abordagem híbrida:

1. **Reescrever `ClinicDemo.tsx`** mantendo standalone mas espelhando 1:1 o layout do Dashboard clínica real: mesmo header (logo + idioma + suporte + sair), mesma estrutura de 5 abas + sub-abas em Clínica, mesmas cores/cards/espaçamentos (semantic tokens). Construir cada tela como mockup visual usando os mesmos componentes UI (Card, Badge, Tabs) alimentados pelos mocks expandidos.
2. **Expandir mocks** (`mockClinicData.ts`): adicionar KPIs financeiros, dados de aderência/churn/no-show, conversas de mensagens, NPS, lista de feedbacks, charts data, branding (logo/cor).
3. **Pro Demo no Dashboard**: habilitar a aba Insights em demo com `<InsightsTab demoMode />` (criar prop), trocar placeholder de mensagens por mock visual de conversa, adicionar DailySummaryCard demo, reforçar CTAs em cada aba.
4. **CTAs reforçados**: criar `<DemoUpsellBanner />` reutilizável (sticky no topo de cada aba, contextual: "Assinaturas a partir de R$ X — desbloqueia X feature desta tela").
5. **Atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es)** mencionando o novo demo modernizado, e memória `mem://features/clinic-demo` + `mem://features/pro-simulated-environment` (já existe — atualizar).

## Arquivos a criar/editar

**Criar:**
- `src/components/demo/DemoUpsellBanner.tsx` — banner CTA contextual reutilizável
- `src/components/demo/DemoInsightsMock.tsx` — 6 cards de insights com dados mock
- `src/components/demo/DemoMessagesMock.tsx` — preview de conversas
- `src/components/demo/DemoManagementMock.tsx` — KPIs + charts (recharts) com mocks
- `src/components/demo/DemoFeedbackMock.tsx` — NPS + lista de feedbacks
- `src/components/demo/DemoDailySummaryMock.tsx` — resumo do dia mock

**Editar:**
- `src/pages/ClinicDemo.tsx` — reescrita completa espelhando layout real (5 abas + sub-abas), usando mocks
- `src/data/mockClinicData.ts` — expandir com KPIs, mensagens, feedbacks, charts, branding
- `src/pages/Dashboard.tsx` — Pro Demo: habilitar Insights/Messages mocks, DailySummaryCard mock, banners por aba
- `src/components/dashboard/insights/InsightsTab.tsx` — aceitar prop `demoMode` que renderiza mocks
- `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx`, `src/locales/pt|en|es.json` — FAQ atualizada
- `mem://features/pro-simulated-environment` — atualizar com novo escopo

## Detalhes técnicos

- Manter `auto_confirm_email` e fluxo de auth intactos — demos são páginas read-only sem chamadas Supabase.
- Reutilizar `Card`, `Badge`, `Tabs`, `ScrollArea` do shadcn; recharts já está no projeto.
- Cores via semantic tokens (`primary`, `muted-foreground`, etc.) — nenhuma cor hard-coded.
- Mobile-first: max-w-7xl na agenda, grid responsivo nos KPIs, ScrollArea horizontal nas conversas.
- CTA: `<DemoUpsellBanner section="agenda" />` posicionado no topo de cada `<TabsContent>` + 1 banner sticky no header da página.

## Fora de escopo

- Não refatorar `InsightsTab`/`MessagesTab` reais para aceitarem dados mock diretamente (mantemos componentes paralelos para o demo).
- Não tocar em rotas, auth, pagamento, edge functions ou RLS.
