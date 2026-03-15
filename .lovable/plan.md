

## Onboarding Guiado para Usuários e Profissionais

### Problema
Novos usuários e profissionais entram no dashboard sem contexto. Não entendem o link de avaliação, o paywall, ou as funcionalidades disponíveis.

### Solução
Implementar um sistema de onboarding baseado em **tooltips/cards guiados** (tour) que aparece apenas na primeira visita, usando `localStorage` para persistir o estado de "já viu". Sem dependência de biblioteca externa — componente custom leve.

---

### Arquitetura

1. **`src/components/onboarding/OnboardingTour.tsx`** — Componente genérico de tour com steps, overlay highlight e tooltip posicionado
2. **`src/components/onboarding/OnboardingStep.tsx`** — Card flutuante com título, descrição, indicador de progresso e botões (Próximo/Pular)
3. **Hook `src/hooks/useOnboarding.ts`** — Gerencia estado do tour (step atual, completed, skip) com `localStorage`

### Tours Específicos

**Tour do Paciente** (Dashboard, primeira visita sem assessments):
1. "Bem-vindo ao Aliv.iA!" — Card central explicando o que o dashboard oferece
2. "Faça sua primeira avaliação" — Highlight nos cards de avaliação básica/premium
3. "Diário de Dor" — Highlight no PainDiary explicando acompanhamento
4. "Encontre um profissional" — Highlight no card de busca

**Tour do Profissional** (ProDashboard, primeira visita):
1. "Seu painel profissional" — Visão geral do que está disponível
2. "Link de avaliação" — Highlight no card de gerar link, explicando que pacientes acessam por ele
3. "Seus pacientes" — Highlight na lista/tabs de pacientes e evolução
4. "Assinatura Pro" — Explicação do paywall e benefícios (se não assinante)

### Implementação

- Cada tour é uma lista de `{ targetId: string, title: string, description: string, position: 'top'|'bottom'|'left'|'right' }`
- Elementos-alvo recebem `id` ou `data-onboarding` attributes nos componentes existentes
- Overlay semi-transparente com "spotlight" no elemento alvo via `getBoundingClientRect()`
- localStorage keys: `onboarding_patient_completed`, `onboarding_pro_completed`
- Botões: "Próximo", "Pular tour", indicador de step (1/4)
- Traduções pt/en no LanguageContext

### Alterações em arquivos existentes
- **Dashboard.tsx**: Adicionar `data-onboarding` IDs nos cards-alvo, renderizar `<OnboardingTour>` condicionalmente
- **ProDashboard.tsx**: Adicionar `data-onboarding` IDs no link card, patient list, subscription area
- **LanguageContext.tsx**: Novas keys de tradução para os steps do onboarding

### UX
- Tour inicia automaticamente na primeira visita ao dashboard
- Animação suave (Framer Motion, já disponível no projeto)
- Mobile-friendly: tooltips se reposicionam abaixo em telas pequenas
- Botão "Rever tutorial" discreto no header ou footer do dashboard para replay

