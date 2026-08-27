---
name: Studio — artes autorais do método (STEPS / D.I.F.I.)
description: Blocos StepsBlock e DifiBlock no motor criativo, exclusivos da marca Aliv.iA (content_source = "alivia") e do Studio interno
type: feature
---

`StepsBlock` (escada dos 6 degraus) e `DifiBlock` (ciclo Dor → Inibição → Fraqueza → Incapacidade com a marca rompendo no centro) reaproveitam as artes institucionais de `MethodologySection.tsx` como peças de Instagram.

Exclusividade: `composePage(..., only, exclusive)` — o parâmetro `exclusive` libera os kinds `steps`/`difi`. Passa `true` no Studio interno (`StudioLanding`) e `isAlivia` (`brand.content_source === "alivia"`) no Studio público. Qualquer outra marca nunca recebe essas artes, nem no sorteio nem via modelos (`kindsForModels(ids, photoCount, exclusive)` + flag `needsBrand` no modelo "Método (STEPS / D.I.F.I.)", que fica oculto para outras marcas).

Legendas próprias em `caption.ts` explicando o método.
