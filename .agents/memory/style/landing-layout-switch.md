---
name: Landing Layout Switch
description: Como alternar todas as landings entre o layout cinematográfico atual e o layout original preservado.
type: preference
---

Todas as landings (paciente, profissional, acadêmico, clínica) têm o código do layout ORIGINAL preservado em `src/pages/legacy/*Classic.tsx`. As versões cinematográficas ficam em `src/pages/cinematic/*Cinematic.tsx`.

`src/pages/PatientLanding.tsx`, `ProfessionalLanding.tsx` e `AcademicLanding.tsx` são apenas switchers que leem `LANDING_LAYOUT` de `src/lib/landingLayout.ts`.

**Como restaurar o padrão antigo:** trocar `LANDING_LAYOUT` para `"classic"` em `src/lib/landingLayout.ts` (comando do usuário: "restaurar landing pages ao layout original"). Nunca apagar os arquivos em `src/pages/legacy/`.

Primitivos cinematográficos reutilizáveis: `ScrollProgress`, `Reveal`, `BrandMarquee`, `KineticStatement`, `ScrollWords`, `HorizontalShowcase`, `StickyShowcase`, `CinematicClosing` (genérico, aceita copy por props).
