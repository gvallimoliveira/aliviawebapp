---
name: Studio — públicos matriz x sub-nichos
description: Regra do sistema para contagem oficial de públicos nas artes do Studio (matriz conta, derivado não)
type: feature
---

`BrandAudience.parentId` (em `src/pages/studio-pro/audiences.ts`) define a hierarquia:

- vazio = **público matriz** (entra na métrica oficial da marca, ex.: "4 públicos" do Aliv.iA: paciente, profissional, clínica, estudante);
- preenchido = **sub-nicho derivado** (comunicação dirigida própria, mas NUNCA conta).

Helpers: `matrixAudiences`, `derivedAudiences`, `officialAudienceCount`.
`brandContent.ts` (visão 360°) usa só `matrixAudiences` para números, headlines, tríptico, lista e carrossel — nunca `audiences.length`.

**Visão 360° = modo livre, não "todos juntos":** cada lote em 360° sorteia pela
seed (determinístico) entre a visão ampla da marca (`applyGlobal`) e o mundo de
UM público matriz isolado (`applyAudience`). Qualquer assunto relevante à marca
vale — dela mesma ou de qualquer público. Nunca forçar todos os públicos na
mesma geração.

**"Informar" ≠ educacional:** o ângulo informativo comunica algo que a marca
faz, resolve ou considera relevante — sem estrutura de aula/ensino. O probe do
rationale aceita afirmações concretas (método, atendimento, crença), não só
explicações.
No editor de marca há seletor "Tipo de público" + resumo da métrica oficial. Aliv.iA no banco já tem os sub-nichos marcados (recem-formado → academico; paciente-* → paciente).

Ao criar bloco/copy que cite quantidade de públicos, sempre derivar da contagem matriz.

**Sub-nicho no motor criativo (global, toda marca):** o mundo/acervo base de um
sub-nicho é descoberto pela cadeia `parentId` (`audienceAncestors`) — nunca por
lista fixa de ids. `resolveAudience` faz o sub-nicho herdar dores/desejos/
soluções/CTA do matriz quando o campo próprio está vazio, e `buildSegmentContent`
só cai no 360° quando o segmento ativo é um público matriz. Coberto por
`src/test/studio-subniche-content.test.ts`.

**Palavra-chave obrigatória (comunicação dirigida):** cada público tem
`keyword` (termo que a arte grita: "Dor crônica", "Esportista", "Geração 60+") e
`hook` (chamada em 2ª pessoa), editáveis no kit e com fallback derivado do label
(`audienceKeyword` / `audienceHook`). Em `applyAudience`, sub-nicho (`parentId`
preenchido) é FOCADO: headlines, typos, kickers, listas de medos, lista de
valor, carrossel, quotes e fechos citam a palavra-chave, e o acervo genérico
entra só como cauda de 3 itens. Coberto por `src/test/studio-subniche-content.test.ts`.
