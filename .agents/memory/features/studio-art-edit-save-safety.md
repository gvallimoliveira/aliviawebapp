---
name: Studio Art Edit — Save Safety & Text Size Range
description: Remontagem obrigatória após editar texto na arte (evita erro ao salvar) e faixa ampliada de tamanho de texto.
type: feature
---
Regras firmadas em set/2026:

1. **Remontar após editar.** `finishEdit` e `cancelEdit` em `StudioProCreate.tsx` bumpam `resetTick`.
   Digitar em `contentEditable` substitui os nós de texto do React; sem a remontagem o próximo
   render/salvamento estourava `NotFoundError` ("The object can not be found here") no StudioBoundary
   e o usuário perdia a arte editada. O efeito de reaplicação (`applyArtText` + `applyArtTextSizes` +
   `applyArtMoves`) recoloca a edição depois da remontagem.
2. **`applyArtText` não recria filhos.** Quando o elemento tem um único nó de texto, altera-se
   `nodeValue` em vez de `textContent`, mantendo os nós que o React referencia.
3. **Faixa de tamanho** em `artTextEdit.ts`: `MIN_TEXT_SCALE = 0.3`, `MAX_TEXT_SCALE = 4`, passo 0,1.
4. **Carrossel sem frase repetida:** `dedupeCarouselSlides` (`director.ts`) roda em todo roteiro antes
   da renderização; nenhuma frase pode aparecer em dois slides da mesma sequência. Repertórios em
   `brandContent.ts` não devem usar arremate único para todos os slides.

Coberto por `src/test/studio-carousel-no-repeat-slide.test.ts` e `src/test/studio-text-size.test.ts`.
