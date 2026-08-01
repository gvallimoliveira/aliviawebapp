---
name: AI Credits — período mensal em fuso de Brasília
description: Bug e correção do cálculo do mês de créditos de IA (UTC virava 21h BRT); fonte única credit_period_start() + escudos anti-falha no widget.
type: feature
---

# Período de créditos de IA = mês de Brasília

## Bug (01/08/2026)
`get_user_credit_status` e `ensure_current_credit_quota` usavam `date_trunc('month', now())` em UTC.
Resultado: às 21h BRT do último dia do mês o período virava e o consumo do mês em curso aparecia **zerado** no Insights.

## Correção
- Fonte única: `public.credit_period_start()` → `date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`.
- Toda nova função/consulta de créditos **deve** usar essa função, nunca `date_trunc('month', now())` cru.
- `get_user_credit_status` agora retorna também `timezone`, `trailing_30d_used` e `last_usage_at`.

## Escudos anti-falha (AiCreditsWidget.tsx)
1. Rótulo do mês vem de `period_start` (backend), não do relógio do dispositivo.
2. `used = max(RPC.used, soma dos itens do ledger)` — nunca subnotifica.
3. Banner âmbar quando mês = 0 mas `trailing_30d_used > 0` (não mostra zero silencioso).
