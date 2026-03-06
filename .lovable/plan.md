## Plano: Integrar Conceitos STEPS e D.I.F.I. no App

### Visão Geral

Dois conceitos clínicos proprietários serão integrados em **4 frentes**: (1) raciocínio da IA no tratamento, (2) landing page, (3) geração de 2 posts de blog, e (4) resultado do diagnóstico/tratamento para o paciente.

---

### 1. Raciocínio da IA — Edge Functions

`**generate-treatment/index.ts**` — Incorporar o framework STEPS no prompt do sistema:

- Instruir a IA a mapear as 3 fases do tratamento ao framework STEPS (short_term = Steps 1-2, medium_term = Steps 3-4, long_term = Steps 5-6)
- Adicionar campo `stepsMapping` no JSON de resposta indicando quais Steps cada fase cobre, ainda usando os termos Curto, médio e longo prazo pois é mais compreendido universalmente. 
- Adicionar o conceito D.I.F.I. no `systemPrompt` como modelo explicativo: a IA deve mencionar o ciclo D.I.F.I. na explicação ao paciente quando houver dor crônica ou score EVA ≥ 5, explicando que a reabilitação visa quebrar esse ciclo

`**generate-diagnosis/index.ts**` — Incorporar D.I.F.I. no raciocínio diagnóstico:

- Instruir a IA a referenciar o ciclo D.I.F.I. no campo `explanation` quando aplicável (dor crônica, inibição muscular evidente, fraqueza funcional detectada por questionários)
- Contextualizar como a avaliação Aliv.iA identifica em qual ponto do ciclo o paciente se encontra

---

### 2. Landing Page — Nova Seção

`**src/components/HighlightsSection.tsx**` ou novo componente `src/components/MethodologySection.tsx`:

- Criar seção "Nossa Metodologia" entre Highlights e Comparison
- **Bloco STEPS**: visual de escada/degraus (6 steps) com ícones e descrições curtas, mostrando a progressão da reabilitação
- **Bloco D.I.F.I.**: diagrama circular/ciclo mostrando D→I→F→I→D com setas, e um "break" visual indicando onde a Aliv.iA intervém
- Texto persuasivo: "Desenvolvido por especialista com 7+ anos de experiência" + "Identificamos exatamente onde você está e para onde precisa ir"

`**src/contexts/LanguageContext.tsx**` — Adicionar traduções PT/EN para os textos da seção

`**src/pages/Index.tsx**` — Incluir o novo componente na ordem da landing page

---

### 3. Blog — 2 Posts Automáticos via Edge Function

**Post 1: "Os 6 Degraus da Reabilitação: Entenda o Caminho da Lesão até a Alta"**

- Conteúdo educativo explicando cada Step com exemplos do dia a dia
- CTAs para avaliação: "Descubra em qual degrau você está agora"
- Tags: reabilitação, fisioterapia, recuperação, lesão, tratamento

**Post 2: "Ciclo D.I.F.I.: Por Que Sua Dor Não Melhora (e Como Quebrar Esse Ciclo)"**

- Explicar o ciclo vicioso Dor→Inibição→Fraqueza→Incapacidade
- Posicionar a avaliação como o "raio-X funcional" que identifica a origem
- Tags: dor crônica, fraqueza muscular, incapacidade, ciclo vicioso, avaliação

Implementação: Vou gerar os artigos diretamente no código usando a edge function `generate-blog-article`, adicionando instruções específicas sobre STEPS e D.I.F.I. no prompt para garantir precisão conceitual. Alternativamente, posso criar os posts como seed data direto no banco.

---

### 4. UI do Resultado (Tratamento)

`**src/components/assessment/TreatmentPlan.tsx**`:

- Adicionar badge visual em cada fase mostrando o Step correspondente (ex: "Steps 1-2: Controle de Dor & Reparo")
- Adicionar card educativo D.I.F.I. no topo do tratamento quando dor ≥ 5 ou evolução crônica, com diagrama simplificado do ciclo e texto: "Seu plano foi desenhado para quebrar este ciclo"

---

### Arquivos a editar


| Arquivo                                          | Mudança                                                   |
| ------------------------------------------------ | --------------------------------------------------------- |
| `supabase/functions/generate-treatment/index.ts` | Adicionar STEPS framework + D.I.F.I. no system prompt     |
| `supabase/functions/generate-diagnosis/index.ts` | Adicionar D.I.F.I. no prompt de diagnóstico               |
| `src/components/MethodologySection.tsx`          | **Novo** — seção visual STEPS (escada) + D.I.F.I. (ciclo) |
| `src/pages/Index.tsx`                            | Importar MethodologySection                               |
| `src/contexts/LanguageContext.tsx`               | Traduções da nova seção                                   |
| `src/components/assessment/TreatmentPlan.tsx`    | Badges de Steps nas fases + card D.I.F.I. educativo       |
