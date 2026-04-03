

# Ajustar UpgradeWelcome por contexto + bypass para usuários logados

## Problema

1. **UpgradeWelcome "direct-premium" e "referral"** — Mostra steps que mencionam "dados salvos" e "sem repetir etapas" (relevante apenas para upgrade da básica). O botão "Voltar ao resultado" não faz sentido pois não há resultado anterior.
2. **Usuários logados acessando premium pelo dashboard** — O `QuickActions.tsx` já navega direto para `/assessment/premium` (sem passar pela UpgradeWelcome), o que está correto. Porém, o Assessment.tsx já lida com isso: verifica pagamento e redireciona para welcome/payment_check. Não precisa de mudança aqui.

## Plano de Correção

### 1. Ajustar steps e textos na UpgradeWelcome para direct-premium e referral

**`src/pages/UpgradeWelcome.tsx`**:

- **Steps**: Para `isDirectPremium` e `isReferral`, substituir os 3 steps por conteúdo adequado:
  - Step 1: "📋 Avaliação completa" — "Anamnese, mapa de dor, questionários validados e testes funcionais guiados."
  - Step 2: "🔐 Crie sua conta" — "É rápido. Sua conta garante acesso aos resultados e histórico."
  - Step 3: "🎯 Diagnóstico + Tratamento" — "Receba diagnóstico detalhado e plano de tratamento personalizado em 3 fases."
- **Botão "Voltar"**: Para `isDirectPremium` e `isReferral`, trocar texto de "Voltar ao resultado" para "Voltar" e usar `navigate(-1)` (já usa, só mudar o label).
- **Segurança texto**: Trocar "dados protegidos por 30 minutos" para "Pagamento seguro e dados protegidos" quando `isDirectPremium` ou `isReferral`.
- **Progress bar**: Remover para `isDirectPremium` e `isReferral` (não faz sentido mostrar 0/3 sem etapa anterior).

### 2. Traduções

**`pt.json`, `en.json`, `es.json`** — Novas chaves:
- `upgrade_welcome.step1_title_direct`: "📋 Avaliação completa"
- `upgrade_welcome.step1_desc_direct`: "Anamnese, mapa de dor, questionários validados e testes funcionais guiados."
- `upgrade_welcome.step3_title_direct`: "🎯 Diagnóstico + Tratamento"
- `upgrade_welcome.step3_desc_direct`: "Diagnóstico detalhado e plano de tratamento personalizado em 3 fases."
- `upgrade_welcome.back_generic`: "Voltar"
- `upgrade_welcome.data_safe_direct`: "Pagamento seguro e dados protegidos"

### 3. Confirmar que dashboard já bypassa UpgradeWelcome

`QuickActions.tsx` já navega para `/assessment/premium` direto — correto. `Assessment.tsx` já verifica acesso premium e mostra tela de pagamento ou inicia avaliação. Nenhuma mudança necessária aqui.

## Arquivos a alterar

1. `src/pages/UpgradeWelcome.tsx` — condicionar steps, progress bar, label do botão voltar e texto de segurança
2. `src/locales/pt.json`, `en.json`, `es.json` — novas chaves de tradução

