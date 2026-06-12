---
name: Student Access (Alivia Acadêmico)
description: Modo Estudante para alunos de fisioterapia sem CREFITO; libera ferramentas PRO com selo acadêmico, com trava para profissionais já formados (exceção VIP) e papel Estagiário na clínica.
type: feature
---

Estudantes ativam o modo por DUAS rotas equivalentes: (1) toggle "Sou estudante — Alivia Acadêmico" no topo do modal `/professional/register` (campos CREFITO/CPF/Instagram somem; aparecem Instituição + Período); (2) card "Acesso Estudante" em /minha-conta (StudentAccessCard). Ao ativar:
- `professionals.is_student = true`, `crefito = null` permitido (trigger pula validação).
- `professionals.approved` é forçado para false → fica fora do marketplace (ProfessionalSearch filtra `is_student=false`).
- Mini-form coleta: full_name, student_institution, student_period.
- `resolveResponsibleProfessional` carrega flags e devolve `isStudent / studentInstitution / studentPeriod`.
- PDF (`generatePdf.ts`): banner no topo "Alivia Acadêmico · ..." + bloco do responsável técnico mostra "Alivia Acadêmico · Instituição · Período" no lugar do CREFITO. Ambos truncados com `…` para respeitar `CONTENT_WIDTH` (170mm) e nunca vazar margem.
- Link público de avaliação (`ProfessionalAssessment.tsx`) mostra banner âmbar identificando avaliação acadêmica.
- `CrefitoCompletionBanner` é ocultado para estudantes.
- RPC `get_public_professional_assessment_link` retorna `is_student, student_institution, student_period`.

CREFITO trigger (`validate_crefito_format`):
- Estudante (`is_student=true`): CREFITO opcional.
- Profissional formado: CREFITO OBRIGATÓRIO (raise quando null/vazio) e formato `123456-F` validado.
- **TRAVA**: Se a row já tem `crefito` preenchido e tenta-se setar `is_student=true` (insert ou update transicional), a operação é bloqueada — exceto se `auth.users.email` estiver em `public.vip_users`. Mensagem: "Professional accounts with CREFITO cannot enable Student mode."
- VIPs alternam o toggle livremente; o update preserva `crefito` (nunca é zerado pela UI).

UI Estudante (`StudentAccessCard.tsx`):
- Faz fetch paralelo de `professionals` + `vip_users`.
- `locked = hasCrefito && !isVip` → bloqueia o card com alerta âmbar "Conta profissional já possui CREFITO. O modo Estudante não pode ser ativado."
- VIPs vêem badge "VIP · alternância livre" e texto "Conta de teste: alternar não apaga seu CREFITO nem seus dados."

Clínica (papel Estagiário):
- Enum `clinic_role` ganhou o valor `intern` (migration 2026-06-12). Mesmas permissões que `therapist` em todas as policies (assessments, patients, patient_files, patient_photos, session_notes) e storage policies (patient-files, patient-photos, clinic-logos). Contagens de KPI/benchmark contam `intern` como terapeuta.
- `ClinicTeamManagement.tsx`: select de papel inclui "Estagiário (Acadêmico)"; ícone GraduationCap; badge "Acadêmico" extra quando `is_student=true` e role≠intern (retrocompat).
- RPC `get_clinic_members_with_details` devolve `is_student, student_institution, student_period`.
- PDFs gerados pelo estagiário herdam o selo Alivia Acadêmico via `getResponsibleProfessional`.

Dashboard PRO:
- Badge "🎓 Alivia Acadêmico" no topo do dashboard ativo quando `professional.is_student=true` (mostra instituição/período).
- Tela de upgrade (assinatura inativa) mostra aviso destacando o cupom `SOUIBMR` (50% off) para estudantes.
