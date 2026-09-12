# Refinamento das capas de carrossel

## Objetivo
Deixar as capas mais limpas, legíveis e semanticamente organizadas, sem alterar o raciocínio nem a quantidade de slides.

## Mudanças
- Aplicar uma regra específica de capa: título curto e completo, sem terminar em conectivos ou separar uma mesma frase entre título e apoio.
- Usar o apoio apenas como uma frase complementar curta; remover a soma automática de gancho, explicação e tese que hoje deixa a capa densa.
- Limitar a densidade visual da capa em todos os modelos de carrossel, preservando textos mais detalhados para os slides internos.
- Nos fundos escuros, restringir os destaques a tratamentos com contraste forte e impedir que a palavra destacada fique quase preta sobre preto.
- Ajustar o destaque para escolher uma palavra relevante e legível, evitando termos de ligação.

## Validação
- Criar testes para capa curta, frase semanticamente completa, apoio enxuto e ausência de cortes como “ninguém me” / “explicou...”.
- Testar o tratamento escuro e os roteiros completos para confirmar que capa, miolo e fecho continuam coerentes.
- Conferir visualmente no tamanho de celular e no PNG.

## Detalhes técnicos
- Centralizar as regras editoriais no acabamento tipográfico e aplicá-las no diretor criativo antes da renderização.
- Ajustar apenas o bloco de carrossel e seus testes; não mudar os demais modelos de arte.
