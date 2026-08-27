---
name: Studio — preferência de modelos de arte
description: Seletor "Modelos" no editor do Studio público (Aleatório por padrão) que restringe quais blocos o motor gera
type: feature
---

Catálogo em `src/pages/studio/models.ts` (`STUDIO_MODELS` + `kindsForModels`): nomes em português (Manifesto/capa, Letras grandes, Minimalista, Citação, Carrossel, Foto do acervo, Números/prova, Passo a passo, Recurso em close, Antes e depois, Storytelling, Institucional, Barra de busca, Mockup de tela, Conceitual, Cartaz/faixa) mapeando para `BlockKind`s.

`composePage(rng, persona, inspiration, carousels, photoCount, only?)` — com `only` preenchido a página usa somente esses blocos e ignora a linhagem de favoritos; vazio = aleatório (comportamento antigo intacto). Etapa final (motion + expansão de carrossel) fica na helper `finish`.

UI em `StudioProCreate.tsx`: chip "Modelos: Aleatório / N selecionados" abre a lista multi-seleção. Modelos que exigem foto ficam desabilitados sem acervo. Seleção persiste em sessionStorage por marca e NÃO consome cota — só "Nova versão" gera lote novo.

Ao criar bloco novo, incluir no catálogo de modelos também.
