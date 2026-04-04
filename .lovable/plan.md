# Correções: WhatsApp Premium, Scroll nas Fases, Remover Follow-up por Email mas nao excluir a funçao, futuramente posso reativar

## 1. Erro ao compartilhar relatório premium via WhatsApp

**Problema:** O compartilhamento WhatsApp no `DiagnosisResult.tsx` (modo premium) e no `TreatmentPlan.tsx` pode falhar no upload ao storage ou na geração do PDF.

**Investigação:** O `handleShareWhatsApp` no `TreatmentPlan.tsx` (linhas 131-158) usa `generateAssessmentPdfBlob` e faz upload para `assessment-reports`. Preciso verificar se o erro é no blob generation ou no upload. Vou adicionar tratamento de erro mais granular e garantir que o `assessmentId` está disponível.

**Correção:**

- No `TreatmentPlan.tsx`, melhorar o `handleShareWhatsApp` para tratar o caso onde `assessmentId` é undefined (usar `crypto.randomUUID()` como fallback — já faz isso)
- Adicionar log de erro mais detalhado e fallback: se o upload falhar, fazer download local do PDF e abrir WhatsApp só com texto (mesmo padrão do `DiagnosisResult.tsx` básico)
- Verificar se `generateAssessmentPdfBlob` está exportada corretamente em `generatePdf.ts`

**Arquivo:** `src/components/assessment/TreatmentPlan.tsx`, `src/utils/generatePdf.ts`

## 2. Scroll para o topo ao expandir fase de médio/longo prazo

**Problema:** Ao clicar no card de médio ou longo prazo, a fase expande mas o usuário vê o final dos exercícios e precisa dar scroll up.

**Correção:** No `togglePhase`, após expandir uma fase, usar `scrollIntoView` com `behavior: 'smooth'` no elemento do card da fase clicada. Adicionar `useRef` ou `id` dinâmico nos cards de fase para fazer o scroll.

**Arquivo:** `src/components/assessment/TreatmentPlan.tsx`

- Adicionar `id={`phase-${phase.id}`}` ao `Card` de cada fase
- No `togglePhase`, após o `setExpandedPhase`, usar `setTimeout` + `document.getElementById(`phase-${phaseId}`).scrollIntoView({ behavior: 'smooth', block: 'start' })`

## 3. Remover opção de acompanhamento por email

**Problema:** No final da avaliação premium, aparece o card "Ativar acompanhamento por email" (linhas 435-462 do `TreatmentPlan.tsx`).

**Correção:** Remover o bloco inteiro do Follow-up Opt-in (linhas 435-462), incluindo o state `followUpOptedIn`, `followUpLoading` e a função `handleFollowUpOptIn`. Limpar os imports de `Mail` se não for usado em outro lugar.

**Arquivo:** `src/components/assessment/TreatmentPlan.tsx`

---

## Arquivos a alterar

1. `**src/components/assessment/TreatmentPlan.tsx**` — scroll nas fases, remover follow-up, melhorar WhatsApp
2. `**src/utils/generatePdf.ts**` — verificar export de `generateAssessmentPdfBlob` (se necessário)