# Upload de Avaliação Externa

Permitir que o profissional envie um PDF ou imagem de uma avaliação feita fora do Aliv.iA. A IA interpreta, mapeia para o nosso padrão (anamnese, dor, ROM, força, testes, questionários, diagnóstico, impressão clínica) e cria uma avaliação nativa no prontuário do paciente. O que não couber nos campos vai para um bloco novo "Informações externas adicionais".

## UX

1. **Entrada**: novo item no menu "Mais ações" (três pontinhos) do `PatientDetailView` — *"Upload de avaliação externa"* (ícone `FileUp`). Disponível para PRO/Clínica, oculto no modo demo (mostra DemoShield com mock).

2. **Modal `ExternalAssessmentUploadModal`** com 3 etapas:
   - **Etapa 1 — Upload**: dropzone aceitando `.pdf, .jpg, .jpeg, .png, .webp, .heic` (até 20MB, igual ao limite de patient files). Texto orientando: "Envie o arquivo de uma avaliação externa. A IA vai interpretar e organizar dentro do padrão Aliv.iA para sua revisão antes de salvar." Botão "Interpretar com IA".
   - **Etapa 2 — Revisão**: loading com `ClinicalThinkingSkeleton`, depois exibe **todos os campos do nosso padrão pré-preenchidos** em formato editável (reaproveita os mesmos sub-componentes do `ManualAssessmentModal`: anamnese, mapa de dor + refinamentos, ROM, força, testes funcionais, questionários sugeridos, diagnóstico, impressão clínica). Campos sem correspondência ficam vazios com badge "sem dados externos" e um bloco final **"Informações externas adicionais"** (textarea) com tudo que a IA não conseguiu mapear. Cada campo preenchido pela IA recebe badge "IA · externo" para o usuário saber que precisa revisar.
   - **Etapa 3 — Confirmar**: salva como uma `assessments` row normal (mesmo schema da manual), com flag `source: "external_upload"` em `anamnesis_data`, o arquivo original anexado em `patient_files`, e segue o fluxo nativo (vira parte do timeline, gera PDF, entra em comparativos, etc).

3. **Visualização (`AssessmentView`)**: quando `anamnesis_data.source === "external_upload"`, mostra:
   - Badge no topo "Avaliação externa interpretada por IA" + link para baixar o arquivo original.
   - Renderização normal das seções; seções sem dados aparecem ao final agrupadas em **"Sem dados externos existentes"** (colapsável).
   - Novo bloco **"Informações externas adicionais"** entre o diagnóstico e o tratamento.

## Backend

Nova edge function `interpret-external-assessment`:
- Input: arquivo (base64) + mime + `language` + `patientId`.
- Modelo: `google/gemini-2.5-flash` (multimodal nativo p/ PDF e imagem) via `callAiWithFallback`, com fallback para `gemini-2.5-pro` quando o PDF é grande.
- System prompt instrui a IA a:
  - extrair anamnese (queixa, início, evolução, fatores, padrão de dor, score VAS, regiões — usando nossos IDs do `painMapData`);
  - extrair ROM, força/dinamometria (tabelas L/R), testes funcionais, escores de questionários reconhecidos (mapear pelos nomes de `questionnaireData.ts`);
  - propor hipótese diagnóstica + resumo + raciocínio (mesmo schema do `generate-diagnosis`);
  - gerar `clinicalImpression` (overview + 2 objetivos da nossa lista, igual `generate-clinical-impression`);
  - jogar em `additionalExternalInfo` (string) tudo que sobrar.
- Output via tool-calling com schema único cobrindo todos os campos acima. Validação: campos não reconhecidos não vão para o JSON estruturado, mas para `additionalExternalInfo`.

## Storage

- Reaproveita o bucket atual de `patient_files` (`patient-files`, 20MB cap já no memory). O arquivo original é gravado em `patient_files` com `category: "external_assessment"` e o `id` referenciado em `anamnesis_data.externalSourceFileId` para download a partir da `AssessmentView`.

## Schema

Sem migração nova. Reaproveita `assessments` (mesmas colunas da manual). Campos novos vivem dentro de `anamnesis_data` (JSON):
- `source: "external_upload"`
- `externalSourceFileId: <patient_files.id>`
- `additionalExternalInfo: string`
- `aiInterpretedFields: string[]` (lista dos campos preenchidos pela IA, p/ badges na revisão e na view)

## Integrações que continuam funcionando automaticamente

- Timeline, comparativos, follow-up, PDF, WhatsApp, Final Hypothesis override, Agente Clínico (pois é uma `assessment` nativa).
- Questionários sugeridos: se a IA identificar escores, eles entram em `test_results` no mesmo formato; senão, a aba de pendentes continua funcionando.
- Diagnostic confidence badge: a IA marca como `"sob ressalva"` quando o material externo for insuficiente (segue regra do memory de safety/dismissal).

## Modo demo

Mock determinístico em `mockManualAssessmentCase.ts` (novo `MOCK_EXTERNAL_INTERPRETATION`) para que o DemoShield preencha o modal sem chamar IA real.

## Arquivos a criar / editar

**Criar**
- `src/components/dashboard/ExternalAssessmentUploadModal.tsx`
- `supabase/functions/interpret-external-assessment/index.ts`
- `src/data/mockExternalAssessment.ts`

**Editar**
- `src/components/dashboard/patient-evolution/PatientDetailView.tsx` — novo `DropdownMenuItem` "Upload de avaliação externa" + estado para abrir o modal.
- `src/pages/AssessmentView.tsx` — badge "externa", link do arquivo, bloco "Informações externas adicionais", agrupador "Sem dados externos existentes".
- `src/utils/generatePdf.ts` — espelhar os 2 blocos acima no PDF.
- `src/locales/{pt,es,en}.json` — strings.
- `src/pages/Support.tsx` + `src/pages/ClinicSupport.tsx` (pt/en/es) — documentação da nova ação (regra de memory).
- `mem://features/...` — salvar nova memória `external-assessment-upload`.

## Pontos a confirmar antes de implementar

1. **Escopo de acesso**: liberar para PRO solo + Clínica (owner + therapist) e bloquear para Premium B2C/paciente? (Faz sentido só para profissional, mas confirmo.)
2. **Quando a IA não consegue interpretar quase nada** (ex.: imagem ilegível): aborta com mensagem de erro ou cria avaliação só com `additionalExternalInfo`?
3. **Custo**: cada upload consome créditos AI (multimodal). Mostro estimativa/aviso antes de processar?
