# Progressão editorial global no Studio

## Objetivo
Corrigir o CORE do Studio para que toda linha editorial, de qualquer marca, transforme os campos preenchidos em uma sequência de ideias complementares: definição → funcionamento → ganho concreto → perda concreta. Nenhuma etapa repetirá, apenas reformulará ou colará a anterior.

## O que será alterado

1. **Criar uma montagem editorial única antes dos modelos visuais**
   - Organizar descrição, funcionamento/prova, ganho, cena/dor e prejuízo em papéis distintos.
   - Escolher itens semanticamente diferentes entre si; se dois campos disserem quase a mesma coisa, usar apenas um e buscar outro campo útil.
   - Dar preferência a uma cena/dor concreta para abrir o problema, ao mecanismo para avançar e ao benefício para concluir.

2. **Transformar prejuízo em problema percebido**
   - Remover rótulos visíveis como “Sem essa funcionalidade”, “Benefício prático” e “Como funciona” das listas e destaques.
   - Reescrever o campo de prejuízo como consequência para o leitor, por exemplo: “Sem um programa consultável, a execução em casa fica dependente da memória da sessão.”
   - Quando o prejuízo vier solto, ligá-lo à situação cotidiana e explicitar o que se perde; nunca apenas anexá-lo à explicação da funcionalidade.

3. **Aplicar a progressão a todos os formatos**
   - Usar a mesma sequência coerente em arte curta, arte com foto, índice, comparação, história, fechamento e carrossel.
   - Garantir que título, corpo e conclusão somem informação nova sem repetir a mesma frase com conectores diferentes.
   - Manter o termo protagonista vinculado ao tema editorial e preservar o isolamento entre temas.

4. **Adicionar guardas e testes globais**
   - Reprovar repetição semântica entre definição, mecanismo, benefício e prejuízo.
   - Reprovar rótulos internos e perdas sem enquadramento de problema.
   - Cobrir a marca Aliv.iA e uma marca genérica para provar que a correção pertence ao motor, não ao exemplo.
   - Validar as artes de HEP em vídeo mostradas nas imagens, além dos testes completos e da compilação.

## Resultado esperado
Cada arte terá uma leitura progressiva: apresenta a funcionalidade, explica como ela opera, mostra o valor na rotina e fecha com uma consequência humana e reconhecível de não tê-la — sem repetições nem campos colados.

## Detalhes técnicos
A correção ficará concentrada na construção editorial de `brandContent.ts`, com apoio do verificador de progressão em `narrativeArc.ts`. Os modelos continuarão consumindo o mesmo contrato visual, evitando correções isoladas por marca ou bloco.
