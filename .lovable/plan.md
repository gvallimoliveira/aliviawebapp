# Corrigir geração dos diferenciais e reduzir poluição do seletor

## Resultado esperado
- Selecionar um ou vários diferenciais não interrompe mais a geração.
- Cada arte continua centrada em um diferencial escolhido.
- A seção “Diferenciais Aliv.iA” pode ser recolhida e reaberta, inclusive no celular.

## Implementação
1. Filtrar os modelos de arte conforme o conteúdo realmente disponível para o diferencial, evitando modelos que exigem métricas, jornadas ou listas vazias.
2. Adicionar proteção nos modelos mais sensíveis para que dados ausentes gerem uma alternativa segura, nunca um travamento.
3. Validar e limpar seleções antigas ou inválidas antes de montar uma nova geração.
4. Adicionar um controle acessível para recolher/expandir a seção de diferenciais, mantendo a preferência durante o uso.
5. Criar testes de regressão para seleção única, múltipla, conteúdo parcial e recolhimento da seção.

## Verificação
- Executar os testes focados do Studio e a checagem de tipos.
- Confirmar geração com diferenciais no preview móvel e conferir que não há novos erros em execução.
