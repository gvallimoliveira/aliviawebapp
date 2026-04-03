

# Unificar navegação Premium + toggle mensal/avulso na UpgradeWelcome

## Problema

1. **ComparisonSection**: botão "Iniciar Premium" navega direto para `/assessment/premium` — sem passar pela UpgradeWelcome.
2. **Footer**: não tem link para premium (confirmado — sem mudança necessária).
3. **UpgradeWelcome**: assume sempre avulso. Não tem toggle mensal/avulso. Se o usuário selecionou "mensal" na tabela comparativa, essa preferência é ignorada.

## Correções

### 1. ComparisonSection — redirecionar para UpgradeWelcome com preferência de plano

**`src/components/ComparisonSection.tsx`** (linha 218):

Trocar `navigate("/assessment/premium")` por:
```typescript
const hasReferral = !!localStorage.getItem("alivia_referral_code");
navigate("/upgrade-welcome", {
  state: {
    redirectTo: "/assessment/premium",
    planType: hasReferral ? "referral" : "direct-premium",
    paymentType: isMonthly ? "monthly" : "single",
  }
});
```

### 2. UpgradeWelcome — adicionar toggle mensal/avulso

**`src/pages/UpgradeWelcome.tsx`**:

- Receber `paymentType` do `location.state` como valor inicial (`"monthly"` ou `"single"`, default `"single"`).
- Adicionar um toggle (Switch) no bloco do plan chip, idêntico ao da ComparisonSection, permitindo alternar entre mensal e avulso.
- O plan chip e preço atualizam dinamicamente conforme o toggle.
- Ao clicar no CTA, salvar a escolha em `sessionStorage("premium_payment_type")` para que o Assessment.tsx saiba qual checkout criar (mensal ou avulso).
- Para `planType === "referral"`: o desconto de 10% só vale no avulso. Se o toggle estiver em "mensal", esconder o preço riscado e mostrar o preço normal da mensalidade.

### 3. Traduções

Novas chaves em `pt.json`, `en.json`, `es.json`:
- `upgrade_welcome.toggle_monthly`: "Mensal"
- `upgrade_welcome.toggle_single`: "Avulso"

## Arquivos a alterar

1. `src/components/ComparisonSection.tsx` — redirecionar para UpgradeWelcome com paymentType
2. `src/pages/UpgradeWelcome.tsx` — adicionar toggle + lógica de paymentType dinâmico
3. `src/locales/pt.json`, `en.json`, `es.json` — chaves do toggle

