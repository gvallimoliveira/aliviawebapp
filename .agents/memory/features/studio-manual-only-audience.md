---
name: Studio Manual-Only Audience
description: Público marcado como manualOnly fica fora do sorteio da Visão 360° e só gera arte quando escolhido na aba do topo (caso "feridas" da marca Guilherme Vallim).
type: feature
---
- `BrandAudience.manualOnly` (jsonb `audiences` de `studio_brands`) exclui o público do sorteio de `pickGlobalAudience` em `brandContent.ts`.
- O público continua disponível: gera arte só quando selecionado manualmente na aba de segmentos.
- Marcado hoje: público `feridas` da marca Guilherme Vallim Fisioterapia (tema dominava os lotes seguintes e travava a variedade).
