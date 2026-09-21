# Studio: escolhas mais inteligentes de assunto, ganchos de verdade e post com começo, meio e fim

Análise feita sobre os ajustes reais da marca Aline Furtado Vet e sobre o código que escreve as artes. A correção é global: vale para qualquer marca que suba um manual.

## O que o manual da Aline entrega hoje (insumo confirmado)

Três públicos completos — tutor de pet crônico, tutor exigente/preventivo e médico veterinário encaminhador. Cada um com 3 dores, 3 desejos, 3 provas, 3 cenas, 3 gatilhos, 3 objeções, 2 consequências, palavra-chave, gancho próprio e chamada própria. Mais matriz de termos técnicos (Malassezia, atopia, PAAF, citologia) com a tradução em percepção do dia a dia, inimigo de mercado declarado e lista de proibições.

É insumo de sobra. O problema não é falta de informação: é o que o motor faz com ela.

## Diagnóstico frio (causas confirmadas no código)

1. **A escolha do assunto não pensa em venda.** O lote é distribuído por eixo de comunicação (quem sou / como trabalho / dor / desejo / prova / convite) em uma roda girada pela seed. Nada pontua "qual dor é mais central", "qual tem objeção para derrubar", "qual tem prova para sustentar". Assunto excelente e assunto genérico têm a mesma chance.
2. **Um único assunto domina o lote.** A rota narrativa da arte é sempre a primeira da lista de rotas do público, e não existe teto de ocupação. Resultado: a mesma cena (nódulo, otite) reaparece em quase todas as artes com capas diferentes.
3. **Não existe gancho, existe colagem.** As aberturas são montadas por encaixe de campos ("objeção" + "E aí entra" + fragmento), sem verificação de que a frase lê como frase. Daí saem títulos truncados e sem verbo. Não há tipologia de gancho — nenhum conceito de contraste, custo do atraso, erro comum, sinal precoce, pergunta diagnóstica.
4. **Só o primeiro item de cada lista é usado.** Das 3 dores, 3 desejos, 3 provas e 3 cenas de cada público, a arte usa praticamente sempre o índice 0. Dois terços do manual não chegam à tela.
5. **O apoio repete o destaque.** A regra atual evita repetir o *campo* do kit, não a *frase final* — então apoio, fechamento, lista e história saem quase idênticos, cada um puxando a mesma prova/desejo.
6. **Começo, meio e fim não são verificados.** A arte pode sair com cena + cena, ou com mecanismo que é só a dor reescrita, e nada bloqueia isso.
7. **O veterinário encaminhador quase nunca fala.** Quando não há público resolvido, o "quem" cai no campo genérico da marca, que mistura os públicos numa linha só — e a objeção do público vem do acervo genérico ("já tentou antes?") em vez da objeção real do manual.
8. **Detalhes que derrubam o tom técnico:** siglas perdem o caixa alto (PAAF vira "Paaf") e o rótulo de público entra como kicker cru, sem reescrita editorial.

## O que muda

### 1. Assunto escolhido por valor, não por sorteio
Cada candidato (público × dor/desejo × ângulo) recebe uma nota determinística vinda do próprio manual: quantas vezes aquela dor aparece nas fontes, se existe objeção correspondente para derrubar, se existe prova para sustentar, quão específico é o recorte, e quanto aquele assunto já circulou. O lote passa a ser montado de cima para baixo nessa lista.

### 2. Biblioteca de ganchos nomeados
Doze a catorze tipos de abertura, cada um com exigência de insumo (só é elegível se o manual tiver o campo) e molde próprio: contraste com o senso comum, custo do atraso, erro mais comum, número/prazo, pergunta diagnóstica, mito × mecanismo, bastidor da conduta, sinal precoce ignorado, dois caminhos comparados, pergunta que mais recebo, cena interrompida, regra com exceção. O tipo de gancho passa a variar dentro do lote como o eixo já varia.

### 3. Arco obrigatório de cinco etapas
Gancho → cena/tensão → mecanismo → prova/conduta → próximo passo. Cada etapa puxa um campo diferente do manual, é conferida por similaridade contra as outras (nada de duas etapas dizendo o mesmo), o mecanismo precisa trazer termo que a tensão não tem, e o próximo passo precisa de verbo de ação. Arte que não fecha o arco não é entregue: cai para um formato que ela consegue sustentar.

### 4. Cobertura real do manual e do público
Teto de ocupação por assunto no lote, rotação dos itens 2 e 3 de cada lista por posição da arte, um público por arte (nunca dois colados na mesma frase), objeção do público na frente do acervo genérico, e o perfil do cliente ideal — hoje lido e descartado — virando material de texto.

### 5. Acabamento de voz
Siglas do manual preservadas em caixa alta, kicker reescrito editorialmente em vez do rótulo cru, e o guarda-chuva de proibições (cura, garantia, infantilização, vocabulário humano em marca veterinária) aplicado também às frases novas de gancho.

### 6. Prova antes de entregar
O relatório interno do diretor, que hoje só mede repetição, passa a barrar o lote: acima do limite de repetição ou com arco incompleto, a arte é substituída. Mais três gerações registradas da Aline (antes e depois) como linha de base, além dos testes determinísticos de gancho, arco e pontuação de assunto.

## Detalhes técnicos

- Novos módulos: `hookTaxonomy.ts` (tipos de gancho, insumo exigido, moldes, proibições), `narrativeArc.ts` (montagem e validação das 5 etapas, reaproveitando `similarity` do `director.ts`), `topicScore.ts` (nota de valor de assunto a partir do DNA/matrizes).
- Ajustes: `relational.ts` (deixar de usar sempre `routes[0]` e o índice 0 dos pools; nunca concatenar públicos no `who`), `director.ts` (roda passa a consumir a lista ordenada por valor; teto de ocupação por rota; objeção do público na frente da genérica; `report()` como guarda), `storytelling.ts` (frames vindos do gancho escolhido; dedupe por texto final; `cap()` com lista de siglas; `profile` como campo de frame), `brandContent.ts` (mesma correção de siglas).
- Tudo local e determinístico: mesma seed, mesmo resultado; zero crédito de IA adicional.
- Nada de regra específica da Aline no código — os termos vêm do manual da marca ativa.
- Testes novos: elegibilidade de gancho por insumo, arco completo e não redundante, ordenação por valor de assunto, cobertura mínima de itens do manual por lote, e proibições.
