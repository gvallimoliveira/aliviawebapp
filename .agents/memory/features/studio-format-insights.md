---
name: Studio Format Insights
description: Campo "Insights de formatos" no kit de marca — diálogo pronto da arte (título | falas | fecho) usado pelo diretor e motor criativo.
type: feature
---

Campo `studio_brands.format_insights` (texto livre), editável em Ajustes da marca.

- Sintaxe: uma ideia por linha, partes separadas por `|` → `título | fala | fala | fecho`.
  1 parte = cartaz; 2 = cartaz com apoio; 3+ = também lista, história e carrossel
  (capa + miolo + CTA). Linha com `#` é comentário.
- `src/pages/studio-pro/formatInsights.ts` lê e injeta no TOPO de headlines, subs,
  features, lists, stories e carousels; entra por último em `buildSegmentContent`
  (`withInsights`), então não é reescrito pela variação linguística.
- Palavras dos insights entram no `learnedVoice` do diretor criativo — atraem as
  escolhas do lote. Zero crédito de IA; campo vazio não altera nada.
- Marca Aliv.iA já vem com 14 formatos escritos (9 profissionais, 5 pacientes).
