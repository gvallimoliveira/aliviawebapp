---
name: Studio Gallery Edit
description: Edição de arte salva na galeria usa instantâneo (snapshot) da arte pronta, nunca reconstrução pela receita.
type: feature
---

## Regra

Editar uma arte salva no Studio Pro NUNCA pode gerar arte nova. Ao salvar, o Studio grava em
`studio_creations.snapshot` um instantâneo da arte pronta: HTML final serializado (texto exato,
blocos, ornamentos, assinatura) com imagens embutidas em data URL, as CSS vars de cor/fonte da
marca e as dimensões de cada slide. Os arquivos HTML ficam no bucket `studio-art` em
`{user}/{brand}/snapshot/...html`.

- `src/pages/studio-pro/artSnapshot.ts`: `captureArtSnapshot`, `loadArtSnapshot`,
  `saveArtSnapshotHtml`, `sanitizeSnapshotHtml`, `snapshotStyle`, `isArtSnapshot`.
- `StudioArtEditor.tsx` abre o instantâneo (nunca `useArtRender`). Troca de formato reenquadra a
  arte original escalada, com o fundo da marca preenchendo a sobra — nada é recomposto ou cortado.
- Salvar regrava PNG, miniatura, texto e o próprio instantâneo NA MESMA linha da galeria.
- Artes sem `snapshot` (salvas antes desta atualização): edição bloqueada na galeria com aviso.

**Por que:** o editor antigo reconstruía a arte pelo motor textual (memória de frases da marca +
perfil de variação do lote) e colava o texto salvo por posição plana — o resultado era outra arte.
Não reintroduzir reconstrução por receita no caminho de edição.
