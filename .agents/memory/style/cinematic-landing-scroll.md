---
name: Cinematic Landing Scroll
description: Padrão de scroll cinematográfico (Apple/OPPO-like) para landings; primitivos reutilizáveis em src/components/scroll e regras de identidade.
type: design
---

Inspiração: página de produto do OPPO Find X9 Pro (vídeo enviado em 22/08/2026) — seções sticky full-bleed, tipografia cinética, revelações no scroll.

Primitivos reutilizáveis (`src/components/scroll/`):
- `ScrollProgress.tsx` — barra de progresso fixa no topo (scaleX, gradiente primary→accent).
- `Reveal.tsx` — entrada fade/slide (opcional scale), once, respeita reduced-motion.
- `KineticStatement.tsx` — momento escuro imersivo: palavra única escalando + brackets fechando + aura teal. Wrapper por landing (ex.: `PatientStatement.tsx`) fornece o copy traduzido.
- `StickyShowcase.tsx` (+ `PatientJourneyShowcase.tsx`) — visual fixado com passos que avançam pelo scroll.
- `BrandMarquee.tsx` — faixa contínua CSS-only entre seções.

Regras:
- Máximo 1 seção escura por landing (~10% do tempo de scroll). O resto mantém a paleta warm/teal do app.
- Só animar opacity/transform (perf mobile); nada de animar layout.
- Aplicado primeiro em `/para-pacientes`. Replicar depois em profissional, clínica e acadêmico com copy próprio, reaproveitando os mesmos primitivos.
- Todo copy novo vai para `src/locales/pt|en|es.json` (chaves `cine.*`).
