

# Badges de tratamento + botão "Ver avaliação" na listagem e detalhe do paciente

## Mudanças em `src/components/dashboard/PatientEvolutionDashboard.tsx`

### 1. Badge de tratamento na listagem de pacientes (linhas 576-623)

Ao lado do badge "Melhorando/Piorando/Estável", adicionar um badge que indica o status do plano de tratamento do paciente:
- **Se alguma avaliação do grupo tem `treatment_plan`** → Badge verde: "Tratamento Liberado" (ícone FileCheck)
- **Se nenhuma tem tratamento mas alguma tem `diagnosis`** → Badge amarelo/outline: "Adquirir Tratamento" (ícone Lock)
- **Se nenhuma tem diagnóstico** → Sem badge

Lógica: verificar `p.assessments.some(a => a.treatment_plan)` e `p.assessments.some(a => a.diagnosis && !a.treatment_plan)`.

### 2. Botão "Ver avaliação completa" + badge de tratamento no header do detalhe do paciente (linhas 636-643)

Na view de detalhe do paciente, ao lado do nome (`patient.name`):
- Adicionar badge de tratamento (mesmo critério da listagem)
- Adicionar botão compacto "Ver avaliação" que navega para a última avaliação com diagnóstico (`/assessment/view/{id}?from=professional&patient=...`)

Layout: nome na esquerda, badge + botão na direita, mesma linha.

### 3. Imports

Adicionar `FileCheck` (já importado) e verificar que `Lock` (já importado) está disponível.

## Arquivos a alterar

1. `src/components/dashboard/PatientEvolutionDashboard.tsx` — badges na listagem + header do detalhe

