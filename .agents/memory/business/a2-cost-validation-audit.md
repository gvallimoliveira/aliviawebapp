---
name: A2 Cost Validation — R$/crédito validado (30/08/2026)
description: Validação do custo real por crédito interno cruzando ai_credit_usage + ai_token_usage com o consumo real de AI Gateway do workspace; substitui a auditoria bloqueada de 27/06.
type: feature
---

# A2 — Validação de Custo Real (fechada em 30/08/2026)

## Status: ✅ concluída (o bloqueio de 27/06 era falta de dados; o tracking agora funciona)

## Dados da janela 01/08 → 30/08/2026

- `ai_credit_usage`: 120 chamadas, 8 usuários, 13 functions, **16,55 créditos internos**.
- Consumo real do workspace (filtro `applicability=ai_gateway`): **1,53 crédito Lovable**.
- Cross-check por tokens (`ai_token_usage`): 315k input / 92k output, quase tudo `google/gemini-2.5-flash` (101 chamadas) + 3 de `gemini-2.5-pro` → ≈ **US$ 0,34 / mês ≈ R$ 1,85**. Coerente com o 1,53 crédito Lovable.

## Conversão validada

- 1 crédito interno ≈ **0,093 crédito Lovable**.
- Custo real ≈ **R$ 0,11–0,13 por crédito interno** (usando R$ ~1,3/crédito Lovable).
- A premissa antiga de **R$ 0,18/cr era conservadora** — o custo real está ~30% abaixo dela. Manter R$ 0,18 como teto de planejamento é seguro.

## Leitura de margem

Custo total de IA do mês inteiro ficou na casa de **R$ 2**. A quota inclusa (100 cr PRO/Acadêmico) equivale a ~R$ 11–18 de custo no pior caso — folga enorme sobre a mensalidade. O risco de margem hoje **não é IA**: é marketing fixo e churn.

## Top consumidores (30d)

`generate-diagnosis` 9,90 cr (33 chamadas) domina; depois treatment/HEP/impressão/evolução (~1 cr cada). Chat do agente é barato (0,25 cr em 23 turnos).
