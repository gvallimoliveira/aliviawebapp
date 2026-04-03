

# Reordenar steps da UpgradeWelcome (direct-premium/referral)

## Mudança

Reordenar os 3 cards do fluxo direto para refletir a sequência real do processo:

1. **🔐 Crie sua conta** — "É rápido. Sua conta garante acesso aos resultados e histórico."
2. **💳 Pagamento seguro** — "Escolha entre avulso ou mensal. Processamento seguro via Stripe."
3. **🎯 Avaliação + Diagnóstico e Tratamento** — "Anamnese completa, questionários validados, testes funcionais, diagnóstico detalhado e plano de tratamento em 3 fases."

## Arquivo

`src/pages/UpgradeWelcome.tsx` — reordenar o array `steps` do bloco `isDirectFlow` e ajustar ícones/textos.

`src/locales/pt.json`, `en.json`, `es.json` — atualizar chaves existentes e adicionar chave para o step de pagamento:
- `upgrade_welcome.step1_title_direct` → "Crie sua conta"
- `upgrade_welcome.step1_desc_direct` → "É rápido. Sua conta garante acesso aos resultados e histórico."
- `upgrade_welcome.step2_title` / `step2_desc` → "Pagamento seguro" / "Escolha entre avulso ou mensal. Processamento seguro."
- `upgrade_welcome.step3_title_direct` → "Avaliação + Diagnóstico e Tratamento"
- `upgrade_welcome.step3_desc_direct` → "Anamnese completa, questionários validados, testes funcionais, diagnóstico detalhado e plano personalizado em 3 fases."

