

## Plano: Separar Dashboard em Tabs (Cliente / Profissional) + Link de avaliação na página de registro

### Problema
1. Dashboard mistura conteúdo de cliente (avaliações pessoais, premium, diário de dor) com conteúdo profissional (ProDashboard, referrals) — confuso para quem é ambos.
2. Página `/professional/register` só tem formulário de cadastro, falta o link de avaliação para enviar ao paciente.

### Solução

**1. Dashboard com Tabs para usuários profissionais**

Quando o usuário é profissional cadastrado e aprovado, o Dashboard exibe duas abas usando o componente `Tabs`:

- **"Minha Saúde"** (tab padrão): conteúdo atual de cliente — premium status, quick actions (avaliação básica/premium), histórico de avaliações pessoais, diário de dor, comparativo, follow-ups, referral card.
- **"Painel Profissional"**: ProDashboard (link de avaliação, stats, lista de pacientes), referrals profissionais.

Para usuários que NÃO são profissionais, nada muda — o dashboard continua como está, sem tabs.

**2. Link de avaliação na página `/professional/register`**

Para profissionais já cadastrados e aprovados (com assinatura ativa ou parceiro), adicionar um card acima do formulário com:
- O link de avaliação copiável (`/assessment/professional/:id`)
- Botão "Copiar link"
- Breve texto explicativo

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Envolver conteúdo em `Tabs` quando `professional?.approved`. Tab "Minha Saúde" com conteúdo cliente, tab "Painel Profissional" com `ProDashboard` + referrals |
| `src/pages/ProfessionalRegister.tsx` | Adicionar card com link de avaliação copiável para profissionais aprovados com assinatura ativa ou `is_partner` |
| `src/contexts/LanguageContext.tsx` | Novas traduções para labels das tabs e card de link |

### Estrutura do Dashboard (quando profissional)

```text
┌──────────────────────────────────────┐
│  Welcome, Nome                       │
│  ┌──────────────┬───────────────────┐ │
│  │ Minha Saúde  │ Painel Profiss.   │ │
│  └──────────────┴───────────────────┘ │
│                                      │
│  [conteúdo da tab selecionada]       │
└──────────────────────────────────────┘
```

