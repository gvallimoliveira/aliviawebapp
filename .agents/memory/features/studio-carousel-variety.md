---
name: Studio Carousel Variety
description: Repertório temático e memória estável de carrosséis por público/marca para não repetir roteiros.
type: feature
---
O bloco de carrossel escolhe o roteiro por índice de grupo (`carousels[group % len]`), que é quase sempre 0. Por isso:

- Todo público (`applyAudience`) gera vários arquétipos a partir do mesmo material: "do medo ao plano", "3 sinais", "mito e verdade", "por dentro (etapas/provas)", "o depois" e "3 perguntas".
- O acervo neutro (`brandContent.ts`) tem 6 roteiros baseados em `operationWords`: passo a passo, 3 erros, perguntas antes de decidir, mito e verdade, o que acontece em cada encontro, antes e depois com método.
- Todo roteiro tem `id` editorial estável. O diretor escolhe por frescor usando a memória da marca; a variação de palavras não apaga o histórico de uso.
- Roteiros são separados pela quantidade de slides antes da escolha, preservando capa + miolo + CTA sem slides vazios.
- Quando um público tem 4+ roteiros próprios, o acervo genérico não é misturado: assunto selecionado permanece dirigido.
- Histórias também nascem das dores, desejos e provas do público, com cena, virada e conclusão de valor.
- Todo carrossel usa na capa um gancho ativo da Biblioteca de Ganchos da marca, escolhido por afinidade com a tese do roteiro e sem repetir no lote. A capa preserva a tese como ponte, o miolo mantém o raciocínio original e o último slide converte o desejo do público no CTA configurado pela marca. A potencialização nunca altera a quantidade de slides.

Nunca reduzir o repertório a um roteiro só, remover os IDs ou ignorar a memória na escolha: o sintoma volta como "carrosséis iguais repetidas vezes". Testes guarda: `src/test/studio-carousel-variety.test.ts` e `src/test/studio-director.test.ts`.
