# Plano — Acoplamento cirúrgico entre imagem e funcionalidade

## Objetivo
Impedir que uma foto apenas “parecida” seja usada em slides de diferenciais ou ecossistemas. Nesses modelos, a imagem deve ser a tela oficial explicitamente vinculada à funcionalidade; sem vínculo exato, o slide continua normalmente sem foto.

## Implementação
- Remover do carrossel de ecossistema o fallback que procura qualquer foto por afinidade ampla.
- Validar também as imagens explicitamente vinculadas contra o tópico exato do slide antes de renderizar.
- Corrigir vínculos incorretos existentes, especialmente red flags, sem reutilizar a tela de reavaliação como ilustração de outra funcionalidade.
- Aplicar a mesma regra à arte única de ecossistema para evitar divergência com o carrossel.
- Preservar o seletor flexível apenas nos modelos gerais, onde a descrição semântica continua sendo necessária.

## Validação
- Cobrir em teste que avaliação manual nunca recebe laserterapia/termografia por fallback.
- Cobrir em teste que HEP sem print oficial sai sem foto.
- Confirmar que reavaliação expressa continua usando apenas seus prints oficiais.
- Rodar os testes focados do Studio e verificar a prévia sem erros.
