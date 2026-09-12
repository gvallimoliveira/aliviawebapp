---
name: Studio MSK Lexicon
description: Vocabulário de lesões (LCA, menisco, manguito, arremessador, lesão muscular, tendinopatias, dor patelofemoral, impactação de quadril, entorse de tornozelo) nas artes de esportista, pós-op e dor crônica.
type: feature
---

Fonte única: `src/pages/studio-pro/mskLexicon.ts` (local, determinístico, zero crédito de IA).
Aplicado em `applyCharm` (`src/pages/studio-pro/charmCopy.ts`) para qualquer ângulo, inclusive "informar".
Teste: `src/test/studio-msk-lexicon.test.ts`.

## Regras
- Tema citado no público tem prioridade; sem citação, o tema roda pela semente entre os
  temas compatíveis com o contexto (esportista / pós-operatório / dor crônica).
- Público vestibular tem precedência (léxico de tontura), nunca os dois na mesma arte.
- Nunca prometer cura, nem autonomia da IA, nem usar "protocolo".
- Ideias-guia: alta por critério (LCA), imagem alterada ≠ dor (menisco, condromalácia),
  tendão pede carga e não repouso, lesão muscular recidiva por retorno apressado,
  quadril que impacta pede controle e não mais alongamento, entorse anterior é o maior
  fator de novo entorse, ombro do arremessador troca amplitude por controle.
