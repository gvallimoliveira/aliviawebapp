---
name: A2 Cost Validation — Shadow Tracking Audit
description: Resultado da auditoria do shadow tracking (Fase 2). Apenas 2 linhas em 30 dias → instrumentação não está capturando uso real; bloqueia validação de R$/cr.
type: feature
---

# A2 — Validação de Custo Real (Auditoria 27/06/2026)

## Achado crítico

Query em `public.ai_credit_usage` retornou **apenas 2 linhas em toda a história da tabela**:

```
total_rows: 2
first_log: 2026-06-26 03:56:49
last_log:  2026-06-26 03:58:20
distinct_users: 1
distinct_functions: 1 (somente clinical-agent-chat)
total_credits_logged: 0.10
```

## Implicações

1. **Validar R$/cr real está bloqueado** — sem volume, não dá pra cruzar com a fatura Lovable.
2. **15 edge functions deveriam estar instrumentadas** (Fase 2), mas só `clinical-agent-chat` aparece. Possíveis causas a investigar:
   - `EdgeRuntime.waitUntil(work)` não está executando o insert antes do isolate ser killed.
   - Helper `shadowLogAiUsage` falhando silenciosamente (`.catch(() => {})` engole erro).
   - JWT→user_id resolvendo `null` e RLS bloqueando.
   - Funções deployadas com versão antiga do helper (cache do edge runtime).

## Próximo passo recomendado (antes de Fase 5)

Adicionar `console.error` temporário dentro do `.catch` de `shadowLogAiUsage` e disparar 1 chamada em cada uma das 15 functions. Inspecionar `supabase--edge_function_logs` para identificar a causa raiz.

## Etapa A2 — Status

❌ **Não foi possível concluir** a validação R$/cr. **Bloqueia A3** (reprecificação Plus depende de margem real). Recomenda-se priorizar fix do shadow tracking antes de prosseguir.
