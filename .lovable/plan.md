

## Correções do Tutorial: Spotlight desalinhado + Tour profissional integrado

### Problema 1 — Diary e Find Pro com spotlight errado

A ordem dos steps no array `patientSteps` é:
1. `patient-welcome` (linha 492)
2. `patient-assessments` (linha 245)
3. `patient-diary` (linha 328) — **condicional**, pode não existir
4. `patient-find-pro` (linha 271) — aparece **antes** do diary no DOM

Resultados:
- Step 3 (diary): se `subscription_type === 'single'`, o elemento não existe → spotlight some
- Step 4 (find-pro): mesmo quando existe, a ordem visual não corresponde ao fluxo do tour

### Problema 2 — Profissionais não veem tour do painel pro

O `ProDashboard` já tem seu próprio tour (`proSteps` + `onboarding_pro_completed`), mas é independente do tour do paciente. Quando o usuário é profissional, deveria ver ambos os tours em sequência.

### Solução

**1. Reordenar e tornar steps dinâmicos (`Dashboard.tsx`)**
- Mudar `patientSteps` de constante estática para função que recebe `subscription_type` e `isProfessional`
- Ordem corrigida: welcome → assessments → find-pro → diary (se subscriber)
- Se `isProfessional`, adicionar steps extras no final apontando para elementos do painel profissional: tab profissional, link de encaminhamento, lista de pacientes
- Remover step do diary se usuário é single-purchase

**2. Adicionar `data-onboarding` nos elementos do painel pro**
- O `ProDashboard` já tem `data-onboarding` atributos (`pro-welcome`, `pro-link`, `pro-patients`, `pro-subscription`)
- Mas esses elementos só existem na aba "professional" do Tabs
- Solução: os novos steps do tour combinado devem apontar para a **tab trigger** do painel profissional primeiro, e ao avançar, trocar programaticamente para a aba "professional" antes de mostrar os steps do pro
- Adicionar `data-onboarding` na TabsTrigger do profissional para o step de transição

**3. Tour unificado com troca de aba**
- No `Dashboard.tsx`, criar um único array de steps combinado (patient + pro)
- Usar `useEffect` para detectar quando o step atual requer a aba "professional" e trocar automaticamente via estado controlado do Tabs
- Remover o tour independente do `ProDashboard` (evitar duplicação)

**4. Traduções novas (`LanguageContext.tsx`)**
- `onboarding.patient.step_pro_tab.title/desc` — "Painel Profissional" / "Aqui você gerencia seus pacientes e acompanha avaliações"
- Reutilizar as traduções existentes dos `proSteps` para os steps seguintes

### Arquivos alterados
- **Dashboard.tsx** — steps dinâmicos, tabs controladas, tour unificado, `data-onboarding` na tab trigger
- **ProDashboard.tsx** — remover tour independente (manter `data-onboarding` attributes)
- **LanguageContext.tsx** — nova tradução para step de transição
- **OnboardingTour.tsx** — adicionar callback `onBeforeStep` opcional para executar ações (como trocar aba) antes de mostrar o step

