---
name: Student Access (Alivia Acadêmico)
description: Modo Estudante para alunos de fisioterapia sem CREFITO; libera ferramentas PRO com selo acadêmico
type: feature
---

Estudantes ativam "Acesso Estudante" em /minha-conta (StudentAccessCard). Ao ativar:
- `professionals.is_student = true`, `crefito = null` permitido (trigger pula validação).
- `professionals.approved` é forçado para false → fica fora do marketplace (ProfessionalSearch filtra `is_student=false`).
- Mini-form coleta: full_name, student_institution, student_period.
- `resolveResponsibleProfessional` carrega flags e devolve `isStudent / studentInstitution / studentPeriod`.
- PDF (`generatePdf.ts`): banner no topo "Alivia Acadêmico · ..." + bloco do responsável técnico mostra "Alivia Acadêmico · Instituição · Período" no lugar do CREFITO.
- Link público de avaliação (`ProfessionalAssessment.tsx`) mostra banner âmbar identificando avaliação acadêmica.
- `CrefitoCompletionBanner` é ocultado para estudantes.
- RPC `get_public_professional_assessment_link` retorna `is_student, student_institution, student_period`.

CREFITO trigger (`validate_crefito_format`):
- Estudante (`is_student=true`): CREFITO opcional.
- Profissional formado: CREFITO OBRIGATÓRIO (raise quando null/vazio) e formato `123456-F` validado.

Clínica (estagiário):
- Estudante pode ser adicionado à equipe da clínica com role `therapist` normalmente.
- RPC `get_clinic_members_with_details` devolve `is_student, student_institution, student_period`.
- `ClinicTeamManagement` exibe badge "Estagiário (Acadêmico)" + instituição/período ao lado do papel; ícone troca para GraduationCap.
- PDFs gerados pelo estagiário herdam o selo Alivia Acadêmico via `getResponsibleProfessional`.

Dashboard PRO:
- Badge "🎓 Alivia Acadêmico" no topo do dashboard ativo quando `professional.is_student=true` (mostra instituição/período).
- Tela de upgrade (assinatura inativa) mostra aviso destacando o cupom `SOUIBMR` (50% off) para estudantes.
