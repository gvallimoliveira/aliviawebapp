

## 3 Alterações: Sub-área multi-select, CTA duplo no diagnóstico básico, Exit intent no diagnóstico

### 1. Sub-área de dor: permitir seleção múltipla

**Arquivo: `src/components/assessment/AnamnesisForm.tsx`**

- Alterar `painSubArea` de `string` para `string[]` (array) na interface `AnamnesisData` e no estado inicial
- No render do step `region_detail`, trocar lógica de seleção única para toggle (adicionar/remover do array)
- Card fica destacado se `painSubAreas.includes(area.id)`
- Validação: `data.painSubArea.length > 0` em vez de `!== ""`
- Manter compatibilidade: onde `painSubArea` é consumido como string downstream, fazer `.join(", ")`

### 2. CTA duplo no resultado do diagnóstico básico (avulso em destaque + mensal)

**Arquivo: `src/components/assessment/DiagnosisResult.tsx`**

Substituir o card de unlock atual (que só mostra o plano mensal R$79,90) por dois CTAs:

- **CTA principal (destaque)**: Avaliação Premium Avulsa — R$109,00
  - Botão grande, cor primária, com badge "Mais popular" ou "Recomendado"
  - Redireciona para `/assessment/premium` (pagamento avulso)
- **CTA secundário**: Plano Mensal — R$79,90/mês
  - Botão outline menor abaixo
  - Texto explicativo: "Inclui 2 avaliações/mês + diário de dor + histórico"
  - Redireciona para `/assessment/premium` com parâmetro ou diretamente ao checkout mensal

Importar `PREMIUM_SINGLE_PRICE_FORMATTED` de `@/constants/pricing`

### 3. Exit intent popup na página de diagnóstico básico

**Arquivo: `src/pages/Assessment.tsx`** (ou onde o DiagnosisResult é renderizado para basic)

- Importar e renderizar `<ExitIntentPopup />` quando o modo é `basic` e o diagnóstico está visível
- Ajustar o ExitIntentPopup para aceitar uma prop opcional de contexto (ex: `variant="diagnosis"`) que mude o copy para algo como "Não vá embora! Desbloqueie seu resultado completo por apenas R$109"
- Ou: criar lógica no ExitIntentPopup que detecta se está na rota `/assessment/basic` e adapta a mensagem

**Arquivo: `src/components/ExitIntentPopup.tsx`**

- Aceitar prop `variant?: "landing" | "diagnosis"`
- Quando `variant === "diagnosis"`: copy focado em desbloquear resultado, CTA vai para avaliação avulsa premium
- Quando `variant === "landing"` (default): comportamento atual

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/components/assessment/AnamnesisForm.tsx` | `painSubArea` string → string[], multi-select no step region_detail |
| `src/components/assessment/DiagnosisResult.tsx` | CTA duplo: avulso (destaque) + mensal |
| `src/components/ExitIntentPopup.tsx` | Prop `variant` para adaptar copy ao contexto diagnóstico |
| `src/pages/Assessment.tsx` | Renderizar ExitIntentPopup no resultado do diagnóstico básico |

