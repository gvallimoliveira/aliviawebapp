# Corrigir lado B, assinatura e quebra literal no Studio

## Resultado
- Fazer “Inverter cores” produzir uma versão B realmente distinta, usando as duas cores principais da marca e mantendo contraste legível.
- Impedir que modelos com identificação própria recebam uma segunda assinatura; a arte mostrará apenas um lockup da marca.
- Normalizar quebras escritas como `\\n` antes da composição dos carrosséis, preservando o storytelling aprovado.

## Implementação
- Ajustar o tema para trocar de fato os papéis de `primary` e `primary2` no lado B, incluindo superfícies, textos, acentos e tokens profundos.
- Marcar os rodapés/lockups internos dos modelos como assinatura própria e tornar a detecção robusta para logos horizontais.
- Adicionar uma limpeza textual global para transformar escapes de linha em espaço ou quebra real antes do encaixe tipográfico.
- Manter o roteiro do carrossel como referência de qualidade, sem torná-lo o único molde nem reduzir a variedade do diretor criativo.

## Validação
- Criar regressões para tema A/B distinto, assinatura única e ausência de `\\n` visível.
- Rodar os testes focados do Studio, validar a prévia e conferir que não há erro de compilação.
