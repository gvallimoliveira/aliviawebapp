---
name: Student Access (Alivia Acadêmico)
description: Modo Estudante para alunos sem CREFITO; identifica o cadastro como acadêmico (selo no PDF/marketplace) mas NÃO concede acesso PRO — estudante precisa assinar PRO igual a qualquer profissional.
type: feature
---

⚠️ **Acesso PRO NÃO é gratuito para estudantes.** `is_student=true` apenas marca o perfil como acadêmico (selo, identificação no PDF, papel intern na clínica). Para usar funcionalidades PRO, estudante e profissional precisam de assinatura PRO ativa paga (`subscription_status='active'` com `subscription_stripe_id` ou `pro_access_expires_at` pago vigente). `lifetime_treatment` e `premium_granted` NÃO substituem assinatura do painel PRO. Única exceção gratuita: **parceiro acadêmico** habilitado pelo admin (`is_partner_account=true` E `is_student=true`). O toggle Acadêmico sozinho, dentro de uma conta já cadastrada na lista de parceiros, concede acesso às ferramentas como parceiro acadêmico e força `active_profile_mode='student'`; o toggle PRO (`is_partner`) permanece independente para parceiros profissionais. `check-pro-subscription` NÃO retorna `subscribed:true` por ser estudante comum; só retorna para assinatura Stripe ativa, anual pago vigente, parceiro PRO ou parceiro acadêmico.


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
- Tela de upgrade (assinatura inativa) mostra aviso de que o selo acadêmico não substitui assinatura PRO (sem cupom — SOUIBMR expirou em 19/06/2026).

---

## Dual perfil (PRO + Acadêmico simultâneos)

A partir da migração `active_profile_mode`, `is_student` virou **capacidade** ("acesso acadêmico liberado") e `active_profile_mode` (`'professional' | 'student'`) define qual identidade está em uso. Quando o parceiro tem CREFITO **e** `is_student=true`, ele escolhe o modo ativo via RadioGroup em `StudentAccessCard` (/minha-conta). Toggle do admin (PartnerManagement) liga/desliga apenas a capacidade; nunca força o modo. Trigger `validate_active_profile_mode` garante coerência: `mode='student'` exige `is_student=true`; ao desligar `is_student`, o modo volta automaticamente para `'professional'`.

Consumidores que decidem identidade visível (PDF, links públicos, marketplace `ProfessionalSearch`, banner em `ProDashboard`, `getResponsibleProfessional`, banners em `ProfessionalAssessment` e `ExerciseProgram`) leem `active_profile_mode` com fallback para `is_student`. RPCs `get_public_professional_assessment_link` e `get_clinic_members_with_details` retornam `active_profile_mode`. Admin (`get_partner_details`) também devolve `active_profile_mode` para exibir "operando como..." no card do parceiro.

---

## Exclusividade PRO × Acadêmico (parceiros)

Os toggles PRO e Acadêmico do painel de parceiros são **mutuamente exclusivos** (backend `manage-vip-users → toggle_partner_access` + estado otimista em `PartnerManagement.tsx`):
- Ligar Acadêmico: `is_student=true`, `active_profile_mode='student'`, `is_partner=false`.
- Ligar PRO: `is_partner=true`, `active_profile_mode='professional'`, `is_student=false`, limpa instituição/período e recria CREFITO placeholder `NNNNNN-X` se a linha estiver sem CREFITO (trigger exige para formado).

Rótulos: `check-pro-subscription` devolve `is_partner:false` + `is_academic_partner:true` para parceiro **apenas** acadêmico (acesso continua `subscribed:true`). `ProDashboard` mostra "Aliv.iA Acadêmico · Parceiro acadêmico" nesse caso, e `ProfessionalManagement.classifyClient` classifica como `student` antes de qualquer flag de parceiro.
