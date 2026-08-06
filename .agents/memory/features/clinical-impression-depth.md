---
name: Clinical Impression Depth
description: A impressão clínica deve ser profunda e obrigatoriamente analisar dinamometria, amplitude de movimento e notas de evolução das sessões.
type: feature
---

- `generate-clinical-impression` produz visão **profunda** (8–14 linhas, parágrafos curtos) — não é resumo raso.
- Blocos obrigatórios quando os dados existem:
  - **Dinamometria**: citar valores reais (média e melhor em kgf), nº de medidas, CV% (>15% = reprodutibilidade duvidosa), assimetria E/D pela média e balanço agonista/antagonista no mesmo lado. Limite **>10% = déficit relevante** (D.I.F.I); ≤10% simétrico.
  - **ADM/ROM**: articulações restritas, comparação de lados, correlação com hipótese e força.
  - **Notas de evolução das sessões** (`session_notes` do paciente, últimas 12): incorporar observações úteis (resposta à carga, comportamento da dor, adesão, intercorrências).
- Sempre CORRELACIONAR achados objetivos com sintomas, questionários e hipótese — nunca listar números sem interpretar. Nunca inventar valores; se não houver dado, não especular.
- Cache: chave inclui `PROMPT_VERSION` — bumpar ao mexer no prompt/blocos. Botão "Regenerar" envia `forceRefresh: true`.
