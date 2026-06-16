## Contexto

Dois ajustes pontuais na aba **Profissional → Pacientes**, sem alterar lógica de avaliações reais nem agenda.

---

### 1) Estado vazio sem cabeçalho

**Hoje:** em `PatientEvolutionDashboard.tsx` (linhas 1103-1112), quando `patients.length === 0` o componente retorna **somente** um card "Nenhum paciente" — pulando o `PatientListView` inteiro. Por isso o título, o botão **Adicionar paciente** e a busca somem.

**Correção:**
- Remover o early-return de empty state em `PatientEvolutionDashboard.tsx`.
- Renderizar sempre `PatientListView` (mesmo com 0 pacientes).
- Em `PatientListView.tsx`, dentro do IIFE de render, se `filteredPatients.length === 0` exibir um card "dashed" centralizado com o ícone Activity, a mensagem `t("pro.no_patients")` (ou "Nenhum resultado para a busca" quando há termo digitado) — **abaixo** do cabeçalho/busca/filtros, que continuam visíveis e funcionais. O botão **Adicionar paciente** (já existente nas linhas 84-103) abre o `AddPatientModal` normalmente.

Nada muda no fluxo de adicionar/editar paciente — apenas o layout do estado vazio.

---

### 2) Cadastro via agenda gera falsa "avaliação concluída"

**Causa raiz encontrada** (investigação profunda):

Quando um profissional cria um agendamento para um paciente novo, dois pontos do código inserem uma linha **fake** em `assessments` com `status: "completed"` apenas para fazer o paciente aparecer na aba Profissional:

- `src/components/dashboard/ProSchedule.tsx` linhas 574-595 — insere assessment `{ type: "professional", status: "completed", anamnesis_data: { externalPatient: true } }`.
- `src/components/dashboard/AppointmentEditorDialog.tsx` linhas 301-315 — insere assessment `{ status: "completed", anamnesis_data: { quickEvolutionOnly: true, source: "schedule" } }` para suportar a "evolução rápida".

Esse insert dispara o realtime INSERT em `useRealtimeNotifications` ("Nova avaliação recebida" / "Avaliação concluída") e faz o card do paciente exibir o badge **"1 avaliação"** mesmo sem avaliação real.

**Correção (cirúrgica, sem quebrar o resto):**

**A. `ProSchedule.tsx` (linhas 574-599)** — ao criar agendamento para paciente novo, **não inserir mais** o assessment placeholder. Em vez disso:
- Manter apenas o `upsert` na tabela `patients` (linha 597) — o PatientListView já trata pacientes sem avaliações (`isImportedOnly`/`assessments.length === 0`, linha 213) e mostra o card normalmente.
- Manter o `dispatchEvent("reload-pro-patients")` para atualizar a lista.
- Substituir o toast `t("schedule.patient_created")` mantido (cadastro foi feito), mas **remover** o insert em `assessments`.

**B. `AppointmentEditorDialog.tsx` (linhas 301-315)** — o assessment placeholder só é criado quando o usuário **realmente abre a aba de Evolução** dentro do dialog (contexto `hasEvolutionContext`). Para evitar o disparo do toast de "avaliação concluída":
- Manter o insert (ele é necessário para ancorar a nota de evolução), **mas** alterar `status: "completed"` → `status: "draft"` e adicionar uma flag `anamnesis_data.placeholder = true`. Assim a linha existe para amarrar `professional_notes`, mas não conta como avaliação concluída.
- Ajustar leitura: onde o código já filtra/exibe assessments do paciente (PatientListView, contadores), ignorar registros com `anamnesis_data.placeholder === true` **ou** `status === "draft"` com `quickEvolutionOnly`. Já existe filtro semelhante em alguns pontos; vou auditar e padronizar.

**C. `useRealtimeNotifications.ts`** — defesa em profundidade: no listener de INSERT/UPDATE de `assessments`, ignorar payloads cujo `anamnesis_data?.externalPatient === true`, `quickEvolutionOnly === true` ou `placeholder === true`. Assim, mesmo se algum fluxo legado inserir um placeholder, o toast não dispara.

**D. PatientListView contadores** — no cálculo do badge `{p.assessments.length} avaliações` e no `trend`, filtrar fora assessments com flags `externalPatient | quickEvolutionOnly | placeholder` antes de contar. O card continua aparecendo (porque o paciente está em `patients`), mas sem o "1 avaliação fantasma".

---

### Riscos e mitigação

- **Pacientes legados** que já receberam o placeholder não somem — eles continuam visíveis via `patients` table. O badge de avaliação some quando o filtro for aplicado.
- **Evolução rápida** continua funcionando: o registro placeholder ainda existe para ancorar `professional_notes`, só não conta como avaliação concluída nem dispara toast.
- **Fluxos reais** (`AddPatientModal` quando o profissional clica em "Criar avaliação", avaliações manuais, links de paciente, avaliações finalizadas pelo paciente) **não são tocados** — continuam inserindo assessments reais sem flag `placeholder`, então geram toasts e contagem normalmente.
- Nenhuma migração de banco é necessária.

---

### Arquivos a editar

- `src/components/dashboard/PatientEvolutionDashboard.tsx` — remover early return do empty state.
- `src/components/dashboard/patient-evolution/PatientListView.tsx` — empty state interno + filtro de placeholders na contagem/trend.
- `src/components/dashboard/ProSchedule.tsx` — não inserir assessment placeholder ao cadastrar paciente novo via agenda.
- `src/components/dashboard/AppointmentEditorDialog.tsx` — placeholder de evolução com `status: "draft"` + flag `placeholder: true`.
- `src/hooks/useRealtimeNotifications.ts` — ignorar payloads com flags de placeholder.
