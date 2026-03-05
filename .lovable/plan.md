

## Plano: Fix Avaliação Profissional Não Salva + Red Flags para Fluxo Profissional

### Diagnóstico

**Bug principal: Avaliação profissional nunca é salva no banco**

As políticas de RLS para UPDATE estão corretas (PERMISSIVE). O problema real é na **leitura após INSERT**:

1. `createAssessment()` faz `.insert(...).select("id").single()` 
2. Após o INSERT, o Supabase tenta ler o registro de volta (SELECT)
3. Não existe política SELECT para `anon` em assessments profissionais
4. `.select("id")` retorna null → `data.id` lança erro → `createAssessment` retorna null
5. `updateAssessment` nunca é chamado (sem ID), diagnóstico nunca é salvo
6. Assessment fica "in_progress" sem dados → não aparece no painel

**Confirmação**: Query no banco mostra **zero** assessments profissionais.

**Bug secundário**: `updateAssessment()` não verifica o `error` retornado pelo Supabase (só usa try/catch, que não captura erros de RLS).

### Solução

**1. Migration: Adicionar SELECT policy para assessments profissionais**

```sql
CREATE POLICY "Anyone can view professional assessments for flow"
  ON public.assessments FOR SELECT TO anon, authenticated
  USING (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);
```

Também adicionar coluna `red_flags` (jsonb) para armazenar dados da triagem:

```sql
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS red_flags jsonb DEFAULT NULL;
```

**2. Fix `updateAssessment` no ProfessionalAssessment.tsx**

Verificar `error` do retorno do Supabase em vez de depender apenas de try/catch:

```ts
const { error } = await supabase.from("assessments").update(updates).eq("id", id);
if (error) console.error("Update error:", error);
```

**3. Red Flags no fluxo profissional: salvar e não bloquear**

Atualmente, quando há red flag, o paciente vê "procure um médico" e o fluxo para. No fluxo profissional, o comportamento deve ser:

- `RedFlagScreening` passa as respostas de volta via callback (novo prop `onFlaggedWithData`)
- `ProfessionalAssessment` cria o assessment com `red_flags` salvas e `status: "red_flagged"`
- Paciente vê mensagem contextualizada: "Informe ao seu fisioterapeuta que foram identificados sinais de alerta na triagem. É recomendado buscar opinião médica antes de prosseguir."
- O fluxo **não continua** para anamnese (por segurança), mas o profissional recebe a notificação

**4. Alerta de Red Flag no ProDashboard**

Na lista de assessments, exibir badge vermelho "⚠ Red Flags" para assessments com `red_flags` não nulo. Ao clicar, mostrar quais itens foram positivos.

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Política SELECT para anon em assessments profissionais + coluna `red_flags` |
| `src/pages/ProfessionalAssessment.tsx` | Fix error handling em `updateAssessment`; salvar red flags; criar assessment mesmo quando flagged; mensagem profissional específica |
| `src/components/assessment/RedFlagScreening.tsx` | Novo prop `onFlaggedWithData` para retornar respostas |
| `src/components/assessment/RedFlagAlert.tsx` | Aceitar prop `mode` para mostrar mensagem diferente no fluxo profissional |
| `src/components/dashboard/ProDashboard.tsx` | Badge de alerta red flag nas assessments; exibir quais flags foram positivas |
| `src/contexts/LanguageContext.tsx` | Traduções para mensagem profissional de red flag e badge no painel |

