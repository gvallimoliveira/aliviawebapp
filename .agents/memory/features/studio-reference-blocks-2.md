---
name: Studio reference blocks — lote 2 (notificações, interruptores, progresso, foco, desvio, fora da caixa)
description: Blocos criativos derivados das referências de agosto/2026 e como cada um traduz a mensagem para a realidade da marca
type: feature
---

Blocos no núcleo criativo (`src/pages/studio/blocks/`, registrados em `src/studio-core/blocks.ts`, `composePage.TREATMENT_COUNT` e `caption.ts`). Servem Studio interno e público — a copy sempre vem do acervo da marca, nunca de texto fixo em inglês.

- `NotifyBlock` — pilha de notificações do app sobre celular deitado. Cada card simula um evento do nicho: título = `feature.tag`, corpo = `feature.description`, selo "agora", ícone com a inicial da marca. Passa pelo `picker` (cobertura editorial). Referência: cards "New Client".
- `ToggleBlock` — dois interruptores: o desligado é a dor/hábito antigo (`compare.before`/objeções), o ligado é o jeito da marca (`compare.after`/provas). Tratamento 3 mostra dois pares. Referência: Motivation/Discipline.
- `TrendBlock` — traçado em zigue-zague com seta atravessando o platô horizontal; headline + sub. Mensagem: evolução não linear que fura o patamar.
- `FocusBlock` — pedras em perspectiva; rótulo de cima = distração/dor, pedra da frente em cor de marca = próximo passo concreto. Referência: "Don't focus here / Focus here".
- `DivergeBlock` — trilhas tracejadas horizontais com origamis geométricos e um desvio diagonal em cor de marca. Referência: "Be the difference".
- `OutboxBlock` — frase alinhada à direita em caixa-alta fina encostando num quadrado de três lados (aberto). Referência: "Think outside the box".

Modelos no catálogo (`models.ts`): "Notificações do app", "Escolha / interruptores", "Progresso / gráfico" (trend+focus), "Sair da fila" (diverge+outbox).
