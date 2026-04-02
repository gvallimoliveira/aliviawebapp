

# Adicionar CTA de Plano de Tratamento no Painel Profissional

## Problema

Hoje, o profissional só vê a opção de desbloquear o plano de tratamento de um paciente se clicar no card e navegar para a página de detalhe da avaliação (`/assessment/view/:id`). Isso não é intuitivo nem ideal para conversão. O CTA precisa estar visível diretamente na lista de avaliações do painel, antes do campo de notas privadas.

## Solução

Inserir um bloco de CTA compacto dentro de cada card de avaliação no `PatientEvolutionDashboard.tsx`, posicionado entre a seção de anamnese e a seção de notas privadas. O bloco aparece **somente** quando a avaliação tem diagnóstico mas **não** tem `treatment_plan`.

## Alterações

### 1. `src/components/dashboard/PatientEvolutionDashboard.tsx` (linhas ~731-733)

Antes da `div` de notas privadas, inserir um novo bloco condicional:

- **Condição**: `a.diagnosis && !a.treatment_plan`
- **Visual**: Card compacto com borda primária, ícone de Sparkles/Lock, texto curto explicando o benefício e botão "Desbloquear Plano de Tratamento"
- **Lógica do botão**: Invocar `create-pro-treatment-payment` (mesma lógica que já existe no `AssessmentView.tsx` — BlurredTreatmentPreview). Se o profissional tem `lifetime_treatment`, gerar tratamento direto; se não, redirecionar ao checkout Stripe.
- **Se já tem `treatment_plan`**: Mostrar badge verde "Plano desbloqueado" com botão para ver detalhes (navega para `/assessment/view/:id?from=professional`)

### 2. Props necessários

- Passar `professional.lifetime_treatment` como prop ao `PatientEvolutionDashboard` para decidir se mostra "Desbloquear por R$29,90" ou gera direto
- Adicionar estado local para loading por assessment (similar ao `noteSaving` pattern)

### 3. Traduções (`pt.json`, `en.json`, `es.json`)

- `pro.unlock_treatment_cta`: "Desbloquear Plano de Tratamento" / "Unlock Treatment Plan" / "Desbloquear Plan de Tratamiento"
- `pro.unlock_treatment_desc`: "Gere exercícios personalizados em 3 fases com base nesta avaliação" / equivalentes
- `pro.treatment_unlocked`: "Plano desbloqueado" / "Plan unlocked" / "Plan desbloqueado"
- `pro.view_treatment`: "Ver plano" / "View plan" / "Ver plan"

### 4. Atualizar estado após desbloqueio

Após sucesso do pagamento ou geração gratuita (lifetime), atualizar o assessment local no state para refletir o `treatment_plan` sem reload da página.

## Resumo de arquivos

1. `src/components/dashboard/PatientEvolutionDashboard.tsx` — CTA inline por avaliação
2. `src/components/dashboard/ProDashboard.tsx` — passar `lifetimeTreatment` prop
3. `src/locales/pt.json`, `en.json`, `es.json` — traduções novas

