# Corrigir exportação de artes com fotos

## Objetivo
Garantir que qualquer arte com foto do acervo seja baixada exatamente como aparece na geração, sem foto ausente, deslocada, comprimida ou fora do formato.

## Implementação
- Unificar o quadro usado pela prévia, pela captura e pelo repinte da foto.
- Reproduzir no PNG o ponto focal, enquadramento, zoom, rotação, recorte e cantos de cada foto.
- Corrigir a detecção das superfícies atrás de fotos transformadas, evitando que o fundo cubra a imagem no arquivo.
- Aplicar a mesma lógica aos downloads individuais, lotes e carrosséis.
- Adicionar verificações automáticas para enquadramentos centralizados, deslocados, ampliados e rotacionados.

## Validação
- Executar os testes de exportação e conferir o estado da aplicação.
- Comparar visualmente prévia e PNG em formatos com foto de fundo, foto dividida, retrato e moldura/dispositivo.
