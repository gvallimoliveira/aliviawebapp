---
name: Studio Photo Rotation
description: Rotatividade do acervo dentro do lote — foto menos usada primeiro, teto de 3 repetições com 10+ fotos e cota de 70% de artes com foto de fundo.
type: feature
---

- `src/pages/studio/photoLedger.ts` (`claimPhoto`) decide a foto olhando o LOTE, não a arte isolada: menos usada primeiro, empate pela ordem determinística do nexo.
- Teto duro: `MAX_REPEAT_PER_ROUND = 3` quando o acervo tem `REPEAT_CAP_MIN_LIBRARY = 10` fotos ou mais.
- Cada arte precisa de `artKey` no formato `"<lote>|<arte>"` (`BlockProps.artKey`); o lote reinicia a contagem e a escolha por arte é memorizada (re-render não conta uso duas vezes).
- `pickPhotoForTopics(..., artKey)` usa o hash do `artKey` como semente da permutação (o `index` pequeno dos blocos fazia o lote inteiro cair em 3/4 fotos).
- Filtro "fotos em destaque": `PHOTO_FIRST_SHARE = 0.7` em `composePage.ts` (era 50%), com segunda passada para completar a cota quando a regra de vizinhança não cabe.
