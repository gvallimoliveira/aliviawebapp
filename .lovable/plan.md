# Diretrizes Profissionais para Dor Crítica (≥6) no Plano de Tratamento

## Resumo

Adicionar ao prompt do `generate-treatment` um bloco condicional ativado quando `mode === "professional"` que inclui orientações de terapia manual e recursos físicos para pacientes com dor ≥ 6 ou presença de edema. O bloco instruirá a IA a gerar uma seção extra `professionalGuidelines` no JSON de resposta, que será renderizada apenas no componente `TreatmentPlan` quando o modo for profissional.

## Conteúdo clínico a incluir (apenas modo profissional)

**Para dor ≥ 6:**

- TENS (convencional e burst)
- Termoterapia por adição (calor superficial) ou Tecarterapia (calor profundo)
- Liberação miofascial
- Mobilização articular Maitland graus 1-2 da região queixosa
- Manobras de mobilização articular de Mulligan (MWM/SNAG quando aplicável)
- Fonoforese com ultrassom terapêutico
- Terapia combinada (TENS + ultrassom)
- Laser de baixa intensidade com entrega de energia alta (espectro de inibição — Lei de Arndt-Schultz)

**Para presença de edema:**

- Drenagem manual linfática
- Drenagem de edema em articulações de MMII associada a TENS 2Hz com elevação de membros inferiores

**Observação:** Sem parâmetros específicos — cabe ao fisioterapeuta ajustar. São diretrizes e sugestões.

## Alterações técnicas

### 1. Edge Function `generate-treatment/index.ts`

- Detectar `mode === "professional"` e `painScore >= 7` ou presença de edema na anamnese
- Adicionar bloco de instruções no `systemPrompt` para gerar campo `professionalGuidelines` (array de objetos com `category`, `technique`, `indication`, `notes`)
- Incluir no JSON schema de resposta o campo opcional `professionalGuidelines`

### 2. Componente `TreatmentPlan.tsx`

- Adicionar prop `mode?: string`
- Renderizar seção "Diretrizes para o Profissional" quando `plan.professionalGuidelines` existir e `mode === "professional"`
- Card com ícone diferenciado (Stethoscope), fundo distinto, listando as técnicas sugeridas

### 3. Componente `TreatmentPlanData` interface

- Adicionar `professionalGuidelines?: ProfessionalGuideline[]` à interface

### 4. Chamadores do componente

- `ProfessionalAssessment.tsx` e `AssessmentView.tsx` — passar `mode="professional"` ao `TreatmentPlan`

### 5. Traduções (pt/en/es)

- Chaves para título da seção e categorias das técnicas

## Arquivos a alterar

1. `supabase/functions/generate-treatment/index.ts`
2. `src/components/assessment/TreatmentPlan.tsx`
3. `src/pages/ProfessionalAssessment.tsx` — passar mode
4. `src/pages/AssessmentView.tsx` — passar mode
5. `src/locales/pt.json`, `en.json`, `es.json`