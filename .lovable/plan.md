

## Correção: Erro ao gerar PDF para pré-avaliações sem plano de tratamento

### Problema
Quando um paciente completa a avaliação pelo link profissional mas ainda não tem um plano de tratamento (`treatment_plan` é `null`), a função `generateAssessmentPdf` tenta iterar sobre `treatmentPlan.phases` (linha 554 de `generatePdf.ts`), causando o erro `Cannot read properties of null`.

### Solução

**Arquivo: `src/utils/generatePdf.ts`**
- Tornar `treatmentPlan` opcional na interface `PdfOptions`
- Envolver toda a seção de Treatment Plan (linhas 524-651) em uma verificação `if (treatmentPlan)`, permitindo gerar PDF apenas com diagnóstico + anamnese

**Arquivo: `src/components/dashboard/ProDashboard.tsx`**
- Nenhuma alteração necessária — o código já passa `assessment.treatment_plan` que pode ser `null`, o fix é no `generatePdf.ts`

### Resultado
O PDF será gerado com sucesso contendo anamnese, mapa de dor e diagnóstico, omitindo a seção de tratamento quando não disponível.

