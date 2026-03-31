

## Queixa Principal Multi-Select com Combinações Válidas + Campo "Outra Queixa" Renomeado

### Contexto

Atualmente `chiefComplaint` é uma string única. Precisa virar array (`string[]`) com validação de combinações biomecânicas permitidas.

### Regras de Combinação

Dois grupos mutuamente exclusivos (não pode misturar entre eles):

- **Membros superiores + cervical**: cervical, ombro, cotovelo, punho, cabeça
- **Membros inferiores**: lombar, quadril, joelho, tornozelo, pé

Dentro de cada grupo, qualquer combinação é livre. Itens isolados que não fazem parte de nenhum grupo também são permitidos. O que **não** pode: selecionar um item de cada grupo ao mesmo tempo.

Mapeamento das queixas aos grupos:
- **Superior**: `neck_pain`, `shoulder_pain`, `elbow_pain`, `wrist_pain`, `headache`
- **Inferior**: `back_pain`, `hip_pain`, `knee_pain`, `ankle_pain`, `foot_pain`

### Alterações

**1. `src/components/assessment/AnamnesisForm.tsx`**

- `chiefComplaint: string` → `chiefComplaints: string[]` (array)
- Step "complaint": trocar seleção única por toggle multi-select com checkboxes
- Ao clicar numa queixa, verificar se a combinação resultante é válida (não mistura grupos). Se inválida, exibir toast/mensagem e não adicionar
- Validação do step: `data.chiefComplaints.length > 0 || customComplaint.trim() !== ""`
- Atualizar `isShoulderRelated()` e `getSelectedSingleRegionType()` para usar o array
- Feedback visual: ao tentar selecionar item do grupo oposto, mostrar mensagem explicativa

**2. Campo "Outra queixa" → "Outra queixa / Detalhes"**

- Atualizar label e placeholder nos 3 arquivos de locale:
  - PT: "Outra queixa ou descreva mais detalhes" / "Descreva outra queixa ou detalhe mais sua queixa..."
  - EN: "Other complaint or describe more details" / "Describe another complaint or add more details..."
  - ES: "Otra queja o describa más detalles" / "Describa otra queja o agregue más detalles..."

**3. Locales (`pt.json`, `en.json`, `es.json`)**

- Atualizar `anamnesis.other_complaint` e `anamnesis.other_complaint_placeholder`
- Adicionar chave `anamnesis.complaint_group_conflict` para mensagem de erro quando tenta misturar grupos

**4. Impacto downstream**

- `generate-diagnosis` edge function recebe `chiefComplaints` (array) em vez de `chiefComplaint` (string) — precisa ajustar para aceitar ambos formatos (backward compatible)
- `DiagnosisResult`, `TreatmentPlan`, e outros componentes que leem `anamnesisData.chiefComplaint` precisam ser atualizados para ler o array

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/components/assessment/AnamnesisForm.tsx` | `chiefComplaint` → `chiefComplaints[]`, multi-select com validação de grupo |
| `src/locales/pt.json` | Atualizar labels "outra queixa", adicionar msg de conflito |
| `src/locales/en.json` | Idem |
| `src/locales/es.json` | Idem |
| `supabase/functions/generate-diagnosis/index.ts` | Aceitar `chiefComplaints` array (backward compatible) |

