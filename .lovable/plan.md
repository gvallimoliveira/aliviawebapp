# Corrigir dimensões das artes e a troca de formato

## O que está acontecendo (verificado no código e no vídeo)

No vídeo, várias artes aparecem com o desenho ocupando só a parte de cima do quadro e uma grande faixa vazia (creme) embaixo; outras aparecem esticadas ou com texto encostando na borda. As causas encontradas:

1. **O formato "Livre" não tem proporção nenhuma.** Nos três lugares que desenham o quadro (`StudioProCreate`, `StudioProAuthorial`, Studio público) o formato `free` é definido só como `width: 100%`, sem `aspectRatio`. No modo autoral o `free` nem existe no mapa de estilos, então a arte fica sem largura e sem proporção definidas. Como "Livre" é hoje o padrão de todo o Studio, a maioria das gerações sai com dimensão indefinida.
2. **Alturas internas presas ao tamanho da tela do celular, não ao quadro.** No formato Livre as seções usam `min-h-[80svh]` (`sectionHeight`) e vários blocos usam alturas em `svh` ou em pixels fixos (26 ocorrências: PhotoType, Billboard, Stage, PhotoPortrait etc.). O resultado depende da altura do aparelho e não muda junto com o quadro — é por isso que trocar o formato no menu superior não reorganiza a arte de verdade.
3. **A faixa vazia embaixo vem do AutoFit.** O `AutoFit` reduz a arte com `transform: scale`, mas transform não reduz a altura de layout. Quando a arte precisa encolher (copy longa), o quadro continua com a altura original e sobra a faixa de fundo visível no vídeo. O `ResizeObserver` do AutoFit também só remede quando a **largura** muda, ignorando mudança de altura.
4. **Três fontes de verdade divergentes para a proporção**: `StudioProCreate` (400/480/560 px), `StudioProAuthorial` (mesmos valores duplicados), Studio público (430/560/720 px + `<style>` sobrescrevendo a altura das seções) e o editor da galeria (`frameRatio`). Elas não concordam entre si, então a mesma arte muda de proporção entre criar, editar e exportar.

## Ajustes

**1. Uma única fonte de proporção**
Criar `src/pages/studio/frame.ts` com a proporção oficial de cada formato (9:16, 4:5, 1:1 e Livre) e o tamanho lógico de exportação. Criar, modo autoral, galeria/editor e exportação passam a ler daí. Remover os mapas duplicados e os blocos `<style>` que sobrescrevem altura de seção.

**2. Dar proporção real ao "Livre"**
"Livre" deixa de significar "sem altura" e passa a significar "o motor escolhe a proporção da arte" entre proporções válidas de Instagram (1:1, 4:5, 9:16), de forma determinística pela semente e pelo tipo de bloco. Assim cada arte tem dimensão publicável, o resultado é reproduzível e o carrossel mantém proporção única em todos os slides.

**3. Alturas internas relativas ao quadro**
Trocar todo `svh`/`vh` e as alturas fixas em pixels dos blocos por percentuais do próprio quadro (`h-full`, `h-[62%]`, etc.), incluindo `sectionHeight`. Com isso, mudar o formato no menu superior redesenha a arte em vez de apenas mudar a moldura.

**4. AutoFit sem faixa vazia**
Como todo formato passa a ter proporção fixa, o quadro sempre é preenchido pela seção (`h-full`). Além disso:
- o AutoFit passa a compensar a redução (o contêiner interno cresce em altura/largura na proporção inversa da escala), garantindo que o conteúdo escalado ainda cubra o quadro inteiro;
- o `ResizeObserver` volta a medir largura **e** altura, para remedir na troca de formato e na rotação do aparelho.

**5. Coerência com exportação e galeria**
Verificar que PNG, snapshots e a troca de formato dentro da galeria usam a mesma proporção do módulo novo, para o arquivo baixado ter exatamente o enquadramento visto na tela.

## Verificação

- Gerar um lote na marca Guilherme Vallim em cada formato (Livre, 9:16, 4:5, 1:1) e conferir que nenhuma arte tem faixa vazia e que a troca no menu superior reorganiza o conteúdo.
- Baixar PNG de uma arte simples e de um slide de carrossel e comparar com a tela.
- Repetir no modo autoral (@lovechronicleswithpain), que hoje não tem estilo definido para "Livre".

## Detalhes técnicos

Arquivos afetados: `src/pages/studio/frame.ts` (novo), `src/pages/studio/AutoFit.tsx`, `src/pages/studio/blocks/shared.ts` e os blocos com `svh`/px fixos, `src/pages/studio-pro/StudioProCreate.tsx`, `src/pages/studio-pro/StudioProAuthorial.tsx`, `src/pages/studio-pro/StudioArtEditor.tsx`, `src/pages/studio/StudioLanding.tsx`, `src/pages/studio/exportImage.ts` / `artSnapshot.ts` (só o consumo da proporção).

Sem mudanças de banco, de créditos ou de motor de texto.
