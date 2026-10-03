# Acoplamento global entre imagem e texto

## Objetivo
Tornar cirúrgica a escolha de imagens no Studio, com prioridade especial para diferenciais, cadeias e ecossistemas Aliv.iA, sem perder a troca manual disponível em todas as artes.

## Implementação
- Centralizar a associação canônica entre cada diferencial Aliv.iA, seu assunto e suas telas oficiais, eliminando mapas paralelos que podem divergir.
- Fazer ecossistemas, cadeias, carrosséis e artes individuais de diferenciais consultarem a mesma associação exata.
- Validar a imagem no momento da renderização: imagem oficial só entra quando pertence ao diferencial abordado; sem correspondência exata, a composição fica sem foto.
- Para fotos comuns de outras marcas, manter seleção semântica global por assunto e descrição, recusando imagem sem nexo suficiente.
- Tornar “Trocar imagem” um controle global nas artes com imagem, usando todo o acervo disponível da marca; manter envio temporário do aparelho exclusivo ao administrador, sem salvar na galeria nem consumir cota.
- Ao abrir a troca, apresentar primeiro imagens compatíveis com o assunto da arte e sinalizar que uma escolha manual substitui conscientemente a curadoria automática.

## Validação
- Cobrir em testes a correspondência exata dos prints oficiais por diferencial e a ausência de fallback incorreto.
- Cobrir a troca manual em arte individual e slide de carrossel, incluindo o PNG.
- Validar compilação, testes do Studio e uma geração real com diferencial e ecossistema Aliv.iA.

## Resultado esperado
Toda imagem automática terá relação direta com o texto da arte. A curadoria será global, enquanto a substituição manual continuará possível em qualquer formato que contenha imagem.
