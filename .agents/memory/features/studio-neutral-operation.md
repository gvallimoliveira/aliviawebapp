---
name: Studio Neutral Archive Operation Vocabulary
description: Acervo neutro do Studio usa o vocabulário da operação real da marca (operationWords), nunca temática de consultório.
type: feature
---

`operationWords(dna, brandName)` em `src/pages/studio-pro/brandDnaKit.ts` deriva do tipo de oferta
(atendimento / produto / programa / serviço) as palavras da operação: `who`, `whoPlural`, `firstStep`,
`planWord`, `reviewWord`, `encounterWord`, `deliverable`, `cycleLabel`.

O acervo de emergência em `brandContent.ts` (headlines, stats, métricas, trípticos, comparativos,
jornadas, features, listas, histórias, carrosséis, sales) escreve com essas palavras — nada de
"consulta", "alta", "conduta", "paciente" fora de marca de atendimento clínico. `subject` usa a 1ª
palavra-chave/nicho da marca para nunca falar de assunto sem nexo.

Vocabulário proibido no arquivo (test `studio-brand-isolation`): prazo, responsável, escopo.
Guardado por `src/test/studio-neutral-operation.test.ts`.
