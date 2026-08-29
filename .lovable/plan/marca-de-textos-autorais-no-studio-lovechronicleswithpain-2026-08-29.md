# Marca de textos autorais no Studio (@lovechronicleswithpain)

## O que muda no conceito

Hoje toda marca do Studio tem um motor que **escreve** o texto. Essa marca nova entra em um modo diferente — **Modo Autoral**: o motor não escreve nada. Ele só diagrama. As únicas palavras permitidas nas artes são:

1. os trechos dos seus textos autorais, exatamente como você escreveu;
2. os slogans do manual da marca.

Nada de sinônimos, releitura, ganchos, CTA, jargão de venda ou frase de acervo. Nenhuma palavra é inventada, trocada ou reescrita.

## Regra de coerência (o ponto central)

- Cada texto é cadastrado inteiro e dividido em fragmentos numerados (A1, A2, A3…), na ordem em que você escreveu.
- Uma arte só pode usar fragmentos **do mesmo texto** e **contíguos**: A1, A2+A3, A3+A4+A5 — sim. A1+B1 ou A2+A5 — nunca.
- Carrossel = o texto inteiro (ou um trecho longo) repartido cronologicamente, um fragmento por slide, na ordem.
- Post simples = um fragmento ou uma sequência curta contígua.
- O slogan é a única frase que pode acompanhar qualquer fragmento (como assinatura/fecho), porque é da marca, não de outro texto.

## Como você usa

**1. Cadastro dos textos** — nova aba "Textos autorais" nos ajustes da marca: colar/escrever o texto, dar título e ordem. O Studio mostra a divisão automática em fragmentos (por parágrafo e, em parágrafos longos, por frase) e você pode ajustar: juntar, separar ou marcar o corte manualmente com uma linha `---`. Nada é publicado sem você ver como ficou dividido.

**2. Geração** — na página de criação você escolhe o texto (ou "qualquer texto") e o Studio gera o lote: artes simples com trechos contíguos e carrosséis com o texto repartido em ordem. Cada arte mostra a etiqueta do trecho usado (ex.: "Texto A · fragmentos 2-3") para você conferir a coerência.

**3. Imagens do acervo** — as fotos que você subir para essa marca entram como fundo total ou parcial, sempre rebaixadas (escurecimento, baixo contraste, leve dessaturação) para não competir com o texto. Há um controle de intensidade do fundo (mais discreto / discreto) e a opção "sem foto".

**4. Identidade** — a marca já vem configurada com o manual: paleta Electric Blue Vices (`#040608`, `#18222d`, `#731717` de impacto, `#c2d1e0` de texto), tom confessional, público 25-45 em inglês, e os três slogans (o de apoio atribuído a Van Gogh fica marcado como citação).

## Detalhes técnicos

- Banco: `studio_brands.content_source = 'authorial'` como chave do modo; nova tabela `public.studio_texts` (`id`, `user_id`, `brand_id`, `title`, `body`, `fragments text[]`, `sort_order`, timestamps) com GRANTs para `authenticated`/`service_role`, RLS por `user_id`, e `studio_creations` passando a guardar `text_id` + faixa de fragmentos dentro de `composition`.
- Novo módulo `src/pages/studio-pro/authorialContent.ts`: divisão em fragmentos (`splitFragments`), seleção determinística por seed de janela contígua (`pickPassage`) e montagem de um `WorldContent` cujos campos vêm **apenas** dos fragmentos e dos slogans — listas de vendas (`sales.*`), `compare`, `metrics`, `stats` ficam vazias/neutralizadas.
- `StudioProCreate.tsx` e `artRender.ts` passam a desviar de `buildSegmentContent` / `varyContent` / `charm` / `relational` / `rationale` quando `content_source === 'authorial'` — sem geração de texto, sem crédito de IA (a cota continua contando gerações de arte).
- Pool de blocos restrito a blocos tipográficos e de foto que respeitam texto longo: `quote`, `typo`, `mono`, `echo`, `photoType`, `photoSplit`, `photoPortrait`, `carousel`, `closing`/`brand` (slogan). Blocos de métrica, jornada, comparação, busca e método ficam fora.
- Fundo de foto: novo tratamento com scrim/`filter` (brilho e saturação reduzidos) aplicado nos blocos de foto quando a marca é autoral, com nível guardado no kit da marca.
- Ajuste de texto longo continua via `AutoFit`/`textFit` — fragmento nunca é cortado nem recebe reticências; se não couber no formato, a arte usa menos fragmentos, nunca meia frase.
- Nova aba `BrandTextsCard.tsx` nos ajustes da marca (CRUD dos textos + prévia dos fragmentos), e seleção de texto no cabeçalho da página de criação.
- Testes novos em `src/test/studio-authorial.test.ts`: (a) nenhuma arte mistura fragmentos de textos diferentes; (b) toda seleção é contígua e em ordem; (c) 200 seeds sem nenhuma palavra fora dos fragmentos/slogans; (d) carrossel preserva a ordem cronológica.
- Seed inicial: a marca `@lovechronicleswithpain` criada na sua conta já com paleta, slogans, tom e público do manual.

## Fora de escopo

Mudanças no motor textual das outras marcas (o modo é isolado por marca), tradução automática dos textos e edição de imagem além do rebaixamento de fundo.
