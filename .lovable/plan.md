

## Plano: Ajustes nas seções de pricing B2B

### 1. `ProfessionalSection.tsx` — Toggle mensal/anual no CTA

Atualmente mostra preço fixo "A partir de R$34,90/mês". Mudar para:
- Adicionar `useState` com toggle `monthly | annual`
- Dois botões side-by-side (Mensal / Anual) que alternam o preço exibido
- Mensal: R$49/mês | Anual: R$34,90/mês (com badge "Economize 30%")
- O CTA continua navegando para `/profissionais`

### 2. `ProfessionalLanding.tsx` — Remover card Lifetime + corrigir hardcodes

**Remover**: Todo o terceiro card "Lifetime Treatment" (linhas 284-314) da seção de pricing.

**Layout**: Mudar grid de `md:grid-cols-3` para `md:grid-cols-2` para exibir apenas os 2 cards (Mensal e Anual) centralizados.

**Hardcodes a corrigir**: Revisar textos que estão hardcoded como fallbacks (ex: `|| "Mensal"`, `|| "Anual"`, `|| "Melhor valor"`, `|| "Cobrado anualmente: R$ 418,80/ano"`, `|| "Economize 30%"`) — estes já usam `t()` com fallback, o que é aceitável, mas confirmar que as traduções existem no LanguageContext. Se o usuário quer remover os hardcodes, mover todos esses textos para as traduções e remover os fallbacks `||`.

### Arquivos a modificar
1. `src/components/ProfessionalSection.tsx` — Adicionar toggle mensal/anual com estado
2. `src/pages/ProfessionalLanding.tsx` — Remover card vitalício, ajustar grid para 2 colunas, limpar hardcodes
3. `src/contexts/LanguageContext.tsx` — Garantir que todas as chaves de tradução existem (plan_monthly, plan_annual, best_value, billed_annually, save_30)

