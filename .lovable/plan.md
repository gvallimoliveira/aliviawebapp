# Corrigir fidelidade e textos ausentes no PNG do Studio

## Objetivo
Fazer o PNG reproduzir exatamente a arte exibida, inclusive após edição: mesma escala, mesmas quebras e posições, sem palavras cortadas e sem arquivos contendo apenas o fundo.

## Implementação
- Manter a superfície temporária de exportação em uma camada realmente pintável no iPhone/Safari, sem deixá-la atrás da página onde o navegador pode descartar os textos.
- Vincular o CSS de fontes à família usada em cada arte, evitando reaproveitar regras incompletas de outra marca ou geração.
- Congelar as linhas aprovadas sem permitir que pequenas diferenças de métrica da fonte aumentem a frase dentro do PNG; cada linha respeitará a largura visual original.
- Aplicar a correção no exportador compartilhado, cobrindo arte individual, lote, carrossel, miniatura e galeria.
- Adicionar regressões automáticas para troca de fonte, palavra no limite da linha, texto editado e superfície exportável no Safari.

## Validação
- Executar os testes focados e a suíte do Studio.
- Conferir no preview uma arte 9:16 com texto editado e comparar a prévia com o PNG.
- Verificar que modelos com movimento não gerem mais PNG apenas com fundo e assinatura.
