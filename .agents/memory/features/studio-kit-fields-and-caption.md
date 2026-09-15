---
name: Studio Kit Fields, Caption & Carousel Filter
description: Legenda escrita pelo diretor, filtro de nexo valendo para carrossel, par obrigatório de campos do kit por arte e objeção como título.
type: feature
---

Regras firmadas em set/2026 (etapas A e B da auditoria do diretor/motor):

1. **Legenda = texto dirigido.** `buildCaption` recebe `director.contentFor(index)`, nunca o `content` bruto
   (`StudioProCreate.tsx`, card e download de legendas). Legenda não pode falar de público/dor/oferta
   diferente do que está escrito na arte.
2. **Carrossel passa pelo filtro de nexo.** Em `rationale.ts/enforceRationale`, slide isolado nunca é trocado,
   mas a SEQUÊNCIA é julgada: capa reprovada, ou 2+ slides reprovados, desfazem o carrossel em artes avulsas
   de formato de reserva (`slide: undefined` + kind de `FALLBACKS`).
3. **Arte sem texto previsto reprova.** `blind = Array.isArray(detail.copy) && copy vazio` derruba marca,
   público, relação e objetivo. Proibido voltar a aprovar por omissão.
4. **Par obrigatório por arte** (`storytelling.ts`): destaque e apoio carregam CAMPOS DIFERENTES do kit
   (cena, gatilho, objeção, consequência, método, inimigo). `rotate` = índice da arte distribui os campos
   ao longo do lote.
5. **Objeção pode ser título**, não só apoio.
6. **Rótulo colado ao valor** ("Desejo: voltar a correr;") é limpo por `stripFieldLabels`, que também remove
   separador residual nas pontas. O diretor aplica isso no desejo antes do fecho do carrossel.

Coberto por `src/test/studio-kit-fields-in-copy.test.ts`.
