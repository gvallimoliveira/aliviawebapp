## Adicionar toggle "Acadêmico" no painel admin de Parceiros

Hoje o admin pode liberar PRO / Clínica / Premium para parceiros, mas não consegue marcar um parceiro como Acadêmico — o trigger `validate_crefito_format` bloqueia a transição quando o profissional já tem CREFITO (a exceção VIP só vale para o próprio usuário VIP, não para o admin liberando para terceiros).

Vou adicionar um 4º switch **"Acadêmico"** em cada card de parceiro, ao lado de PRO / Clínica / Premium, que o admin pode alternar livremente — mesmo se o parceiro já tiver CREFITO. O CREFITO é preservado (não é apagado), apenas marcamos `is_student=true`, forçamos `approved=false` (sai do marketplace) e coletamos instituição/período opcionalmente.

### O que muda

**Banco (migration)**
- Atualizar `validate_crefito_format` para também aceitar transições feitas por admin: adicionar bypass quando `auth.uid()` pertencer a `vip_users` (admin alternando para terceiros, não só para si mesmo). Hoje a função compara com o e-mail da própria row; passa a aceitar também o e-mail do caller via `auth.users.id = auth.uid()`.

**Edge function `manage-vip-users`**
- Estender `toggle_partner_access` para aceitar `access_type: "academic"`. Quando `enabled=true`: atualiza `professionals` setando `is_student=true`, `approved=false`, e opcionalmente `student_institution` / `student_period` se vierem no payload. Quando `enabled=false`: `is_student=false` e restaura `approved` conforme regra atual (true se tiver CREFITO+CPF preenchidos).
- Estender `get_partner_details` para retornar `is_student`, `student_institution`, `student_period`.

**UI `src/components/admin/PartnerManagement.tsx`**
- Adicionar campo `is_student` na interface `PartnerDetail`.
- Adicionar 4º toggle "Acadêmico" (ícone `GraduationCap`) no `PartnerCard`, junto com PRO/Clínica/Premium.
- Adicionar tipo `"academic"` na assinatura de `onToggle` e em `handleToggle`.
- Labels pt/en: "Acadêmico" / "Academic".
- Quando o toggle Acadêmico aparece como ativo, mostrar um pequeno badge "🎓 Alivia Acadêmico" abaixo do nome do parceiro (similar ao badge de clínica).

### O que NÃO muda

- PRO, Clínica e Premium continuam funcionando exatamente como hoje — toggles independentes. O admin pode ter PRO **e** Acadêmico ligados ao mesmo tempo se quiser (o badge acadêmico no dashboard do parceiro já trata isso).
- CREFITO do parceiro nunca é apagado.
- Fluxo de auto-criação de conta por e-mail (Plus button no topo) continua igual; depois de criar, o admin liga o toggle Acadêmico no card.
- Memory `student-access` continua válida; a trava do trigger para usuários comuns (não-VIP, não-admin) permanece intacta.