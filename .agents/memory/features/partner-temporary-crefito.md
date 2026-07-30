---
name: CREFITO temporário de parceiro
description: Contas criadas pelo painel de parceiros recebem CREFITO placeholder `NNNNNN-X`; ele nunca pode classificar a conta como profissional formado.
type: feature
---

Ao adicionar um parceiro por e-mail no painel admin (`manage-vip-users` → `set_partner`), quando não existe registro em `professionals`, o backend cria a linha com um **CREFITO temporário** no padrão `^\d{1,6}-X$` (ex.: `283406-X`) apenas para satisfazer o trigger `validate_crefito_format`.

Regra: esse placeholder **não é registro real**. Toda lógica que decide categoria de conta usa `src/lib/crefito.ts`:
- `hasRealCrefito(crefito)` — só true para registro real.
- `isPlaceholderCrefito(crefito)` — detecta o temporário.
- `displayCrefito(crefito)` — undefined para placeholder (PDF nunca imprime CREFITO falso).

Consumidores ajustados: `StudentAccessCard` (trava do modo Acadêmico), `ProfessionalRegister` (studentLocked + campo do form), `getResponsibleProfessional` (PDF/links públicos), `Dashboard` (perfil pro real + redirect /complete-profile), `CompleteProfile`.

Backend `toggle_partner_access`:
- `access_type='academic'` com `enabled=true` → limpa o CREFITO placeholder, força `is_student=true`, `active_profile_mode='student'`, `approved=false`, `subscription_status='active'`.
- `access_type='pro'` com `enabled=false` numa conta acadêmica → também limpa o placeholder e força modo `student`.
