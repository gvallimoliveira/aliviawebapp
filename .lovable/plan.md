## Objetivo

Permitir que o fisioterapeuta (PRO autônomo ou membro de Clínica como **owner/therapist**) sobrescreva a hipótese diagnóstica sugerida pela IA. Esse overrule:
- Aparece apenas no **ambiente interno** (prontuário e visualização da avaliação).
- Quando preenchido, **substitui totalmente** a hipótese da IA no prontuário e no **PDF entregue ao paciente**.
- Quando vazio (ou marcado como "OK com a IA"), mantém o comportamento atual.
- **Secretárias não podem editar** (decisão clínica).

## UX / Design

Novo card discreto, padrão do app (rounded-xl, primary/teal, alinhado ao card "Hipótese Diagnóstica" existente), com dois estados:

```text
┌─ Hipótese Diagnóstica ──────────────────────┐
│ 🩺 Tendinopatia patelar (sugerida pela IA)  │  ← hipótese da IA (sempre visível)
│ Confiança: Alta                             │
└──────────────────────────────────────────────┘

┌─ Hipótese Final (Profissional) ✎ ───────────┐
│ ◉ Concordo com a hipótese da IA             │
│ ○ Ajustar / Sobrescrever                    │
│   [campo de texto quando selecionado]       │
│                              [Salvar][Cancelar]
└──────────────────────────────────────────────┘
```

Quando há overrule salvo, o card principal vira:

```text
┌─ Hipótese Diagnóstica (Final) ──────────────┐
│ ✓ Síndrome femoropatelar                    │  ← em destaque
│ Revisada pelo fisioterapeuta · há 2 dias    │
│ ──                                          │
│ Sugestão original da IA: Tendinopatia       │  ← discreto, abaixo
│ patelar (Confiança: Alta)            [Editar]│
└──────────────────────────────────────────────┘
```

- Card de edição só aparece para usuários autorizados (PRO ativo OU clinic role owner/therapist).
- Para o **paciente** e em links públicos, o card de edição não aparece — ele só vê a hipótese final em destaque (sem saber se foi IA ou ajustada).

## Mudanças técnicas

### 1. Banco de dados (migration)
Adicionar à tabela `assessments`:
- `final_hypothesis text` (nullable) — texto digitado pelo profissional.
- `final_hypothesis_by uuid` (nullable) — `auth.uid()` de quem editou.
- `final_hypothesis_at timestamptz` (nullable) — quando foi salvo.

Sem tabela de auditoria (decisão do usuário). RLS de UPDATE já existe e cobre os papéis necessários:
- PRO autônomo: policy "Professionals can update their linked assessments".
- Clínica owner/therapist: policy "Clinic managers and therapists can update clinic assessments" (já restringe owner/secretary/therapist; vamos manter esse mesmo conjunto, **mas no front** bloquearemos o botão para `secretary`).

### 2. Helper de permissão (frontend)
Pequeno hook `useCanEditFinalHypothesis(assessment)` retornando `true` se:
- `professional_id` corresponde ao PRO logado, **ou**
- `clinic_id` existe e usuário tem `clinic_role` em `['owner','therapist']`.

### 3. Componente novo: `FinalHypothesisEditor.tsx`
- Recebe `assessment`, `aiHypothesis`, `finalHypothesis`, `onSaved`.
- Estados: visualização → edição (com radio "Concordo" / "Ajustar").
- Ao salvar: `UPDATE assessments SET final_hypothesis, final_hypothesis_by, final_hypothesis_at`. Limpar = setar `null` (volta para a IA).
- Toast de confirmação, validação de tamanho (max 200 chars).

### 4. Pontos de integração

**Prontuário (`PatientEvolutionDashboard.tsx`, linha ~2190)**
- Card "Hipótese Diagnóstica" passa a renderizar `final_hypothesis ?? diagnosis.hypothesis` em destaque.
- Se há override: badge "Revisada pelo fisioterapeuta" + linha discreta com a sugestão original da IA.
- Logo abaixo: `<FinalHypothesisEditor />` se permissão.

**Visualização da avaliação (`AssessmentView.tsx`)**
- Mesmo tratamento: card principal usa `final_hypothesis ?? diagnosis.hypothesis`.
- Editor abaixo (mesmo componente, mesmo registro → sincronizado).

**PDF (`utils/generatePdf.ts`, linhas 1173 e 945)**
- Adicionar parâmetro opcional `finalHypothesis?: string` ao `AssessmentReportOptions` e `BasicReportOptions`.
- Se presente, usar `finalHypothesis` no card principal (substitui totalmente a da IA, conforme decidido).
- Caller passa `assessment.final_hypothesis ?? assessment.diagnosis.hypothesis`.

**Compartilhamento WhatsApp (`AssessmentView.tsx` linha 227 e `DiagnosisResult.tsx` linha 386)**
- Mesma lógica: se `final_hypothesis` existe, usa ele no texto.

**Listagens secundárias (não exibem editor, apenas leitura):**
- `AssessmentHistory.tsx` linha 62 — usar fallback `final_hypothesis ?? hypothesis`.
- `PatientEvolutionDashboard.tsx` linhas 359, 1137, 1883, 2589 — mesmo fallback (utility helper `getDisplayHypothesis(assessment)` para evitar duplicação).

### 5. NÃO alterar
- `DiagnosisResult.tsx` (tela mostrada ao paciente logo após avaliação) → não exibe editor; o profissional acessa via prontuário/AssessmentView.
- Edge functions de geração da IA (`generate-diagnosis`) → o overrule é puramente pós-fato, não afeta o raciocínio da IA armazenado em `diagnosis.hypothesis`.
- Tabela de auditoria/log → fora de escopo (decidido).

## Resumo de arquivos

| Arquivo | Tipo |
|---|---|
| `supabase/migrations/...sql` | novo (3 colunas) |
| `src/lib/finalHypothesis.ts` | novo (helper `getDisplayHypothesis` + hook permissão) |
| `src/components/dashboard/FinalHypothesisEditor.tsx` | novo |
| `src/components/dashboard/PatientEvolutionDashboard.tsx` | editar (card + editor + fallbacks) |
| `src/pages/AssessmentView.tsx` | editar (card + editor + WhatsApp) |
| `src/components/dashboard/AssessmentHistory.tsx` | editar (fallback) |
| `src/utils/generatePdf.ts` | editar (suportar `finalHypothesis` em ambos PDFs) |
| `src/components/assessment/DiagnosisResult.tsx` | editar leve (fallback no WhatsApp share, caso já tenha override) |

## Considerações

- Segurança: RLS já cobre quem pode dar UPDATE em `assessments`. O bloqueio adicional para secretária é UX no front; ela tecnicamente teria permissão de UPDATE (policy "Clinic managers and therapists" inclui secretary). Se quiser bloqueio também no DB, posso adicionar uma policy mais restrita — me avise.
- O campo é opcional e retroativo: avaliações antigas continuam funcionando normalmente (mostram a hipótese da IA até que alguém faça overrule).
- Memória do projeto será atualizada com regra "Final Hypothesis Overrule".
