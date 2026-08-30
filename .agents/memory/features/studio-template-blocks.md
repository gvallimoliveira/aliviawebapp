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
- `punch` (PunchBlock) — frase de impacto: elemento único no alto (foto do acervo em recorte cinza, quando existe), nota pequena de oferta no canto, frase curta provocativa gigante embaixo e assinatura da marca no pé. Texto SEMPRE curto (corta em 6 palavras / 42 caracteres; sem frase curta o bloco não renderiza). 4 tratamentos (claro c/ foto, escuro c/ foto, claro sem foto, chapa primária).
- Referência de arte quadrada minimal com frase centralizada já é coberta por `mono`/`typo` — não criar bloco novo para isso.
- `CarouselBlock` tratamento 4 = glossário em cartão (claro/escuro alternando, número, pill do termo, `>>>`); tratamento 5 = editorial escuro numerado com fecho em cartão de mensagem. `TREATMENT_COUNT.carousel = 6`.

Ao criar bloco novo a partir de template: registrar em `composePage.BlockKind` + `TREATMENT_COUNT` + pool `baseWeighted`, `studio-core/blocks.ts`, `models.ts` (rótulo em português), `caption.ts` e `rationale.ts` (registros exaustivos por bloco — build quebra sem eles).
