

## Plano

Duas funcionalidades novas para o painel profissional/clínica:

### 1. Upload de Fotos do Paciente (avaliação postural / acompanhamento)

Espelhar o componente `PatientFilesSection.tsx` (PDFs) criando um novo `PatientPhotosSection.tsx` para imagens.

**Backend:**
- Nova tabela `patient_photos` (mesma estrutura de `patient_files` + campo `category`: 'postural' | 'follow_up' | 'other')
- Bucket privado `patient-photos` com RLS espelhando `patient-files`
- Limite: 30 fotos por paciente, 10MB cada, formatos JPG/PNG/WEBP
- Políticas RLS: clínica vê fotos da clínica; profissional autônomo vê suas fotos

**Frontend:**
- `src/components/dashboard/PatientPhotosSection.tsx` — upload, grid de miniaturas (3 col), preview em modal (lightbox), categoria selecionável, exclusão
- Integrar no mesmo lugar onde `PatientFilesSection` é usado (página do paciente / `AssessmentView`)

### 2. Avaliação Manual ("Surpresa") preenchida pelo fisioterapeuta

Ao adicionar um paciente direto pela lista (`AddPatientModal`), oferecer botão **"Criar avaliação manual"** que abre um fluxo completo de preenchimento.

**Novo componente:** `src/components/dashboard/ManualAssessmentModal.tsx` (multi-step, em Tabs/Stepper):

| Etapa | Conteúdo | Reaproveita |
|---|---|---|
| 1. Anamnese | Formulário completo (queixa, histórico, dor, localização, intensidade, fatores agravantes/aliviantes, medicações, cirurgias, etc.) | Reusa `AnamnesisForm.tsx` em modo "manual" |
| 2. Mapa de Dor | Selecionar regiões no `PainMapView` | Reusa `PainMap.tsx` |
| 3. Red Flags | Triagem rápida (checkboxes) | Reusa `RedFlagScreening.tsx` |
| 4. Questionários | Profissional escolhe quais aplicar (Roland-Morris, Oswestry, NDI, etc.) e preenche pontuação OU marca como "aplicar depois" | Reusa `QuestionnaireStep.tsx` + lista de `questionnaireData.ts` |
| 5. Testes Funcionais | Campo de texto livre + checklist de testes feitos com resultado (positivo/negativo/observação) | Adapta `FunctionalTests.tsx` para entrada manual |
| 6. Observações & Diagnóstico | Campo livre para impressão clínica + botão "Gerar diagnóstico com IA" (chama `generate-diagnosis` edge function existente) | Reusa edge function |
| 7. Plano de Tratamento | Botão "Gerar plano com IA" ou preencher manual | Reusa `generate-treatment` |

**Salvamento:**
- Insere em `assessments` com `type='professional'`, `status='completed'`, `professional_id` ou `clinic_id`, `anamnesis_data`, `pain_regions`, `pain_score`, `test_results`, `red_flags`, `diagnosis`, `treatment_plan`, `patient_name`, `patient_email`
- Marca `anamnesis_data.manualEntry = true` para diferenciar de avaliações via link
- Após salvar, abre direto o `AssessmentView` do paciente

**Trigger no `AddPatientModal`:**
- Após `Adicionar`, exibir toast com 2 ações: "Ver lista" / "Criar avaliação agora" → abre `ManualAssessmentModal`
- Também adicionar botão **"Nova avaliação manual"** no card de cada paciente na lista (para casos onde paciente já existe)

### Arquivos a criar/editar

**Criar:**
- `src/components/dashboard/PatientPhotosSection.tsx`
- `src/components/dashboard/ManualAssessmentModal.tsx`
- Migration: tabela `patient_photos` + bucket `patient-photos` + RLS

**Editar:**
- `src/components/dashboard/AddPatientModal.tsx` — toast com ação pós-criação
- `src/pages/AssessmentView.tsx` (ou onde `PatientFilesSection` é renderizado) — incluir `PatientPhotosSection`
- Lista de pacientes no `ProDashboard`/`ClinicOwnerDashboard` — botão "Avaliação manual"
- `src/locales/pt.json` / `en.json` / `es.json` — strings novas

### Pontos de design
- Manual assessment usa o mesmo layout/UI dos passos do link público para consistência visual
- Validação mínima: apenas nome do paciente é obrigatório; etapas podem ser puladas
- IA opcional em diagnóstico e tratamento (não bloqueia salvar)
- Fotos: respeitar privacidade — bucket privado, signed URLs de 60s

