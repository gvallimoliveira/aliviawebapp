---
name: Studio Vestibular Lexicon
description: Vocabulário de tontura (labirintite, VPPB, cristais/otocônias, canais semicirculares, avaliação e manobras posicionais corretivas) nas artes do público vestibular.
type: feature
---

Fonte única: `src/pages/studio-pro/vestibularLexicon.ts` (local, determinístico, zero crédito de IA).
Aplicado em `applyCharm` (`src/pages/studio-pro/charmCopy.ts`) para QUALQUER ângulo, inclusive "informar".
Teste: `src/test/studio-vestibular-lexicon.test.ts`.

## Relação entre os termos (usada na copy)
- Labirintite = apelido popular que virou guarda-chuva; quase nunca é o quadro real.
- VPPB = causa mais comum da vertigem de posição.
- Cristais (otocônias) = partículas que saem do lugar.
- Canais semicirculares = onde o cristal gera o giro.
- Avaliação de VPPB = testes de posição; dizem SE é e QUAL canal.
- Manobras posicionais corretivas = reposicionam os cristais, sempre DEPOIS da avaliação.

## Regras
- Nunca prometer cura, nem autonomia da IA, nem usar "protocolo".
- Nunca considerar ou apresentar dor como sintoma vestibular. Descrever o quadro como disfunção vestibular, vertigem, instabilidade, desequilíbrio ou sensação de o mundo rodar.
- Manobra nunca aparece antes da avaliação na mesma frase.
- Escolha por semente (`marca:probe:ângulo`): mesma combinação, mesmo texto.
- A linha `vestibular` de `SUBNICHE_CHARM` também usa esse vocabulário (não voltar ao "Tontura e vertigem não devem ditar o seu ritmo").
