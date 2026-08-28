# Corrigir renderização e controlar variação linguística

## Resultado
- Remover a colisão do fundo de destaque com as linhas vizinhas, preservando o efeito visual.
- Impedir que blocos sem conteúdo/foto compatível sejam incluídos como artes vazias.
- Adicionar intensidade de variação **Baixa, Média e Alta**, configurável separadamente para títulos, textos de apoio e chamadas/legendas.
- Mostrar exemplos ao vivo de cada categoria antes de gerar uma nova versão.

## Implementação
- Tornar destaques de palavra elementos inline seguros, com altura de linha e margem vertical compatíveis com quebra de linha, incluindo os blocos tipográficos.
- Validar a composição antes da renderização e substituir qualquer bloco incapaz de produzir conteúdo visível por um bloco tipográfico válido; imagens também terão estado de fallback.
- Criar um perfil tipado de intensidades, persistido por marca no editor público e nos parâmetros do Studio interno.
- Aplicar as intensidades tanto aos sinônimos quanto à quantidade de estruturas retóricas, mantendo a mesma seed determinística e sem chamadas de IA.
- Exibir um painel compacto de “Variação linguística” com seletores segmentados e amostras reais do kit ativo, sem consumir geração/crédito.
- Cobrir os níveis e os fallbacks com testes, depois validar build e renderização responsiva.
