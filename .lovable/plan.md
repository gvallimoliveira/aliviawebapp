

## Reestruturação da Landing Page: Dupla proposta de valor (B2C + B2B)

### Diagnóstico atual

A landing page segue esta ordem:
1. Hero -- fala apenas de "dor" (B2C puro)
2. Stats -- avaliações realizadas
3. Highlights -- "Por que a Aliv.iA?" (foco B2C)
4. Methodology -- STEPS + D.I.F.I.
5. Comparison -- planos Basico vs Premium (B2C)
6. How it Works -- 6 etapas da avaliação (B2C)
7. Testimonials
8. **ProfessionalSection** -- unica menção ao B2B, lá embaixo
9. FAQ
10. Social

O profissional so descobre que a plataforma serve para ele na seção 8. A proposta dual nunca aparece de forma integrada.

### Estrategia proposta

Manter a estrutura existente (nao criar componentes novos), mas fazer 3 alterações cirurgicas:

**1. Hero reescrito com proposta dual**
- Titulo: posicionar Aliv.iA como plataforma de avaliação inteligente para **dois perfis**
- Subtitulo: uma frase que abraça ambos ("Entenda sua dor com precisao clinica — ou potencialize suas avaliacoes como profissional")
- **3 CTAs** em vez de 2: "Avaliacao Gratuita" | "Avaliacao Premium" | "Sou Profissional" (outline, com icone de estetoscopio, redireciona para /profissionais)
- Novo micro-badge: "Usado por fisioterapeutas e pacientes"

**2. Nova seção "Para quem é a Aliv.iA?" logo apos Stats (posição 3)**
- Criar componente `DualAudienceSection.tsx`
- Layout: 2 cards lado a lado (mobile: empilhados)
  - Card 1 (B2C): icone de usuario + "Para voce que sente dor" + 3-4 bullets curtos + CTA "Fazer minha avaliacao"
  - Card 2 (B2B): icone de estetoscopio + "Para o fisioterapeuta" + 3-4 bullets curtos + CTA "Conhecer o painel profissional" → /profissionais
- Gatilhos: autoridade (formulada por especialista), economia de tempo (30min/consulta), precisao (IA + evidencia)

**3. Reordenar seções no Index.tsx**
Nova ordem:
1. Hero (reescrito)
2. Stats
3. **DualAudienceSection** (NOVA)
4. Highlights
5. Methodology
6. HowItWorks
7. ComparisonSection (planos B2C)
8. **ProfessionalSection** (sobe para antes dos testimonials)
9. Testimonials
10. FAQ
11. Social

### Detalhes tecnicos

**Arquivos alterados:**
- `src/components/HeroSection.tsx` -- adicionar 3o CTA, reescrever textos via chaves de traducao
- `src/components/DualAudienceSection.tsx` -- novo componente com 2 cards
- `src/pages/Index.tsx` -- nova ordem de seções + import DualAudienceSection
- `src/contexts/LanguageContext.tsx` -- novas chaves de traducao (PT + EN):
  - `hero.title` (reescrito)
  - `hero.subtitle` (reescrito)
  - `hero.badge` (reescrito)
  - `hero.cta.professional` (novo)
  - `hero.social_proof` (manter)
  - `dual.title`, `dual.subtitle`
  - `dual.patient.title`, `dual.patient.bullet1-4`, `dual.patient.cta`
  - `dual.pro.title`, `dual.pro.bullet1-4`, `dual.pro.cta`

### Conteudo textual (PT)

**Hero:**
- Badge: "Avaliacao musculoesqueletica com IA"
- Titulo: "Avaliacao inteligente para quem sente dor — e para quem trata"
- Subtitulo: "Entenda sua dor com precisao clinica ou potencialize suas avaliacoes profissionais. Tudo baseado em evidencia, formulado por fisioterapeuta especialista."
- CTA 3: "Sou Profissional"

**DualAudienceSection:**
- Titulo: "Para quem e a Aliv.iA?"
- Card Paciente: "Sinto dor e quero entender" / bullets: Avaliacao guiada sem sair de casa / Diagnostico preliminar em minutos / Plano de tratamento personalizado / Encontre profissionais na sua regiao
- Card Profissional: "Sou fisioterapeuta e quero mais precisao" / bullets: Receba pacientes com anamnese pronta / Economize 30 min por consulta / Questionarios validados ja aplicados / Dashboard de evolucao do paciente

