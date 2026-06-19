
## Como o sistema enxerga hoje

Existe **uma única linha** em `professionals` por usuário. O modo Acadêmico é apenas a flag booleana `is_student` nessa linha. Ou seja:

- `is_student = false` → o parceiro é tratado como **Profissional** em todo lugar (PDF mostra CREFITO, aparece no marketplace se aprovado, links públicos saem como avaliação profissional).
- `is_student = true` → tudo passa a se comportar como **Acadêmico**: banner âmbar no PDF ("Alivia Acadêmico · Instituição · Período"), bloco do responsável mostra instituição/período no lugar do CREFITO, link público de avaliação vira acadêmico, marketplace é forçado a `approved=false`.

Quem decide isso hoje é o `getResponsibleProfessional` lendo `is_student` direto do banco. Não há "modo ativo" — o estado da flag **é** o perfil.

**Implicação prática do toggle admin que acabamos de criar:** se você ligar Acadêmico para um parceiro que já tem PRO ativo, o PDF e os links **passam imediatamente a sair como acadêmicos**, mesmo com a assinatura PRO viva. Ligar os dois "ao mesmo tempo" no estado atual significa: acesso liberado às ferramentas PRO (porque `subscription_status` permanece ativo), mas identidade visível = Acadêmico. Não há como o parceiro escolher.

## O que você quer

Permitir que o parceiro com PRO + Acadêmico liberados **escolha qual perfil está ativo** (e qual identidade vai para PDF/links/marketplace), podendo alternar quando quiser. Sem perder dados de nenhum dos dois.

## Mudanças propostas

### 1. Banco — novo campo `active_profile_mode`

Adicionar coluna em `professionals`:
- `active_profile_mode TEXT` com valores `'professional' | 'student'`, default `'professional'`.
- Migration preenche linhas existentes: se `is_student=true` hoje → `'student'`; senão → `'professional'`.
- Trigger garante coerência: só pode setar `'student'` se `is_student=true`; só pode setar `'professional'` se tem CREFITO **ou** é VIP.

`is_student` deixa de ser "estou no modo acadêmico agora" e passa a significar **"acesso acadêmico liberado"** (capacidade). `active_profile_mode` indica qual está em uso.

### 2. Resolução do responsável (`getResponsibleProfessional`)

Trocar a leitura de `is_student` por `active_profile_mode === 'student'`. PDFs, links públicos e RPCs (`get_public_professional_assessment_link`, `get_clinic_members_with_details`) passam a refletir o modo ativo, não a capacidade.

### 3. Painel admin (`PartnerManagement.tsx`)

- Os 4 toggles continuam significando **liberação de acesso** (capacidades): PRO, Clínica, Premium, Acadêmico.
- Adicionar legenda curta no card explicando: "O parceiro escolhe qual perfil exibir em /minha-conta quando tiver mais de um liberado."

### 4. UI do parceiro — seletor de perfil ativo

Em `StudentAccessCard.tsx` (ou novo card `ProfileModeCard.tsx` ao lado), quando o parceiro tem **PRO + Acadêmico liberados simultaneamente**:
- Mostrar um RadioGroup: "Perfil ativo agora" → Profissional / Acadêmico.
- Salvar grava `active_profile_mode`.
- Feedback explicando o impacto: "Esta escolha define o que aparece no seu PDF, no link público de avaliação e no marketplace."

Quando só um está liberado, não mostra o seletor (modo é fixo).

### 5. Badge no Dashboard / ClinicContextSelector

A lógica `isStudentProfessional` que hoje lê `is_student` passa a ler `active_profile_mode === 'student'`. Assim o ícone 🎓 só aparece quando o parceiro está **operando** como acadêmico.

### 6. Regra de "perfil padrão pós-liberação"

Conforme você sugeriu: na primeira liberação, o `active_profile_mode` reflete o cadastro que o parceiro completou:
- Se ele se cadastrou como profissional (tem CREFITO) e admin liga Acadêmico depois → permanece `'professional'`; ele decide quando mudar.
- Se ele se cadastrou como estudante e admin liga PRO depois → permanece `'student'`.
- Migration inicial respeita esse princípio usando o `is_student` atual como dica.

## Resumo do que muda para você como admin

- Liberar Acadêmico **não rouba mais** a identidade do parceiro PRO — apenas habilita a opção.
- O parceiro vê o seletor em /minha-conta e escolhe; pode alternar sempre.
- PDF, links e marketplace seguem o modo ativo selecionado.

## Pontos técnicos

- Migration: nova coluna + trigger + backfill.
- Edge function `manage-vip-users` continua igual (toggle = capacidade); opcionalmente expor `active_profile_mode` no `get_partner_details` para o admin ver em qual modo o parceiro está agora.
- `StudentAccessCard` ganha lógica de "tenho os dois" e renderiza o radio.
- Componentes que hoje filtram por `is_student` (PDF, banner dashboard, ProfessionalSearch marketplace) trocam para `active_profile_mode`.
- `ProfessionalSearch` continua escondendo quem está em modo acadêmico (`active_profile_mode='student'`), mesmo que tenha CREFITO.
