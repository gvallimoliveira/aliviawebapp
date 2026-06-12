## 1. PDF Acadêmico — auditoria de margens

Validação do banner "Alivia Acadêmico" em `generatePdf.ts` (linhas 1318–1336):

- Usa `MARGIN` e `CONTENT_WIDTH` (158mm), idênticos ao bloco do paciente e demais cards. ✓
- Altura fixa 10mm + 4mm de respiro abaixo — mesmo padrão dos outros blocos. ✓
- Texto cortado via `splitTextToSize(label, CONTENT_WIDTH - 12)[0]` evita overflow horizontal. ✓
- Bloco do responsável técnico (linhas 162–174) substitui CREFITO por linha única "Alivia Acadêmico · Instituição · Período" sem alterar Y/spacing. ✓

Ajuste único de segurança: trocar o truncamento bruto por um truncamento com reticências para nomes/instituições muito longos, mantendo a mesma altura e largura úteis.

## 2. Trava de acesso estudante (com exceção VIP)

Regra:
- Conta profissional **com CREFITO preenchido** não pode ativar `is_student` — exceto se o e-mail estiver em `vip_users`.
- Conta VIP pode alternar livremente o toggle sem perder dados (mantém `crefito`, `professionals.*`, avaliações, pacientes etc.).
- O toggle só persiste o campo `is_student` (+ `student_institution` / `student_period`); nunca apaga `crefito` ao desativar.

UI (`StudentAccessCard.tsx`):
- No load, buscar VIP via `supabase.from('vip_users').select('id').eq('email', user.email).maybeSingle()`.
- Se `crefito` existe **e** não é VIP → toggle aparece desabilitado com aviso "Conta profissional já possui CREFITO. Modo acadêmico não disponível.".
- Se VIP → exibe badge discreta "VIP · alternância livre" + texto "Modo de teste: alternar não apaga seu CREFITO nem dados".

Backend (`validate_crefito_format` trigger, migration):
- Manter regra atual (estudante pode ter CREFITO null, profissional precisa de CREFITO).
- Adicionar guarda: ao tentar setar `is_student = true` em uma linha que já tem `crefito IS NOT NULL`, permitir somente se o e-mail estiver em `vip_users`. Caso contrário, `RAISE EXCEPTION`.
- Update preserva `crefito` (não zerar).

## 3. Papel "Estagiário" na clínica

Adicionar valor `intern` ao enum `clinic_role` e tratá-lo em todo lugar como equivalente a `therapist` (mesmas permissões, mesma quota, mesmo acesso a pacientes/avaliações).

Migration:
- `ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'intern';`
- Atualizar todas as policies/funções que listam `'therapist'` para incluir `'intern'` (search-replace cirúrgico nas policies vivas via `DROP POLICY` + recriar, e em funções como `get_clinic_members_with_details`, contagem de terapeutas, `try_direct_clinic_add`, etc.).
- Não mexe em dados existentes — ninguém é `intern` até o owner escolher.

UI:
- `ClinicTeamManagement.tsx`: adicionar opção "Estagiário (Acadêmico)" no `Select` de papéis (invite + edição de membro). Label PT/EN/ES.
- Quando o membro tem `role='intern'` **ou** `is_student=true`, mostrar o badge atual "Estagiário (Acadêmico)".
- Manter ícone `GraduationCap` para ambos.
- Atualizar `roleLabels` para incluir `intern`.

Observação: não removo o badge automático para `is_student=true` quando o owner deixou como `therapist` — fica retrocompatível.

## 4. Documentação

- Atualizar `mem://features/student-access` com a regra de bloqueio para CREFITO, exceção VIP e novo papel `intern`.
- Atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) mencionando "Estagiário" como papel para alunos.

## Arquivos tocados

- `supabase/migrations/<novo>.sql` — enum `intern`, policies, trigger de bloqueio CREFITO×is_student.
- `src/components/account/StudentAccessCard.tsx` — VIP check + lock.
- `src/components/dashboard/ClinicTeamManagement.tsx` — novo papel no select + label.
- `src/utils/generatePdf.ts` — só truncamento com reticências do banner.
- `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx`, `src/locales/{pt,en,es}.json` — referência ao papel Estagiário.
- `.agents/memory/features/student-access.md` — atualização.

## Riscos & mitigação

- Enum nova: feita em migração isolada, antes das policies. `ADD VALUE IF NOT EXISTS` é idempotente.
- Policies: cada `DROP POLICY` é seguido imediatamente de `CREATE POLICY` com a mesma regra + `intern`. Sem janela de buraco.
- Trigger CREFITO×is_student: só impede mudança nova; updates que não tocam `is_student` continuam funcionando.
- VIPs: read direto da tabela `vip_users` por e-mail (já usado em outros lugares do app).
