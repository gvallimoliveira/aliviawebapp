---
name: Studio Editorial Line for Any Brand
description: Linha editorial genérica (serviços/diferenciais/produtos) em qualquer marca do Studio — temas fechados, termos de destaque e seleção múltipla.
type: feature
---

Generalização do foco editorial (antes exclusivo dos "Diferenciais Aliv.iA").

- `BrandAudience.editorialGroup` transforma o item em TEMA (não público): não entra em
  `officialAudienceCount`, aparece agrupado no seletor de geração e aceita **seleção múltipla**
  (públicos comuns seguem seleção única).
- `BrandAudience.highlightTerms` define as únicas palavras que podem virar o destaque gigante;
  `highlightTermsFor()` deriva do nome/keyword quando vazio. Adjetivo genérico ("Planejada",
  "Benefício") nunca é destaque.
- `enforceEditorialFocus` (alias legado `enforceDifferentialFocus`) em `brandContent.ts` recoloca os
  termos canônicos em `typos`/`kinetic`/`marquee` depois da variação/aprendizado.
- Arco obrigatório por arte: o que é → como funciona → ganho na rotina → custo de não ter. Títulos de
  slide nomeiam o tema; rótulos soltos são proibidos. Carrossel nunca perde slide: `audienceScope.ts`
  não filtra arrays `slides`/`beats`.
- `buildEditorialScope` em `audienceScope.ts` bloqueia só o vocabulário EXCLUSIVO dos temas irmãos do
  mesmo grupo (siglas de 4 letras como sRPE/HEP contam), sem aplicar o filtro clínico de públicos.
- Editor: `StudioProBrand.tsx` tem campos "Linha editorial" e "Termos de destaque" por item.
- Testes: `src/test/studio-editorial-any-brand.test.ts` (marca comum) e
  `src/test/studio-subniche-content.test.ts` (Aliv.iA, resultado preservado).
