---
name: Double-check obrigatório por etapa do sistema de créditos
description: Procedimento padrão de revisão adversarial após CADA etapa (5.x, 6, 7...) da implementação do sistema de créditos de IA do Aliv.iA fisioterapia.
type: preference
---

# Double-check padrão — sistema de créditos de IA

Aplicar após CADA etapa concluída do plano de créditos (`mem://business/ai-credits-workspace-plan`), antes de declarar a etapa fechada. Complementa o protocolo Plan → Build → Prove (`mem://process/plan-build-prove`) — este é o passo extra de revisão adversarial.

## Roteiro (executar e relatar no chat)

1. **Quem poderia ser bloqueado indevidamente?**
   - Conferir bypass VIP (e-mail case-insensitive), `is_partner`, tiers ilimitados.
   - Clínica nunca bloqueia atendimento.
2. **Paridade código ↔ SQL**
   - `get_user_ai_tier`, `get_included_credits_for_tier`, `get_user_credit_status` devem concordar com os tiers do helper `_shared/ai-credits.ts`.
   - Checar tabelas laterais que a SQL pode ignorar (ex.: `granted_premium_users`).
3. **Dados reais, não hipóteses**
   - Rodar SQL de distribuição por tier e listar quem ficaria sem cota/no tier errado (ex.: estudantes com `academic_period` nulo).
4. **Fail-open explícito**
   - Erro de rede, e-mail não resolvido, tier desconhecido, incluso 0 → `ok=true`, `blocked=false`, com causa gravada em `ai_credit_decisions`.
5. **Trava dupla antes de qualquer 402**
   - Flag global `app_config.ai_credits_enforced` **E** allowlist `ai_credits_enforced_tiers`. Nunca só a flag global.
6. **Contabilidade**
   - `was_bypassed` marcado para que VIP/parceiro não queime cota de clínica.
7. **Latência**
   - Medir caminho de bypass e `quota_check`; cachear apenas decisões ilimitadas.
8. **Vocabulário**
   - Aliv.iA fisioterapia fala "créditos de IA"; "gerações" é só do Studio.

## Relato final obrigatório
- O que a etapa prometia.
- O que foi verificado, com evidência (SQL, logs, curl, screenshot).
- Erros encontrados e corrigidos.
- O que não foi verificado, risco aceito e como detectar depois.

## Origem
Pedido explícito de Guilherme em 31/08/2026, após a revisão da Fase 5.3 ter encontrado 4 falhas que causariam bloqueios indevidos na 5.4.
