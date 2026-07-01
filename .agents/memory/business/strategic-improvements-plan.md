---
name: Strategic Improvements Plan (Finance + Engineering)
description: Plano consolidado das recomendações do analista financeiro QI 150 (créditos/pricing) e engenheiro QI 150 (arquitetura), organizado em etapas executáveis sob demanda.
type: feature
---

# Plano Estratégico Consolidado — Créditos & Engenharia

Origem: revisão dupla (financeira + engenharia) em 27/06/2026. Executar etapas sob demanda explícita do usuário. Cada etapa é independente e reversível.

---

## TRILHA A — Financeira / Créditos

### Etapa A1 — Single source of truth de pacotes & quotas
- Consolidar `.lovable/plan.md`, `mem://business/ai-credits-workspace-plan.md` e Stripe num único arquivo canônico.
- Descartar números obsoletos (ex: "150 cr generosos" do plan.md antigo vs 100 cr atual).
- Refletir IDs reais do Stripe (Mini 100/R$29, Plus 300/R$69, Pro 1000/R$199, ou os novos Starter/Mini/Plus se mantidos).
- **Entregável:** doc canônico + atualização das memórias.

### Etapa A2 — Validar custo real R$/crédito Lovable
- SQL em `ai_credit_usage` cruzando com fatura real do workspace.
- Calcular custo unitário real (assumimos R$0,18, validar).
- Recalcular margem de cada pacote.
- **Entregável:** relatório no admin com R$/cr real e margem por SKU.

### Etapa A3 — Reprecificação Plus (margem fina)
- Plus 300cr/R$69 hoje tem ~21% bruto → ~10% líquido.
- Opções: reduzir para 200cr/R$69 OU subir para R$89.
- **Entregável:** decisão + atualização Stripe + UI.

### Etapa A4 — Modelagem realista de conversão e churn
- Recalcular cenários com mix 50/50 anual/mensal (não 70% anual).
- Adicionar churn 8–12% ao mês.
- Calcular CAC, payback, MRR projetado.
- **Entregável:** novo estudo de viabilidade.

### Etapa A5 — Novos produtos comerciais
- Chat Agente híbrido: R$14,90/mês + R$0,10/msg acima de 100.
- Pacote anual de créditos: 1200cr/R$999.
- Trial Clínica: reduzir para 25cr + exigir CNPJ válido.
- **Entregável:** novos prices Stripe + edge functions + UI.

### Etapa A6 — Custo fixo de marketing no modelo
- Incluir R$1.500/mês de marketing em todos cenários.
- Recalcular ponto de equilíbrio.
- **Entregável:** atualização do estudo.

### Etapa A7 — Comunicação pública sobre créditos IA (transparência)
- **Contexto:** hoje só `ClinicLanding.tsx` menciona créditos (apenas o cap de 75 no trial). Não há explicação em `ProfessionalLanding.tsx`, `AcademicLanding.tsx`, `Support.tsx`, `AcademicSupport.tsx`, e `ClinicSupport.tsx` só cita "cartão de crédito" (não IA).
- **Problema:** usuários compram/assinam sem entender o que são créditos IA, quanto vem incluso, o que consome, o que fazer se acabar. Gera ticket de suporte, churn e sensação de "cobrança escondida" — principalmente após A5 (chat addon + trial 75cr) começar a bloquear ações.
- **Escopo:**
  1. **Landings** (Pro, Clínica, Acadêmico): seção "Como funcionam os créditos Aliv.iA" com (a) o que é 1 crédito ≈ (avaliação, chat, transcrição), (b) quanto vem incluso no plano (tabela de suficiência de `mem://features/credits-sufficiency-table-landings`), (c) o que acontece se acabar (compra de pacote/warning/soft-block), (d) exceções (biblioteca de evidências sempre livre, clínica não bloqueia).
  2. **Chat Agente add-on** na landing Pro/Clínica: card explicando R$14,90/150 msgs, quando faz sentido, isenções (VIP/parceiro).
  3. **Trial Clínica**: destaque de "75 créditos IA durante trial" + link para "como estender" na `ClinicLanding` (já parcialmente feito) e página `/clinica/suporte`.
  4. **FAQ nas 3 páginas de suporte** (`Support.tsx`, `ClinicSupport.tsx`, `AcademicSupport.tsx`): perguntas fixas — "O que são créditos IA?", "Como vejo meu saldo?", "O que consome créditos?", "Meus créditos acabaram, e agora?", "Créditos comprados expiram?", "Chat do agente cobra separado?".
  5. **Copy consistente**: um único glossário em `src/constants/creditsCopy.ts` reutilizado em landings, suporte e widget, evitando divergência de números.
- **Risco:** mínimo (só conteúdo/UI). Reversível.
- **Entregável:** 3 landings + 3 suporte + glossário compartilhado + i18n pt/en/es.

---



## TRILHA B — Engenharia

### Etapa B1 — Wrapper único de edge functions
- Criar `_shared/edge-runtime.ts` com `withEdgeFunction(handler, { auth, cors, logging, rateLimit, retry })`.
- Migrar 60+ functions gradualmente (começar pelas críticas).
- **Ganho:** redução estimada de 40% em bugs de boilerplate.

### Etapa B2 — Reorganização do diretório dashboard
- Mover `src/components/dashboard/` para subpastas `{pro,clinic,patient,admin}/`.
- Criar `useDashboardContext()` hook.
- **Ganho:** clareza arquitetural, menos imports cruzados.

### Etapa B3 — Sistema de logging de erros em produção
- Tabela `app_errors` + edge function `log-error` (ou integrar Sentry).
- Instrumentar `ErrorBoundary` global + catches críticos.
- **Ganho:** visibilidade real de falhas em produção.

### Etapa B4 — Lazy-loading de rotas
- `React.lazy` + `Suspense` para todas as páginas exceto Landing/Auth/Dashboard.
- **Ganho:** redução estimada de 60% no LCP, bundle inicial mais leve.

### Etapa B5 — Robustez do SplashScreen em PWA
- Trocar `sessionStorage` por `localStorage` com TTL 24h.
- OU mostrar apenas no primeiro acesso pós-login.
- **Ganho:** comportamento previsível em standalone mode.

### Etapa B6 — CI/CD básico
- GitHub Actions: `bun test` + `tsgo` em cada PR.
- Cobertura mínima e bloqueio de merge em falha.
- **Ganho:** prevenção de regressões.

---

## Ordem sugerida de execução
1. **A1** (alinhar verdade) → 2. **A2** (validar custo) → 3. **B4** (lazy-load, ganho rápido)
4. **A3** (margem Plus) → 5. **B1** (wrapper) → 6. **B3** (logging)
7. **A4 + A6** (modelo realista) → 8. **A5** (novos produtos) → 9. **A7** (comunicação pública créditos — logo após A5 estar no ar) → 10. **B2, B5, B6**

Cada etapa começa apenas quando o usuário pedir explicitamente "executar etapa Xn".

