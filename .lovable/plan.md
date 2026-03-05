

## Plano: Canal B2B - Plano Profissional (R$49/mês)

### Visão Geral

Criar um sistema de assinatura mensal para fisioterapeutas que permite enviar links de avaliação personalizada aos pacientes antes da consulta. A avaliação do link do fisioterapeuta inclui apenas: triagem de red flags, anamnese, questionários e mapa de dor -- **sem** testes funcionais e **sem** plano de tratamento (esses ficam para o profissional fazer presencialmente).

---

### Arquitetura

```text
┌──────────────────────────────────────────────────────────┐
│  Fisioterapeuta (assinante R$49/mês)                     │
│  Dashboard Pro → Gera link → Paciente preenche           │
│  → Fisio vê relatório completo do paciente               │
└──────────────────────────────────────────────────────────┘

Fluxo:
1. Fisio se cadastra/faz login → /professional/register
2. Fisio assina plano mensal (Stripe subscription)
3. Dashboard Pro aparece com botão "Gerar link para paciente"
4. Link público: /assessment/professional/:professionalId
5. Paciente preenche: red flags → anamnese → questionários → diagnóstico (sem testes funcionais, sem tratamento)
6. Assessment é salvo com professional_id vinculado
7. Fisio vê lista de avaliações dos seus pacientes no Dashboard Pro
```

---

### Alterações Necessárias

#### 1. Database (Migrações SQL)

- Adicionar coluna `subscription_status` (text, default 'inactive') e `subscription_stripe_id` (text, nullable) na tabela `professionals`
- Adicionar coluna `professional_id` (uuid, nullable) na tabela `assessments` para vincular avaliação ao fisioterapeuta
- Adicionar RLS: profissionais com assinatura ativa podem ler assessments vinculados ao seu `professional_id`

#### 2. Stripe - Produto e Assinatura

- Criar produto "Plano Profissional" no Stripe (R$49/mês recorrente) via ferramenta Stripe
- Edge Function `create-pro-subscription`: cria checkout session com mode "subscription" para o fisioterapeuta autenticado
- Edge Function `check-pro-subscription`: verifica se o fisioterapeuta tem assinatura ativa no Stripe, retorna status
- Registrar em `supabase/config.toml`

#### 3. Novo tipo de avaliação: "professional"

- Rota: `/assessment/professional/:professionalId`
- Fluxo reduzido: welcome → redflags → anamnesis → questionnaire → loading → result (diagnóstico apenas com hypothesis, confidence, summary, disclaimer -- sem explanation, recommendations, treatment)
- **Sem** etapa de testes funcionais
- **Sem** etapa de tratamento
- **Sem** necessidade de login do paciente (assessment com user_id null mas professional_id preenchido)
- Stepper adaptado: apenas 4 etapas (Triagem, Anamnese, Questionários, Resultado)
- No resultado, exibir mensagem: "Este relatório foi enviado ao seu fisioterapeuta [nome]. Ele(a) complementará a avaliação presencialmente."

#### 4. Dashboard Profissional (seção no Dashboard existente)

Quando `professional.subscription_status === 'active'`:
- Card "Gerar Link de Avaliação" com botão para copiar link `/assessment/professional/:id`
- Lista de avaliações recebidas (assessments com `professional_id = profissional.id`) com:
  - Nome/data, regiões de dor, score, hipótese diagnóstica
  - Botão para ver detalhes completos (reutilizar AssessmentView)
- Contador: "X avaliações recebidas este mês"

#### 5. Paywall da Assinatura

- No Dashboard, se o profissional é aprovado mas **não** tem assinatura ativa, exibir card de upsell:
  - "Economize 30min por consulta"
  - "Receba anamnese, mapa de dor e questionários antes do paciente chegar"
  - CTA: "Assinar por R$49/mês"
- Botão "Gerenciar assinatura" (customer-portal) para quem já assina

#### 6. Ajustes no generate-diagnosis

- Quando `mode === "professional"`: gerar apenas hypothesis, confidence, summary e disclaimer (igual ao basic), mas com acesso aos questionários (diferente do basic que não tem questionários)
- Adicionar nota no resultado: "Hipótese preliminar para triagem. O diagnóstico definitivo será responsabilidade do profissional."

#### 7. Traduções (LanguageContext)

- Novas chaves PT/EN para: plano profissional, gerar link, avaliações recebidas, mensagens de paywall, disclaimer do modo profissional

---

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/constants/pricing.ts` | Adicionar `PRO_PLAN_PRICE = 49` |
| `supabase/functions/create-pro-subscription/index.ts` | Novo - checkout Stripe subscription |
| `supabase/functions/check-pro-subscription/index.ts` | Novo - verificar assinatura ativa |
| `supabase/config.toml` | Registrar novas functions |
| `src/pages/Assessment.tsx` | Suportar mode "professional" com fluxo reduzido |
| `src/components/assessment/AssessmentStepper.tsx` | Adicionar steps para mode "professional" |
| `supabase/functions/generate-diagnosis/index.ts` | Suportar mode "professional" |
| `src/pages/Dashboard.tsx` | Seção Pro Dashboard com link, lista de avaliações, paywall |
| `src/App.tsx` | Nova rota `/assessment/professional/:professionalId` |
| `src/contexts/LanguageContext.tsx` | Novas traduções |
| Migration SQL | Colunas novas + RLS |

---

### Segurança

- Paciente **não precisa** de login para preencher avaliação via link do fisioterapeuta
- Assessment é criado com `user_id = null` e `professional_id = fisio.id`
- RLS garante que o fisioterapeuta só vê assessments com seu `professional_id`
- Link só funciona se o profissional estiver aprovado **e** com assinatura ativa (validação no frontend + backend)

