
## Objetivo
Unificar a navegação de contextos no Dashboard. Hoje o seletor só alterna entre "Pessoal" e "Clínicas". Vamos adicionar um terceiro contexto: **Profissional autônomo** (quando o usuário tem perfil em `professionals` sem clínica ativa do tipo owner). Assim a aba "Profissional" e "Agenda" só aparecem nesse contexto, deixando o modo "Pessoal" enxuto (apenas Saúde + Mensagens).

## Regras de visibilidade do seletor
O seletor só aparece quando o usuário tem **2 ou mais** dos seguintes perfis:
- **Pessoal** (sempre disponível para qualquer usuário logado)
- **Profissional autônomo** (existe registro em `professionals` para o `user_id`)
- **Clínica X** (uma entrada para cada `clinic_membership` ativo)

Casos cobertos:
- Apenas pessoal → sem seletor (modo atual: Saúde + Mensagens)
- Pessoal + Profissional autônomo → seletor com 2 opções
- Profissional + Clínica → seletor com Pessoal + Profissional + Clínica (3 opções)
- Pessoal + Clínica (secretária sem perfil pro) → seletor com 2 opções
- Os 3 perfis → seletor com 3+ opções

## Modos e abas resultantes

| Contexto ativo | Abas exibidas |
|---|---|
| **Pessoal** | Saúde, Mensagens |
| **Profissional autônomo** | Profissional (pacientes/avaliações), Agenda, Mensagens |
| **Clínica (owner/therapist)** | Agenda, Pacientes, Equipe, Link, Gestão*, Mensagens |
| **Clínica (secretary)** | igual acima sem Gestão (já existe) |

*Gestão só para owner (já existe)

## Mudanças técnicas

### 1. `src/contexts/ClinicContext.tsx`
- Adicionar novo estado `activeContext: "personal" | "professional" | "clinic"` (derivado).
- Persistir junto: chaves `activeContextType` + `activeClinicId` em localStorage.
- Expor `setActiveContext(type, clinicId?)`, manter `setActiveClinicId` por compat.
- `needsContextSelection` passa a considerar também perfil profissional (recebido via prop ou checado externamente).

**Decisão simpler**: em vez de carregar perfil professional dentro do ClinicContext (acoplamento), criamos um novo contexto enxuto `AccountContextProvider` que recebe `hasProfessionalProfile` calculado no Dashboard e combina memberships + pessoal + profissional num único array `availableContexts`.

Para evitar refactor grande, vamos:
- Manter `ClinicContext` como está (memberships/activeClinic).
- Adicionar `professionalMode: boolean` ali (default false), com setter `setProfessionalMode`.
- Adicionar setter `hasProfessionalProfile` informado externamente (Dashboard chama `setHasProfessionalProfile(!!professional)`).

### 2. `src/components/dashboard/ClinicContextSelector.tsx`
Renomear para refletir uso amplo (manter nome para minimizar churn). Renderizar:
```
[Conta pessoal] | [Profissional autônomo] | [Clínica A] | [Clínica B]
```
Itens condicionais:
- Pessoal: sempre
- Profissional: se `hasProfessionalProfile`
- Clínicas: do array `memberships`

Esconder o componente quando o total for ≤ 1 (apenas pessoal).

`onValueChange`: mapear `"solo"` → contexto pessoal, `"pro"` → profissional, qualquer UUID → clínica.

### 3. `src/components/dashboard/ContextSelectionModal.tsx`
Adicionar terceiro botão "Profissional autônomo" (ícone Stethoscope) quando `hasProfessionalProfile`. Mostrar modal só quando houver 2+ opções e nada escolhido ainda.

### 4. `src/pages/Dashboard.tsx`
- Após carregar `professional`, chamar `setHasProfessionalProfile(!!professional)`.
- Substituir lógica `professional ? ProMode : PersonalMode` pela nova condicional baseada em `activeContext`:
  - `clinic` → bloco de clínica (já existe)
  - `professional` → novo bloco com 3 abas: Profissional, Agenda, Mensagens
  - `personal` → bloco de modo pessoal (sem abas pro)
- Default inteligente: se usuário tem só 1 contexto, ele é o ativo; se tem múltiplos e ainda não escolheu, modal aparece.
- Tabs URL: `?tab=professional` redireciona automaticamente para o contexto profissional se aplicável.
- Aba "Saúde" deixa de aparecer no modo profissional/clínica → conteúdo de saúde fica acessível apenas no modo pessoal (mais limpo).

### 5. Pequenos ajustes
- `WelcomeSection`: badge muda conforme `activeContext` ao invés de `activeTab`.
- `useOnboarding`: passos do tour pro só ativam no contexto profissional (alterar efeito que muda activeTab para alterar contexto).
- Persistência: lembrar último contexto entre sessões.

## Arquivos a alterar
1. `src/contexts/ClinicContext.tsx` — adicionar `activeContext`, `setActiveContext`, `hasProfessionalProfile`/setter, `availableContextsCount`.
2. `src/components/dashboard/ClinicContextSelector.tsx` — opção "Profissional autônomo", esconder se ≤1 contexto.
3. `src/components/dashboard/ContextSelectionModal.tsx` — terceiro botão.
4. `src/pages/Dashboard.tsx` — render condicional por `activeContext`, sincronização do perfil profissional, ajuste do `useEffect` de tabs.
5. `src/components/dashboard/WelcomeSection.tsx` — derivar badge de `activeContext` (opcional, melhoria de coerência).

## Revisão de riscos
- **Usuários só com perfil pessoal**: sem seletor, sem modal — comportamento idêntico ao atual ✓
- **Profissional autônomo único (sem clínica)**: passará a ver seletor (Pessoal vs Profissional). Default = profissional na primeira vez (mais útil), modal aparece para confirmar.
- **Secretária de clínica (sem perfil pro)**: vê Pessoal + Clínica. Mantém comportamento atual.
- **Owner com perfil pro + clínica**: 3 opções. Modal aparece se nunca escolheu.
- **URL legacy `?tab=professional`**: força contexto profissional automaticamente.
- **Onboarding tour pro**: ajustar efeito para chamar `setActiveContext("professional")` em vez de `setActiveTab("professional")`.
- **Modo simulado (`isSimulated`)**: continua restrito ao bloco profissional/clínica, sem mudança.

Após aplicar, faço uma releitura para confirmar que nenhum import quebrou e que o default escolhido na primeira renderização não pisca entre modos.
