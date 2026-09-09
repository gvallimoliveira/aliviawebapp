---
name: Studio Typography Guards
description: Regras globais de acabamento tipográfico das artes do Studio (palavra inteira, chamada curta, caixa, fecho, contraste em foto).
type: feature
---
`src/pages/studio/typographyGuards.ts` é a fonte única das regras globais, valendo para todas as marcas e modelos:

- `displayWord` + `displayWordStyle` + `displayWordContainer`: palavra-cartaz nunca quebra letra/sílaba; tamanho por container query (`cqw`), `whiteSpace: nowrap`, `word-break: keep-all`. Usado em `StackTypeBlock` e `EchoBlock`.
- `shortKicker`: chamada de público curta, UM público por vez, sem enumerações/parênteses, corte só em palavra inteira. Aplicado centralmente em `sanitizeContent` (`brandContent.ts`) para `kickers` e `features[].tag` — não aplicar por bloco.
- `sentenceLead`: rótulo em caixa alta entra em caixa de frase ("COMO EU TRABALHO" → "Como eu trabalho"); nunca `lower1` sobre all-caps ("cOMO..."). Aplicado em `sanitizeContent` sobre `typos[].lead`.
- Início/meio/fim: `TypoBlock` descarta cauda só com pontuação e fecha com CTA/fecho da marca.
- Contraste em foto: `photoTextPlate(anchor)` + `onPhotoTextStyle(ink)` em `PhotoVeilBlock` e `ElegantAskBlock`; destaque sobre foto usa `--studio-ink-accent` (acento do kit clareado em `brandTheme.ts`), nunca `--accent` cru.
