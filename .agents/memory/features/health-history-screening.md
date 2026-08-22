---
name: Health History Screening
description: Triagem obrigatória de hipertensão/diabetes/cardiopatia e medicação de uso contínuo em todos os fluxos de anamnese, prontuário, relatórios e prompts de IA.
type: feature
---

# Antecedentes de saúde — obrigatório em toda anamnese

Fonte única: `src/lib/healthHistory.ts` (ids, labels pt/en/es, normalização snake_case,
`formatHealthConditions`, `formatContinuousMedication`). Espelho para edge functions:
`supabase/functions/_shared/health-history.ts` (`formatHealthHistoryForPrompt`).

Campos em `anamnesis_data`: `healthConditions` (`hypertension` | `diabetes` | `heart_disease` |
`other` | `none` — "none" é exclusivo), `healthConditionsOther`, `usesContinuousMedication`
("yes"/"no"), `continuousMedications`.

Coleta obrigatória em TODOS os fluxos:
- `AnamnesisForm.tsx` — step `health_history` logo após `surgery`; grupo `identity`, ou seja
  nunca é removido em reavaliação/fluxos reduzidos e é validado antes de avançar.
- `ManualAssessmentModal.tsx` — chips de condições + toggle Sim/Não de uso contínuo (o campo
  "Medicações em uso" virou o "quais" do uso contínuo; comorbidades livres = "Outras comorbidades").

Exibição obrigatória: prontuário (`AssessmentView.tsx`), todos os PDFs
(`generatePdf.ts` → resumo de anamnese) e payload da síntese de evolução.

Raciocínio de IA: `generate-diagnosis` e `generate-treatment` recebem o bloco formatado com
regras de segurança (evitar Valsalva/isometria intensa em hipertensão/cardiopatia, controle
glicêmico e pé diabético, liberação médica antes de alta intensidade, efeitos de betabloqueador,
anti-hipertensivo, corticoide e anticoagulante).

Nunca remover essas perguntas de nenhum fluxo sem pedido explícito do usuário.
