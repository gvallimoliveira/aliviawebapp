# Carrossel em sequência de tweets

## Objetivo
Adicionar ao modelo **Carrossel** uma variação visual opcional em que cada slide aparece como um post curto da marca, formando uma sequência coerente do primeiro ao último.

## O que será feito
- Incluir um novo tratamento visual de carrossel inspirado no mockup de tweet já existente, preservando avatar/logo, nome, @, selo, horário e barra de ações.
- Transformar capa, desenvolvimento e fechamento em uma sequência contínua de posts curtos, sem misturar frases ou mudar de assunto no meio.
- Limitar e condensar o texto exibido para manter uma ideia por slide, com leitura rápida e sem cortes.
- Permitir três linhas editoriais no mesmo formato: provocação, informação e apresentação de funcionalidade da marca; a escolha continuará seguindo o público e o roteiro selecionados no topo.
- Manter o carrossel como peça indivisível no download, na memória anti-repetição e no filtro de sentido.

## Garantias
- Os seis tratamentos atuais de carrossel continuam disponíveis; a sequência de tweets entra como uma sétima opção.
- O primeiro post abre a tese, os posts intermediários desenvolvem o raciocínio e o último conclui com o próximo passo da marca.
- Nenhum texto ou dado novo será inventado: a sequência reaproveita o roteiro, público, funcionalidade e chamada já aprovados para a marca.
- Serão adicionados testes para estrutura, concisão, continuidade e seleção do novo tratamento.

## Detalhes técnicos
- Ampliar a contagem de tratamentos do bloco `carousel`.
- Extrair/reutilizar a estrutura visual reconhecível de `TweetBlock` dentro de `CarouselBlock`, adaptada ao índice do slide.
- Criar uma guarda textual específica para montar um post curto e completo a partir de cada etapa do roteiro.
- Atualizar os testes do diretor criativo e do bloco para assegurar que a quantidade de slides e o texto previsto continuem corretos.
