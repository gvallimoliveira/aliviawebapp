## Problema

Hoje a reavaliação só copia uma fração do `anamnesis_data` da avaliação de origem: queixas, onset, cirurgia, atividade e dados demográficos. Tudo que o profissional preencheu na **Avaliação Manual** (tipo de dor, duração, padrão, frequência semanal, despertar noturno, fatores de piora/alívio, refinamentos do mapa de dor, irradiação, inchaço, dados de cefaleia, etc.) é descartado. Resultado: o paciente do Luiz Eduardo respondeu tudo do zero, ignorando o trabalho clínico já feito.

A correção é estrutural: a reavaliação deve enxergar a avaliação de origem como **fonte de verdade** para qualquer campo estável, sem ancorar variáveis sensíveis (EVA).

## O que vai mudar

### 1. Expandir `prefilledExtras` (`ProfessionalAssessment.tsx` + `ClinicAssessment.tsx`)

Acrescentar ao objeto montado a partir de `originalAssessment.anamnesis_data`:

**Caracterização da dor**
- `painType`, `painTypes`
- `painDuration`
- `painPattern`
- `painWeeklyFrequency`
- `painNightWaking`
- `evolution`
- `aggravatingFactors`, `relievingFactors`

**Mapa de dor (refinamento)**
- `painSubArea` (já incluso, manter)
- `painRegionRefinements`
- `painTypesPerRegion`

**Histórico clínico estável (completar o que faltou)**
- `hadTwist`, `hadSprain`, `hadDislocation` (já parciais, garantir)
- `hasLocalSwelling`, `hasScapulaPain`
- `ottawaPositive`

**Cefaleia**
- `hasPhotophobia`, `hasVisualAura`, `hasNausea`, `headacheCrisisFrequency` (já inclusos, manter)

**NÃO pré-preencher** (variáveis sensíveis da reavaliação)
- `painScore` / `painScoresPerRegion` / `painScoreMode` — paciente responde do zero
- Red flags — sempre re-triadas (já é o comportamento)

### 2. EVA anterior visível, slider neutro

No componente do slider EVA dentro de `AnamnesisForm.tsx`:
- Aceitar nova prop opcional `previousPainScore?: number` (passada pelas páginas de avaliação quando há `reassessmentId`).
- Renderizar, abaixo do label, um chip discreto: `Última avaliação: 7/10` (com tradução pt/en/es).
- Slider continua iniciando no valor neutro padrão atual — **sem ancoragem**.
- Se `painScoreMode === 'per_region'`, mostrar o anterior por região na linha de cada região.

### 3. Destaque visual "da avaliação anterior"

Em `AnamnesisForm.tsx`:
- Calcular um `Set<string>` `prefilledFieldKeys` no `useEffect` que aplica `initialExtras` + demais `initialX`. Cada campo realmente pré-preenchido entra no set.
- Helper local `<PrefilledBadge />`: badge `text-[10px]` com fundo `bg-primary/5` e texto `text-primary/70`, label "Da avaliação anterior" / "From previous assessment" / "De la evaluación anterior".
- Aplicar badge ao lado do label dos campos cujo `key` está no set. Leve realce visual: borda `border-primary/30` no controle enquanto valor === valor pré-preenchido. Ao usuário editar, a borda volta ao normal (sinaliza confirmação/alteração).

### 4. Persistir corretamente no submit da reavaliação

Já existe `mergeAnamnesisWithOriginal` em `src/lib/reassessmentSteps.ts`. Garantir que os novos campos pré-preenchidos sejam **mantidos** no `anamnesis_data` salvo da reavaliação mesmo que o paciente apenas confirme (não digite nada). Isso já acontece porque viram parte de `formData`, mas vamos validar lendo o submit handler.

### 5. i18n

Adicionar 3 chaves novas em `src/locales/pt.json` / `en.json` / `es.json`:
- `assessment.prefilled.badge` — "Da avaliação anterior"
- `assessment.prefilled.lastPainScore` — "Última EVA: {{value}}/10"
- `assessment.prefilled.lastPainScoreRegion` — "Última EVA ({{region}}): {{value}}/10"

## Detalhes técnicos

```text
ProfessionalAssessment / ClinicAssessment
        │
        │ (reassessmentId)
        ▼
   originalAssessment.anamnesis_data
        │
        ├──► prefilledExtras (expandido)  ──► AnamnesisForm.initialExtras
        ├──► previousPainScore             ──► AnamnesisForm (chip, sem ancorar)
        └──► previousQuestionnaireAnswers (já existe)
```

Arquivos tocados:
- `src/pages/ProfessionalAssessment.tsx` — expandir `setPrefilledExtras({...})` e adicionar `previousPainScore`.
- `src/pages/ClinicAssessment.tsx` — mesmo conjunto de mudanças.
- `src/components/assessment/AnamnesisForm.tsx` — aceitar `previousPainScore`, rastrear `prefilledFieldKeys`, renderizar badge + chip de EVA anterior.
- `src/lib/reassessmentSteps.ts` — conferir/garantir merge dos novos campos quando o sub-step `complaint` ou `painmap` estiver desabilitado.
- `src/locales/{pt,en,es}.json` — novas chaves.

Sem migrations. Sem novas tabelas. Sem mudança em edge functions.

## Validação

1. Abrir avaliação manual existente do Luiz Eduardo (admin).
2. Gerar link de reavaliação.
3. Conferir no fluxo do paciente que vêm pré-preenchidos: onset, tipo de dor, duração, padrão, frequência, despertar noturno, fatores, sub-área, refinamentos por região, cefaleia e histórico estável — todos com badge "Da avaliação anterior".
4. Conferir EVA: slider neutro + chip "Última EVA: X/10" visível.
5. Submeter sem editar nada → confirmar que `anamnesis_data` persistido contém todos os campos.
