

## Upgrade Básico → Premium: Continuidade sem Retrabalho

### Situação Atual

Quando o usuário completa a avaliação básica e decide comprar a premium:
1. É redirecionado para `/auth` → cadastro → Stripe checkout
2. Após pagamento, entra em `/assessment/premium` → **começa do zero** (welcome → redflags → anamnese → questionários → testes → diagnóstico → tratamento)
3. Todos os dados da avaliação básica (anamnese, regiões de dor, score EVA, red flags) são perdidos

### Solução Proposta

Usar `sessionStorage` para persistir os dados da avaliação básica e, ao entrar no fluxo premium, detectar que existe uma avaliação básica prévia e pular direto para os passos exclusivos premium (questionários → testes funcionais → diagnóstico completo → tratamento).

### Fluxo do Upgrade

```text
Básica concluída (resultado na tela)
  ↓ clica "Comprar Premium"
  ↓ sessionStorage salva: anamnesisData, painRegions, painScore, redFlags, assessmentId, capturedName, capturedEmail
  ↓ /auth (cadastro/login)
  ↓ Stripe checkout
  ↓ /payment-success → /assessment/premium
  ↓ Detecta dados em sessionStorage
  ↓ Pula para step "questionnaire" (com banner: "Dados da sua avaliação básica foram aproveitados")
  ↓ Questionários → Testes funcionais → Diagnóstico completo → Tratamento
```

### Alterações

**1. `src/components/assessment/DiagnosisResult.tsx`**
- Nos botões de CTA (avulso/mensal), antes de redirecionar para auth/pagamento, salvar em `sessionStorage` chave `alivia-basic-upgrade-data`:
  ```json
  { "anamnesisData": {...}, "painRegions": [...], "painScore": 7, "capturedName": "João", "capturedEmail": "j@x.com" }
  ```

**2. `src/pages/Assessment.tsx`**
- No `useEffect` do `payment_check`, após confirmar `has_access`, verificar se existe `alivia-basic-upgrade-data` em `sessionStorage`
- Se existir:
  - Restaurar `anamnesisData`, `capturedName`, `capturedEmail` nos states
  - Criar assessment premium no banco com os dados restaurados (anamnesis_data, pain_regions, pain_score)
  - Pular direto para step `"questionnaire"` em vez de `"welcome"`
  - Limpar `sessionStorage` após restaurar
- Se não existir: fluxo premium normal (welcome → redflags → anamnese...)

**3. Banner informativo**
- Exibir um banner sutil no topo do step `questionnaire` quando veio de upgrade:
  > "✅ Seus dados da avaliação básica foram aproveitados. Continue de onde parou."

### Detalhes Técnicos

- `sessionStorage` persiste enquanto a aba está aberta (sobrevive a navegação para `/auth` e redirect do Stripe se usar `window.location.href` na mesma aba)
- Para cobrir o caso de o Stripe abrir em nova aba: duplicar os dados em `localStorage` com TTL de 30 minutos (`alivia-basic-upgrade-data` + `alivia-basic-upgrade-expiry`). Ao restaurar, verificar expiração e limpar
- Backward compatible: se não houver dados salvos, o fluxo premium funciona normalmente do zero

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/components/assessment/DiagnosisResult.tsx` | Salvar dados da básica no storage antes do redirect de compra |
| `src/pages/Assessment.tsx` | Detectar e restaurar dados no fluxo premium, pular para questionários |

