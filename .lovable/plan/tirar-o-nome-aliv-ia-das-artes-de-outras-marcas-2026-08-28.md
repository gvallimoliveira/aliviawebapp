# Tirar o nome Aliv.iA das artes de outras marcas

## De onde vem (verificado no código e no banco)

A marca da arte é montada num módulo único (`src/pages/studio/brand.ts`), e o Studio público troca esse lockup para a marca ativa antes de renderizar — no seu caso a logo do PerformaPro apareceu correta justamente porque essa troca funcionou.

O problema é que **dois blocos escrevem o nome "Aliv.iA" no HTML, em texto fixo**, ignorando o módulo de marca:

- `blocks/MonoBlock.tsx` linha 172 — o lockup mono (logo grande + wordmark + slogan em caixa alta) escreve `Aliv.` + `iA`. É exatamente a arte da sua foto: logo verde do PerformaPro, wordmark "Aliv.iA", slogan gerado do nicho do PerformaPro.
- `blocks/MonoBlock.tsx` linha 52 — a assinatura interna do mesmo bloco, mesmo texto fixo.
- `blocks/StepsBlock.tsx` linha 46 — "Método Aliv.iA". Esse bloco hoje só é sorteado para a marca dona, mas o texto fixo continua sendo um risco.

Também confirmei no banco que a marca `PerformaPro` está com `content_source = generic`, ou seja o acervo editorial da Aliv.iA (que é cheio de copy clínica) **não** é usado por ela — a contaminação é só de wordmark nos blocos acima.

## Correção

1. **MonoBlock passa a usar o nome da marca ativa**
   - O wordmark do lockup e a assinatura interna passam a ler o nome do módulo de marca, quebrando o nome no ponto quando existir (`Perfor` + `maPro` não faz sentido, então: se o nome tem ponto — "Aliv.iA" — a segunda parte sai na cor de destaque; se não tem, o nome sai inteiro e uma palavra final ganha o destaque). O visual do modelo se mantém para a Aliv.iA e passa a servir qualquer marca.

2. **StepsBlock deixa de citar a marca em texto fixo**
   - "Método Aliv.iA" passa a ser "Método {nome da marca}", vindo do mesmo módulo.

3. **Trava contra reincidência**
   - Teste de regressão em `src/test/studio-coverage.test.ts` que varre os arquivos de `src/pages/studio/blocks/` e falha se qualquer bloco contiver o literal do nome da marca (ou o site/handle) fora de comentário. Assim um bloco novo não volta a plantar "Aliv.iA" na arte de outro cliente.

4. **Endurecer o fallback do módulo de marca**
   - Hoje, se o nome da marca chegar vazio, o módulo cai para "Aliv.iA". Passa a cair para um neutro ("Sua marca") — nenhum caminho de fallback pode expor o seu negócio na conta de outro usuário.

## Detalhes técnicos

- Arquivos: `src/pages/studio/blocks/MonoBlock.tsx`, `src/pages/studio/blocks/StepsBlock.tsx`, `src/pages/studio/brand.ts`, `src/test/studio-coverage.test.ts`.
- Nada muda no acervo editorial, na cota por geração, no Studio interno (que continua com a Aliv.iA aplicada por padrão) nem no app clínico.
- Verificação: rodar os testes do Studio e abrir a marca PerformaPro no preview para conferir que o modelo mono sai com o wordmark "PerformaPro".
