---
name: Blog AI Generation Rules
description: Regras obrigatórias de CTA para o gerador de artigos (generate-blog-article) — URL oficial e restrições de promessa por público.
type: constraint
---

Regras que valem tanto para o prompt do edge function `generate-blog-article` quanto para revisões manuais de artigos:

1. **URL do app**: TODO link para a Aliv.iA embutido no HTML do artigo deve usar exatamente `https://aliviawebapp.com.br` (ou paths sob esse domínio: `/profissional`, `/clinica`, `/academico`). Proibido usar `alivia.app`, `alivia.com.br`, `alivia.io` ou qualquer outra variante. Vale para PT, EN e ES.

2. **Promessa de "avaliação gratuita"**:
   - **Público paciente** (dor lombar, pós-op, ciatalgia, cefaleia etc.): pode prometer "avaliação gratuita" / "free assessment" / "evaluación gratuita" linkando para `https://aliviawebapp.com.br/`.
   - **Público profissional** (fisioterapeuta, clínica, acadêmico/estudante): **PROIBIDO** prometer avaliação gratuita — esse produto não existe para eles. Substituir por:
     - "teste grátis de 14 dias do plano PRO (sem cartão de crédito)" / "14-day free trial of the PRO plan"
     - "conheça o plano Profissional" / "explore the Professional plan"
     - Para clínicas: "teste grátis da Aliv.iA Clínica"
   - Link do CTA profissional: `https://aliviawebapp.com.br/profissional` (ou `/clinica`).

3. Antes de gerar o artigo, identificar o público do tema e escolher a promessa correta.

Onde está aplicado:
- `supabase/functions/generate-blog-article/index.ts` — prompt do sistema.
- Auditoria dos posts já publicados: pós-op EN/PT, fisio-recém-formado PT/EN e otimiza-avaliação-profissional PT/EN corrigidos em 2026-07-01.
