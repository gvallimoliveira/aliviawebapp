## Objetivo
Aumentar conversão tornando o badge "Adquirir Tratamento" (hoje decorativo) em um atalho de compra, levando direto ao card de pagamento dentro do detalhe do paciente. Quando o paciente tiver mais de uma avaliação pendente (queixas/datas distintas, sem plano comprado), o clique abre um seletor para escolher de qual avaliação comprar o tratamento.

## Sim, é totalmente viável
A infraestrutura de pagamento por avaliação já existe (`TreatmentUnlockCTA` chama `create-pro-treatment-payment` com `assessment_id`). Hoje o card de compra na visão expandida usa **apenas a avaliação mais recente** (`latestWithDiagnosis`) — então a melhoria também resolve um gap real: avaliações antigas sem tratamento ficam invisíveis para compra.

## Mudanças

### 1. Badge clicável (`src/components/dashboard/PatientEvolutionDashboard.tsx`)
Dois pontos de renderização do badge "Adquirir Tratamento":
- **Linha ~1499** — card compacto na lista de pacientes
- **Linha ~1810** — header do paciente expandido

Ambos passam a ser clicáveis (cursor-pointer, hover). Comportamento ao clicar (`stopPropagation` para não disparar outras ações do card):

- **1 avaliação pendente** (com `diagnosis` mas sem `treatment_plan` e sem `payment_status` em `treatment_paid/generating`):  
  - Se o card já está expandido → scroll suave até o `TreatmentUnlockCTA`, com highlight de 2s.  
  - Se não está expandido → expande o paciente, aguarda render, então faz o scroll+highlight.

- **2+ avaliações pendentes**: abre um `<Dialog>` "Selecione qual avaliação deseja desbloquear" listando cada avaliação pendente com:
  - Data da avaliação (`created_at`)
  - Queixa principal (extraída de `anamnesis_data` — região de dor + descrição curta) e hipótese (`diagnosis.hypothesis` ou `final_hypothesis`)
  - Score de dor
  - Botão "Adquirir tratamento — R$ 29,90" (ou "Desbloquear" se `lifetime_treatment`/clínica ativa) que dispara o mesmo fluxo do `TreatmentUnlockCTA` para aquele `assessment_id`

### 2. Card de compra por avaliação no detalhe expandido
Hoje o bloco "4. CTA PLANO DE TRATAMENTO" (linhas ~2210–2283) só renderiza para `latestWithDiagnosis`. Vamos:
- Manter o card principal para a avaliação mais recente pendente.
- Se houver **outras avaliações pendentes além da mais recente**, adicionar logo abaixo um sub-bloco "Outras avaliações sem plano de tratamento" com uma lista enxuta (data + queixa/hipótese + botão de desbloqueio individual reutilizando `TreatmentUnlockCTA`).

### 3. Âncora para scroll
Envolver o card "4. CTA PLANO DE TRATAMENTO" com `id="treatment-unlock-section"` e `ref` para permitir `scrollIntoView({ behavior: "smooth", block: "center" })` + classe temporária de ring/pulse.

## Detalhes técnicos

- Helper `getPendingAssessments(patient)`: filtra `patient.assessments` por `a.diagnosis && !a.treatment_plan && a.payment_status !== "treatment_paid" && a.payment_status !== "treatment_generating"`.
- Helper `getAssessmentLabel(a)`: retorna `{ date, complaint, hypothesis, painScore }` para o seletor.
- Estado novo: `treatmentPickerOpen` + `treatmentPickerPatient` no componente principal.
- Reaproveitar `TreatmentUnlockCTA` (já trata caminho pago/gratuito/lifetime/clínica) — passar `assessmentId` correto.
- i18n: novas chaves em `pt/en/es`:
  - `pro.pick_assessment_to_unlock_title` ("Selecione a avaliação a desbloquear")
  - `pro.pick_assessment_to_unlock_desc`
  - `pro.other_pending_assessments` ("Outras avaliações sem plano")
  - `pro.assessment_from` ("Avaliação de {date}")

## Atualização da página de Suporte (regra do projeto)
Adicionar item curto em `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) na seção de PRO/Tratamento:
- "Como comprar plano de tratamento de uma avaliação antiga?" → explicar o badge clicável e o seletor.

## Fora de escopo
- Não mexer no fluxo de pagamento/edge function `create-pro-treatment-payment` — já aceita `assessment_id` arbitrário.
- Não alterar regras de clínica (tratamento gratuito) nem lifetime — apenas reaproveita o caminho existente.
- Não criar bulk purchase (comprar várias de uma vez); cada avaliação segue 1 pagamento, conforme modelo atual.