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
No editor de marca há seletor "Tipo de público" + resumo da métrica oficial. Aliv.iA no banco já tem os sub-nichos marcados (recem-formado → academico; paciente-* → paciente).

Ao criar bloco/copy que cite quantidade de públicos, sempre derivar da contagem matriz.
