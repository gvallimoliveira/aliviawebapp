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

---

## Registro da revisão da Fase 5.3 — 31/08/2026

### O que a etapa prometia
Implementar um canário de decisão de crédito em modo shadow (nunca bloqueia) nas 9 edge functions críticas de IA, alimentando `ai_credit_decisions` e `ai_credit_usage` para validar caminhos antes da Fase 5.4 (bloqueio real).

### O que foi verificado
1. **Paridade código ↔ helper**: 4 das 9 funções ainda faziam a decisão manualmente com `assertCreditsAvailable` + `shadowLogAiUsage` em vez do ponto único `canaryCredits`.
   - `generate-diagnosis`
   - `generate-treatment`
   - `clinical-agent-chat`
   - As outras 5 já usavam `canaryCredits`.
2. **Configuração de enforcement**: flag global `ai_credits_enforced = true`, mas `ai_credits_enforced_tiers = []` (ninguém bloqueia) — estado esperado para o canário.
3. **Distribuição real de tiers**: 13 `academic_monthly`, 9 `clinic_large`, 1 `clinic_small`, 27 `premium_b2c`, 8 `pro_monthly`, 2 `unlimited`. Nenhum `unknown`.
4. **Estudantes em premium_b2c**: 0 casos após correção anterior — query confirmou que todos os 13 estudantes estão em `academic_monthly`.
5. **Telemetria ativa**: 88 decisões em `ai_credit_decisions`, com caminhos `vip`, `partner`, `anonymous`, `quota_check` visíveis.

### Erros encontrados e corrigidos
- **Inconsistência de integração**: 4 funções não usavam o helper canário padronizado. Isso causaria:
  - Telemetria fragmentada (`ai_credit_decisions` incompleta);
  - Risco de `was_bypassed` inconsistente entre funções;
  - Manutenção duplicada na 5.4.
- **Correção aplicada**: substituídos os blocos manuais por `canaryCredits(...)` em `generate-diagnosis`, `generate-treatment` e `clinical-agent-chat`, preservando a lógica especial de addon/isentos no agent-chat.
- **Deploy realizado** das 9 funções críticas com sucesso.

### O que não foi verificado / risco aceito
- **Latência de bypass em produção**: o cache de 5 min por isolate existe, mas não medimos percentis reais. Detectar via `latency_ms` no `ai_credit_decisions` nos próximos 7 dias.
- **Cobertura de telemetria**: só 88 decisões. Com a padronização, esperamos volume maior; se em 7 dias alguma função crítica não aparecer, investigar.
- **Fail-open em cenário de indisponibilidade do RPC**: testado no código, mas não simulado em produção.

### Estado atual
- Canário padronizado nas 9 funções.
- Nenhum bloqueio real ativo (`ai_credits_enforced_tiers` vazia).
- Pronto para aguardar 5–7 dias de dados antes da Fase 5.4.
