# Corrigir selo PRO em parceiro acadêmico

## O que está acontecendo

Verifiquei a conta do Filipe no banco: `is_partner = false`, `is_student = true`, `is_partner_account = true`, `active_profile_mode = student`, `subscription_status = active`. Ou seja, os toggles estão como você deixou — o problema é só de **rótulo**, em dois lugares que ainda tratam "parceiro" como sinônimo de PRO:

1. **Lista de clientes no Admin** (aba Profissionais): a classificação testa `is_partner_account` antes de `is_student`, então ele cai no tipo "Parceiro / VIP" (coroa âmbar) em vez de "Acadêmico".
2. **Faixa de status do painel dele**: a verificação de assinatura devolve `is_partner: true` para parceiro acadêmico, e o painel usa isso para mostrar "Plano PRO · Parceiro".

Além disso, os toggles PRO e Acadêmico hoje são independentes — nada impede que os dois fiquem ligados ao mesmo tempo.

## O que vou ajustar

**1. Rótulo correto no Admin**
Classificar como "Acadêmico" (capelo, verde) sempre que a conta tiver acesso acadêmico ativo, mesmo sendo parceira; "Parceiro / VIP" fica reservado a parceiro profissional/premium sem modo acadêmico. As contagens dos cards de filtro seguem a mesma regra.

**2. Faixa de status do painel do parceiro acadêmico**
Quando o acesso vier do modo acadêmico, a faixa mostra "Aliv.iA Acadêmico" com selo "Parceiro acadêmico" (capelo) em vez de "Plano PRO". O acesso às ferramentas continua exatamente o mesmo — muda só a identificação. O selo do topo (WelcomeSection) já está correto e não muda.

**3. Toggles PRO e Acadêmico mutuamente exclusivos**
No cartão de parceiro do Admin: ligar Acadêmico desliga PRO e vice-versa, no mesmo clique (otimista na tela e persistido no backend). Os toggles Clínica e Premium continuam independentes.
- Ligar **Acadêmico**: `is_student = true`, `active_profile_mode = student`, `is_partner = false`.
- Ligar **PRO**: `is_partner = true`, `active_profile_mode = professional`, `is_student = false`.
- Desligar qualquer um dos dois continua com o comportamento atual (mantém a pessoa na lista de parceiros; se sobrar nenhum acesso, o status volta a inativo).

**4. Normalizar o caso do Filipe**
A conta dele já está com os flags certos, então o rótulo se corrige sozinho com os itens 1 e 2 — nenhuma alteração de dados é necessária. Vou conferir se existe outro parceiro com PRO e Acadêmico ligados ao mesmo tempo e, se houver, ajusto para um único modo ativo (mantendo o que está em `active_profile_mode`).

## Detalhes técnicos

- `src/components/admin/ProfessionalManagement.tsx`: em `classifyClient`, testar modo acadêmico (`active_profile_mode === 'student' || is_student`) antes do bloco de parceiro.
- `supabase/functions/check-pro-subscription/index.ts`: manter `subscribed: true`, mas devolver `is_partner: false` quando for parceiro **apenas** acadêmico, mantendo `is_academic_partner: true` (checar consumidores de `is_partner` — `ProDashboard`, `useProSubscription`) para não perder acesso.
- `src/components/dashboard/ProDashboard.tsx`: título/selo da faixa de status derivados de `is_academic_partner`.
- `supabase/functions/manage-vip-users/index.ts` (`toggle_partner_access`): exclusividade PRO/Acadêmico no lado do servidor; `PartnerManagement.tsx` reflete o mesmo no estado otimista.
- Redeploy da(s) edge functions alteradas.
