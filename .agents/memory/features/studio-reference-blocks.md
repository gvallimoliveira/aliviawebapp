---
name: Studio reference blocks (busca, mockups, porta, palco)
description: Blocos criativos derivados das referências enviadas (barra de busca, dispositivos, porta, pessoa sobre celular) e como o handle/site da marca alimenta as artes
type: feature
---

Blocos no núcleo criativo (`src/pages/studio/blocks/`, registrados em `src/studio-core/blocks.ts` + `composePage`):

- `SearchBlock` — barra de busca com sugestões simulando digitação; prefixos ("como tratar", "por que sinto"...) + sugestões derivadas do acervo editorial da marca (features/marquee/typos/quotes). Formato de dor/desejo.
- `DeviceBlock` — mockup notebook/tablet/celular com o produto aberto. A tela é maquete tipográfica da UI (nunca screenshot real), montada com features + lockup da marca.
- `DoorBlock` — cartaz com porta aberta em recorte e frase de duas alturas vinda das headlines.
- `StageBlock` — pessoa do acervo em pé sobre celular deitado em perspectiva, com perfil social (`BRAND_HANDLE`) ou site (`BRAND_SITE`) aberto. Só renderiza com foto no acervo; entra no pool de blocos fotográficos.

`brand.ts` expõe `BRAND_HANDLE` (default `@aliviafisioapp`) e `BRAND_SITE` (default `aliviawebapp.com.br`); no Studio público vêm de `instagram_handle`/`source_url` da marca via `applyStudioBrandTheme`.
