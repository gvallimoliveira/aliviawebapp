

## Plano: Welcome + Nome do Paciente no Fluxo Profissional + Fix do Erro

### Problemas Identificados

1. **Erro na anamnese**: `AnamnesisForm` aceita `mode: "basic" | "premium"` mas `ProfessionalAssessment` passa `mode="professional"` (cast forçado). Isso pode causar comportamento inesperado em lógica condicional dentro do formulário.

2. **Sem onboarding para paciente**: O paciente que acessa o link do profissional vai direto ao `WelcomeStep` genérico sem identificar-se. O fisioterapeuta não sabe qual paciente completou qual avaliação.

3. **Sem nome do paciente**: A tabela `assessments` não armazena o nome do paciente (quando `user_id` é null, como no fluxo profissional). O `ProDashboard` lista avaliações sem identificação.

### Solução

**1. Adicionar coluna `patient_name` na tabela `assessments`**

```sql
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS patient_name text;
```

Permite que avaliações profissionais (sem user_id) tenham o nome do paciente.

**2. Criar tela de boas-vindas específica para paciente profissional**

Novo step `"patient_info"` no `ProfessionalAssessment.tsx`, entre `"welcome"` e `"redflags"`:
- Saudação personalizada: "Olá! O(a) Dr(a). {nome} solicitou que você preencha esta avaliação."
- Campo obrigatório: Nome completo do paciente
- Breve explicação do que vai acontecer (3 etapas, ~5 min)
- Botão "Continuar" que salva o nome e avança para red flags

**3. Corrigir tipo do `mode` no `AnamnesisForm`**

Atualizar a interface `AnamnesisFormProps` para aceitar `"basic" | "premium" | "professional"` eliminando os casts `as any`.

**4. Salvar `patient_name` na avaliação**

Ao criar o assessment em `ProfessionalAssessment`, incluir o `patient_name` no insert.

**5. Exibir nome do paciente no `ProDashboard`**

Na lista de avaliações recebidas, mostrar `patient_name` ao invés de "Paciente anônimo".

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Coluna `patient_name` em `assessments` |
| `src/pages/ProfessionalAssessment.tsx` | Novo step `patient_info` com input de nome; salvar `patient_name` no insert; remover casts `as any` |
| `src/components/assessment/AnamnesisForm.tsx` | Aceitar `mode: "professional"` no tipo |
| `src/components/dashboard/ProDashboard.tsx` | Exibir `patient_name` na lista de avaliações |
| `src/contexts/LanguageContext.tsx` | Traduções para tela de nome do paciente |

