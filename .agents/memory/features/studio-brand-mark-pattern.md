---
name: Studio Brand Mark Pattern
description: Padrão de fundo repetido com o símbolo da marca (mão da Aliv.iA, raio do PerformaPro) na mesma rotação das tramas geométricas.
type: feature
---
- Campo `studio_brands.mark_url` guarda o símbolo isolado (só o ícone, sem wordmark), enviado na etapa 1 dos ajustes de marca (`BrandAssetsFields`, chave `mark`). Sem símbolo, cai no logo.
- `brand.ts` exporta `BRAND_MARK`; `applyStudioBrandTheme({ mark })` troca por marca.
- `blocks/brandMarkTile.ts` gera ladrilho monocromático em **data URL** via canvas (silhueta + `source-in`), com cache. Data URL é obrigatório: background remoto quebra no `foreignObject` da exportação PNG.
- `Texture.tsx`: `BRAND_MARK_TEXTURES` (tile 46px alpha 0.09 e tile 82px alpha 0.075) entram na rotação da persona junto das 8 tramas geométricas; `TEXTURE_COUNT` continua só geométrico (KineticBlock usa CSS puro), `PATTERN_COUNT` é o total.
- As tramas geométricas (triângulos, +, pontos) permanecem — o padrão da marca é alternativa, não substituto.
