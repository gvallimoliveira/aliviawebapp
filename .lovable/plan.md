

## Plano: Fix Questionário Quadril + Fix Avaliação Profissional Não Chega ao Painel

### Problema 1: HOOS não aparece para dor no quadril

O mapa de dor nas vistas laterais usa IDs `"hip_left"` e `"hip_right"`, mas o `regionMapping` do HOOS lista `"hip_side"` (que não existe no mapa). Resultado: selecionar quadril na vista lateral não aciona o HOOS.

**Fix**: Adicionar `"hip_left"` e `"hip_right"` ao `regionMapping` do HOOS em `src/data/questionnaireData.ts`.

### Problema 2: Avaliação profissional não é salva/atualizada (bug crítico de RLS)

A tabela `assessments` tem duas políticas **RESTRICTIVE** para UPDATE:
1. "Anyone can update professional assessments" — `type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL` ✅
2. "Users can update their own assessments" — `auth.uid() = user_id` ❌

Como ambas são RESTRICTIVE, **ambas precisam passar**. Para avaliações profissionais, `user_id` é NULL e o paciente pode ser anônimo (`auth.uid()` = NULL). Em SQL, `NULL = NULL` retorna FALSE, então a política 2 bloqueia TODA atualização.

Isso significa que `updateAssessment()` falha silenciosamente — a anamnese, diagnóstico e `status: "completed"` **nunca são salvos**. Por isso a avaliação não aparece no painel profissional (fica "in_progress" sem dados).

**Fix**: Criar nova migration SQL que dropa a política restritiva "Users can update their own assessments" e a recria como PERMISSIVE (ao invés de RESTRICTIVE). A política "Anyone can update professional assessments" também deve ser PERMISSIVE. Quando há pelo menos uma PERMISSIVE, basta uma delas passar.

```sql
-- Drop restrictive policies
DROP POLICY "Users can update their own assessments" ON public.assessments;
DROP POLICY "Anyone can update professional assessments" ON public.assessments;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can update their own assessments"
  ON public.assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can update professional assessments"
  ON public.assessments FOR UPDATE TO anon, authenticated
  USING (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);
```

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Recriar políticas de UPDATE em `assessments` como PERMISSIVE |
| `src/data/questionnaireData.ts` | Adicionar `"hip_left"`, `"hip_right"` ao `regionMapping` do HOOS |

