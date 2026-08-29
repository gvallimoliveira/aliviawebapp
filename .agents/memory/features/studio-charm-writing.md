---
name: Studio Charm Writing
description: Pilares da Escrita Charmosa aplicados só aos ângulos venda/dor/desejo + tabela de copy charmosa por sub-nicho (dor crônica, esportista, pós-op, 60+, vestibular, feridas).
type: feature
---

Decisão (ago/2026): nos ângulos **venda, dor e desejo** o texto segue os Pilares da Escrita Charmosa.
O ângulo **informar** fica fora de propósito (mantém a postura de sócio experiente).

Regra central: trocar jargão técnico de venda por **empatia estruturada** — mostrar que entende a
frustração e apresentar o método como ponte lógica e segura até a solução.

`src/pages/studio/charm.ts` (local, determinístico, sem crédito de IA):
1. **Ritmo sedutor** (`charmRhythm`) — frase longa e fluida + remate curto e seco.
2. **Foco no "você"** (`youFocus`) — ego da marca sai da abertura ("Nós criamos o melhor…").
3. **Antecipação** (`charmAnticipation`) — não entrega todas as características; deixa fio solto (só apoios).
4. **Confiança despretensiosa** (`charmCta`, `PLEADING_PHRASES`) — proibido implorar
   ("compre agora", "última chance", "imperdível", "só hoje"); CTA vira convite ("Descubra o que estava faltando").
Toda transformação é revalidada por `readsWell` — se estragar a leitura, mantém o original.

`src/pages/studio-pro/charmCopy.ts`:
- `SUBNICHE_CHARM` — tabela do Guia Prático de Escrita (coluna fria guardada só como contraexemplo,
  nunca renderizada) para dor crônica, esportista/performance, pós-operatório, geração 60+,
  vestibular e feridas. Vale para QUALQUER marca com público equivalente, não só a marca pessoal.
- `charmFrames` — frases montadas com a relação eleita (público × medo/desejo × prova × CTA).
- `applyCharm` é chamado por `applyAngle` em `brandContent.ts`.

Não alterou ajustes de marca nem regras da marca pessoal do dono: é camada de redação em tempo de geração.
Coberto por `src/test/studio-charm-copy.test.ts`.
