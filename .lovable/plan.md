
## Problema

Quem cria conta a partir da landing **profissional** (ou **clínica**) sem assinar nada cai direto no painel **pessoal**, sem indicação alguma do contexto pro/clínica nem CTA de assinatura. Causas encontradas:

1. `ProfessionalLanding` envia o destino pós-login via `location.state.redirectTo` → some se o usuário recarregar, alternar entre Login/Signup, voltar/avançar no browser ou passar por OAuth (`/auth/callback`).
2. `ClinicLanding` usa `?redirect=/dashboard` na URL, mas `Auth.tsx` só lê `location.state.redirectTo` — o parâmetro de query é **ignorado**.
3. Sem `professional` row criada, `hasProfessionalProfile=false` no `ClinicContext`, então `availableContextsCount=1` e o **seletor Pessoal / Profissional nem aparece**. O usuário vê só a aba "Saúde".
4. O redirect existente em `Dashboard.tsx` (`tab=professional` + sem professional row → `/professional/register`) nunca é acionado porque o redirectTo se perdeu antes.

## Solução

Persistir a **origem do cadastro** em `sessionStorage` no clique do CTA da landing e reagir a essa flag após o signup, independentemente de como o usuário chega no `/dashboard`.

### 1. Marcar origem nas landings
- `ProfessionalLanding.tsx`: nos CTAs de signup (linhas 56–58 e 161–163), antes de `navigate("/auth", ...)`, gravar `sessionStorage.setItem("signupOrigin", "professional")`. Continuar passando `redirectTo` via state como fallback.
- `ClinicLanding.tsx`: nos `navigate("/auth?redirect=...")` (linhas 85, 88, 100), gravar `sessionStorage.setItem("signupOrigin", "clinic")` e passar `state: { redirectTo: "/dashboard" }` em vez de query.

### 2. Auth.tsx — ler query `?redirect=` como fallback
Aceitar `searchParams.get("redirect")` se `location.state.redirectTo` não existir, para que links diretos/refreshes não quebrem.

### 3. Dashboard.tsx — reagir à origem persistida
No `useEffect` de carregamento (logo após carregar `professional`), se `sessionStorage.getItem("signupOrigin")` existir:
- `"professional"` + sem professional row → `navigate("/professional/register")` (página onde ele completa cadastro e vê CTA de assinatura). Consumir (`removeItem`) a flag.
- `"clinic"` → `navigate("/clinica")` com toast indicando para escolher o plano/trial, OU mostrar o painel com aba "Clínica" bloqueada e CTA. Vou usar o redirect para `/clinica` (a própria landing já tem os CTAs de trial/assinatura e identifica usuário logado). Consumir a flag.

### 4. ClinicContext — expor seletor mesmo sem professional/clinic
Adicionar uma flag `pendingProfessionalSignup` (lida de `sessionStorage`) e considerar `availableContextsCount >= 2` quando ela estiver presente. Assim o `ClinicContextSelector` já aparece com a opção "Profissional autônomo" levando para `/professional/register`. Como o redirect do passo 3 já leva direto para essa página, esse passo é redundante para o caso atual e fica **fora do escopo** desta correção (evita mudanças estruturais no contexto). Mantemos apenas passos 1–3.

## Arquivos alterados

- `src/pages/ProfessionalLanding.tsx` — gravar `signupOrigin=professional` antes de navegar para `/auth`.
- `src/pages/ClinicLanding.tsx` — gravar `signupOrigin=clinic` e usar `state` no lugar de `?redirect=`.
- `src/pages/Auth.tsx` — aceitar `?redirect=` como fallback de `location.state.redirectTo`.
- `src/pages/Dashboard.tsx` — após carregar `professional`, consumir `signupOrigin` e redirecionar para `/professional/register` ou `/clinica` conforme o caso.

## Resultado esperado

- Cadastro via landing profissional (sem assinar) → cai em `/professional/register` (formulário CREFITO/CPF). Ao salvar, vira professional row → seletor Pessoal/Pro aparece, aba Profissional renderiza com CTA de assinatura.
- Cadastro via landing clínica (sem assinar/trial) → cai em `/clinica` logado, com os CTAs de trial e assinatura visíveis.
- Cadastro normal/checkout direto → fluxo atual preservado (não há `signupOrigin`).
