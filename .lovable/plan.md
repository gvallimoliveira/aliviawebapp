

## Correção: botão "Voltar ao Dashboard" deve retornar à aba correta

### Problema
Ao navegar de dentro do Painel Profissional para a visualização de uma avaliação (`/assessment/view/:id`), o botão "Voltar ao Dashboard" redireciona para `/dashboard` sem o parâmetro `?tab=professional`, fazendo o usuário cair na aba "Minha Saúde".

### Solução
Passar o contexto de origem via query param ou state ao navegar para a avaliação, e usar essa informação no botão de volta.

### Mudanças

**1. `src/components/dashboard/ProDashboard.tsx` e `src/components/dashboard/PatientEvolutionDashboard.tsx`**
- Alterar os `navigate(/assessment/view/${id})` para incluir `?from=professional`

**2. `src/pages/AssessmentView.tsx`**
- Ler o param `from` da URL
- Alterar todos os `navigate("/dashboard")` para `navigate("/dashboard?tab=professional")` quando `from === "professional"`, senão manter `/dashboard`

