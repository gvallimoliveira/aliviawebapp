

## Plano: Tutorial sem spotlight + Cadastro automático de parceiro

### 1. Tutorial sem spotlight (manter cards, remover retângulo de destaque)

**O que muda:**
- Em `OnboardingTour.tsx`: remover o overlay SVG escuro, o retângulo de spotlight animado, e a lógica de scroll/posicionamento baseada em `rect`
- O card do step passa a ser exibido sempre centralizado na tela (posição fixa central), sem tentar apontar para nenhum elemento
- Remover toda a lógica de `data-onboarding`, `getTooltipPosition`, `updateRect`, e a detecção de elementos DOM
- O `OnboardingStep` continua funcionando como está, apenas com `style` fixo de centralização

**Arquivos:** `OnboardingTour.tsx`

### 2. Cadastro automático de parceiro com senha padrão

**Problema atual:** O `set_partner` só funciona se o profissional já estiver cadastrado. Se o admin insere um email novo, retorna "not_found".

**Solução:** No edge function `manage-vip-users`, quando `action === "set_partner"` e o email não é encontrado na tabela `professionals`:
1. Criar conta auth via `supabaseClient.auth.admin.createUser({ email, password: "parceiroalivia", email_confirm: true })`
2. Criar registro na tabela `profiles` (o trigger `handle_new_user` já faz isso automaticamente)
3. Criar registro na tabela `professionals` com `is_partner: true`, `subscription_status: "active"`, `approved: true`, e dados mínimos (full_name extraído do email, city/state/crefito vazios que o parceiro preencherá depois)
4. Retornar sucesso com flag `created: true` para o frontend mostrar mensagem apropriada

**Ajuste no frontend (`PartnerManagement.tsx`):**
- Quando resposta contém `created: true`, mostrar toast informando que a conta foi criada com senha padrão "parceiroalivia"
- Adicionar texto explicativo no card de concessão informando que se o profissional não tiver conta, uma será criada automaticamente

**Problema de campos obrigatórios:** A tabela `professionals` exige `crefito`, `city`, `state`, `full_name` como NOT NULL. O edge function precisará inserir valores placeholder (ex: `crefito: "000000-X"`, `city: "A definir"`, `state: "XX"`, `full_name` extraído do email) que o parceiro atualizará ao acessar o sistema pela primeira vez.

**Arquivos:** `manage-vip-users/index.ts`, `PartnerManagement.tsx`

### Resumo de arquivos alterados
- `src/components/onboarding/OnboardingTour.tsx` — remover overlay/spotlight, centralizar card
- `supabase/functions/manage-vip-users/index.ts` — auto-criar conta + perfil profissional para parceiros novos
- `src/components/admin/PartnerManagement.tsx` — feedback de conta criada com senha padrão

