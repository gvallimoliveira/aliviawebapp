---
name: Studio Carousel Variety
description: Repertório temático de carrosséis por público/marca e rotação por seed para não repetir o mesmo roteiro.
type: feature
---
O bloco de carrossel escolhe o roteiro por índice de grupo (`carousels[group % len]`), que é quase sempre 0. Por isso:

- Todo público (`applyAudience`) gera vários arquétipos a partir do mesmo material: "do medo ao plano", "3 sinais", "mito e verdade", "por dentro (etapas/provas)", "o depois" e "3 perguntas".
- O acervo neutro (`brandContent.ts`) tem 6 roteiros baseados em `operationWords`: passo a passo, 3 erros, perguntas antes de decidir, mito e verdade, o que acontece em cada encontro, antes e depois com método.
- `buildSegmentContent.finish` ROTACIONA o array `carousels` pela seed do lote (`carousel:<seed>:<segmento>:<ângulo>`) — seed nova = tema novo; mesma seed = mesmo carrossel (edição pela galeria continua determinística).

Nunca reduzir o repertório a um roteiro só nem remover a rotação: o sintoma volta como "carrosséis iguais repetidas vezes". Teste guarda: `src/test/studio-carousel-variety.test.ts`.
