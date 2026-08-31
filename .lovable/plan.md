# Correção definitiva: película escurece só a foto, nunca o texto

## O que está acontecendo

Na tela a ordem é: foto → película escurecida → texto (brilho total).

No download, o exportador faz o contrário: ele rasteriza a arte inteira (com texto), e depois **pinta foto + película por cima** dessa imagem já pronta (`renderStaticNodeToBlob` em `src/pages/studio/exportImage.ts`, linhas ~591-606). Como essa camada extra é aplicada sobre o resultado final, ela cai também sobre o texto — que sai apagado/acinzentado. Isso é global: vale para qualquer marca, qualquer usuário e qualquer modelo que use foto de fundo (`PhotoVeilBlock`, `PhotoFrame`, modo autoral).

O ajuste anterior tentou resolver compondo foto+película num canvas separado, mas o canvas separado continua sendo desenhado **acima** do texto. A arquitetura está invertida.

## Como corrigir

Inverter a ordem de composição: a foto passa a ser pintada **atrás** do que o navegador já rasterizou, em vez de na frente.

1. Rasterizar a arte com fundo transparente (hoje o fundo é preenchido opaco, o que impede pintar qualquer coisa por baixo). Esse raster já contém a película e o texto exatamente como no preview.
2. Montar o PNG final em três passos: cor de fundo → fotos (`paintImagesOnCanvas`) → raster da arte por cima.
3. Com isso a película já rasterizada fica exatamente sobre a foto e o texto continua na primeira camada, com brilho normal. O repinte manual de películas (`paintOverlaysOnCanvas`) deixa de ser necessário e sai do fluxo, eliminando a fonte do duplo escurecimento.
4. Garantir que a região da foto no raster fique transparente durante a captura: os contêineres da foto (bloco de foto de fundo, moldura, modo autoral) não devem pintar cor de fundo opaca em cima do lugar onde a foto entra. Onde houver, neutralizar apenas durante a exportação e restaurar depois.

## Verificação

- Baixar arte da marca Aliv.iA com foto de fundo e comparar pixel a pixel com o preview (texto claro, foto escurecida na mesma intensidade).
- Repetir com a marca Lovechronicles (modo autoral, carrossel) e com uma marca sem foto, para confirmar que nada regrediu.
- Testar 1:1, 4:5 e formato livre, e a exportação em lote de carrossel (vários slides de uma vez).
- Conferir também a galeria (editar arte salva → baixar PNG), que usa o mesmo exportador.

## Detalhes técnicos

- Arquivo central: `src/pages/studio/exportImage.ts` — `renderStaticNodeToBlob`, `paintImagesOnCanvas`, remoção de `paintOverlaysOnCanvas`/`buildOverlayFill`.
- `toCanvas` passa a ser chamado sem `backgroundColor` opaco; o fundo é aplicado no canvas final, antes das fotos.
- `data-studio-overlay="1"` (em `PhotoFrame.tsx` e `PhotoVeilBlock.tsx`) deixa de ser usado para repinte; mantido apenas se necessário como marcação semântica.
- Sem mudança de dados, sem migração e sem consumo de créditos de IA; artes antigas passam a exportar corretamente porque a correção é no motor de exportação.
