# Red flags: continuar avaliação em links pro/clínica (com dispensa rastreável)

## Objetivo

Parar de afugentar clientes em **links profissionais e de clínica** quando uma red flag é marcada. A avaliação passa a ser concluída normalmente, mas o sistema sinaliza fortemente a necessidade de aval médico e suprime a hipótese diagnóstica do destaque até que o profissional dispense a red flag com justificativa. Histórico da dispensa fica visível no PDF (auditoria).

**Fluxo do paciente final (Assessment.tsx básica/premium auto-serviço) permanece como hoje: interrompe.**

---

## 1. Mudança de fluxo nos links pro/clínica

Arquivos: `src/pages/ProfessionalAssessment.tsx`, `src/pages/ClinicAssessment.tsx`.

- `handleRedFlagged` deixa de mudar `status` para `red_flagged` e de redirecionar para `RedFlagAlert`. Em vez disso:
  - Salva `red_flags` (objeto com itens marcados) no assessment.
  - Mostra um modal/tela intermediária "Atenção — sinal de alerta detectado" explicando que o profissional será avisado e que a hipótese ficará sob ressalva até liberação médica. Botões: "Entendi, continuar avaliação" e "Encerrar agora" (encerrar mantém comportamento atual de `red_flagged`).
  - Ao continuar, segue para a próxima etapa normal (dor/pain map/anamnese).
- `RedFlagAlert` continua existindo, usado só quando o paciente opta por encerrar e no fluxo do paciente final.

## 2. Persistência e dispensa

Nova coluna em `assessments`:
- `red_flags_dismissed_at timestamptz`
- `red_flags_dismissed_by uuid` (user_id do profissional)
- `red_flags_dismissed_reason text` (justificativa obrigatória)
- `red_flags_dismissed_by_name text` (snapshot do nome para PDF, caso o profissional saia da clínica)

Quem pode dispensar: qualquer membro ativo da clínica com role `owner | admin | therapist` (não `secretary`), ou o profissional dono do assessment. Validado em uma RPC `dismiss_assessment_red_flags(_assessment_id, _reason)` security definer, com checagem via `is_clinic_member`/owner do professional. RLS continua restringindo updates diretos.

Reverter dispensa: outra RPC `revert_assessment_red_flags_dismissal` para casos de erro (mesmo critério de permissão).

## 3. Geração de diagnóstico sob ressalva

`supabase/functions/generate-diagnosis/index.ts`:
- Quando `red_flags.detected = true` **e** `red_flags_dismissed_at` é nulo: prompt instrui IA a:
  - Retornar `hypothesis_suppressed: true` no JSON.
  - Preencher `summary` enfatizando "sinal de alerta médico — hipótese fisioterapêutica não deve ser considerada até liberação médica".
  - Ainda retornar uma hipótese técnica (para histórico), mas marcada como suprimida.
- Quando dispensada: comportamento normal de profissional (acknowledge da red flag, sem suprimir).

## 4. UI do profissional (prontuário)

`AssessmentSummaryView.tsx`, `AssessmentView.tsx`, `ProDashboard.tsx`, `PatientEvolutionDashboard.tsx`, `ClinicSecretaryDashboard.tsx`:

- Banner âmbar/vermelho no topo do prontuário listando as red flags marcadas.
- Se NÃO dispensada: hipótese diagnóstica exibida com overlay/badge "Sob ressalva — requer aval médico" e botão **"Dispensar red flag"** (abre dialog pedindo justificativa obrigatória ≥20 chars; opção "encaminhamento médico em andamento", "atestado/aval recebido", "outro").
- Se dispensada: banner muda para "Red flag dispensada em DD/MM/AAAA por Dr(a). X — motivo: …" + botão discreto "Reverter dispensa".
- Secretária vê o banner mas não vê o botão de dispensar (apenas leitura).

## 5. PDF

`src/utils/generatePdf.ts` (`renderRedFlagsCard` já criado):
- Sempre renderiza o card de red flags se houver itens marcados.
- Quando dispensada: adiciona linha "Dispensada em DD/MM/AAAA por Dr(a). X — Motivo: …" no card (sem sumir do PDF — auditoria permanente).
- Quando NÃO dispensada: adiciona aviso forte "Hipótese diagnóstica sob ressalva — necessário aval médico antes de iniciar tratamento" e a seção de hipótese principal mostra esse mesmo aviso no lugar do destaque normal.

## 6. Notificação ao profissional

Quando uma avaliação por link pro/clínica é concluída com `red_flags.detected = true`:
- Toast/badge na lista de pacientes ("⚠ Red flag pendente de dispensa").
- (Opcional, fora deste plano): e-mail/push. Por ora apenas indicador visual no dashboard.

## 7. Fluxo do paciente final — sem mudança

`Assessment.tsx` (auto-serviço básica/premium) continua chamando `RedFlagAlert` e encerrando a avaliação. Sem botão "continuar mesmo assim".

## 8. Página de suporte + memória

- Atualizar `Support.tsx` e `ClinicSupport.tsx` (pt/en/es) com a nova regra (red flags em links pro/clínica não interrompem mais; profissional precisa dispensar para liberar hipótese).
- Atualizar `mem://features/safety-screening` para refletir a nova distinção entre fluxo paciente final (interrompe) e fluxo pro/clínica (continua sob ressalva + dispensa).

---

## Detalhes técnicos

### Migração SQL
```sql
ALTER TABLE public.assessments
  ADD COLUMN red_flags_dismissed_at timestamptz,
  ADD COLUMN red_flags_dismissed_by uuid,
  ADD COLUMN red_flags_dismissed_by_name text,
  ADD COLUMN red_flags_dismissed_reason text;
```
Mais duas RPCs security definer (`dismiss_assessment_red_flags`, `revert_assessment_red_flags_dismissal`) com validação de permissão por clínica/profissional.

### Componentes novos
- `RedFlagContinueDialog.tsx` — modal intermediário no fluxo pro/clínica ("continuar avaliação" / "encerrar agora").
- `DismissRedFlagDialog.tsx` — dialog com select de motivo + textarea de justificativa obrigatória.

### Arquivos editados
- `src/pages/ProfessionalAssessment.tsx`, `src/pages/ClinicAssessment.tsx` — novo handler de continuar.
- `src/components/assessment/AssessmentSummaryView.tsx` — banner + supressão da hipótese.
- `src/pages/AssessmentView.tsx` + dashboards (Pro, Secretary, Evolution) — banner e botão de dispensar.
- `src/utils/generatePdf.ts` — card de red flag com linha de dispensa.
- `supabase/functions/generate-diagnosis/index.ts` — prompt condicional para hipótese suprimida.
- `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx` (3 idiomas).

### Fora de escopo
- E-mail/push de notificação de red flag (fica como melhoria futura).
- Upload de atestado médico como anexo de dispensa (pode entrar depois via `patient_files`).
- Mudança no fluxo do paciente final (mantido como interrupção).
