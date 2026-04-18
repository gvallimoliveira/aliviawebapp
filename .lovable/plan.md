
## Resposta direta

**Sim, hoje viraria um paciente novo.** O agrupamento usa `patient_email` como chave principal (e nome como fallback). Se o paciente importado não tem email e o link genérico (`/assessment/professional/{professionalId}`) é enviado, o paciente preenche email/nome no formulário e a avaliação cai num grupo separado, sem vínculo com o card existente.

## Solução proposta: link de avaliação personalizado por paciente

Sua ideia é a melhor — não precisa de IA. Basta gerar um link com um **token vinculado ao registro do paciente**. Quando o paciente preenche, a avaliação é automaticamente atribuída ao card existente.

### Como vai funcionar (UX)

1. No card do paciente importado (sem email), adicionar botão **"Gerar link de avaliação personalizado"** (ao lado dos ícones de avaliação manual / nota rápida).
2. Clicou → gera link único `…/assessment/professional/{professionalId}?patient={token}` e copia para a área de transferência.
3. Profissional envia por WhatsApp/SMS.
4. Paciente abre o link → o nome dele já aparece pré-preenchido (e bloqueado), pode adicionar email opcionalmente.
5. Ao concluir, a avaliação é gravada com o `patient_id` correto → aparece **dentro do card existente**, não cria duplicata.

### Diagrama do fluxo

```text
Card paciente importado
  └─ [Gerar link personalizado] → token único salvo em DB
                                    ↓
                         Profissional envia link
                                    ↓
                    Paciente abre /assessment/professional/{proId}?patient=TOKEN
                                    ↓
                    Form pré-preenche nome do patient record
                                    ↓
                    Submit grava assessment com patient_email do registro
                    (ou novo campo patient_id) → agrupa no card certo
```

### Mudanças técnicas

1. **Migration**: adicionar coluna `assessment_token text unique` na tabela `patients` (gerado via `gen_random_uuid()::text` quando solicitado). Sem regenerar automaticamente — só sob demanda.
2. **`PatientEvolutionDashboard.tsx`**:
   - Novo botão "link" (ícone Link2) nos cards, sempre visível em mobile, hover em desktop (mesmo padrão dos outros ícones).
   - Handler: se `patientRecord.assessment_token` não existe, gera e faz `update`. Depois copia `…/assessment/professional/{professionalId}?patient={token}`.
3. **`ProfessionalAssessment.tsx`**:
   - Ler `searchParams.get("patient")`.
   - Se presente: buscar `patients` com aquele token (RLS permite SELECT público pois o token é o segredo — política nova: `SELECT` quando `assessment_token = $1`).
   - Pré-preencher `patientName` e `patientEmail` (campos somente leitura para o nome).
   - No `createAssessment`, gravar `patient_email` do registro existente (ou um campo adicional `patient_id` se quiser vínculo forte — começamos com email/nome para compatibilidade com o agrupamento atual).
4. **Agrupamento**: já funciona — usa email se existir, nome como fallback. Como o nome vem pré-preenchido idêntico ao registro, o agrupamento por nome funciona automaticamente.

### Por que essa solução e não a "IA gerar link"

- **Mais simples**: token UUID é instantâneo, gratuito, infalível. IA aqui não agrega valor (não há texto para gerar).
- **Mais seguro**: token aleatório de 36 caracteres é impossível de adivinhar.
- **Reaproveita infra existente**: já usamos o mesmo padrão em `exercise_programs.token`.

### Bônus opcional (posso incluir agora ou depois)

- Botão "Compartilhar via WhatsApp" que abre `wa.me/{phone}?text=…` se o paciente tem telefone cadastrado.
- Validade de 30 dias para o token (regenera se expirado).

### Arquivos afetados

- `supabase/migrations/<novo>.sql` (adicionar coluna + policy SELECT por token)
- `src/components/dashboard/PatientEvolutionDashboard.tsx`
- `src/pages/ProfessionalAssessment.tsx`
