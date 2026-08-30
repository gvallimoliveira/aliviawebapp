# Simplificar carrosséis como artes individuais

## Objetivo

Manter a leitura de carrossel como uma faixa horizontal ordenada, mas eliminar o tratamento técnico em lote. Cada slide será uma arte independente, com seu próprio menu logo abaixo e usando exatamente os fluxos individuais já existentes de baixar, salvar, ajustar texto, inverter cores e copiar legenda.

A mudança valerá para todo o Studio público, incluindo marcas comuns e o modo autoral LoveChronicles.

## Experiência final

```text
Carrossel · deslize para o lado

[ Slide 1 ]   [ Slide 2 ]   [ Slide 3 ]
[ ações 1 ]   [ ações 2 ]   [ ações 3 ]

Cada slide:
- baixa sozinho em PNG;
- salva sozinho na galeria;
- pode ser editado sem alterar os demais;
- pode inverter cores sem alterar os demais;
- mantém sua posição visual na sequência do carrossel.
```

Não haverá mais botão “PNG (N)” nem “Salvar carrossel” nesses conjuntos. A entrega deixa de depender da captura simultânea de vários nós, que é o ponto instável do fluxo atual.

## Implementação

1. **Segmentar o menu no Studio comum**
   - Preservar a faixa horizontal, o snap e a ordem narrativa dos slides.
   - Renderizar abaixo de cada slide o mesmo conjunto de ações usado por uma arte avulsa.
   - Fazer download, edição, restauração, inversão e estado de salvamento trabalharem somente com o índice daquele slide.
   - Manter a legenda do carrossel disponível em cada slide, sem duplicar lógica de geração textual.

2. **Salvar cada slide como arte independente**
   - Reutilizar o salvamento individual já existente: miniatura própria, PNG próprio, snapshot de um único slide e `text_edits` da própria arte.
   - Criar uma linha independente na galeria para cada slide salvo, com título, formato e posição reconhecíveis.
   - Preservar no bloco salvo os metadados narrativos do carrossel (`group`, índice e total), para que capa, desenvolvimento, CTA, contador e indicadores continuem corretos.
   - Não alterar nem migrar carrosséis antigos: eles continuam abrindo pelo formato agrupado atual; apenas os novos salvamentos serão individuais.

3. **Aplicar o mesmo padrão ao modo autoral**
   - Colocar o menu individual abaixo de cada slide do LoveChronicles.
   - Adaptar download, inversão e salvamento para receber `art.key + slideIndex`, em vez de operar sobre o conjunto inteiro.
   - Salvar snapshot, miniatura e PNG de um slide por item da galeria, preservando o trecho e a posição no texto autoral.
   - Manter as fotos fixadas, slogans, ornamentos e sequência cronológica exatamente como renderizados.

4. **Galeria e edição**
   - Fazer cada novo slide aparecer como card próprio na galeria.
   - Reutilizar o editor atual com snapshot de um slide, permitindo alterar texto e formato sem regenerar nem gastar geração.
   - Manter compatibilidade de leitura, download e edição com os carrosséis agrupados já salvos.

5. **Retirar os atalhos de lote problemáticos**
   - Remover das telas alteradas as ações de baixar/salvar um carrossel inteiro por uma única chamada.
   - Não usar `exportNodesAsPng`, `lockUniformHeight` ou descoberta de arquivos irmãos para os novos cards segmentados.
   - Preservar os helpers compartilhados enquanto ainda forem necessários para conteúdo legado ou outros consumidores, evitando regressões fora do Studio público.

6. **Ajuda e comunicação**
   - Atualizar a ajuda relevante em português, inglês e espanhol explicando que slides de carrossel são gerenciados individualmente.
   - Manter as páginas de suporte geral e de clínica sincronizadas conforme a regra do projeto.

## Validação

- Testar em desktop e celular um carrossel comum e um autoral.
- Em cada um, baixar separadamente primeiro, meio e último slide e comparar o PNG com o quadro visível.
- Salvar dois slides, confirmar dois cards distintos na galeria e editar texto/formato de apenas um deles.
- Confirmar que edição, inversão e estado “Salvo” de um slide não afetam os vizinhos.
- Abrir um carrossel antigo da galeria e confirmar que download e edição legados continuam funcionando.
- Adicionar testes para a segmentação por slide, snapshot unitário e preservação dos metadados de sequência.

## Detalhes técnicos

- Principal: `src/pages/studio-pro/StudioProCreate.tsx` — substituir ações por grupo por ações por item dentro da faixa horizontal e aposentar `downloadCarousel`/`saveCarousel` da UI.
- Autoral: `src/pages/studio-pro/StudioProAuthorial.tsx` — identificar estado, arquivo e persistência por slide.
- Galeria/editor: manter `StudioProBrand.tsx`, `StudioArtEditor.tsx` e `artSnapshot.ts` compatíveis com registros antigos de vários slides e novos registros unitários.
- Testes: ampliar a cobertura do Studio para garantir que cada slide percorra somente o pipeline individual e que os carrosséis legados permaneçam válidos.
