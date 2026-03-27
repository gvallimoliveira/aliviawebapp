

## Reestruturação: Pré-Landing + Landing Paciente + Landing Profissional refinada

### Visão geral

Criar 3 camadas de funil:

```text
/ (Pré-Landing - Gateway)
├── "Sinto dor" → /para-pacientes (Nova Landing B2C)
└── "Sou Profissional" → /profissionais (Landing B2B existente, refinada)
```

A landing page atual (`Index.tsx`) será preservada como `/landing-legacy` (rota inativa mas acessível sob demanda).

---

### 1. Pré-Landing Page (nova rota `/`)

**Arquivo:** `src/pages/Gateway.tsx`

Página minimalista e impactante com a identidade visual do app:
- Logo Aliv.iA flutuante animada (mesmo estilo do Hero atual)
- Gradientes e blobs de fundo consistentes com o app
- Headline: "Avaliação musculoesquelética inteligente"
- Subheadline: "Escolha seu perfil para descobrir como a Aliv.iA pode ajudar você"
- **Dois cards lado a lado** (mobile: empilhados):
  - **Card Paciente**: ícone User, título "Sinto dor e quero resolver", breve descrição (3 bullets curtos sobre o benefício), botão "Começar minha avaliação" → `/para-pacientes`
  - **Card Profissional**: ícone Stethoscope, título "Sou fisioterapeuta", breve descrição (3 bullets curtos), botão "Conhecer o painel profissional" → `/profissionais`
- Gatilhos de prova social (badge "X+ avaliações realizadas")
- Footer mínimo ou link para blog

### 2. Landing Page Paciente (nova rota `/para-pacientes`)

**Arquivo:** `src/pages/PatientLanding.tsx`

Transferir e adaptar as seções relevantes ao paciente da landing atual:
- Header (com navegação ajustada)
- HeroSection adaptado (sem CTA profissional, foco 100% B2C)
- StatsSection
- HighlightsSection ("Por que a Aliv.iA?")
- ComparisonSection (Básico vs Premium)
- MethodologySection (STEPS + D.I.F.I.)
- HowItWorksSection (etapas da avaliação)
- TestimonialsSection
- FaqSection (filtrar FAQs relevantes ao paciente)
- SocialSection
- Footer
- StickyCTA (sem botão profissional)

### 3. Landing Profissional refinada (`/profissionais`)

**Arquivo:** `src/pages/ProfessionalLanding.tsx` (editar existente)

Melhorias a aplicar:
- Incorporar os cards de benefício que hoje estão no `ProfessionalSection` da landing atual (economize tempo, relatórios PDF, anamnese pré-preenchida, dashboard de evolução)
- Adicionar seção de "Como funciona" com os 4 passos visuais
- Adicionar prova social / depoimentos de profissionais (se houver)
- Manter pricing e FAQ existentes
- Refinar copy com gatilhos de urgência e autoridade

### 4. Arquivamento da Landing atual

- Renomear `src/pages/Index.tsx` → `src/pages/LandingLegacy.tsx`
- Adicionar rota `/landing-legacy` no `App.tsx`
- A rota `/` passará a renderizar `Gateway.tsx`

### 5. Ajustes de navegação

**`src/App.tsx`:**
- `/` → `Gateway`
- `/para-pacientes` → `PatientLanding`
- `/landing-legacy` → `LandingLegacy` (página original preservada)
- `/profissionais` → `ProfessionalLanding` (já existe)

**`src/components/Header.tsx`:**
- Logo clica → `/` (gateway)
- Links de navegação adaptados conforme contexto da página

---

### Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/Gateway.tsx` |
| Criar | `src/pages/PatientLanding.tsx` |
| Renomear | `src/pages/Index.tsx` → `src/pages/LandingLegacy.tsx` |
| Editar | `src/pages/ProfessionalLanding.tsx` (refinar com cards do ProfessionalSection) |
| Editar | `src/App.tsx` (rotas) |
| Editar | `src/components/Header.tsx` (navegação) |

### Detalhes técnicos

- Gateway usa framer-motion para animações consistentes
- PatientLanding reutiliza componentes existentes (HeroSection adaptado ou inline)
- SEO (`setSeo`) configurado em cada página com title/description únicos
- Referral code (`?ref=`) preservado na Gateway e PatientLanding
- Todas as páginas mantêm a mesma paleta de cores, tipografia e estilo visual

