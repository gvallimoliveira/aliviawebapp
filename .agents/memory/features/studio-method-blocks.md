---
name: Studio — artes autorais do método (STEPS / D.I.F.I.)
description: Blocos StepsBlock e DifiBlock no motor criativo, exclusivos da marca Aliv.iA (content_source = "alivia") e do Studio interno
type: feature
---

`StepsBlock` (escada dos 6 degraus) e `DifiBlock` (ciclo Dor → Inibição → Fraqueza → Incapacidade com a mão da Aliv.iA rompendo no centro) reaproveitam as artes institucionais de `MethodologySection.tsx` como peças de Instagram. O diagrama da landing também usa a mão, nunca o raio.

Toda arte que cita STEPS ou D.I.F.I precisa explicar o conceito na própria peça por texto ou ilustração: STEPS nomeia dor/inflamação → reparo → mobilidade → força → função → retorno; D.I.F.I explicita a relação entre dor, inibição, fraqueza e incapacidade. Siglas soltas são proibidas.

Exclusividade: `composePage(..., only, exclusive)` — o parâmetro `exclusive` libera os kinds `steps`/`difi`. Passa `true` no Studio interno (`StudioLanding`) e `isAlivia` (`brand.content_source === "alivia"`) no Studio público. Qualquer outra marca nunca recebe essas artes, nem no sorteio nem via modelos (`kindsForModels(ids, photoCount, exclusive)` + flag `needsBrand` no modelo "Método (STEPS / D.I.F.I.)", que fica oculto para outras marcas).

Legendas próprias em `caption.ts` explicando o método.
