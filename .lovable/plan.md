

# Implementação: HEP, White-label, Reavaliação Expressa e Notificação Push

## Visão geral

Quatro funcionalidades novas para o fluxo profissional:
1. **HEP** — Programa de Exercícios Domiciliares com banco pré-cadastrado e link público
2. **White-label** — Logo do profissional na tela de avaliação e nos PDFs
3. **Reavaliação Expressa** — Botão no painel que gera link pré-preenchido
4. **Notificação Push** — Alerta ao profissional quando paciente completa avaliação

---

## 1. HEP — Programa de Exercícios Domiciliares

### Banco de dados
- Nova tabela `exercise_library`: `id`, `name_pt`, `name_en`, `name_es`, `description_pt/en/es`, `body_region` (text), `category` (text: "strengthening", "stretching", "mobility", "proprioception"), `video_url` (text, YouTube/Instagram embed), `thumbnail_url` (text), `difficulty` ("beginner"/"intermediate"/"advanced"), `created_at`
- Nova tabela `exercise_programs`: `id`, `professional_id` (uuid), `assessment_id` (uuid, nullable), `patient_name` (text), `token` (text unique, gerado via `gen_random_uuid()`), `notes` (text), `created_at`, `expires_at` (timestamp, default 90 dias)
- Nova tabela `exercise_program_items`: `id`, `program_id` (uuid FK → exercise_programs), `exercise_id` (uuid FK → exercise_library), `sets` (text), `reps` (text), `frequency` (text), `observations` (text), `sort_order` (int)
- RLS: profissionais leem/criam seus programas; leitura pública por token (anon SELECT com filtro por token)
- Seed inicial: ~30 exercícios comuns (fortalecimento de quadril, alongamento de isquiotibiais, mobilidade de ombro, etc.) com links de vídeo do YouTube de canais públicos de fisioterapia

### Frontend
- Nova rota `/hep/:token` — página pública, mobile-friendly, sem login. Mostra nome do paciente, lista de exercícios agrupados por categoria, com embed de vídeo, séries/reps e observações
- No `PatientEvolutionDashboard.tsx` (detalhes do paciente): botão "Criar Programa de Exercícios" que abre um modal/drawer
- Modal de criação: barra de busca no banco de exercícios, filtros por região/categoria, seleção múltipla, campos de séries/reps/frequência por exercício, campo de observações gerais, botão "Gerar Link"
- Após criar: exibe link copiável e botão "Enviar via WhatsApp"

### Arquivos novos
- `src/pages/ExerciseProgram.tsx` — página pública /hep/:token
- `src/components/dashboard/CreateExerciseProgramModal.tsx` — modal de criação

### Arquivos alterados
- `src/App.tsx` — nova rota `/hep/:token`
- `src/components/dashboard/PatientEvolutionDashboard.tsx` — botão "Criar Programa"

---

## 2. White-label — Logo na Avaliação e PDFs

### Tela de avaliação (`ProfessionalAssessment.tsx`)
- No `useEffect` de verificação do profissional, incluir `logo_url` no SELECT
- No header da página, se `professional.logo_url` existir, exibir a logo do profissional ao lado ou no lugar da logo Aliv.iA (lado direito do header, espelhando a posição do PDF)
- Manter a logo Aliv.iA à esquerda, adicionar logo do profissional à direita

### PDFs (já parcialmente implementado)
- Verificar se `professionalLogoUrl` já está sendo usado no `generatePdf.ts` — conforme memória, já existe no cabeçalho e rodapé do PDF profissional
- Garantir consistência: logo no header (canto superior direito) e footer (canto inferior direito)

### Arquivos alterados
- `src/pages/ProfessionalAssessment.tsx` — SELECT inclui `logo_url`, header exibe logo
- `src/utils/generatePdf.ts` — confirmar/ajustar posicionamento (se necessário)

---

## 3. Reavaliação Expressa

### Lógica
- Na página de detalhes do paciente (`PatientEvolutionDashboard.tsx`), adicionar botão "Reavaliação Expressa"
- Ao clicar, gera um link de avaliação profissional com query param `?reassessment=<assessmentId>`
- Na `ProfessionalAssessment.tsx`, se `reassessment` param existir:
  - Buscar a avaliação original no DB
  - Pré-preencher `patientName`, `patientEmail`
  - Pular etapa de Red Flags (assumir que já foi triado)
  - Pré-selecionar regiões de dor na anamnese (usuário pode ajustar)
  - Setar `original_assessment_id` na nova avaliação (campo já existe na tabela)

### Arquivos alterados
- `src/pages/ProfessionalAssessment.tsx` — ler query param, carregar dados originais, pular red flags, pré-preencher
- `src/components/dashboard/PatientEvolutionDashboard.tsx` — botão "Reavaliação Expressa" que gera link
- `src/components/assessment/AnamnesisForm.tsx` — aceitar props de pré-preenchimento (regiões, queixa)

---

## 4. Notificação Push ao Profissional

### Lógica
- Quando o paciente completa a avaliação via link profissional (`ProfessionalAssessment.tsx`, step `thank_you`), fazer uma chamada à edge function `send-push-notification`
- Precisa do `user_id` do profissional (buscar via `professionals.user_id` usando `professional_id`)
- Payload: título "Avaliação concluída", body "O paciente {nome} completou a avaliação", url "/dashboard"

### Implementação
- Na `ProfessionalAssessment.tsx`, após `updateAssessment` com `status: "completed"`, invocar `send-push-notification` com o `user_id` do profissional
- O profissional precisa ter ativado push notifications (já tem o sistema de opt-in no dashboard)

### Arquivos alterados
- `src/pages/ProfessionalAssessment.tsx` — chamar `send-push-notification` após completion

---

## Resumo de migrações DB

1. Tabela `exercise_library` + seed de ~30 exercícios
2. Tabela `exercise_programs` com RLS
3. Tabela `exercise_program_items` com RLS

## Ordem de implementação sugerida

1. **Notificação Push** (menor esforço, alto valor imediato)
2. **White-label** (menor esforço, alto valor percebido)
3. **Reavaliação Expressa** (esforço médio, alto valor clínico)
4. **HEP** (maior esforço, requer seed de exercícios + UI complexa)

