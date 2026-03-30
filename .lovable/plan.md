

## Corrigir centralização do card do tutorial no mobile

### Problema

O card usa `position: fixed` com `top: 50%; left: 50%; transform: translate(-50%, -50%)` via `style` prop inline. Porém, o componente `OnboardingStep` também aplica `w-[320px]` e `max-w-[calc(100vw-2rem)]` via Tailwind. O conflito entre o `transform` inline do style e possíveis overrides do framer-motion (que anima com `y`) faz o card perder a centralização vertical — a animação `y: 8 → y: 0` sobrescreve o `translateY(-50%)` do transform.

### Solução

Usar **flexbox no container** para centralizar, em vez de `transform` no card. Isso elimina o conflito com framer-motion.

**Arquivo: `src/components/onboarding/OnboardingTour.tsx`**
- Envolver o `OnboardingStep` em um `div` com `fixed inset-0 z-[60] flex items-center justify-center p-4`
- Remover a prop `style` do `OnboardingStep`

**Arquivo: `src/components/onboarding/OnboardingStep.tsx`**
- Remover `fixed` da className (o container pai já é fixed)
- Manter `z-[60]` ou removê-lo (o pai controla o z-index)
- Mudar a animação de `y: 8` para `scale: 0.97, opacity: 0` para não interferir no posicionamento

### Arquivos editados
| Ação | Arquivo |
|------|---------|
| Editar | `src/components/onboarding/OnboardingTour.tsx` |
| Editar | `src/components/onboarding/OnboardingStep.tsx` |

