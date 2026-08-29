# Remodelar o motor textual do Studio: marca + público como única fonte

Diagnóstico honesto do que você está vendo: existe, sim, um acervo genérico enraizado. Em `brandContent.ts` o texto de **toda** marca nasce de listas fixas escritas à mão ("clareza", "método", "escuta", "detalhe não é enfeite — é resultado", "O barato sai caro", "3 pilares centrais", "um produto, N públicos"). Esse acervo é a **base**; o manual da marca e o público entram só como *prefixo* (`[...headlines do público, ...base.headlines]`). Como os blocos sorteiam dentro do pool inteiro, na prática metade das artes cai no texto genérico — herdado da época em que o Studio só falava do Aliv.iA. É esse bypass que você percebe.

## O que muda

**1. Inversão da hierarquia (o coração da mudança)**
O acervo genérico deixa de ser base e passa a ser **fallback isolado**, usado só quando a marca não tem manual/formulário nem público preenchido. Enquanto houver dados do kit, nenhuma frase de catálogo entra no pool — sem mistura.

**2. Copy relacional obrigatória (público × medo × desejo × gancho × CTA)**
Cada arte passa a ser gerada a partir de um "par relacional" sorteado pela seed: um público (ou sub-nicho), UM medo ou UM desejo dele, o gancho em 2ª pessoa e o CTA daquele público. A arte inteira (destaque, apoio, lista, carrossel, fecho) fala desse mesmo par — hoje cada slot pega de um lugar diferente, o que produz aquela sensação de texto solto.
Regra: nenhuma peça dirigida pode terminar sem gancho + CTA do próprio público.

**3. Visão 360° passa a ser o retrato da marca, vindo do manual**
Em vez de "N públicos, um só padrão", o 360° usa os campos do formulário/manual: como você se apresenta, o que entrega na prática, o diferencial real, no que você acredita, o que nunca pode prometer. São os três eixos que você citou — **quem sou / como trabalho / a fisioterapia em que acredito** — mais o ramo de público único que já existe.

**4. Lista de vícios de linguagem banida**
Criar uma lista dura (`STALE_PHRASES`) com os clichês herdados do Aliv.iA Fisio e do acervo neutro: "detalhe não é enfeite", "o barato sai caro", "sem mistério", "pilares", "clareza que aproxima", "presença digital todo dia", "método, não sorte", "um produto, N públicos", "escuta / método / valor". Qualquer frase gerada que caia nesses padrões é descartada e recomposta. Vale para toda marca, com teste automatizado.

**5. Respeito literal ao manual**
Palavras e promessas proibidas do formulário (`proibidas`, `nunca_prometer`, `nao_atrair`) passam a alimentar o `forbidden` do compositor em toda a cadeia (léxico, releitura, fechos), não só em partes dela. Tom e nível técnico do manual definem o registro antes de qualquer default.

**6. Filtro de nexo mais exigente**
O contrato de sentido já existente passa a exigir, para peça dirigida, que o texto contenha vocabulário do medo/desejo usado na geração — não só a palavra-chave do público. Se o par relacional não aparece no texto, a arte é recomposta, não aprovada.

## Detalhes técnicos

- `src/pages/studio-pro/brandContent.ts`: `buildBrandContent` dividido em `buildFromKit` (manual + públicos) e `buildFallback` (acervo neutro atual, só quando o kit é vazio); `applyAudience` deixa de concatenar `tail(base.*)` quando há dados suficientes do público; `applyGlobal` reescrito sobre `brief_answers`.
- Novo `src/pages/studio-pro/brandDnaKit.ts`: normaliza `brief_answers` + posicionamento + nicho em `BrandDna` (apresentação, oferta, diferencial, crença, assinatura, proibições) — fonte única consumida pelo motor e pelo `rationale`.
- Novo `src/pages/studio-pro/relational.ts`: `pickRelation(audiences, seed)` → `{ audience, pain?, desire?, hook, cta, keyword }`, propagado a todos os slots.
- `src/pages/studio/persuasion.ts`: adiciona `STALE_PHRASES` + `isStale()`; `phrasing.ts`/`rewrite.ts` recompõem quando `isStale` acusa.
- `src/pages/studio/rationale.ts`: Dimensão 1 lê `BrandDna`; Dimensão 2 exige o par relacional no texto.
- Testes novos em `src/test/`: (a) 200 seeds sem nenhuma `STALE_PHRASES`; (b) marca com manual completo nunca usa frase do fallback; (c) toda peça dirigida contém keyword + gancho + CTA; (d) proibições do manual nunca aparecem. Mantém `studio-brand-isolation` e `studio-subniche-content` verdes.

## Fora de escopo

Layout dos blocos, cotas, créditos de IA (motor segue 100% local e determinístico) e mudanças no Studio interno do Aliv.iA além da limpeza de clichê.
