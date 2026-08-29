---
name: Studio Relational Copy Engine
description: Hierarquia do texto no Studio — manual/briefing como fonte primária, par relacional obrigatório por arte e lista de vícios de linguagem banidos.
type: feature
---

Remodelação textual (ago/2026) para acabar com o bypass do manual da marca.

**1. Inversão de hierarquia (`brandDnaKit.ts`)**
`buildBrandDna` normaliza `studio_brands.brief_answers` + posicionamento/descrição/nicho em `BrandDna`
(presentation / offer / belief / pain / desire / cta / forbidden). Nada é inventado: campo vazio fica vazio.
Em `brandContent.ts`, `buildFromDna` escreve os slots e `prefer()` só completa com o acervo neutro quando
o DNA daria menos de 2 opções. O acervo neutro é **emergência** (marca sem manual e sem briefing).

**2. Copy relacional (`relational.ts`)**
`pickRelation` elege UM par por arte: público × medo/desejo × gancho × CTA, determinístico pela seed.
`applyAudience` recebe a relação e coloca esse medo/desejo à frente em headline, typo, kinetic, lista,
carrossel, quote e fecho. Público com acervo próprio (≥2 dores+desejos) também vira `focused` — acervo
neutro cai para cauda de 2 itens.

**3. Visão 360° pelos eixos do briefing**
`applyGlobal` monta a arte com QUEM SOU (`apresentacao`), COMO TRABALHO (`oferta`) e NO QUE ACREDITO
(`diferencial`). A leitura por públicos só entra quando esses eixos estão vazios.

**4. Vícios banidos (`persuasion.ts`)**
`STALE_PHRASES` + `isStale` bloqueiam os clichês herdados do Aliv.iA Fisio ("detalhe não é enfeite",
"pilares", "sem ruído", "feito com método", "um só padrão", "clareza que aproxima"…).
`sanitizeContent` em `brandContent.ts` varre TODOS os pools (inclusive `sales`) removendo vício, jargão
proibido (`BANNED_JARGON`) e palavras vetadas pela marca (`dna.forbidden`, vindas de `proibidas`,
`nunca_prometer`, `nao_atrair`). Roda em `buildBrandContent` e de novo no fim de `buildSegmentContent`.

**5. Filtro de nexo mais exigente (`rationale.ts`)**
`RationaleContext.relation` traz o par eleito; a dimensão de PÚBLICO só passa se o vocabulário do
medo/desejo aparecer no texto real da arte. Senão a explicação assume o defeito e a arte é trocada.

Coberto por `src/test/studio-relational-copy.test.ts` (DNA lido, texto vindo do manual, zero vício em
múltiplas seeds/segmentos, palavras proibidas respeitadas, relação determinística).
