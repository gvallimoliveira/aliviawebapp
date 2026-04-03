

# Disclaimer de referral + páginas de boas-vindas para Premium direto

## Resumo dos 3 pedidos

1. **Banner sutil de indicação** — quando `alivia_referral_code` existe no localStorage, exibir um banner fixo e discreto nas landing pages informando que o usuário tem uma condição especial.
2. **Página de boas-vindas para indicados** — ao clicar em "Avaliação Premium" com referral ativo, redirecionar para uma versão adaptada da UpgradeWelcome mencionando o desconto de 10%.
3. **Página de boas-vindas para Premium direto** — ao clicar em "Avaliação Premium" na landing page convencional (sem referral), redirecionar para uma versão da UpgradeWelcome adaptada para quem ainda não fez avaliação básica.

## Implementação

### 1. Componente `ReferralBanner` (novo)

**Arquivo:** `src/components/ReferralBanner.tsx`

- Lê `localStorage("alivia_referral_code")` no mount
- Se existir, renderiza um banner fixo no topo (abaixo do header), estilo slim:
  - Ícone de presente + texto: *"Você foi indicado! 🎉 10% de desconto na sua primeira avaliação premium avulsa"*
  - Botão de fechar (dismiss por sessão via sessionStorage)
- Posição: `sticky top-0 z-40`, bg sutil `bg-amber-50 border-b border-amber-200`
- Responsivo: texto compacto em mobile

**Onde inserir:** `PatientLanding.tsx` e `Gateway.tsx`, logo após o `<Header />`.

### 2. Adaptar UpgradeWelcome para múltiplos contextos

**Arquivo:** `src/pages/UpgradeWelcome.tsx`

Adicionar suporte a novos `planType` via location state:

- `planType: "referral"` — indicado clicando Premium
- `planType: "direct-premium"` — usuário comum clicando Premium na landing

Para cada contexto, ajustar:
- **Título**: "referral" → *"Você foi indicado! Bem-vindo ao Aliv.iA 🎉"* / "direct-premium" → *"Avaliação Premium Completa"*
- **Subtítulo**: "referral" → mencionar 10% de desconto / "direct-premium" → explicar o que a avaliação premium inclui
- **Steps**: Para "direct-premium" e "referral" (sem avaliação básica prévia), o step 1 muda de "Avaliação básica concluída ✅" para "Escolha sua avaliação" (não done). O progresso fica 0/3.
- **Chip do plano**: "referral" → *"Premium Avulso — R$ 109,00 → com 10% OFF"* / "direct-premium" → chip normal com preço

### 3. Redirecionar HeroSection e StickyCTA para UpgradeWelcome

**Arquivos:** `src/components/HeroSection.tsx`, `src/components/StickyCTA.tsx`

Atualmente, clicar "Avaliação Premium" navega direto para `/assessment/premium`. Alterar para:

```
const hasReferral = !!localStorage.getItem("alivia_referral_code");
navigate("/upgrade-welcome", {
  state: {
    redirectTo: "/assessment/premium",
    planType: hasReferral ? "referral" : "direct-premium"
  }
});
```

Manter o botão "Avaliação Gratuita" navegando direto para `/assessment/basic` (sem intermediário).

### 4. Traduções

**Arquivos:** `pt.json`, `en.json`, `es.json`

Novas chaves:
- `referral_banner.text` — "Você foi indicado! 10% de desconto na primeira avaliação premium avulsa"
- `upgrade_welcome.title_referral` — "Você foi indicado! Bem-vindo ao Aliv.iA 🎉"
- `upgrade_welcome.subtitle_referral` — "Um amigo te indicou e você tem 10% de desconto na sua primeira avaliação premium avulsa. Veja como funciona:"
- `upgrade_welcome.title_direct` — "Avaliação Premium Completa"
- `upgrade_welcome.subtitle_direct` — "Diagnóstico preciso + plano de tratamento personalizado. Conheça o que está incluso e comece agora."
- `upgrade_welcome.step1_title_new` — "📋 Escolha feita: Avaliação Premium"
- `upgrade_welcome.step1_desc_new` — "Você terá acesso a anamnese completa, questionários validados, testes funcionais e plano de tratamento."
- `upgrade_welcome.plan_referral` — "Premium Avulso com 10% OFF"
- `upgrade_welcome.referral_price` — exibir preço original riscado + preço com desconto

## Arquivos alterados

1. `src/components/ReferralBanner.tsx` — novo componente
2. `src/pages/PatientLanding.tsx` — inserir ReferralBanner
3. `src/pages/Gateway.tsx` — inserir ReferralBanner
4. `src/pages/UpgradeWelcome.tsx` — adaptar para contextos referral/direct-premium
5. `src/components/HeroSection.tsx` — redirecionar Premium para UpgradeWelcome
6. `src/components/StickyCTA.tsx` — redirecionar Premium para UpgradeWelcome
7. `src/locales/pt.json`, `en.json`, `es.json` — novas chaves

