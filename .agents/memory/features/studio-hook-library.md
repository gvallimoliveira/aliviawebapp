---
name: Studio Hook Library
description: Biblioteca de ganchos virais do Studio — mecanismo em hooks.ts, acervo curado por marca em hookLibrary.ts, curadoria editável em hookStore.ts e modelo/bloco "Ganchos".
type: feature
---

Ganchos de parada de scroll (ago/2026), 100% local e determinístico.

**Mecanismo** — `src/pages/studio/hooks.ts`: `HOOK_FRAMES` são os 10 frames virais.
`composeHooks(ing)` monta a partir dos ingredientes reais do kit (dor, desejo, oferta,
diferencial, público, CTA) — frame sem insumo é descartado, nunca inventa.

**Acervo curado** — `src/pages/studio/hookLibrary.ts`: `STUDIO_SELF_HOOKS`, `ALIVIA_PRO_HOOKS`,
`ALIVIA_PATIENT_HOOKS` (autoavaliação, sem promessa de cura) e `VALLIM_HOOKS`, com 2 lotes
(10 originais + 15 do lote 2, temas variados) = 25+ por marca. `curatedHooksFor(brand,
{patientVoice})` só devolve acervo para a marca correspondente — isolamento obrigatório.

**Curadoria do dono** — `src/pages/studio/hookStore.ts`: preferências por marca (e por voz
pro/paciente) no localStorage `studio.hooks.prefs.v1`: `off` (desativados) + `order`.
`applyHookPrefs` é aplicado em `brandContent.ts` e nos getters de `content/index.ts`
(WORLDS usa getters justamente para reler a curadoria a cada geração). Sem preferência salva,
o acervo sai intacto. Editor: `src/pages/studio-pro/BrandHooksCard.tsx`, dentro da etapa 3
("Acervo") dos ajustes da marca — reordenar (setas), ativar/desativar (switch), restaurar
original; oculto no modo autoral.

**Arte**: bloco `hook` (`blocks/HookBlock.tsx`, 4 tratamentos), modelo `ganchos` em `models.ts`,
peso 3 no pool de `composePage`, entrada em `caption.ts` e no filtro de nexo (`rationale.ts`).
Testes: `src/test/studio-hooks.test.ts`, `src/test/studio-hook-store.test.ts`.
