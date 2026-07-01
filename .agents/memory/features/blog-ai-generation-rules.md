---
name: Blog AI Generation Rules
description: Regras obrigatórias de CTA para o gerador de artigos (generate-blog-article) — URL oficial e restrições de promessa por público.
type: constraint
---

Regras que valem tanto para o prompt do edge function `generate-blog-article` quanto para revisões manuais de artigos:

1. **URL do app**: TODO link para a Aliv.iA embutido no HTML do artigo deve usar exatamente `https://aliviawebapp.com.br` (ou paths sob esse domínio: `/profissional`, `/clinica`, `/academico`). Proibido usar `alivia.app`, `alivia.com.br`, `alivia.io` ou qualquer outra variante. Vale para PT, EN e ES.

2. **Promessas de gratuidade — o que existe e o que NÃO existe**:
   - **Público paciente** (dor lombar, pós-op, ciatalgia, cefaleia etc.): pode prometer "avaliação gratuita" / "free assessment" / "evaluación gratuita" linkando para `https://aliviawebapp.com.br/`.
   - **Público profissional / acadêmico** (fisioterapeuta autônomo, estudante): **PROIBIDO** prometer:
     - "avaliação gratuita" / "free assessment" (produto não existe para eles)
     - "teste grátis de 14 dias do plano PRO" / "14-day free trial" / "trial de 14 dias" / "sem cartão de crédito" (**esse trial NÃO existe** — não inventar prazo nenhum)
     - Usar apenas CTAs neutros: "conheça o plano Profissional da Aliv.iA", "veja os planos da Aliv.iA", "explore a Aliv.iA" → link `https://aliviawebapp.com.br/profissional`.
   - **Público clínica**: existe teste grátis da Aliv.iA Clínica, mas **sem prazo específico na copy** (não escrever "14 dias", "15 dias" etc.). Usar "conheça a Aliv.iA Clínica" ou "teste grátis da Aliv.iA Clínica" → link `https://aliviawebapp.com.br/clinica`.

3. Antes de gerar o artigo, identificar o público do tema e escolher a promessa correta. Em dúvida, usar CTA neutro sem promessa de gratuidade.

Onde está aplicado:
- `supabase/functions/generate-blog-article/index.ts` — prompt do sistema.
- Auditoria dos posts já publicados: pós-op EN/PT, fisio-recém-formado PT/EN e otimiza-avaliação-profissional PT/EN corrigidos; promessas de "14-day free trial" removidas em 2026-07-01.
