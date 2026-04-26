# Plano: Acelerar carregamento do app com priorização inteligente

## Diagnóstico rápido

Hoje o `App.tsx` importa **todas as 30 páginas de uma vez** (Auth, Dashboard, Assessment, Admin, Blog, ClinicLanding, ClinicDemo, etc.) e o `Dashboard.tsx` importa **todos os componentes de todas as abas** sincronamente — incluindo libs pesadas como `recharts` (gráficos), `jspdf`, `jszip`, `framer-motion`, `embla-carousel`, `react-easy-crop`, `react-day-picker`. Resultado: o navegador baixa e parseia ~tudo antes de mostrar a primeira tela.

A solução padrão em React/Vite é `React.lazy()` + `Suspense` + `requestIdleCallback` para pré-aquecer os módulos que serão usados em seguida.

## Estratégia em 3 níveis

### Nível 1 — Carregamento IMEDIATO (entram no bundle inicial)
São telas/funções que o usuário vê nos primeiros segundos. Não terão delay nenhum.

- **Gateway** (`/`) — porta de entrada
- **Auth** (`/auth`) — login/cadastro
- **Dashboard shell** — header, abas, `WelcomeSection`, `QuickActions`, `AssessmentHistory` (aba inicial padrão)
- **AuthContext, ClinicContext, LanguageContext** — já são imediatos
- **Toaster, Tooltip, ScrollToTop, GlobalMobileMenu** — infraestrutura
- **PatientLanding** e **ProfessionalLanding** — landing pages públicas (SEO/conversão)

### Nível 2 — Pré-carregadas em IDLE (após app montar, sem bloquear)
Carregam ~300ms depois do app pintar a primeira tela, usando `requestIdleCallback`. Quando o usuário clicar, já estarão prontas.

- **Assessment** (`/assessment/:type`) — fluxo de avaliação (página mais usada após o dashboard)
- **AssessmentView** — visualização de avaliação
- **MessagesTab + ConversationList** — chat (pré-aquece se usuário tem conversas)
- **PainDiary, ExerciseChecklist, EvolutionSummary** — abas secundárias do Dashboard
- **ProDashboard** (só se o usuário for profissional)

### Nível 3 — Sob demanda PURA (lazy real, só baixa ao clicar)
Funções raramente usadas ou específicas de perfil. Mostram um spinner curtinho durante o load (~200-500ms na 4G).

- **Admin** (`/admin`) — só admins
- **Blog**, **BlogPost** — leitura ocasional
- **ClinicLanding, ClinicDemo, ClinicSupport, ClinicAssessment, ClinicFeedback** — fluxo de clínicas
- **ProfessionalRegister, ProfessionalSearch, ProfessionalAssessment, ProfessionalLanding** — fluxo profissional
- **ExerciseProgram** (`/hep/:token`) — link público de exercícios
- **PaymentSuccess, UpgradeWelcome, ResetPassword, AcceptInvite, CompleteProfile, Account, Support, ClearCache, LandingLegacy**
- **Componentes pesados sob demanda**:
  - `recharts` (gráficos do `ProAnalyticsCharts`, `RegionPainComparison`) — só quando aba Analytics abrir
  - `jspdf` + `generatePdf.ts` — só ao clicar "exportar PDF"
  - `jszip` — só em download em lote
  - `react-easy-crop` — só em upload de avatar/fotos
  - `PainMapPathEditor` — só admin no modo debug
  - `ClinicTeamManagement, ClinicSettingsCard, AgendaImportModal, ManualAssessmentModal, CreateExerciseProgramModal` — modais e telas internas

## Como ficará na prática (visão técnica)

```text
src/App.tsx
  ├─ import direto: Gateway, Auth, Dashboard (shell)
  └─ React.lazy(): todas as outras rotas + <Suspense fallback={<Spinner/>}>

src/lib/preloader.ts (novo)
  └─ requestIdleCallback(() => {
        import("./pages/Assessment");
        import("./pages/AssessmentView");
        import("./components/dashboard/PainDiary");
        ...
     })

src/pages/Dashboard.tsx
  ├─ import direto: WelcomeSection, QuickActions, AssessmentHistory
  └─ React.lazy(): PainDiary, MessagesTab, ProDashboard, ClinicTeamManagement,
                   ProAnalyticsCharts, AdaptiveProgressionCard, AssessmentComparison...

src/utils/generatePdf.ts → carregado via dynamic import dentro do botão de export
```

Adicionar também no `vite.config.ts` um `manualChunks` simples para separar libs grandes (`recharts`, `jspdf`, `jszip`, `framer-motion`) em chunks próprios — assim a primeira página carrega só o essencial.

## Ganhos esperados

- **Bundle inicial**: estimativa de queda de ~40-55% (de ~800KB-1.2MB para ~400-550KB gzip)
- **Tempo até interativo**: 1.5-3s mais rápido em 4G/mobile
- **Sem regressão**: telas Nível 2 (Assessment, chat) abrem instantâneas porque foram pré-aquecidas em idle
- **Auth segue inalterado** (regra crítica de estabilidade do login mantida)

## O que NÃO vai mudar

- Nenhuma alteração em service worker / PWA / cache (respeita a constraint de estabilidade do auth)
- Nenhuma mudança em comportamento de auto-save, modo offline, ou restauração de sessão
- Nenhuma mudança visual

## Pontos para você aprovar/editar

1. **Concorda com a divisão dos 3 níveis acima?** Se quiser mover algo de Nível 3 → Nível 2 (ex.: deixar `ExerciseProgram` pré-aquecido porque pacientes recebem o link), me diga.
2. **Quer um spinner global discreto** (só logotipo + barra) ou **skeleton específico por página** durante o lazy-load do Nível 3?
3. **Posso aplicar o `manualChunks`** no Vite (separa recharts/jspdf/jszip)? Recomendo sim — é zero-risco e aumenta o ganho.
