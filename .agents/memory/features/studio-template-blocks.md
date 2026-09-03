---
name: Studio Template Blocks (referências externas)
description: Blocos nascidos de templates enviados pelo usuário (caixa de perguntas, promoção com celular, letras empilhadas, 2 tratamentos de carrossel) — globais, exceto modo autoral.
type: feature
---
Templates de referência viram BLOCOS globais do núcleo criativo (todas as marcas do Studio; modo autoral/lovechronicles usa `AuthorialArtBlock` e fica de fora automaticamente).

- `askbox` (AskBoxBlock) — engajamento: filetes em degradê topo/rodapé, chapa com pergunta curta, tema em serifada itálica, cartão do sticker (convite + campo) e @ da marca. Tema vem de `features.tag/title` ou `searchQueries` — nunca inventado. 4 tratamentos (0 usa foto do acervo se houver).
- `promoPhone` (PromoPhoneBlock) — oferta: produto/plano na tela do celular, palavra-chave repetida em contorno atrás + versão sólida embaixo, linha de condição de `sales.offers/ctas`. 3 tratamentos.
- `stackType` (StackTypeBlock) — cartaz: papel granulado, tarjas de cor nos cantos, palavra em contorno 2x + sólida, complemento em chapa. 4 tratamentos.
- `tweet` (TweetBlock) — print de post de rede: avatar redondo com logo, nome + selo, @, corpo grande, horário, filete e barra de ações com contadores. Elementos do "tweet" são obrigatórios e não podem ser simplificados. 4 tratamentos (claro/escuro).
- `phoneSide` (PhoneSideBlock) — mockup lado a lado: aparelho com notch/botões + coluna com tag, título, explicação e CTA; foto do acervo na tela quando existe. 3 tratamentos.
- `notice` (NoticeBlock) — recado importante: chapa de cor, cartão arredondado, selo redondo com "!" em relevo e @ no pé. 4 tratamentos.
- `punch` (PunchBlock) — "é só dar zoom": mão grande em close (SVG vetorial, gesto de pinça) segurando uma frase curta em fonte MINÚSCULA no vão dos dedos, chamada gigante embaixo ("É só dar zoom") e assinatura no pé. Elementos obrigatórios: mão em close + frase minúscula na pinça + chamada gigante + assinatura. 4 tratamentos (claro, escuro, chapa primária, mão espelhada).
- `shrink` (ShrinkBlock) — "frase que diminui": mesma frase repetida em 13 linhas a 78% do tamanho anterior até virar fio; alvo do incômodo (dor/medo/insegurança/limitação/bagunça) sai do vocabulário real da marca, nunca inventado. 4 tratamentos (0 = chapa do acento com tinta escura; nunca `--destructive`).
- `elegantAsk` (ElegantAskBlock) — pergunta elegante: frase de até 8 palavras (`condensePhrase(…, 52)`), palavra protagonista inline em serifada itálica no acento, foto do acervo com véu no tratamento 0. 4 tratamentos; tratamento 2 é o único claro.
- `pullQuote` (PullQuoteBlock) — citação assinada: aspas gigantes, fecho em serifada itálica e rodapé com logo + nome + @; o texto entra sem aspas próprias (as do desenho bastam). 4 tratamentos.
- `percent` (PercentBlock) — dado percentual: percentual gigante extraído de `stats`/`metrics` (sem número inventado — sem percentual no acervo o bloco não renderiza), frase da dor, seta redonda e @. 4 tratamentos com fundo explícito (nunca `personaSurface`, que já causou tinta escura em chapa escura).
- Referência de arte quadrada minimal com frase centralizada já é coberta por `mono`/`typo` — não criar bloco novo para isso.

- `CarouselBlock` tratamento 4 = glossário em cartão (claro/escuro alternando, número, pill do termo, `>>>`); tratamento 5 = editorial escuro numerado com fecho em cartão de mensagem. `TREATMENT_COUNT.carousel = 6`.

Ao criar bloco novo a partir de template: registrar em `composePage.BlockKind` + `TREATMENT_COUNT` + pool `baseWeighted`, `studio-core/blocks.ts`, `models.ts` (rótulo em português), `caption.ts` e `rationale.ts` (registros exaustivos por bloco — build quebra sem eles).
