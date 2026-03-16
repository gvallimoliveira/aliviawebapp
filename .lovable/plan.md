

## Correções: Texto de cancelamento do plano anual + Restrição de features para compra avulsa

### Problema 1 — Texto "Cancele quando quiser" no plano anual

**Situação atual:**
- `ProfessionalLanding.tsx` — texto aparece só no card mensal ✅
- `ProfessionalSection.tsx` (seção na landing principal) — texto aparece sempre, independente do toggle mensal/anual ❌

**Correção:**
- Em `ProfessionalSection.tsx`, condicionar o texto ao `billing === "monthly"`
- Quando `billing === "annual"`, exibir texto alternativo: "Pagamento único. Acesso garantido por 1 ano."
- Na `ProfessionalLanding.tsx`, adicionar o mesmo texto no card anual
- Novas traduções: `b2b.annual_no_refund` (PT/EN)

### Problema 2 — Dashboard não diferencia assinante de comprador avulso

**Situação atual:**
- `verify-payment` (`check_access`) só busca subscriptions ativas no Stripe → comprador avulso recebe `has_access: false`
- O Dashboard renderiza `PainDiary`, `AssessmentComparison`, histórico e follow-ups **incondicionalmente** para todos os usuários logados
- Resultado: comprador avulso tem acesso visual às features que deveriam ser exclusivas da assinatura, mas o indicador Premium diz que não tem acesso

**Correção em 2 partes:**

**A) Backend (`verify-payment`):**
- Após verificar assinatura, se não encontrar subscription ativa, checar se o usuário tem assessment com `payment_status = 'paid'` e `type = 'premium'` (compra avulsa)
- Retornar campo adicional `subscription_type: 'monthly' | 'single' | null` na resposta
- Para compra avulsa: `has_access: true`, `subscription_type: 'single'`, sem `can_redo`, sem `max_assessments`

**B) Frontend (`Dashboard.tsx`):**
- Receber `subscription_type` do `premiumAccess`
- Quando `subscription_type === 'single'`:
  - **Ocultar** `PainDiary` (ou mostrar com paywall/blur + CTA para assinar)
  - **Ocultar** `AssessmentComparison` (idem)
  - **Ocultar** follow-up emails
  - Manter visível: histórico de avaliações (para acessar o resultado)
  - Mostrar banner incentivando upgrade para assinatura mensal

**C) Traduções:**
- `dashboard.single_purchase_banner` — "Você possui uma avaliação avulsa. Assine o Premium para acompanhar sua evolução com diário de dor, métricas e comparativos."
- `dashboard.upgrade_to_monthly` — "Assinar Premium mensal"

### Arquivos alterados
- **ProfessionalSection.tsx** — condicionar texto de cancelamento ao billing
- **ProfessionalLanding.tsx** — adicionar texto "pagamento único" no card anual
- **verify-payment/index.ts** — retornar `subscription_type` distinguindo assinante de avulso
- **Dashboard.tsx** — condicionar PainDiary, AssessmentComparison e follow-ups ao tipo de assinatura
- **LanguageContext.tsx** — novas traduções

