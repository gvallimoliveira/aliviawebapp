# Eliminar o travamento percebido da landing profissional

## Diagnóstico confirmado

- Em acesso direto local a `/profissionais`, a navegação inicia imediatamente, mas o primeiro título visível só monta em cerca de **1,44 s**.
- O módulo da landing profissional começa a ser solicitado perto de **600 ms** e ainda precisa carregar/executar o bloco do Framer Motion; não há consulta ao backend bloqueando a tela.
- A abertura global do app permanece sobre qualquer rota por **2,6 s** na primeira visita do período, inclusive quando a entrada é diretamente na landing profissional.
- O preload atual é oportunista: depende do tempo ocioso da página geral, hover, foco ou toque. Links diretos, recarregamento e cliques rápidos ainda podem pagar o carregamento completo.
- A landing profissional concentra hero e centenas de linhas de conteúdo abaixo da dobra no mesmo módulo. Apenas a tabela de questionários já está separada.

## Implementação

1. **Garantir hero imediato**
   - Separar a estrutura essencial da landing em um shell leve e síncrono: cabeçalho, badge, título, subtítulo e CTAs.
   - Não aplicar estado inicial invisível no hero; manter somente um deslocamento curto e discreto, sem atrasos escalonados.
   - Manter dimensões estáveis para evitar mudança de layout quando o restante chegar.

2. **Carregar o restante depois do primeiro viewport**
   - Extrair as seções abaixo da dobra para um módulo próprio carregado de forma assíncrona após o hero estar montado.
   - Exibir uma transição curta e integrada ao fundo, sem tela vazia, spinner central ou skeleton que pareça travamento.
   - Preservar todo o conteúdo, preços, FAQs, idioma, links e animações cinematográficas abaixo da dobra.

3. **Pré-carregar de forma determinística**
   - Iniciar o carregamento da landing profissional cedo na página geral, sem depender apenas de `requestIdleCallback` ou hover.
   - Manter os gatilhos de intenção já existentes e incluir toque móvel de forma explícita.
   - Reutilizar uma única promessa de importação para evitar requisições duplicadas.

4. **Não bloquear a landing com a abertura global**
   - Impedir que a splash de 2,6 s cubra acessos diretos à `/profissionais`.
   - Preservar a splash no fluxo de entrada geral onde ela ainda fizer sentido, sem alterar autenticação ou navegação das demais áreas.

5. **Simplificar o feedback de navegação**
   - Ao clicar no card profissional, manter o conteúdo atual visível até o shell da nova rota estar pronto ou apresentar feedback discreto imediato.
   - Remover qualquer combinação de overlay, fallback e animação que prolongue artificialmente a sensação de espera.

## Detalhes técnicos

- Manter `loadProfessionalLanding` como fonte única para import/preload.
- O shell inicial não dependerá do módulo pesado das seções inferiores.
- Animações usarão apenas `opacity`/`transform`, respeitando `prefers-reduced-motion`.
- Nenhuma mudança será feita em regras comerciais, backend, autenticação ou conteúdo clínico.

## Validação

- Medir acesso direto com cache vazio e navegação pelo card da página geral, em desktop e mobile.
- Confirmar visualmente que cabeçalho e hero aparecem sem tela vazia e continuam interativos enquanto o conteúdo inferior carrega.
- Verificar rolagem até todas as seções, alternância de idioma, preços, CTAs e preferência de movimento reduzido.
- Conferir waterfall, erros de console/runtime e build.

## Critério de sucesso

- Hero profissional legível em até aproximadamente **300–500 ms** na navegação interna local.
- Em acesso direto, nenhum bloqueio visual artificial de 2,6 s e nenhum período perceptível de página vazia.
- Conteúdo abaixo da dobra pode continuar carregando progressivamente sem impedir o uso do primeiro viewport.
