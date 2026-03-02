# Tela de Onboarding antes da Triagem

## O que muda

Uma tela introdutoria de boas-vindas sera exibida antes da triagem de red flags. Ela tera tom acolhedor, explicara brevemente o processo e estimara o tempo. O usuario avanca clicando em "Comecar".

## Mudancas tecnicas

### 1. Novo step "welcome" no fluxo (`Assessment.tsx`)

- Adicionar `"welcome"` ao tipo `AssessmentStep`.
- Alterar o estado inicial de `step` de `"redflags"` para `"welcome"` (tanto basic quanto premium, apos payment_check).
- Quando premium tem acesso, ir para `"welcome"` em vez de `"redflags"`.
- Renderizar o novo componente `WelcomeStep` quando `step === "welcome"`, com `onContinue={() => setStep("redflags")}`.

### 2. Novo componente `WelcomeStep` (`src/components/assessment/WelcomeStep.tsx`)

- Layout centralizado com animacao fade-in (framer-motion).
- Icone acolhedor (Heart ou Sparkles).
- Titulo: "Vamos entender sua dor juntos" / "Let's understand your pain together".
- Subtitulo com tempo estimado: "Sao apenas X minutos" (basic: ~3 min, premium: ~5 a 8 min).
- 3 bullets rapidos do que vai acontecer (triagem, anamnese, diagnostico).
- Botao "Comecar avaliacao" / "Start assessment".
- Props: `mode` (basic/premium) e `onContinue`.

### 3. Atualizar `AssessmentStepper.tsx`

- Adicionar `"welcome"` ao `STEP_MAP` mapeando para `"redflags"` (mesmo circulo, sem passo extra visivel no stepper).
- O stepper nao mostrara um passo adicional -- o welcome e apenas uma introducao antes do primeiro passo real.

### 4. Traducoes

- As strings serao inline com fallback (mesmo padrao usado no resto do arquivo Assessment.tsx), usando `t("welcome.title") || "fallback"`.