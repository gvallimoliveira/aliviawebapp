# Página de Transição "Bem-vindo ao Premium" — antes do login

## Problema

Quando o usuário clica nos CTAs de upgrade (avulso, mensal ou exit intent com desconto) no resultado da avaliação básica, ele é redirecionado bruscamente para `/auth`. Não há contexto sobre por que precisa fazer login, o que vai acontecer com seus dados, nem qual é o próximo passo. Parece um erro.

## Solução

Criar uma **página intermediária `/upgrade-welcome**` que é exibida entre o clique no CTA e o redirecionamento para `/auth`. Essa página:

1. **Parabeniza** o usuário pela avaliação básica concluída
2. **Explica o fluxo** em 3 passos visuais (similar ao UpgradeFlowSection):
  - ✅ Avaliação básica concluída — seus dados estão salvos
  - 🔐 Crie sua conta ou faça login (rápido, com Google)
  - 🚀 Continue direto para questionários e testes premium (sem repetir etapas)
3. **Mostra o produto escolhido** (avulso R$109 / mensal R$79,90 / avulso com desconto)
4. **Botão principal** "Criar conta e continuar" → redireciona para `/auth` com o `state` preservado  
5. continua o fluxo de compra no stripe 

## Arquivos a criar/editar

### 1. Criar `src/pages/UpgradeWelcome.tsx`

- Página com layout similar ao WelcomeStep (logo, animações framer-motion)
- Recebe via `location.state`: `redirectTo`, `planType` (single/monthly/exit-discount)
- Exibe os 3 passos visuais com ícones
- Destaca que os dados da avaliação básica estão preservados (30min)
- Botão CTA → `navigate("/auth", { state: { redirectTo } })`
- Botão secundário "Voltar ao resultado"
- Suporte i18n (PT/EN/ES)

### 2. Editar `src/App.tsx`

- Adicionar rota `/upgrade-welcome` → `<UpgradeWelcome />`

### 3. Editar `src/components/assessment/DiagnosisResult.tsx`

- Nos dois botões de upgrade (avulso e mensal), trocar `window.location.href = "/assessment/premium"` por `navigate("/upgrade-welcome", { state: { redirectTo: "/assessment/premium", planType: "single" | "monthly" } })`

### 4. Editar `src/components/ExitIntentPopup.tsx`

- No `handleDiscountCheckout` quando `!user`, redirecionar para `/upgrade-welcome` com `planType: "exit-discount"` em vez de ir direto para `/auth`

### 5. Adicionar traduções em `src/locales/pt.json`, `en.json`, `es.json`

- Chaves para título, subtítulo, passos e botões da página de transição

## Fluxo atualizado

```text
Resultado Básico
  ↓ clique CTA upgrade
UpgradeWelcome (NOVA)
  ↓ "Criar conta e continuar"
Auth (login/cadastro)
  ↓ redirect
Assessment Premium (dados restaurados)
```