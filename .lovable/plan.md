## Objetivo

Adicionar questionários validados de **cardiorrespiratória** (mMRC, CAT, Borg CR10) e **geriatria** (TUG, Berg, SPPB, FES-I) ao fluxo PRO/Clínica, sugeridos pela IA com base na anamnese, **selecionáveis** pelo fisio para não estender demais a avaliação, com possibilidade de **retomar depois** (presencial ou via link enviado ao paciente) e **regenerar a impressão clínica** automaticamente.

---

## 1. Catálogo de questionários (novo)

Criar `src/data/specialtyQuestionnaires.ts` no mesmo formato de `questionnaireData.ts`:

- **Cardio**: mMRC (1 item, dispneia), CAT (8 itens, impacto da DPOC), Borg CR10 (1 item, percepção de esforço).
- **Geriatria**: FES-I (16 itens, medo de cair), TUG (teste cronometrado — input único em segundos), Berg (14 itens de equilíbrio), SPPB (3 subtestes cronometrados).

Cada item inclui: id, domínio (`cardio` / `geri`), gatilhos clínicos, tempo médio de aplicação e regras de interpretação do score.

## 2. Sugestão pela IA

Nova edge function `suggest-specialty-questionnaires`:
- Recebe `anamnesis`, `painRegions` e `age`.
- Reaproveita o helper `shouldIncludePedroKnowledge` (já existente) para decidir domínio (cardio, geri, ambos ou nenhum).
- Retorna até 3 sugestões: `[{ id, domain, reason, priority }]`.

## 3. Tela de seleção (somente fluxo manual PRO/Clínica)

Novo step **após** o `QuestionnaireStep` padrão, apenas em `ProfessionalAssessment.tsx` e `ClinicAssessment.tsx`:

- Card "Questionários especializados sugeridos" com badges (Cardio / Geri).
- Cada item mostra: nome, motivo da sugestão (ex.: "Paciente >65a + queixa de dispneia"), tempo estimado e **checkbox**.
- Botões: **"Aplicar agora"** (entra no fluxo) ou **"Aplicar depois"** (salva como pendente no prontuário).
- Se a IA não retornar sugestões, o step é pulado silenciosamente.
- Avaliações self-service do paciente **não** são afetadas.

## 4. Tabela `pending_questionnaires` (nova)

Colunas:
```
id, assessment_id, patient_id, professional_id, clinic_id,
questionnaire_id, domain, suggested_reason,
status ('pending' | 'completed' | 'skipped'),
answers jsonb, score jsonb,
completed_at, completed_via ('in_session' | 'patient_link' | 'manual_later'),
created_at, share_token (para link público)
```
+ GRANTs + RLS (fisio dono / membro da clínica / paciente dono).

## 5. Prontuário — card "Questionários pendentes"

Em `PatientDetailDialog` (e equivalente da clínica):
- Card com badge de contador.
- Para cada pendente, duas ações:
  - **"Preencher agora"** abre modal com o questionário no consultório.
  - **"Enviar link ao paciente"** gera short-link com `share_token` e copia para WhatsApp.
- Nova rota pública `/q/:token` para o paciente responder sem login; ao salvar, marca como completo.

## 6. Regeneração automática da impressão clínica

Ao marcar um questionário como `completed`:
- Setar flag `assessment.needs_reimpression = true`.
- O frontend, ao abrir o prontuário, detecta a flag e dispara `generate-clinical-impression`, substituindo a impressão atual (mantendo histórico/versão).
- Decisão técnica: flag + disparo no front, em vez de webhook assíncrono — mais simples e evita custo de `pg_net`.

## 7. Integração com diagnóstico e tratamento

- `generate-diagnosis` e `generate-treatment` passam a receber `specialty_scores` no prompt quando existirem.
- A `PEDRO_KNOWLEDGE_BASE` continua sendo injetada condicionalmente como hoje.

## 8. PDF

Scores especializados concluídos entram em uma nova seção **"Avaliação funcional especializada"**, abaixo dos questionários padrão, respeitando o limite de 158mm.

## 9. Páginas de suporte

Atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) com a nova funcionalidade, conforme regra de manutenção.

---

## Detalhes técnicos

- Step de seleção custa, no máximo, ~5s extras (apenas checkboxes).
- Self-service do paciente segue inalterado — questionários especializados nunca aparecem fora do fluxo manual PRO/Clínica.
- 1 nova tabela com GRANTs e RLS; nenhuma dependência nova.

---

## Arquivos afetados

**Novos**
- `src/data/specialtyQuestionnaires.ts`
- `src/components/assessment/SpecialtyQuestionnaireSelector.tsx`
- `src/components/assessment/PendingQuestionnairesCard.tsx`
- `src/pages/PublicQuestionnaire.tsx` (rota `/q/:token`)
- `supabase/functions/suggest-specialty-questionnaires/index.ts`
- Migration: `pending_questionnaires` + GRANTs + RLS + flag `needs_reimpression`

**Editados**
- `src/pages/ProfessionalAssessment.tsx`, `src/pages/ClinicAssessment.tsx` (novo step)
- `src/components/dashboard/PatientDetailDialog.tsx` (card de pendentes + trigger de regeneração)
- `supabase/functions/generate-diagnosis/index.ts`, `generate-treatment/index.ts` (consumir `specialty_scores`)
- `supabase/functions/generate-clinical-impression/index.ts` (consumir novos scores)
- `src/utils/generatePdf.ts` (nova seção)
- `src/App.tsx` (rota pública)
- `Support.tsx` + `ClinicSupport.tsx` + `src/locales/{pt,en,es}.json`

---

## Fora do escopo
- Auto-regeneração via webhook (ficará com flag + disparo no front).
- Aplicação dos questionários especializados em modo self-service do paciente.
