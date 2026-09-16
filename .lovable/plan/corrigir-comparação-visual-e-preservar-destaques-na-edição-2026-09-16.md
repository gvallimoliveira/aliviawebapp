# Corrigir comparação visual e preservar destaques na edição

## O que será ajustado
- No modelo dos círculos, transformar a última pedra próxima da solução em um ponto claramente associado à marca e inserir nela o símbolo/logo da marca ativa.
- Corrigir a edição de texto para preservar palavras destacadas por cor, fundo, sublinhado ou contorno quando a frase for alterada.
- Garantir que essa formatação sobreviva ao salvamento na galeria e ao PNG baixado, tanto na criação quanto na edição de artes já salvas.

## Como será validado
- Adicionar testes para edição de uma frase com palavra verde, incluindo alteração ao redor do destaque e alteração da própria palavra destacada.
- Validar o modelo dos círculos e o fluxo editar → salvar → exportar.
- Confirmar testes direcionados e compilação sem erros.

## Detalhes técnicos
- O editor guardará a função visual dos trechos destacados antes da edição e a reaplicará ao texto final, em vez de achatar todo o conteúdo em texto simples.
- A reconstrução manterá somente marcação visual segura já existente na arte, sem recriar código executável.
