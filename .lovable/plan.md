# Reconstruir a landing profissional mantendo o design atual

Objetivo: manter exatamente a identidade visual, o conteúdo e a linha das outras landings específicas (paciente, clínica, acadêmico). Nenhum redesign: apenas reorganizar o código em blocos independentes para a página rodar fluida, e acrescentar dinamismo discreto nas seções que hoje entram sem nenhuma animação.

## O que NÃO muda

- Paleta, tipografia, espaçamentos, cards, badges e botões atuais.
- Todos os textos, traduções e CTAs.
- A ordem das seções e os mesmos primitivos cinematográficos já usados nas outras landings (`BrandMarquee`, `KineticStatement`, `ScrollWords`, `HorizontalShowcase`, `CinematicClosing`, `Reveal`).
- O toggle `LANDING_LAYOUT` e o layout clássico preservado em `legacy/`.

## Reestruturação (causa da lentidão percebida)

Hoje a página vive em dois arquivos grandes com todo o conteúdo, ícones e dependências num único módulo, e o corpo inteiro monta de uma vez logo após o hero. A reconstrução divide a mesma página em blocos por seção:

1. Manter o hero atual como entrada síncrona e leve (já é o `Shell`), sem alterar seu visual.
2. Quebrar o corpo em módulos de seção separados (`sections/`), cada um exportando apenas a sua seção, com os dados/listas movidos para um módulo de conteúdo puro.
3. Montar os blocos progressivamente conforme se aproximam da viewport, em vez de montar todo o corpo de uma vez — assim o scroll nunca compete com a montagem de 16 seções.
4. Importar os ícones por seção (não uma lista única gigante) e manter tabela de questionários e outros blocos pesados sob carga tardia.
5. Padronizar as animações para usarem só `opacity`/`transform` com `once: true`, sem estado inicial invisível para o conteúdo que já deve aparecer.

## Dinamismo a acrescentar (discreto, no mesmo tom)

Somente nas seções que hoje entram estáticas:

- Faixa da citação "não compete com o fisioterapeuta": entrada suave do texto.
- Bloco de passos "como funciona": revelação sequencial dos passos, um após o outro.
- Bloco de evidências/questionários: fade discreto no cabeçalho e nas linhas ao entrar.
- Preço e itens incluídos: revelação escalonada da lista.
- FAQ e instalação do app: fade curto de entrada.
- Números/estatísticas: contagem animada apenas quando visíveis, reaproveitando o hook de contagem já existente no projeto.

Todas respeitam `prefers-reduced-motion` e no mobile usam versões mais curtas.

## Como vou provar que ficou fluido

Medição com navegador headless em desktop e mobile emulado, antes e depois:

- tempo até o H1 visível,
- número de recursos e peso transferido da rota,
- captura de várias alturas de scroll para confirmar que nenhuma seção aparece vazia,
- verificação de ausência de erros de console.

## Detalhes técnicos

- Novos arquivos: `src/pages/cinematic/professional/` com `content.ts` (listas e chaves de tradução) e um módulo por seção; um orquestrador que monta as seções sob observador de interseção.
- `ProfessionalLandingShell.tsx` passa a montar o orquestrador em vez de um único `ProfessionalLandingBody`.
- `ProfessionalLandingCinematic.tsx` e `ProfessionalLandingBody.tsx` são substituídos pela nova composição; o clássico em `legacy/ProfessionalLandingClassic.tsx` permanece intacto.
- Nenhuma alteração de backend, rotas, preços ou lógica de CTA.
