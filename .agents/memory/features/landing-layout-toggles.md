---
name: Landing Layout Toggles
description: Como alternar entre layouts modernos/cinematográficos e originais das landings, incluindo a landing geral (Gateway)
type: feature
---

# Toggles de layout das landings

Arquivo central: `src/lib/landingLayout.ts`

- `LANDING_LAYOUT: "cinematic" | "classic"` → landings de paciente, profissional, acadêmico e clínica.
  - cinematic: `src/pages/cinematic/*Cinematic.tsx`
  - classic: `src/pages/legacy/*Classic.tsx`
- `GATEWAY_LAYOUT: "modern" | "classic"` → landing geral (seleção de perfil / 4 cards).
  - modern: `src/pages/modern/GatewayModern.tsx`
  - classic: `src/pages/legacy/GatewayClassic.tsx`

`src/pages/Gateway.tsx` e os arquivos de landing raiz são apenas switchers.

## Regra de tom
A landing geral (Gateway) deve permanecer **mais formal e sóbria** que as demais: reveals discretos ao entrar
na viewport, malha técnica de fundo muito suave, elevação leve nos cards no hover. Nada de efeitos
cinematográficos pesados (parallax escuro, kinetic statements, marquee) nessa página.
