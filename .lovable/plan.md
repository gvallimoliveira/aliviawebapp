

## Corrigir textos sobre Tratamento Vitalício no Suporte e no Dashboard

### Problema

Os textos atuais em vários locais descrevem incorretamente o Tratamento Vitalício como "acesso permanente ao painel profissional". Na realidade, ele concede apenas acesso permanente aos **planos de tratamento** dos pacientes, sem necessidade de pagamento avulso por tratamento. O acesso ao painel profissional continua exigindo assinatura ativa (mensal ou anual).

### O que já está correto no código

- `check-pro-subscription` — NÃO considera `lifetime_treatment` para conceder acesso ao painel (correto)
- `create-pro-treatment-payment` — Pula o pagamento por tratamento se `lifetime_treatment = true` (correto)
- `verify-payment` — Marca `lifetime_treatment = true` no profissional após pagamento (correto)

### Textos que precisam ser corrigidos

**1. Suporte — Tool "Tratamento Vitalício" (LanguageContext.tsx)**

Atual PT: *"A oferta de tratamento vitalício permite acesso permanente ao painel profissional com pagamento único."*
Correto PT: Explicar que concede acesso permanente aos planos de tratamento de todos os pacientes, sem custo adicional por avaliação, mas que a assinatura PRO (mensal ou anual) continua necessária para acesso ao painel.

Mesma correção no EN.

**2. Suporte — FAQ rf5 ou rf8 (se mencionar lifetime)**

Verificar e corrigir qualquer FAQ que descreva incorretamente o lifetime.

**3. Dashboard — Upsell descriptions (LanguageContext.tsx)**

- `pro_lifetime.upsell_desc` PT/EN — já está correto ("Desbloqueie todos os planos de tratamento para sempre. Sem custos adicionais por avaliação.")
- `pro_lifetime.upsell_desc_regular` PT/EN — já está correto.

Estes estão OK. Apenas o suporte precisa de correção.

### Arquivo editado

| Ação | Arquivo |
|------|---------|
| Editar | `src/contexts/LanguageContext.tsx` (corrigir textos do suporte PT e EN para `lifetime_treatment` tool e FAQs relacionadas) |

### Conteúdo corrigido

**PT — `support.pro.tool.lifetime_treatment.desc`:**
"Com o Tratamento Vitalício, todos os planos de tratamento dos seus pacientes ficam permanentemente liberados — sem custo adicional por avaliação, a partir da data da compra. Importante: o acesso ao painel profissional continua dependendo de uma assinatura PRO ativa (mensal ou anual). O Tratamento Vitalício não substitui a assinatura do painel."

**EN — `support.pro.tool.lifetime_treatment.desc`:**
"With Lifetime Treatment, all your patients' treatment plans are permanently unlocked — no additional cost per assessment, from the purchase date onward. Important: access to the professional panel still requires an active PRO subscription (monthly or annual). Lifetime Treatment does not replace the panel subscription."

