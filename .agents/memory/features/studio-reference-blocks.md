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

Modelos adicionais (mesmo registro):

- `ConstellationBlock` — nome da EMPRESA em serifada gigante ao centro com pilares em português (Propósito, Mensagem, Clareza, Valores, História, Autenticidade, Conexão...) ligados por hastes com ponto. Nunca termos em inglês.
- `SignpostBlock` — poste com duas placas: a de cima é o "local atual" = DOR do nicho (`compare.before`/objeções); a de baixo, com ponta de seta, é o DESEJO resolvido pela marca (`compare.after`), sempre amarrado ao nome da marca. Ex.: "Insegurança na avaliação" → "Clareza com Aliv.iA".
- `BillboardBlock` — outdoor em parede com duas silhuetas desfocadas se cruzando na calçada; a mensagem é o encontro que não deveria depender do acaso (a marca conecta paciente e profissional).
