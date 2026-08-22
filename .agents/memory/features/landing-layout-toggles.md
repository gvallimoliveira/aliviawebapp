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

## Landing profissional (estrutura por blocos)
`/profissionais` usa `cinematic/ProfessionalLandingShell.tsx` (hero síncrono) + `ProfessionalLandingBody.tsx`,
que é só um orquestrador: cada seção vive em `cinematic/professional/sections/`, o conteúdo puro em
`professional/content.ts`, e `professional/LazySection.tsx` monta cada bloco só quando ele se aproxima da
viewport. Ao adicionar seção nova, criar um módulo próprio e registrá-lo no orquestrador — nunca voltar a
concentrar tudo em um arquivo único (era a causa da lentidão percebida).

## Regra de tom
A landing geral (Gateway) deve permanecer **mais formal e sóbria** que as demais: reveals discretos ao entrar
na viewport, malha técnica de fundo muito suave, elevação leve nos cards no hover. Nada de efeitos
cinematográficos pesados (parallax escuro, kinetic statements, marquee) nessa página.
