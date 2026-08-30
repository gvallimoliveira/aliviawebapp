# Correção: PNG do carrossel sai com a arte deslocada/parcial

## O que está acontecendo

Os slides do carrossel são exibidos numa faixa horizontal na página de criação. Metade dos modelos de arte recebe um efeito de movimento ligado ao scroll da página (`StudioMotion`: deslocamento vertical, deslocamento lateral, zoom, inclinação, desfoque, opacidade e "wipe").

Esse efeito só fica neutro quando o slide está **centralizado verticalmente na tela**. Como o carrossel tem vários slides e o download rasteriza todos de uma vez, os slides que não estavam centralizados foram capturados **no meio do efeito** — a camada interna aparece empurrada para fora do quadro, com zoom ou clipada, sobrando na imagem apenas as camadas que ficam fora do movimento (assinatura da marca, indicadores de slide e o botão "ARRASTE").

É exatamente o padrão dos anexos: o slide 1 (que estava centralizado) saiu completo; os slides 2 a 5 saíram praticamente vazios, com só a marca e os pontinhos.

Efeito secundário visível nos anexos: no formato **Livre** cada slide tem altura própria, então os PNGs saíram com proporções diferentes entre si — o Instagram exige proporção única no carrossel.

## O que será feito

1. **Congelar o movimento durante qualquer exportação** (correção central e global)
   - Antes de rasterizar, o pipeline de exportação neutraliza as camadas de movimento dentro da arte: zera transformações, desfoque, recorte e opacidade herdados do scroll, e restaura tudo ao terminar.
   - Como isso vive no pipeline único de captura, passa a valer para: PNG individual, PNG em lote do carrossel, PNG salvo na galeria, editor de arte da galeria, modo autoral e Studio interno.

2. **Capturar sempre o quadro completo da arte**
   - A captura passa a considerar o quadro com a proporção do formato escolhido, garantindo que o PNG tenha exatamente o enquadramento visto na tela (sem sobra nem corte).

3. **Proporção única no carrossel**
   - No formato Livre, todos os slides do mesmo carrossel são exportados com a mesma altura (a maior do grupo), para o carrossel ser aceito como sequência no Instagram. Nos formatos 1:1, 4:5 e 9:16 a proporção já é fixa e é respeitada.

4. **Validação antes de entregar**
   - Teste automatizado garantindo que a exportação neutraliza as camadas de movimento.
   - Verificação visual no navegador: gerar um carrossel no desktop, exportar em lote e conferir os PNGs slide a slide (formato Livre e 4:5).

## Detalhes técnicos

- `src/pages/studio/blocks/StudioMotion.tsx`: marcar as camadas animadas com um atributo estável (ex.: `data-studio-motion="1"`) para poderem ser neutralizadas na captura.
- `src/pages/studio/exportImage.ts`: novo helper `freezeMotion(node)` (padrão dos helpers existentes `hideCssStrokes` / `inlineImages`) chamado dentro de `renderNodeToPngBlob`, limpando `transform`, `filter`, `clip-path` e `opacity` nas camadas marcadas e devolvendo a função de restauração.
- `src/pages/studio-pro/StudioProCreate.tsx`: `downloadCarousel` e `saveCarousel` passam a exportar o nó do quadro (com `aspect-ratio`/altura normalizada do grupo) em vez de apenas o `div` interno; mesma normalização em `StudioProAuthorial.tsx` e `StudioLanding.tsx`.
- Testes em `src/pages/studio/__tests__` (mesma pasta dos testes de render já existentes).
