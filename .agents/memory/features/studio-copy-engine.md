---
name: Studio Copy Engine
description: Motor textual local do Studio — léxico, releitura de frase (rewrite.ts) e níveis de variação Baixa/Média/Alta.
type: feature
---

Geração de texto no Studio é 100% local (nenhum crédito de IA por arte) e determinística (mesma seed ⇒ mesmo texto).

Camadas:
1. `lexicon.ts` — sinônimos por registro de voz (`tecnico|proximo|direto|inspirador|sobrio`) classificado a partir do tom de voz do kit (o texto do tom NUNCA é renderizado).
2. `phrasing.ts` — frames retóricos que montam a frase a partir dos ingredientes do kit.
3. `rewrite.ts` (`rephrase`) — RELEITURA da frase: troca de conectivos, reescrita sintática por padrões (`A gera B` → `B nasce de A`, `não é X, é Y` → `Menos X. Mais Y.`, subordinada movida para o fim) e enquadramento por registro (prefixo, remate, pergunta). É a camada usada por `vary.ts` e pelo `dress()` de `phrasing.ts`.

Regra: variação NUNCA é apenas 1-2 palavras. Níveis:
- Baixa (0.22) → só léxico, frase original preservada.
- Média (0.58) → léxico + conectivos + reescrita estrutural.
- Alta (0.9) → léxico forte + reescrita + enquadramento retórico.

Fragmentos (pedaços de headline, palavras soltas, kickers em CAIXA ALTA) recebem apenas léxico — reescrita estrutural exige frase completa (inicial maiúscula, pontuação final, ≥4 palavras).

Salvaguardas obrigatórias em `rephrase`: nunca introduzir literal proibido (nome de outra marca) e nunca inflar o texto acima de ~1,45× do original (o quadro tem limite físico).

`VariationControl.tsx` mostra 3 exemplos reais por categoria (Títulos / Apoio / Chamadas) + descrição do nível; a prévia é local e não consome gerações.
