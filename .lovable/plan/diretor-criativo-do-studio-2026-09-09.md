# Diretor Criativo do Studio

Uma camada acima do motor: antes de qualquer arte aparecer, um "diretor" lê o kit da marca, decide o roteiro do lote (o que cada arte diz, para quem, com que foto) e só aprova o lote quando cada arte fala de um jeito diferente e coerente com o DNA da marca. Vale para todas as marcas do Studio.

## O que está causando a repetição hoje (verificado no código)

- As frases de destaque, apoio e fecho de quase toda arte são sorteadas direto do mesmo saco, sem qualquer controle: `rng.pick(content.headlines)`, `rng.pick(content.subs)`, `rng.pick(content.closings)` — em `HeroBlock.tsx:23-24`, `ClosingBlock.tsx:15` e mais ~40 pontos. Hero e fecho aparecem em praticamente toda arte, por isso a sensação de "o mesmo texto em modelos diferentes".
- O seletor com memória (`picker.ts`) existe, mas: em `StudioProCreate.tsx:535` o registro de cobertura entra como `() => {}` (não registra nada durante o lote), e a memória de frases (`usePhraseMemory.ts:90-104`) só grava no banco depois de 2,5s — ela não desconta a frase que a arte anterior do MESMO lote acabou de usar.
- O filtro de nexo roda **antes de existir texto**: `enforceRationale` chama `explainArt(block, ctx)` sem o texto real (`rationale.ts:770`), então as checagens de "o texto realmente fala com esse público" passam vazias.
- A foto é escolhida por rotação de índice, sem relação com o texto: `pickPhoto` só filtra por etiqueta de uso (`photos.ts:294-303`). Nada liga imagem ao medo/desejo escolhido.
- Não existe nenhuma camada de direção: o próprio `StudioProCreate.tsx` faz tudo.

## O que muda

**1. Roteiro do lote (o diretor)**
Antes de renderizar, o diretor monta um roteiro: para cada arte do lote define o eixo (quem sou / como trabalho / no que acredito / dor / desejo / prova / convite), o par relacional (público × medo ou desejo), o tom da vez e a foto compatível. Nenhuma arte do mesmo lote repete eixo enquanto houver eixo não usado.

**2. Texto único por arte, sem repetição no lote**
Cada frase passa a ser reservada pelo diretor: destaque, apoio, kicker e fecho saem de um distribuidor que já sabe o que as artes anteriores do lote usaram, incluindo Hero e fecho (hoje fora de qualquer controle). Frase parecida demais com outra da mesma leva é recomposta, não repetida.

**3. Memória de verdade**
A memória de frases da marca passa a valer também dentro do lote (desconto imediato, não só depois de gravar no banco) e a cobertura de assunto volta a ser registrada durante a geração.

**4. Foto coerente com a frase**
A escolha de foto passa a receber o par relacional e o eixo da arte, priorizando fotos cujo significado (`photoMeaning.ts`) conversa com o que a arte diz. Sem foto compatível, o diretor prefere um formato tipográfico a forçar uma imagem descolada do texto.

**5. Aprovação com o texto na mão**
O filtro de nexo passa a rodar depois de o texto da arte existir: se a arte não disser nada do medo/desejo/eixo previsto no roteiro, ela é recomposta antes de aparecer — hoje ela é aprovada em branco.

**6. Briefing por IA (só para você)**
Botão "Diretor com IA" visível apenas para a conta admin, com liga/desliga e desligado por padrão. Ligado, faz **uma** leitura de IA por lote (não por arte): a IA lê o kit/manual da marca e devolve um briefing criativo (ângulos, vocabulário próprio da marca, frases-semente, o que evitar), que o diretor usa como matéria-prima. Para todos os outros usuários, e para você com o botão desligado, o diretor segue 100% local e gratuito, com o mesmo resultado determinístico de hoje.

## Detalhes técnicos

- Novo `src/pages/studio-pro/director.ts`: `planBatch({ dna, audiences, relationSeed, blocks, photos, coverage, phraseMemory, brief? })` → roteiro por arte (`axis`, `relation`, `photoId?`, `reserved` de slots textuais) + `claim(slot, candidates)` com dedup por assinatura (`phraseSignature`) e similaridade (bigramas) dentro do lote.
- `BlockProps` ganha `director`/`shot` (o roteiro daquela arte). `pickHeadline` e todos os `rng.pick(content.headlines|subs|kickers|closings)` passam a chamar `director.claim(...)` (fallback para o comportamento atual quando `director` não existe, preservando o Studio interno).
- `picker.ts`: `createPicker` recebe um conjunto de assinaturas já usadas no lote (peso ~0 para repetição imediata); `usePhraseMemory` ganha desconto otimista em memória junto do `record()`.
- `StudioProCreate.tsx`: passar um `collect` real (não `() => {}`); construir o diretor após `composePage`; mover a auditoria de nexo para depois da montagem do texto de cada arte (`explainArt(block, ctx, { copy })`) com recomposição via `FALLBACKS`.
- `photos.ts`: `pickPhoto` recebe `affinity` opcional (palavras do eixo/relação) e ordena o pool por afinidade + rotação; sem match, mantém a rotação atual.
- Briefing de IA: nova função `studio-brand-brief` (Lovable AI, `google/gemini-3.8-flash`, streaming, saída estruturada estrita), autorizada só para admin (VIP `src/lib/vipEmails.ts` + checagem no servidor), 1 chamada por lote, resultado cacheado por `brand_id + hash do kit` em `studio_brand_briefs` (RLS por dono + GRANTs). Erros de gateway tratados por status (402/403 encerram, 429/5xx com espera) e o Studio cai para o modo local sem quebrar. Flag persistida por marca/usuário e botão no painel do Studio.
- Testes em `src/test/`: sem frase repetida em 200 seeds dentro do mesmo lote; todo lote cobre eixos distintos; toda arte dirigida contém vocabulário do medo/desejo do roteiro; foto escolhida respeita afinidade quando existe; modo local permanece determinístico e sem chamada de IA.

## Fora de escopo

Layout dos blocos, cotas/créditos por arte, e qualquer consumo de IA para usuários que não sejam a conta admin.
