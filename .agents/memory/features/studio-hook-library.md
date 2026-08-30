---
name: Studio Hook Library
description: Biblioteca de ganchos virais do Studio — mecanismo em hooks.ts, acervo curado por marca em hookLibrary.ts e modelo/bloco "Ganchos".
type: feature
---

Ganchos de parada de scroll (ago/2026), 100% local e determinístico.

**Mecanismo** — `src/pages/studio/hooks.ts`: `HOOK_FRAMES` são os 10 frames virais
("Ninguém te conta isso", "O erro que quase todo mundo comete", "Se você ainda faz isso",
"Isso muda o seu resultado", "O jeito mais fácil de melhorar", "Você não precisa de mais
informação", "90% ignoram isso", "O segredo que parece simples", "Se eu começasse do zero",
"Pare imediatamente"). `composeHooks(ing)` monta a partir dos ingredientes reais do kit
(dor, desejo, oferta, diferencial, público, CTA) — frame sem insumo é descartado, nunca inventa.

**Acervo curado** — `src/pages/studio/hookLibrary.ts`: `STUDIO_SELF_HOOKS`, `ALIVIA_PRO_HOOKS`
(inclui variação de clínica), `ALIVIA_PATIENT_HOOKS` (autoavaliação, sem promessa de cura) e
`VALLIM_HOOKS`, exatamente como aprovados pelo dono. `curatedHooksFor(brand, {patientVoice})`
só devolve acervo para a marca correspondente — isolamento de marca obrigatório.

**Onde entra**: `WorldContent.hooks` (campo opcional). Mundos internos recebem em
`content/index.ts` (paciente = variante de autoavaliação); marcas do Studio público recebem
em `buildBrandContent` (curado + mecanismo, deduplicado por `strong`).

**Arte**: bloco `hook` (`blocks/HookBlock.tsx`, 4 tratamentos), modelo `ganchos`
("Ganchos (frases virais)") em `models.ts`, peso 3 no pool de `composePage`, entrada em
`caption.ts` e no filtro de nexo (`rationale.ts`). Coberto por `src/test/studio-hooks.test.ts`.
