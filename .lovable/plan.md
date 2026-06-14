## Objetivo
Aplicar todas as medidas de proteção jurídica sugeridas + renomear "Diagnóstico" → "Hipótese preliminar" em todo o app voltado ao paciente.

## Escopo de mudanças

### 1. Checkbox de consentimento obrigatório (antes da autoavaliação)
- **Arquivo:** `src/components/assessment/WelcomeStep.tsx`
- Adicionar checkbox: *"Li e compreendo que esta é uma autoavaliação preenchida por mim, guiada pelo método do app, e que não substitui consulta presencial. [Ver termos]"*
- Botão "Iniciar" só fica habilitado após marcação.
- Persistir consentimento em `localStorage` (`alivia_self_assessment_consent_v1` com timestamp) para auditoria local.
- Não aplica em fluxo de clínica/profissional (já têm responsável clínico).

### 2. Disclaimer fixo no PDF
- **Arquivo:** `src/utils/generatePdf.ts`
- Adicionar rodapé/seção fixa em PDFs gerados a partir de autoavaliação do paciente:
  *"Este relatório foi gerado a partir de uma autoavaliação preenchida pelo próprio usuário, processada por sistema automatizado baseado em método clínico. Não constitui diagnóstico médico nem substitui consulta presencial. Em caso de emergência, ligue 192 (SAMU)."*
- Só inclui quando `type === 'premium'` ou autoavaliação sem profissional vinculado.

### 3. Renomear "Diagnóstico" → "Hipótese preliminar" (paciente)
Substituições em UI voltada ao paciente:
- `src/locales/pt.json`, `en.json`, `es.json` — chaves de `diagnosis.*`, labels de cards, títulos.
  - PT: "Diagnóstico" → "Hipótese preliminar"; "Diagnóstico Preliminar" → "Hipótese Preliminar"
  - EN: "Diagnosis" → "Preliminary Hypothesis"
  - ES: "Diagnóstico" → "Hipótesis preliminar"
- `src/components/assessment/DiagnosisResult.tsx` — títulos visíveis.
- `src/components/assessment/AssessmentSummaryView.tsx` — labels.
- `src/components/dashboard/AssessmentComparison.tsx` — já usa "hypothesis".
- **Não alterar:** nomes de colunas/tabelas/funções/edge functions (`diagnosis`, `generate-diagnosis`, etc.) para não quebrar backend.
- **Não alterar:** UI exclusivamente profissional/clínica (mantém "diagnóstico"/"hipótese clínica" conforme já está) — risco de confundir clínico.

### 4. Aviso persistente de emergência
- **Arquivo novo:** `src/components/EmergencyBanner.tsx` — faixa discreta com ícone telefone:
  *"Emergência? Ligue 192 (SAMU)"* + link tel:.
- Renderizar:
  - Rodapé do `DiagnosisResult.tsx` (sempre que mostrar hipótese ao paciente).
  - Rodapé do `TreatmentPlan.tsx`.
  - `SelfAssessmentDisclaimerSection.tsx` (já tem texto — só reforçar com ícone clicável `tel:192`).

## Detalhes técnicos
- Sem mudanças de schema, sem migrations.
- Sem mexer em edge functions.
- Sem mexer em fluxos de pagamento.
- i18n: garantir que todas as 3 línguas tenham a chave atualizada para evitar fallback exibindo a chave.
- Build esperado: zero erros TypeScript.

## Fora do escopo (preservado)
- Termos técnicos em prontuário profissional, edge functions, nomes de tabelas/colunas (`diagnosis` no DB), nomes de arquivos.
- Fluxo de clínica/profissional (já tem responsável clínico identificado).
