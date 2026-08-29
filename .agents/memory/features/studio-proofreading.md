---
name: Studio Proofreading
description: Revisor de concordância (agreement.ts) e escolha inteligente do texto digitado na barra de busca do Studio.
type: feature
---

## Revisão de concordância (`src/pages/studio/agreement.ts`)

Todo texto de arte passa por `proofread()` (concordância + pontuação) antes de ser aprovado:
- `fixAgreement` flexiona determinantes, possessivos e ordinais pelo NÚCLEO nominal ("apenas o primeiro etapa" → "apenas a primeira etapa"; "a sua dia a dia" → "o seu dia a dia").
- Gênero/número vêm de dicionário de exceções (dia, problema, sistema / fase, dor, imagem…) + sufixos. Sem certeza ⇒ NADA é alterado (conservador por decisão).
- Locuções fixas ("dia a dia", "fase a fase", "passo a passo") são protegidas.
- Pontos de entrada: `rephrase` (rewrite.ts), `charmify` (charm.ts) e `sentence()` (grammar.ts).

Regra: erro de concordância é bug de produto. Ao adicionar sinônimo/moldura nova, cobrir com teste em `src/test/studio-agreement.test.ts`.

## Barra de busca (`blocks/SearchBlock.tsx`)

O texto digitado não é fixo: cada prefixo declara com o que combina (condição/diagnóstico, lacuna, objetivo). O motor escolhe o prefixo que dá match com TODAS as sugestões; sem match específico, usa os abrangentes ("saber mais sobre", "quero entender", "pesquisando sobre").

## Títulos por lote

`buildSegmentContent` limita a 12 headlines (8 dirigidas + cauda sorteada pela seed), mantendo variedade entre lotes sem diluir a comunicação dirigida.
