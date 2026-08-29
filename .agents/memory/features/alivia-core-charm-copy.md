---
name: Aliv.iA Core Charm Copy
description: Acervo charmoso exclusivo da marca Aliv.iA (app clínico) com 6 públicos; isolado do Studio e das marcas de cliente.
type: feature
---

Fonte: tabela "Abordagem Comum (fria) x Abordagem Charmosa (estilo Aliv.iA)" entregue em vídeo pelo dono (ago/2026), exclusiva para o **Aliv.iA normal** (app clínico) e seus nichos.

Implementação: `src/pages/studio-pro/aliviaCoreCharm.ts`
- 6 linhas: `paciente-com-dor`, `fisioterapeuta-autonomo`, `clinica-gestor`, `estudante`, `recem-formado`, `institucional-360` (fallback quando o público não casa).
- Cada linha guarda a versão fria só como contraexemplo (nunca renderizada), o ponto zero charmoso (`headline`), o apoio (`sub`) e o convite (`cta`).
- `isAliviaCoreBrand()` casa "Aliv.iA" e **exclui** "Aliv.iA Studio".

Precedência em `applyCharm` (`charmCopy.ts`): Studio (`studioSelfCharm`) → Aliv.iA core (`aliviaCoreCharm`) → sub-nichos clínicos genéricos (`SUBNICHE_CHARM`). Só nos ângulos venda/dor/desejo; "informar" segue intocado.

Isolamento obrigatório: este acervo cita produto Aliv.iA (avaliação guiada, prontuário, STEPS, D.I.F.I.) — nunca pode vazar para marca de cliente.
