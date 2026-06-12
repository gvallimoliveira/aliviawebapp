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
