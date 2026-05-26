## Objetivo

Eliminar perda de dados em formulários longos (HEP, Avaliação Manual, Anamnese) quando o app é recarregado por bloqueio de tela, troca de app, refresh ou crash. Estratégia dupla: **autosave local instantâneo + sync para a nuvem**, com prompt "Retomar rascunho" ao reabrir.

## Como o usuário vai sentir

1. Ao adicionar o 1º exercício/campo, aparece discretamente "💾 Rascunho salvo" no rodapé do modal.
2. A cada edição, o rascunho é atualizado (debounce 800ms) — local primeiro, nuvem em background.
3. Se o app recarrega, ao reabrir o mesmo formulário um banner pergunta: *"Encontramos um rascunho de DD/MM HH:mm com X itens. Retomar ou descartar?"*
4. Funciona em qualquer dispositivo logado (sync via nuvem) e mesmo offline (cai pro local).
5. Ao finalizar/salvar de verdade, o rascunho é descartado automaticamente.

## Arquitetura

### 1. Tabela `form_drafts` (nuvem)
Genérica — uma linha por (user, form_key, scope_key).

```text
form_drafts
├── id uuid pk
├── user_id uuid (auth.uid)
├── form_key text  -- 'hep' | 'manual_assessment' | 'anamnesis'
├── scope_key text -- ex: patient_email + professional_id, ou assessment_id
├── payload jsonb  -- estado serializado do formulário
├── updated_at timestamptz
└── unique (user_id, form_key, scope_key)
```

RLS: cada usuário só vê/edita os próprios rascunhos. TTL: limpeza automática de drafts >14 dias via cron já existente (`cleanup-old-reports` ou novo).

### 2. Hook `useAutosaveDraft<T>`
Em `src/hooks/useAutosaveDraft.ts`:

```text
useAutosaveDraft({
  formKey: 'hep',
  scopeKey: `${professionalId}:${patientEmail}`,
  state: { selected, customExercises, notes },
  enabled: open && !generatedLink,
})
→ { hasDraft, draftMeta, restore(), discard(), saving }
```

Comportamento:
- **Save**: debounce 800ms → `localStorage` síncrono + `upsert` em `form_drafts` (fire-and-forget, com retry simples).
- **Load**: ao montar com `enabled`, lê local + nuvem, pega o mais recente, expõe via `hasDraft`.
- **Discard**: remove ambos.
- Chave local: `alivia:draft:{formKey}:{scopeKey}`.
- Ignora salvamento se `state` igual ao último snapshot (hash leve).

### 3. Componente `DraftResumeBanner`
Aparece no topo do modal/formulário quando `hasDraft` é true. Dois botões: **Retomar** | **Descartar**.

## Pontos de integração

### CreateExerciseProgramModal.tsx
- `scopeKey = ${professionalId}:${patientName}:${assessmentId ?? ''}`
- `state = { selected, customExercises, notes }`
- Em modo edição (`editProgramId`), autosave fica desligado (já está no servidor).
- Após `createProgram` bem-sucedido → `discard()`.

### ManualAssessmentModal.tsx
- `scopeKey = ${professionalId}:${patientEmail || patientName}`
- `state = { painRegions, painScore, anamnesis, testResults, notes, ... }`
- Após salvar avaliação → `discard()`.

### AnamnesisForm.tsx (usado em Assessment.tsx)
- `scopeKey = ${assessmentId}` (avaliação já existe como linha)
- `state = anamnesisData`
- Aqui já há salvamento parcial em `assessments.anamnesis_data`; o draft cobre o intervalo entre cliques (campos em digitação) e o cenário de assessment ainda não criado.
- Ao avançar de etapa → mantém; ao finalizar avaliação → `discard()`.

## Camadas de defesa

1. **Local (sempre)**: `localStorage` é síncrono e sobrevive a reload imediato. Cobre 99% dos casos do tipo "tela bloqueou".
2. **Nuvem (quando online)**: cobre troca de dispositivo, limpeza de cache, reinstalação do PWA.
3. **`beforeunload` / `visibilitychange`**: força flush do debounce pendente antes do app sumir.
4. **Conflito**: se local e nuvem divergem, pega o `updated_at` mais recente e mostra ambas as datas no banner.

## Detalhes técnicos

- Tamanho do payload: limitar a ~200KB (jsonb), avisar e parar sync na nuvem se exceder (segue só local).
- Não salvar dados sensíveis fora do escopo do formulário (sem tokens, sem PII além do que já está no form).
- `useAutosaveDraft` é puro client-side, sem dependências novas.
- Migração inclui `GRANT` para `authenticated` e `service_role` (sem anon).

## Arquivos

**Novos**
- `supabase/migrations/{ts}_form_drafts.sql`
- `src/hooks/useAutosaveDraft.ts`
- `src/components/common/DraftResumeBanner.tsx`

**Editados**
- `src/components/dashboard/CreateExerciseProgramModal.tsx`
- `src/components/dashboard/ManualAssessmentModal.tsx`
- `src/components/assessment/AnamnesisForm.tsx` (+ pequena integração em `Assessment.tsx` para o `scopeKey`)
- `src/locales/{pt,en,es}.json` — strings do banner e badge "Rascunho salvo"
- `src/pages/Support.tsx` + `src/pages/ClinicSupport.tsx` — nova entrada explicando autosave

## Fora de escopo

- Histórico de versões de rascunho (só o último vence).
- Autosave em outros formulários menores (perfil, configurações da clínica).
- Sincronização realtime entre abas abertas simultaneamente.
