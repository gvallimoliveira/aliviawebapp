

# Ajustes na Anamnese: Cabeça, Frequência, Cirurgia e Dor por Região

## Resumo

Quatro ajustes na anamnese que enriquecem a coleta de dados sem quebrar o fluxo existente. Todas as mudanças se aplicam igualmente às avaliações de paciente e link profissional.

---

## 1. Cabeça como combinação válida com cervical/costas/lombar + perguntas de enxaqueca

**Problema:** "Dor de cabeça" (`headache`) está no `upperGroup` mas não faz parte das combinações cross-group permitidas. Cervical + cabeça é clinicamente relevante (cervicalgia tensional).

**Solução:**
- Expandir `spinalPair` para incluir `headache`: `["neck_pain", "back_pain", "headache"]` — renomear para `spinalHeadGroup` (qualquer subconjunto deste grupo é permitido)
- Criar um novo step condicional `"migraine_screening"` que aparece quando `headache` + `neck_pain` estão ambos selecionados (sem outros)
- Perguntas do screening (baseadas em critérios ICHD-3 para enxaqueca sem aura):
  - Fotofobia (sim/não)
  - Presença de auras visuais (sim/não)
  - Enjoo/náusea durante crises (sim/não)  
  - Frequência de crises (diária, semanal, mensal, esporádica)
- Novos campos no `AnamnesisData`: `hasPhotophobia`, `hasVisualAura`, `hasNausea`, `headacheCrisisFrequency`
- Step inserido após `region_detail` (ou após `painmap` se não houver region_detail)

## 2. Frequência e padrão da dor (SINSS - Mulligan)

**Problema:** Falta informação sobre se a dor é contínua (24h) ou intermitente e a frequência semanal.

**Solução:**
- Adicionar novo step `"pain_frequency"` após `"duration"` no `buildStepSequence`
- Perguntas:
  - **Padrão:** Contínua (24h) ou Intermitente (vem e vai)
  - **Frequência semanal** (se intermitente): Todos os dias, 4-6x/semana, 2-3x/semana, 1x/semana ou menos
  - **Intensidade noturna** (conceito SINSS): A dor te acorda durante a noite? (Sim, frequentemente / Às vezes / Não)
- Novos campos: `painPattern` ("continuous" | "intermittent"), `painWeeklyFrequency`, `painNightWaking`
- Esses dados alimentam o raciocínio do `generate-diagnosis` e `generate-clinical-impression` (adicionar ao prompt)
- Incluir na seção de anamnese do PDF

## 3. Disclaimer na pergunta de cirurgia

**Mudança simples:** Adicionar texto explicativo abaixo do título da etapa `surgery`:
- PT: "Considere qualquer cirurgia prévia, não apenas na região da queixa atual."
- EN: "Consider any prior surgery, not just in the current complaint area."
- ES: "Considere cualquier cirugía previa, no solo en el área de la queja actual."
- Nova chave de tradução: `anamnesis.surgery_disclaimer`

## 4. Nota de dor por região (múltiplas regiões)

**Problema:** Quando múltiplas regiões são selecionadas, a nota de dor é única e genérica.

**Solução:**
- No step `painscore`, se `data.painRegions.length > 1` (ou `chiefComplaints.length > 1`), exibir pergunta inicial:
  - "Deseja atribuir uma nota geral ou notas diferentes por região?"
  - Opções: "Nota geral" / "Notas por região"
- Novo campo: `painScoreMode` ("general" | "per_region"), `painScoresPerRegion: Record<string, number>` (mapa região → nota)
- Se "por região":
  - Exibir uma régua VAS para cada região selecionada (com label da região)
  - Cada régua com cor distinta (paleta de 6 cores predefinidas)
  - Legenda visual abaixo mostrando qual cor = qual região
- Se "geral": comportamento atual inalterado
- No `pain_score` do banco: salvar a média (arredondada) para manter compatibilidade
- Salvar `painScoresPerRegion` dentro de `anamnesis_data` para acesso detalhado
- No PDF: se houver notas por região, exibir mini-tabela abaixo da VAS com região + nota + cor

---

## Arquivos a alterar

1. **`src/components/assessment/AnamnesisForm.tsx`** — novos campos na interface, novos steps (`migraine_screening`, `pain_frequency`), lógica de combinação de complaints, VAS por região, disclaimer de cirurgia
2. **`src/locales/pt.json`, `en.json`, `es.json`** — ~25 novas chaves de tradução
3. **`supabase/functions/generate-diagnosis/index.ts`** — incluir novos campos no prompt (frequência, padrão, screening de enxaqueca)
4. **`supabase/functions/generate-clinical-impression/index.ts`** — incluir novos campos no prompt
5. **`src/utils/generatePdf.ts`** — renderizar frequência/padrão da dor na anamnese, VAS por região, dados de enxaqueca
6. **`src/components/dashboard/PatientEvolutionDashboard.tsx`** — exibir notas por região no resumo da anamnese (se disponível)

## Ordem de execução

1. Interface `AnamnesisData` + lógica de steps (AnamnesisForm)
2. Traduções
3. Edge functions (diagnosis + clinical impression)
4. PDF
5. Dashboard (exibição)

