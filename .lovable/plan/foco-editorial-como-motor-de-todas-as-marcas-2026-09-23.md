# Foco editorial como motor de todas as marcas

Hoje a disciplina de "uma arte = um assunto, com a palavra de destaque sendo o nome do assunto" só existe na marca Aliv.iA, porque os 12 diferenciais são um arquivo fixo do código com termos de destaque escritos à mão. Nenhuma outra marca consegue criar esse tipo de recorte.

A proposta é transformar isso em recurso do produto: qualquer marca ganha uma linha editorial própria ("Serviços", "Diferenciais", "Tratamentos", "Produtos") com seus temas, e o motor passa a produzir arte fechada em um tema só, com a palavra de destaque sempre ligada a ele.

## O que será construído

1. **Linha editorial por marca (não mais exclusiva da Aliv.iA)**
   - Nos ajustes da marca, além dos públicos, uma nova seção de temas editoriais: cada linha é um tema (nome, palavra-chave, o que é, como funciona, benefício prático, prejuízo de não ter, prova, cena de rotina, chamada para ação).
   - O nome do grupo é escolhido pela pessoa (ex.: "Serviços Aline Furtado", "Diferenciais Aliv.iA"), aparece separado dos públicos oficiais e não muda a contagem de públicos.
   - Seleção múltipla nesse grupo, como já funciona nos diferenciais: cada arte do lote recebe um tema, e o lote cobre os temas escolhidos.

2. **Palavras de destaque ligadas ao tema**
   - Campo "termos de destaque" por tema, com sugestão automática a partir do nome/palavra-chave (a pessoa pode aceitar, editar ou adicionar).
   - Em artes de palavra protagonista, somente esses termos podem ocupar o centro. Adjetivo genérico tirado do texto corrido é proibido — a mesma regra que já vale para os diferenciais Aliv.iA passa a valer para todas as marcas.
   - Quando a marca não tem tema selecionado (leitura por público ou 360°), o destaque passa a usar a palavra-chave do próprio público em vez de palavra solta.

3. **Pacote fechado, sem mistura de temas**
   - Uma arte nunca mistura dois temas: título, apoio, corpo, lista, citação, fechamento, legenda e todos os slides do carrossel ficam presos ao tema atribuído.
   - Matriz geral da marca, memória de voz aprendida e rotas genéricas continuam desligadas dentro do pacote fechado — hoje isso vale só para grupos editoriais e passará a valer para qualquer tema de qualquer marca.
   - Filtro de vazamento entre temas irmãos: vocabulário exclusivo de um tema não pode aparecer na arte de outro (o filtro atual de públicos é desligado nos grupos editoriais e não faz esse controle).

4. **Progressão de ideia obrigatória**
   - Cada arte constrói a linha completa: nomear o assunto, explicar como funciona, mostrar o benefício concreto, fechar com o custo de não ter ou com a ação.
   - Nos formatos curtos a mesma linha é condensada; os pilares nunca aparecem como rótulos soltos ("O que é", "Benefício").

5. **Migração da Aliv.iA sem perda**
   - Os 12 diferenciais atuais passam a ser lidos pelo mecanismo genérico, mantendo exatamente os textos e termos de destaque de hoje.
   - Nenhuma frase ou tema de uma marca pode vazar para outra.

6. **Ajuda, guia e testes**
   - Atualizar o guia de ajustes de marca e as páginas de ajuda Profissional e Clínica em português, inglês e espanhol.
   - Testes: destaque sempre pertence ao tema; zero mistura entre temas irmãos; começo-meio-fim presente; determinismo por seed; isolamento entre marcas; seleção múltipla distribuindo temas; e a Aliv.iA produzindo o mesmo resultado de hoje.

## Detalhes técnicos

- Promover `aliviaDifferentials.ts` a caso de uso de um modelo genérico: temas editoriais persistidos na coluna `audiences` da marca, com `editorialGroup`, `highlightTerms` e os campos já existentes (`scenes`, `proof`, `desires`, `stakes`, `cta`).
- `audiences.ts`: ler/gravar `highlightTerms`, derivação automática de termos a partir de `label`/`keyword`, e helper de grupos editoriais da marca.
- `brandContent.ts`: renomear `enforceDifferentialFocus` para foco editorial genérico e aplicá-lo a qualquer público com `editorialGroup`; manter a preservação de pontuação significativa (ex.: "D.I.F.I.").
- `audienceScope.ts`: em vez de devolver o conteúdo intacto para grupos editoriais, comparar o tema ativo com os temas irmãos do mesmo grupo e remover vocabulário exclusivo dos outros.
- `director.ts`: `closedEditorial` continua bloqueando matriz geral, voz aprendida, rotas e léxico; a distribuição de temas por arte/carrossel passa a valer para qualquer marca.
- Editor: nova aba/cartão em `StudioProBrand.tsx` para o grupo editorial e seus temas, reaproveitando os editores estruturados por linha.
- `StudioProCreate.tsx`: chips agrupados e recolhíveis com o nome do grupo da marca, seleção múltipla e persistência já existentes.

## Fora de escopo

- Nenhuma chamada de IA por arte (motor segue local e gratuito).
- Planos, cotas e cobrança.
- Mudança de layout ou de blocos visuais.
